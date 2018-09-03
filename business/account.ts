import * as db from "../util/db";

export function create(customer: any, account: any): Promise<any> {
    account.customer_id = customer.id;
    
    return insertNew(account).then(() => assertDefaultAccount(customer));
}

export function findById(id: number): Promise<any> {
    return db.querySingle("select * from customer_account where id=?", [id]).then(res => res[0]);
}

export function findByCustomer(customer: any, query: any = {}): Promise<any> {
    return findByCustomerId(customer.id, query);
}

export function findByCustomerId(customer_id: number, query: any = {}): Promise<any> {
    let stmt = "select * from customer_account ca where ca.customer_id=?";
    let params = [customer_id];
    if (query.default) {
        stmt += " and ca.default=?";
        params.push(parseInt(query.default));
    }

    return db.querySingle(stmt, params);
}

export function deleteAccount(customer: any, id: number): Promise<any> {
    let result = Promise.resolve();

    result = result.then(() => db.querySingle("delete from customer_account where customer_id=? and id=?", [customer.id, id]));

    //check if we still have a default account!
    return result.then(() => assertDefaultAccount(customer));
}

export function updateAccount(customer: any, id: number, account: any): Promise<any> {
    if (account.id != id) throw "Cannot update account. ID mismatch!";

    let result = Promise.resolve();
    if (account.default === 1) {
        result = result.then(() => db.querySingle("update customer_account ca set ca.default=0 where ca.customer_id=?", [customer.id]));
    }
    result = result.then(() => db.querySingle("update customer_account set ? where customer_id=? and id =?", [account, customer.id, account.id]));

    //check if we still have a default account!
    return result.then(() => assertDefaultAccount(customer));
}

function insertNew(account: any): Promise<any> {
    return db.querySingle("insert into customer_account set ?", [account]);
}

function assertDefaultAccount(customer: any): Promise<any> {
    //check for default account!
    return findByCustomer(customer, {default:"1"}).then(defaultAccount => {
        if((!defaultAccount || defaultAccount.length == 0) || (defaultAccount && defaultAccount.length > 1)) {
            //something is wrong here! we have no, or more than one default account. unset all default accounts and set new one
            return db.querySingle("update customer_account ca set ca.default=0 where ca.customer_id=?", [customer.id]).then(() => {
                return findByCustomer(customer).then(accounts => {
                    if(accounts && accounts.length > 0) {
                        let newDefaultAccount = accounts[0];
                        newDefaultAccount.default = 1;
                        return updateAccount(customer, newDefaultAccount.id, newDefaultAccount);
                    }
                });
            });
        }
    });
}
