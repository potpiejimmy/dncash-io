import * as db from "../util/db";
import * as Device from "./device";

export function createToken(customer: any, token: any): Promise<any> {
    return Device.findByCustomerAndUUID(customer, token.device_uuid).then(device => {
        if (!device) throw "Sorry, device with UUID " + token.device_uuid + " not found.";
        delete token.device_uuid;
        token.owner = customer.id;
        token.owner_device_id = device.id;
        return insertNew(token).then(id => findById(id));
    });
}

function insertNew(token: any): Promise<number> {
    return db.connection().then(con =>
           db.query(con, "insert into token set ?", [token]).then(() =>
           db.query(con, "select LAST_INSERT_ID()").then(res => {
               con.release();
               return res[0];
           })
    ));
}

function findById(id: number): Promise<any> {
    return db.querySingle("select * from token where id=?", [id]).then(res => res[0]);
}
