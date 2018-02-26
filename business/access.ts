import * as db from "../util/db";
import * as crypto from "crypto";
import * as Login from "./login";
import * as config from '../config';

export function createApiKey(customer: any, scope: string): Promise<any> {
    if (!config.API_SCOPES.includes(scope)) throw "Unknown scope: " + scope;

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

export function findByKey(key: string): Promise<any> {
    return db.querySingle("select * from customer_access where apikey=?", [key]).then(res => {
        if (res[0]) delete res[0].apisecret; // do not return secret
        return res[0];
    });
}

export function findByKeyAndSecret(key: string, secret: string): Promise<any> {
    return db.querySingle("select * from customer_access where apikey=? and apisecret=?", [key, secret]).then(res => res[0]);
}

export function findByCustomerAndScope(customer: any, scope: string): Promise<any> {
    return db.querySingle("select * from customer_access where customer_id=? and scope=?", [customer.id, scope])
             .then(res => {
                 res.forEach(i => delete i.apisecret); // never return secret
                 return res;
             }); 
}

export function findByCustomerAndId(customer: any, password: string, id: number): Promise<any> {
    return Login.login(customer.email, password).then(res => {
        if (res.token) // authentication successful?
            // Note: this makes sure the ID belongs to the customer ID
            return db.querySingle("select * from customer_access where customer_id=? and id=?", [customer.id, id]).then(res => res[0]); 
        else
            throw "Sorry, wrong password";
    })
}

export function deleteByCustomerAndId(customer: any, id: number): Promise<any> {
    return db.querySingle("delete from customer_access where customer_id=? and id=?", [customer.id, id]);
}

function insertNew(access: any): Promise<any> {
    return db.querySingle("insert into customer_access set ?", [access]);
}
