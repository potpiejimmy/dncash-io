import * as db from "../util/db";
import * as Device from "./device";
import * as crypto from 'crypto';
import * as uuid from "uuid/v4"; // Random-based UUID
import * as config from '../config';

export function createToken(customer: any, token: any): Promise<any> {
    return Device.findByCustomerAndUUID(customer, token.device_uuid).then(device => {
        if (!device) throw "Sorry, device with UUID " + token.device_uuid + " not found.";

        // create secure UUID
        let uid = uuid();
        // check if unique
        return findByUUID(uid).then(found => {
            if (found) return createToken(customer, token); // try again

            delete token.device_uuid;
            token.uuid = uid;
            token.owner_id = customer.id;
            token.owner_device_id = device.id;
            let code = crypto.randomBytes(config.DEFAULT_CODE_LEN);
            token.secure_code = crypto.publicEncrypt(device.pubkey, code).toString('base64');

            return insertNew(token).then(id => findById(id));
        });
    });
}

export function findByDeviceUUID(customer: any, uid: string): Promise<any> {
    return Device.findByCustomerAndUUID(customer, uid).then(device => {
        if (!device) return [];
        return db.querySingle("select * from token where owner_device_id=?", [device.id]);
    });
}

export function findByCustomer(customer: any): Promise<any> {
    return db.querySingle("select * from token where owner_id=?", [customer.id]);
}

export function deleteByDeviceAndUUID(customer: any, device_uuid: string, uid: string): Promise<any> {
    return Device.findByCustomerAndUUID(customer, device_uuid).then(device => {
        if (!device) return;
        return db.querySingle("delete from token where owner_device_id=? and uuid=?", [device.id, uid]);
    });
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
