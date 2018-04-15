import * as db from "../util/db";

export function readParam(customer_id: number, pkey: string): Promise<any> {
    return selectParam(customer_id, pkey).then(param => {
        if (!param || !param.pvalue) return null;
        return JSON.parse(param.pvalue);
    })
}

export function writeParam(customer_id: number, pkey: string, pvalue: any): Promise<any> {
    return selectParam(customer_id, pkey).then(param => {
        if (!param) return insertParam(customer_id, pkey, pvalue);
        else updateParam(customer_id, pkey, pvalue);
    })
}

function selectParam(customer_id: number, pkey: string): Promise<any> {
    return db.querySingle("select * from customer_param where customer_id=? and pkey=?", [customer_id, pkey]).then(res => res[0]);
}

function insertParam(customer_id: number, pkey: string, pvalue: any): Promise<any> {
    return db.querySingle("insert into customer_param set ?", [{
        customer_id: customer_id,
        pkey: pkey,
        pvalue: JSON.stringify(pvalue)
    }]);
}

function updateParam(customer_id: number, pkey: string, pvalue: any): Promise<any> {
    return db.querySingle("update customer_param set pvalue=?,updated=? where customer_id=? and pkey=?", [
        JSON.stringify(pvalue),
        new Date(),
        customer_id,
        pkey
    ]);
}
