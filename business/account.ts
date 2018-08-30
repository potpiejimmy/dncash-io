import * as db from "../util/db";

export function create(customer: any, account: any): Promise<any> {
    account.customer_id = customer.id;
    // insert and re-read from db
    return insertNew(account);
}

export function findById(id: number): Promise<any> {
    return db.querySingle("select * from customer_account where id=?", [id]).then(res => res[0]);
}

export function findByCustomer(customer: any, query: any = {}): Promise<any> {
    let stmt = "select * from customer_account where customer_id=?";
    let params = [customer.id];
    if (query.default) {
        stmt += " and 'default'=?";
        params.push(parseInt(query.default));
    }
    return db.querySingle(stmt, params);
}

export function deleteAccount(customer: any, id: number): Promise<any> {
    return db.querySingle("delete from customer_account where customer_id=? and id=?", [customer.id, id]);
}

export function updateAccount(customer: any, id: number, account: any): Promise<any> {
    if (account.id != id) throw "Cannot update account. ID mismatch!";

    let result = Promise.resolve();
    if (account.default === 1) {
        result = result.then(() => db.querySingle("update customer_account ca set ca.default=0 where ca.customer_id=?", [customer.id]));
    }
    return result.then(() => db.querySingle("update customer_account set ? where customer_id=? and id =?", [account, customer.id, account.id]));
}

function insertNew(account: any): Promise<any> {
    return db.querySingle("insert into customer_account set ?", [account]);
}
