import * as db from "../util/db";
import * as crypto from "crypto";

export function createApiKey(customer: any, scope: string): Promise<any> {
    if (scope != "token-api") throw "Unknown scope: " + scope;

    // create secure random numbers:
    let key = crypto.randomBytes(48).toString('base64');
    let secret = crypto.randomBytes(48).toString('base64');

    // check if unique key:
    return findByKey(key).then(res => {
        if (res) return createApiKey(customer, scope); // already exists (what are the chances?), try again

        let newAccess = {
            customer_id: customer.id,
            scope: scope,
            apikey: key,
            apisecret: secret
        };

        // insert and re-read from db
        return insertNew(newAccess).then(() => findByKey(key));
    });
}

export function getApiKeys(customer: any): Promise<any> {
    return findByCustomerId(customer.id);
}

export function findByKey(key: string): Promise<any> {
    return db.querySingle("select * from customer_access where apikey=?", [key]).then(res => res[0]);
}

export function findByCustomerId(customer_id: number): Promise<any> {
    return db.querySingle("select * from customer_access where customer_id=?", [customer_id])
             .then(res => {
                 res.forEach(i => delete i.apisecret); // never return secret
                 return res;
             }); 
}

export function deleteByCustomerId(customer_id: number): Promise<any> {
    return db.querySingle("delete from customer_access where customer_id=?", [customer_id]);
}

function insertNew(access: any): Promise<any> {
    return db.querySingle("insert into customer_access set ?", [access]);
}
