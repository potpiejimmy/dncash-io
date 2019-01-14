import * as db from "../util/db";
import * as uuid from "uuid/v4"; // Random-based UUID

export function register(customer: any, device: any): Promise<any> {
    // create secure UUID
    let uid = uuid();

    // check if unique key:
    return findByUUID(uid).then(res => {
        if (res) return register(customer, device); // already exists (what are the chances?), try again

        let newDevice = {
            customer_id: customer.id,
            uuid: uid,
            pubkey: device.pubkey,
            type: device.type,
            lat: device.lat,
            lon: device.lon,
            refname: device.refname,
            info: JSON.stringify(device.info)
        };

        // insert and re-read from db
        return insertNew(newDevice).then(() => findByUUID(uid));
    });
}

export function findById(id: number): Promise<any> {
    return db.querySingle("select * from customer_device where id=?", [id]).then(res => res[0]);
}

export function findByUUID(uid: string): Promise<any> {
    return db.querySingle("select * from customer_device where uuid=?", [uid]).then(res => res[0]);
}

export function findByCustomer(customer: any): Promise<any> {
    return db.querySingle("select * from customer_device where customer_id=?", [customer.id]);
}

export function findByCustomerAndUUID(customer: any, uid: string): Promise<any> {
    return db.querySingle("select * from customer_device where customer_id=? and uuid=?", [customer.id, uid]).then(res => res[0]);
}

export function deleteByCustomerAndId(customer: any, id: number): Promise<any> {
    return db.querySingle("delete from customer_device where customer_id=? and id=?", [customer.id, id]);
}

export function getAdminDeviceStatistics(customer: any): Promise<any> {
    if (!customer.roles.includes('admin')) throw "Illegal access: Not allowed.";
    return db.querySingle("select c.email,d.type,d.refname from customer c join customer_device d on d.customer_id=c.id");
}

export function updateDeviceByCustomerAndId(customer: any, id: number, newFields: any): Promise<boolean> {
    // only update of type and refname fields allowed
    let allowedFields = ['type','refname'];
    let params = [];
    let query = "update customer_device set ";
    Object.keys(newFields).forEach(f => {
        if (allowedFields.includes(f)) {
            if (params.length) query += ", ";
            query += f + "=?";
            params.push(newFields[f]);
        }
    })
    query += " where customer_id=? and id=?";
    params.push(customer.id);
    params.push(id);
    return db.querySingle(query, params).then(res => res.affectedRows);
}

function insertNew(device: any): Promise<any> {
    return db.querySingle("insert into customer_device set ?", [device]);
}
