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
            pubkey: device.pubkey
        };

        // insert and re-read from db
        return insertNew(newDevice).then(() => findByUUID(uid));
    });
}

export function findByUUID(uid: string): Promise<any> {
    return db.querySingle("select * from customer_device where uuid=?", [uid]).then(res => res[0]);
}

export function findByCustomer(customer: any): Promise<any> {
    return db.querySingle("select * from customer_device where customer_id=?", [customer.id]);
}

function insertNew(device: any): Promise<any> {
    return db.querySingle("insert into customer_device set ?", [device]);
}
