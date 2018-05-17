import * as db from "../util/db";
import * as Param from "./param";
import * as Login from "./login";

export function addClearing(token_id: number, debitor_id: number, creditor_id: number): Promise<any> {
    return Param.readParam(debitor_id, "clearing-account").then(debitor_account =>
           Param.readParam(creditor_id, "clearing-account").then(creditor_account =>
           db.querySingle("insert into clearing set ?", [{
                token_id: token_id,
                debitor_id: debitor_id,
                creditor_id: creditor_id,
                debitor_account: JSON.stringify(debitor_account),
                creditor_account: JSON.stringify(creditor_account)
           }])));
}

export function getClearingData(user: any, filters: any): Promise<any> {
    let customer_id = user.roles.includes('admin') ? filters.customer_id : user.id;

    let stmt: string =
        "select c.created as date,t.uuid,t.type,td.refname as tokendevice,t.refname,cd.refname as lockdevice,t.lockrefname,amount,symbol,debitor_account as debitor, creditor_account as creditor "+
        "from clearing c join token t on c.token_id=t.id join customer_device td on t.owner_device_id=td.id join customer_device cd on t.lock_device_id=cd.id "+
        "where (debitor_id=? or creditor_id=?)";

    let params: any = [customer_id, customer_id];

    if (filters.from) {
        stmt += " and c.created>=?";
        params.push(new Date(filters.from));
    }
    if (filters.to) {
        stmt += " and c.created<?";
        params.push(new Date(filters.to));
    }
    if (filters.type) {
        stmt += " and t.type=?";
        params.push(filters.type);
    }
    return db.querySingle(stmt, params).then(res => {
            res.forEach(c => {
                c.debitor = JSON.parse(c.debitor);
                c.creditor = JSON.parse(c.creditor);
            });
            return res;
        });
}

export function getCustomerData(user: any): Promise<any> {
    let isAdmin = user.roles.includes('admin');
    let res = isAdmin ? Login.getAllUsers(user) : Promise.resolve([user]);
    return res.then(us => {
        if (!isAdmin) us.forEach(u => {
            delete u.id;
            delete u.created;
            delete u.status
        });
        return us;
    });
}
