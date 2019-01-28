import * as db from "../util/db";

export function journalize(customer_id: number, entity: string, action: string, data: any): void {
    db.querySingle("insert into journal set ?", [{
        customer_id: customer_id,
        entity: entity,
        action: action,
        data: JSON.stringify(data)
    }]);
}

export function getJournal(customer: any, limit: string, from: string, to: string, filter: string): Promise<any> {
    let params: Array<any> = [];
    let sql = "select * from journal where customer_id";
    if (customer.roles.includes('admin')) {
        sql += ">0"; // return data for all customers if admin
    } else {
        sql += "=?";
        params.push(customer.id);
    }

    if (from) {
        params.push(new Date(parseInt(from)));
        sql += " and created>=?";
    }
    if (to) {
        params.push(new Date(parseInt(to)));
        sql += " and created<?";
    }
    if (filter) {
        params.push('%'+filter+'%');
        params.push('%'+filter+'%');
        sql += " and (action like ? or data like ?)";
    }
    sql += " order by created desc";
    if (limit) {
        params.push(parseInt(limit));
        sql += " limit ?";
    }
    return db.querySingle(sql, params).then(res => {
        res.forEach(j => j.data = JSON.parse(j.data));
        return res;
    });
}

export function getAdminJournal(customer: any): Promise<any> {
    if (!customer.roles.includes('admin')) throw "Illegal access: Not allowed.";
    return db.querySingle("select j.created,email,entity,action from customer c join journal j on j.customer_id=c.id order by j.created desc");
}
