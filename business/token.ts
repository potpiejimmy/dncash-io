import * as db from "../util/db";
import * as Device from "./device";
import * as Journal from "./journal";
import * as crypto from 'crypto';
import * as constants from 'constants';
import * as forge from 'node-forge';
import * as uuid from "uuid/v4"; // Random-based UUID
import * as config from '../config';
import { tokenChangeNotifier } from "../util/notifier";

export function createToken(customer: any, token: any): Promise<any> {
    return Device.findByCustomerAndUUID(customer, token.device_uuid).then(device => {
        if (!device) throw "Sorry, device with UUID " + token.device_uuid + " not found.";

        // create secure UUID
        let uid = uuid();
        // check if unique
        return findByUUID(uid).then(found => {
            if (found) return createToken(customer, token); // try again

            delete token.device_uuid;
            delete token.id;
            delete token.lock_device_id;
            delete token.state;
            token.uuid = uid;
            token.owner_id = customer.id;
            token.owner_device_id = device.id;
            let code = crypto.randomBytes(config.DEFAULT_CODE_LEN);
            token.secure_code = encryptTokenCode(device.pubkey, code);
            token.info = JSON.stringify(token.info); // save info data as string
            if (token.expires) token.expires = new Date(token.expires);
            tokenChangeNotifier.notifyObservers(customer.id, {uuid: uid});
            return insertNew(token).then(id => findById(id)).then(t => {
                Journal.journalize(customer.id, "token", "create", t);
                return exportToken(t);
            });
        });
    });
}

let exportTokenSelect = "select t.*,d.uuid as device_uuid from token t join customer_device d on t.owner_device_id=d.id";

export function getByDeviceUUID(customer: any, uid: string): Promise<any> {
    return Device.findByCustomerAndUUID(customer, uid).then(device => {
        if (!device) return [];
        return db.querySingle(exportTokenSelect + " where t.owner_device_id=? and t.state='OPEN'", [device.id]).then(res => exportTokens(res));
    });
}

export function getByCustomer(customer: any): Promise<any> {
    return db.querySingle(exportTokenSelect + " where t.owner_id=?", [customer.id]).then(res => exportTokens(res));
}

export function getByUUID(customer: any, uid: string): Promise<any> {
    return db.querySingle(exportTokenSelect + " where t.owner_id=? and t.uuid=?", [customer.id, uid]).then(res => {
        if (!res.length) return null;
        return exportToken(res[0]);
    });
}

export function deleteByDeviceAndUUID(customer: any, device_uuid: string, uid: string): Promise<any> {
    return Device.findByCustomerAndUUID(customer, device_uuid).then(device => {
        if (!device) return;
        return db.querySingle("update token set state='DELETED' where state='OPEN' and owner_device_id=? and uuid=?", [device.id, uid]).then(res => {
            if (res.affectedRows) {
                tokenChangeNotifier.notifyObservers(customer.id, {uuid: uid});
                return findByUUID(uid).then(t => {
                    Journal.journalize(customer.id, "token", "delete", t);
                    return exportToken(t);
                });
            }
        });
    });
}

export function getStatistics(customer: any): Promise<any> {
    return db.querySingle("select state, type, sum(amount) as amount, count(*) as count from token where owner_id=? group by state, type", [customer.id]);
}

export function verifyAndLock(customer: any, device_uuid: string, radio_code: string): Promise<any> {
    // make sure the verifying cash device is allowed for the current user credentials
    return Device.findByCustomerAndUUID(customer, device_uuid).then(cashDevice => {
        if (!cashDevice) throw "Cash device with UUID " + device_uuid + " not found.";
        return verifyAndLockImpl(cashDevice, radio_code);
    });
}

export function verifyAndLockByTrigger(device_id: number, radio_code: string): Promise<any> {
    return Device.findById(device_id).then(cashDevice => {
        return verifyAndLockImpl(cashDevice, radio_code);
    });
}

export function updateByLockDeviceAndUUID(customer: any, device_uuid: string, uid: string, newData: any): Promise<any> {
    return Device.findByCustomerAndUUID(customer, device_uuid).then(cashDevice => {
        if (!cashDevice) throw "Cash device with UUID " + device_uuid + " not found.";
        return findByUUID(uid).then(token => {
            if (!token) throw "Token not found";
            // make sure the updater is the same as the locker
            if (token.lock_device_id != cashDevice.id) throw "Sorry, token was locked by another device";
            
            // right now, we only support updating of the state and/or amount
            if (!(['COMPLETED','CANCELED','FAILED','REJECTED','RETRACTED'].includes(newData.state))) throw "Update token state: only values COMPLETED, CANCELED, FAILED, REJECTED, RETRACTED allowed.";
            if (!newData.amount) newData.amount = token.amount;
            if (token.type=='CASHOUT' && newData.amount > token.amount) throw "Illegal amount increase for dispense token.";

            return updateLockedToken(token.id, newData.state, newData.amount).then(success => {
                if (!success) throw "Token not in LOCKED state.";
                tokenChangeNotifier.notifyObservers(token.owner_id, {uuid: uid});
                // re-read and export:
                return findById(token.id).then(t => {
                    Journal.journalize(customer.id, "token", "confirm", t);
                    return exportToken(t)
                });
            });
        });        
    });
}

