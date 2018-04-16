import * as db from "../util/db";
import * as Param from "./param";

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

export function getClearingData(customer_id: number): Promise<any> {
    return db.querySingle(
        "select c.created as date,t.uuid,t.type,t.refname,td.refname as tokendevice,cd.refname as cashdevice,amount,symbol,debitor_account as debitor, creditor_account as creditor "+
        "from clearing c join token t on c.token_id=t.id join customer_device td on t.owner_device_id=td.id join customer_device cd on t.lock_device_id=cd.id "+
        "where debitor_id=? or creditor_id=?", [
                customer_id, customer_id
        ]).then(res => {
            res.forEach(c => {
                c.debitor = JSON.parse(c.debitor);
                c.creditor = JSON.parse(c.creditor);
            });
            return res;
        });
}
