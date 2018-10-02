import * as db from "../util/db";
import * as Device from "./device";
import * as Journal from "./journal";
import * as Clearing from './clearing';
import * as Param from './param';
import * as crypto from 'crypto';
import * as constants from 'constants';
import * as forge from 'node-forge';
import * as uuid from "uuid/v4"; // Random-based UUID
import * as config from '../config';
import * as Utils from '../util/utils';
import * as logging from "../util/logging";
import { changeNotifier } from "../util/notifier";

export function createToken(customer: any, token: any): Promise<any> {
    return Device.findByCustomerAndUUID(customer, token.device_uuid).then(device => {
        if (!device) throw "Sorry, device with UUID " + token.device_uuid + " not found.";

        let retries = 10;
        let createdToken: any;

        return Param.readParam(customer.id, "USE_PLAIN_CODES").then(USE_PLAIN_CODES => 
               Utils.asyncWhile(() => retries > 0, () => {
            // create secure UUID
            let uid = uuid();
            delete token.device_uuid;
            delete token.id;
            delete token.lock_device_id;
            delete token.state;
            token.uuid = uid;
            token.owner_id = customer.id;
            token.owner_device_id = device.id;

            let secure_code_buf;
            if (config.USE_PLAIN_CODES || USE_PLAIN_CODES) {
                // create plain code (from a secure random int32) (will be globally unique)
                // used for low security barcodes / manual modes only (retail)
                // do not create a plain code for systems using radio or scanning to achieve higher security with secure codes only
                token.plain_code = Utils.getSecureRandomFixedLengthDecimalString(config.DEFAULT_PLAIN_CODE_LEN);
                // in plain code mode, use only integer ascii characters as secure code
                secure_code_buf = Buffer.from(Utils.getSecureRandomFixedLengthDecimalString(config.DEFAULT_SECURE_CODE_LEN));
            } else {
                // create secure code as random bytes
                secure_code_buf = crypto.randomBytes(config.DEFAULT_SECURE_CODE_LEN);
            }
            token.secure_code = encryptTokenCode(device.pubkey, secure_code_buf);

            token.info = JSON.stringify(token.info); // save info data as string
            if (token.expires) token.expires = new Date(token.expires);
            return insertNew(token).then(id => findById(id)).then(t => {
                changeNotifier.notifyObservers("token:"+customer.id, {uuid: uid});
                journalizeToken(customer.id, "token", "create", t);
                createdToken = exportToken(t);
                retries = 0;
            }).catch(err => {
                retries--;
                if (retries) logging.logger.warn(err);
                else logging.logger.error(err);
            });
        })).then(() => {
            if (createdToken) return createdToken;
            throw "Token could not be created in database";
        });
    });
}

export function getOpenForDevice(customer: any, d_uid: string): Promise<any> {
    return getFilteredExportedTokens(customer, {
        "d.uuid": d_uid,
        "t.state": 'OPEN'
    });
}

export function getByCustomer(customer: any, filters: any): Promise<any> {
    return getFilteredExportedTokens(customer, filters);
}

export function getByUUID(customer: any, uid: string): Promise<any> {
    return getFilteredExportedTokens(customer, {
        "t.uuid": uid
    }).then(res => {
        if (!res.length) return null;
        return res[0];
    });
}

function getFilteredExportedTokens(customer: any, filters: any): Promise<any> {
    let tokenSelect = "select t.*,d.uuid as device_uuid from token t join customer_device d on t.owner_device_id=d.id where t.owner_id=?";
    let supportedFilters = ['d.uuid','t.uuid','t.state','t.clearstate'];

    let queryParams = [customer.id];

    Object.keys(filters).forEach(filter => {
        let filterval = filters[filter];
        // allow filters on token without t. as convenience, prefix them with t.
        if (!filter.startsWith("d.") && !filter.startsWith("t.")) filter = "t."+filter;
        if (supportedFilters.includes(filter)) {
            // add supported filter
            tokenSelect += " and " + filter + "=?";
            queryParams.push(filterval);
        }
    });

    return db.querySingle(tokenSelect, queryParams).then(res => exportTokens(res));
}

