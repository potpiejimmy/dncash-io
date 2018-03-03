import * as db from "../util/db";
import { Request, Response, NextFunction } from "express";
import * as Access from '../business/access';
import * as Login from '../business/login';

export function verifyAccess(request: Request, response: Response, next: NextFunction) {
    if (request.method == 'OPTIONS') return next();
    Access.findByKeyAndSecret(request.headers['dn-api-key'], request.headers['dn-api-secret']).then(access => {
        request.access = access;
        next();
    });
}

export function verifyTokenApi(request: Request, response: Response, next: NextFunction) {
    if (request.method == 'OPTIONS') return next();
    if (!request.access || request.access.scope != 'token-api') {
        response.status(401).json({error:"Invalid API access key or secret"});
    } else {
        return next();
    }
}

export function verifyCustomer(request: Request, response: Response, next: NextFunction) {
    if (request.method == 'OPTIONS') return next();
    Login.findUserById(request.access.customer_id).then(user => {
        request.user = user;
        next();
    });
}