function cleanUpExpired(): Promise<void> {
    return db.querySingle("update token set state='EXPIRED' where state='OPEN' and expires<NOW()");
}

function verifyAndLockImpl(cashDevice: any, radio_code: string): Promise<any> {
    // Radio Code V.1: 36 characters token UUID + decrypted secure code in hex
    let token_uuid = radio_code.substring(0,36);
    let code = new Buffer(radio_code.substring(36), 'hex');

    // look up the token to find the associated token device
    return cleanUpExpired().then(() => findByUUID(token_uuid).then(token => {
        if (!token) throw "Token not found";

        // fetch the token device with its associated public key:
        return Device.findById(token.owner_device_id).then(tokenDevice => {
            // compare the encrypted token codes:
            if (token.secure_code != encryptTokenCode(tokenDevice.pubkey, code)) throw "Invalid token code.";

            // now check for cross-customer access
            if (token.owner_id != cashDevice.customer_id) {
                // The cash device and the token device belong to different
                // customers ("Fremdkundenaus/einzahlung")
                // Apply sophisticated rules here in the future allowing
                // for cross-customer-clearing.
                // For now, segregate all customers
                return atomicLockAndReturn(cashDevice, token, "reject", "REJECTED").then(t => {
                    throw "Foreign token rejected";
                });
            }

            // okay, verified, now try to lock the token:
            return atomicLockAndReturn(cashDevice, token, "lock", "LOCKED");
        })
    }));
}

function atomicLockAndReturn(cashDevice: any, token: any, action: string, state: string): Promise<any> {
    return atomicLockTokenDB(token.id, cashDevice.id, state).then(success => {
        if (!success) throw "Token not in OPEN state.";
        tokenChangeNotifier.notifyObservers(token.owner_id, {uuid: token.uuid});
        // re-read and export:
        return findById(token.id).then(t => {
            Journal.journalize(cashDevice.customer_id, "token", action, t);
            return exportToken(t)
        });
    });
}

/**
 * Returns the public key encrypted token using PKCS1_PADDING 
 * @param pubkey PEM encoded public key
 * @param code a variable size buffer with random data
 */
function encryptTokenCode(pubkey: string, code: Buffer): string {
    // apply non-random PKCS#1-padding so we don't have to
    // store the plain code in the DB and can compare
    // the encrypted code on token verification.
    // this does not compromise security as the plain text
    // itself is a secure random number. this way
    // we never store the plain code anywhere which greatly
    // enhances the token security.

    // determine key length:
    let keylen = forge.pki.publicKeyFromPem(pubkey).n.toString(16).length/2;

    // Apply PKCS#1 padding:
    let padded = Buffer.from([0x00, 0x02, ...new Array(keylen-code.length-3).fill(0xff), 0x00, ...code]);

    // and encrypt using public key:
    return crypto.publicEncrypt({
        key: pubkey,
        padding: constants.RSA_NO_PADDING /* already padded */
    }, padded).toString('base64');
}

function exportTokens(tokens: Array<any>): Array<any> {
    tokens.forEach(i => exportToken(i));
    return tokens;
}

function exportToken(token: any): any {
    // converts a DB token into its outside-world representation:
    delete token.id;
    delete token.owner_id;
    delete token.owner_device_id;
    delete token.lock_device_id;
    token.info = JSON.parse(token.info);
    return token;
}

function insertNew(token: any): Promise<number> {
    return db.querySingle("insert into token set ?", [token]).then(res => res.insertId);
}

function findById(id: number): Promise<any> {
    return db.querySingle("select * from token where id=?", [id]).then(res => res[0]);
}

function findByUUID(uid: string): Promise<any> {
    return db.querySingle("select * from token where uuid=?", [uid]).then(res => res[0]);
}

function atomicLockTokenDB(id: number, cashDeviceId: number, state: string): Promise<boolean> {
    return db.querySingle("update token set state=?,lock_device_id=?,updated=? where id=? and state='OPEN'", [state,cashDeviceId,new Date(),id]).then(res => res.affectedRows);
}

function updateLockedToken(id: number, newState: string, newAmount: number): Promise<boolean> {
    return db.querySingle("update token set state=?,amount=?,updated=? where id=? and state='LOCKED'", [newState,newAmount,new Date(),id]).then(res => res.affectedRows);
}