export function deleteByDeviceAndUUID(customer: any, device_uuid: string, uid: string): Promise<any> {
    return Device.findByCustomerAndUUID(customer, device_uuid).then(device => {
        if (!device) return;
        return db.querySingle("update token set state='DELETED',plain_code=null,secure_code='' where state='OPEN' and owner_device_id=? and uuid=?", [device.id, uid]).then(res => {
            if (res.affectedRows) {
                changeNotifier.notifyObservers("token:"+customer.id, {uuid: uid});
                return findByUUID(uid).then(t => {
                    journalizeToken(customer.id, "token", "delete", t);
                    return exportToken(t);
                });
            }
        });
    });
}

export function updateByUUID(customer: any, uid: string, body: any): Promise<any> {
    if (body.info) body.info = JSON.stringify(body.info);
    return updateToken(uid, body).then(updcount => {
        if (!updcount) return null;
        return findByUUID(uid).then(t => {
            journalizeToken(customer.id, "token", "update", t);
            return exportToken(t);
        });
    });
}

export function getStatistics(customer: any): Promise<any> {
    return db.querySingle("select t.state, t.type, sum(amount) as amount, count(*) as count from token t left outer join customer_device d on t.lock_device_id=d.id where t.owner_id=? or d.customer_id=? group by t.state, t.type", [customer.id,customer.id]);
}

export function verifyAndLock(customer: any, device_uuid: string, radio_code: string): Promise<any> {
    // make sure the verifying cash device is allowed for the current user credentials
    return Device.findByCustomerAndUUID(customer, device_uuid).then(cashDevice => {
        if (!cashDevice) throw "Cash device with UUID " + device_uuid + " not found.";
        return verifyAndLockImpl(cashDevice, radio_code);
    });
}

export function verifyAndLockByTrigger(device_id: number, radio_code: string, signedData: Utils.SignedStringData): Promise<any> {
    return Device.findById(device_id).then(cashDevice => {
        return verifyAndLockImpl(cashDevice, radio_code, signedData);
    });
}

export function confirmByLockDeviceAndUUID(customer: any, device_uuid: string, uid: string, newData: any): Promise<any> {
    return Param.readParam(customer.id, "PARTIAL_CASHOUTS").then(partialCashoutsEnabled => 
           Device.findByCustomerAndUUID(customer, device_uuid).then(cashDevice => {
        if (!cashDevice) throw "Cash device with UUID " + device_uuid + " not found.";
        return findByUUID(uid).then(token => {
            if (!token) throw "Token not found";
            // make sure the updater is the same as the locker
            if (token.lock_device_id != cashDevice.id) throw "Sorry, token was locked by another device";
            
            // we only support updating of the fields state, amount and processing_info
            if (!(['COMPLETED','CANCELED','FAILED','REJECTED','RETRACTED'].includes(newData.state))) throw "Update token state: only values COMPLETED, CANCELED, FAILED, REJECTED, RETRACTED allowed.";
            if (newData.amount === undefined) newData.amount = token.amount;
            if (token.type=='CASHOUT' && newData.amount > token.amount) throw "Illegal amount increase for dispense token.";

            // open a DB transaction so the following is an atomic operation
            return db.withTransaction(dbCon =>
                // confirming the token not only updates its state (and some additional fields like amount, lockrefname etc.),
                // it also clears out the token's plain code (and secret code) to be re-used by other tokens.
                confirmLockedToken(dbCon, token.id, newData.state, newData.lockrefname, newData.amount, newData.processing_info).then(success => {
                    if (!success) throw "Token not in LOCKED state.";
                    if (partialCashoutsEnabled) {
                        // partial cashouts: if the new (actual) amount of the cashout (or payment) operation
                        // is LOWER than the pre-authorized amount of the CASHOUT token, a new token is
                        // immediately created for the remaining amount using the SAME plain and secret code
                        // (the latter allows for barcodes to stay the same over a period of multiple cashouts/payments)
                        if (newData.amount < token.amount) {
                            return createTokenPartialCashout(dbCon, token, token.amount - newData.amount);
                        }
                    }
            // end of DB transaction
            })).then(() => {
                changeNotifier.notifyObservers("token:"+token.owner_id, {uuid: uid});
                if (token.owner_id != customer.id) changeNotifier.notifyObservers("token:"+customer.id, {uuid: uid});
                // re-read and export:
                return findById(token.id).then(t => {
                    journalizeToken(token.owner_id, "token", "confirm", t);
                    if (token.owner_id != customer.id) journalizeToken(customer.id, "token", "confirm", t);
                    // add to clearing and export
                    return clearToken(t, customer.id).then(() => exportToken(t));
                });
            });
        });        
    }));
}

