import * as db from "../util/db";
import * as Device from "./device";
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

            delete token.id;
            delete token.device_uuid;
            token.uuid = uid;
            token.owner_id = customer.id;
            token.owner_device_id = device.id;
            let code = crypto.randomBytes(config.DEFAULT_CODE_LEN);
            token.secure_code = encryptTokenCode(device.pubkey, code);
            token.info = JSON.stringify(token.info); // save info data as string
            tokenChangeNotifier.notifyObservers(customer.id);
            return insertNew(token).then(id => findById(id)).then(t => exportToken(t));
        });
    });
}

export function findByDeviceUUID(customer: any, uid: string): Promise<any> {
    return Device.findByCustomerAndUUID(customer, uid).then(device => {
        if (!device) return [];
        return db.querySingle("select * from token where owner_device_id=? and state='OPEN'", [device.id]).then(res => exportTokens(res));
    });
}

export function findByCustomer(customer: any): Promise<any> {
    return db.querySingle("select * from token where owner_id=?", [customer.id]).then(res => exportTokens(res));
}

export function deleteByDeviceAndUUID(customer: any, device_uuid: string, uid: string): Promise<any> {
    return Device.findByCustomerAndUUID(customer, device_uuid).then(device => {
        if (!device) return;
        tokenChangeNotifier.notifyObservers(customer.id);
        return db.querySingle("update token set state='DELETED' where owner_device_id=? and uuid=?", [device.id, uid]);
    });
}

export function getStatistics(customer: any): Promise<any> {
    return db.querySingle("select state, type, sum(amount) from token where owner_id=? group by state, type", [customer.id]);
}

export function verifyAndLock(customer: any, device_uuid: string, radio_code: string): Promise<any> {
    // Radio Code V.1: 36 characters token UUID + decrypted secure code in hex
    let token_uuid = radio_code.substring(0,36);
    let code = new Buffer(radio_code.substring(36), 'hex');

    // first, make sure the verifying cash device is allowed for the current user credentials
    return Device.findByCustomerAndUUID(customer, device_uuid).then(cashDevice => {
        if (!cashDevice) throw "Cash device with UUID " + device_uuid + " not found.";

        // next, look up the token to find the associated token device
        return findByUUID(token_uuid).then(token => {
            if (!token) throw "Token not found";

            // fetch the token device with its associated public key:
            return Device.findById(token.owner_device_id).then(tokenDevice => {
                // compare the encrypted token codes:
                if (token.secure_code != encryptTokenCode(tokenDevice.pubkey, code)) throw "Invalid token code.";

                // okay, verified, now try to lock the token:
                return atomicLockToken(token.id).then(success => {
                    if (!success) throw "Token not in open state.";

                    tokenChangeNotifier.notifyObservers(token.owner_id);
                    // TODO: journalize / connect for clearing
                    return exportToken(token);
                })
            })
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
    // store the plain code in the DB and can just compare
    // the encrypted code on token verification

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

function atomicLockToken(id: number): Promise<boolean> {
    return db.querySingle("update token set state='LOCKED' where id=? and state='OPEN'",[id]).then(res => res.affectedRows);
}
