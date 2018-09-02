import * as db from "../util/db";

export function create(customer: any, account: any): Promise<any> {
    account.customer_id = customer.id;

    //make sure we have a default account!
    return checkIfDefaultAccountExists(customer).then(defaultExists => {
        if(!defaultExists)
            account.default = 1;

        return insertNew(account);
    });
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
    return result.then(() => checkDefaultAccount(customer));
}

export function updateAccount(customer: any, id: number, account: any): Promise<any> {
    if (account.id != id) throw "Cannot update account. ID mismatch!";


    let result = Promise.resolve();
    if (account.default === 1) {
        result = result.then(() => db.querySingle("update customer_account ca set ca.default=0 where ca.customer_id=?", [customer.id]));
    }
    result = result.then(() => db.querySingle("update customer_account set ? where customer_id=? and id =?", [account, customer.id, account.id]));

    //check if we still have a default account!
    return result.then(() => checkDefaultAccount(customer));
}

function insertNew(account: any): Promise<any> {
    return db.querySingle("insert into customer_account set ?", [account]);
}

function checkDefaultAccount(customer: any) {
    //check if we still have a default account!
    return checkIfDefaultAccountExists(customer).then(defaultExists => {
        if(defaultExists)
            return Promise.resolve();
        else
            return setAnotherAccountAsDefault(customer); //seems like the default account got somehow deleted -> set another account as default!
    });
}

function checkIfDefaultAccountExists(customer: any): Promise<boolean> {
    //check for default account!
    return findByCustomer(customer, {default:"1"}).then(defaultAccount => (defaultAccount && defaultAccount.length==1)) //return true if default account exists
}

function setAnotherAccountAsDefault(customer: any): Promise<any> {
    return findByCustomer(customer).then(accountsArray => {
        if(accountsArray && accountsArray.length > 0) {
            let account = accountsArray[0];
            account.default = 1;
            return updateAccount(customer, account.id, account);
        } else {
            return Promise.resolve();
        }
    });
}