function createTokenPartialCashout(dbCon: any, origToken: any, amount: number) {
    let token = JSON.parse(JSON.stringify(origToken));
    delete token.id;
    delete token.state;
    delete token.lock_device_id;
    delete token.lockrefname;
    delete token.created;
    delete token.updated;
    token.uuid = uuid();
    token.amount = amount;
    token.info = JSON.stringify({
        partial_from_uuid: origToken.uuid
    });
    return insertNew(token, dbCon).then(id => findById(id, dbCon)).then(t => {
        changeNotifier.notifyObservers("token:"+token.owner_id, {uuid: token.uuid});
        journalizeToken(token.owner_id, "token", "create", t);
    });
}

function clearToken(token: any, cash_customer_id: number): Promise<void> {
    if (token.state === 'COMPLETED')  {
        if (token.type === 'CASHOUT') {
            return Clearing.addClearing(token, token.owner_id, cash_customer_id);
        } else if (token.type === 'CASHIN') {
            return Clearing.addClearing(token, cash_customer_id, token.owner_id);
        }
    }
    return Promise.resolve();
}

function cleanUpExpired(): Promise<void> {
    return db.querySingle("update token set state='EXPIRED',plain_code=null,secure_code='' where state='OPEN' and expires<NOW()");
}

function verifyAndLockImpl(cashDevice: any, radio_code: string, signedData: Utils.SignedStringData = null): Promise<any> {

    let codetype: string;
    let token_id: string;
    let code: Buffer;

    if (!radio_code || !radio_code.length) throw "Illegal radio code";

    if (radio_code.length > 36) {
        // Radio Code Banking QR: 36 characters token UUID + decrypted secure code in hex
        codetype = "long";
        token_id = radio_code.substring(0,36);
        code = Buffer.from(radio_code.substring(36), 'hex');
    } else {
        // Radio Code Retail EAN-13: short decimal plain code
        codetype = "short";
        token_id = radio_code.substring(0,config.DEFAULT_PLAIN_CODE_LEN);
        code = Buffer.from(radio_code.substring(config.DEFAULT_PLAIN_CODE_LEN));
    }

    // look up the token to find the associated token device
    return cleanUpExpired().then(() => (codetype === "long" ? findByUUID(token_id) : findByPlainCode(token_id)).then(token => {
        if (!token) throw "Token not found: " + token_id;

        // fetch the token device with its associated public key:
        return Device.findById(token.owner_device_id).then(tokenDevice => {

            // we use the signedData as an additional layer of security if the
            // token device itself is the one that is verifying the token through
            // the Mobile API using a trigger code.
            if (signedData) {
                if (!signedData.verify(tokenDevice.pubkey)) {
                    // REJECT token, allow no retries
                    let reject_reason = "Invalid signature";
                    return atomicLockAndReturn(cashDevice, token, "reject", "REJECTED", reject_reason).then(t => {
                        throw reject_reason;
                    });
                }
            }

            // check the secure code
            if (token.secure_code != encryptTokenCode(tokenDevice.pubkey, code)) {
                // REJECT token, allow no retries
                let reject_reason = "Invalid token code";
                return atomicLockAndReturn(cashDevice, token, "reject", "REJECTED", reject_reason).then(t => {
                    throw reject_reason;
                });
            }

            // now check for cross-customer access
            if (!config.ALLOW_INTER_CUSTOMER_CLEARING && token.owner_id != cashDevice.customer_id) {
                // The cash device and the token device belong to different
                // customers ("Fremdkundenaus/einzahlung")
                // Apply sophisticated rules here in the future allowing
                // for cross-customer-clearing.
                // For now, segregate all customers
                let reject_reason = "Foreign token rejected";
                return atomicLockAndReturn(cashDevice, token, "reject", "REJECTED", reject_reason).then(t => {
                    throw reject_reason;
                });
            }

            // okay, verified, now try to lock the token:
            return atomicLockAndReturn(cashDevice, token, "lock", "LOCKED");
        })
    }));
}

