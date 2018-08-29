import * as db from "../util/db";
import * as uuid from "uuid/v4"; // Random-based UUID

export function create(customer: any, account: any): Promise<any> {

    // check if unique key:
    let newAccount = {
        customer_id: customer.id,
        label: account.pubkey,
        value: account.value,
        type: account.type,
        subtype: account.subype,
        default: account.refname
    };

    // insert and re-read from db
    return insertNew(newAccount);
}

export function findById(id: number): Promise<any> {
    return db.querySingle("select * from customer_account where id=?", [id]).then(res => res[0]);
}

export function findByCustomer(customer: any): Promise<any> {
    return db.querySingle("select * from customer_account where customer_id=?", [customer.id]);
}

export function deleteByCustomerAndId(customer: any, id: number): Promise<any> {
    return db.querySingle("delete from customer_account where customer_id=? and id=?", [customer.id, id]);
}

export function findDefaultAccountByCustomerId(customer: any): Promise<any> {
    return db.querySingle("select * from customer_account where customer_id=? and default=?", [customer.id,1]);
}

export function updateDefaultAccountByCustomerId(customer: any, id: number): Promise<any> {
    return db.querySingle("update customer_account set default = 0 where customer_id=? and id !=?", [customer.id, id]).then(() =>
           db.querySingle("update customer_account set default = 1 where customer_id=? and id =?", [customer.id, id]));
}

function insertNew(device: any): Promise<any> {
    return db.querySingle("insert into customer_account set ?", [device]);
}