function atomicLockAndReturn(cashDevice: any, token: any, action: string, state: string, reject_reason?: any): Promise<any> {
    return atomicLockTokenDB(token.id, cashDevice.id, state).then(success => {
        if (!success) throw "Token not in OPEN state.";
        changeNotifier.notifyObservers("token:"+token.owner_id, {uuid: token.uuid});
        if (token.owner_id != cashDevice.customer_id) changeNotifier.notifyObservers("token:"+cashDevice.customer_id, {uuid: token.uuid});
        // re-read and export:
        return findById(token.id).then(t => {
            if (reject_reason) t.processing_info = JSON.stringify({ reject_reason: reject_reason });
            journalizeToken(token.owner_id, "token", action, t);
            if (token.owner_id != cashDevice.customer_id) journalizeToken(cashDevice.customer_id, "token", action, t);
            delete t.plain_code;
            delete t.secure_code;
            return exportToken(t);
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
    token.processing_info = JSON.parse(token.processing_info);
    return token;
}

function insertNew(token: any, dbCon?: any): Promise<number> {
    let result;
    let stmt = "insert into token set ?";
    let params = [token];
    if (dbCon)
        result = db.query(dbCon, stmt, params);
    else 
        result = db.querySingle(stmt, params);
    return result.then(res => res.insertId);
}

function findById(id: number, dbCon?: any): Promise<any> {
    let result;
    let stmt = "select * from token where id=?";
    let params = [id];
    if (dbCon)
        result = db.query(dbCon, stmt, params);
    else 
        result = db.querySingle(stmt, params);
    return result.then(res => res[0]);
}

function findByUUID(uid: string): Promise<any> {
    return db.querySingle("select * from token where uuid=?", [uid]).then(res => res[0]);
}

function findByPlainCode(plainCode: string): Promise<any> {
    return db.querySingle("select * from token where plain_code=?", [plainCode]).then(res => res[0]);
}

function atomicLockTokenDB(id: number, cashDeviceId: number, state: string): Promise<boolean> {
    let stmt = "update token set state=?,lock_device_id=?,updated=?";
    if (state !== 'LOCKED') {
        // Note: if going to LOCKED state, keep the plain and secure code until confirmed
        // (allows for re-using for partial cashouts / payments)
        stmt += ",plain_code=null,secure_code=''";
    }
    stmt += " where id=? and state='OPEN'";
    return db.querySingle(stmt, [state,cashDeviceId,new Date(),id]).then(res => res.affectedRows);
}

function confirmLockedToken(dbCon: any, id: number, newState: string, lockrefname: string, newAmount: number, processingInfo: any): Promise<boolean> {
    let stmt = "update token set state=?,lockrefname=?,amount=?,processing_info=?,plain_code=null,secure_code='',updated=? where id=? and state='LOCKED'";
    return db.query(dbCon, stmt, [newState,lockrefname,newAmount,JSON.stringify(processingInfo),new Date(),id]).then(res => res.affectedRows);
}

function updateToken(uid: string, newFields: any): Promise<boolean> {
    let allowedFields = ['clearstate','info'];
    let params = [];
    let query = "update token set ";
    Object.keys(newFields).forEach(f => {
        if (allowedFields.includes(f)) {
            if (params.length) query += ", ";
            query += f + "=?";
            params.push(newFields[f]);
        }
    })
    query += " where uuid=?";
    params.push(uid);
    return db.querySingle(query, params).then(res => res.affectedRows);
}

function journalizeToken(customer_id: number, entity: string, action: string, token: any) {
    let jtoken = JSON.parse(JSON.stringify(token));
    delete jtoken.plain_code;
    delete jtoken.secure_code;
    jtoken.info = JSON.parse(jtoken.info);
    jtoken.processing_info = JSON.parse(jtoken.processing_info);
    Journal.journalize(customer_id, entity, action, jtoken);
}
