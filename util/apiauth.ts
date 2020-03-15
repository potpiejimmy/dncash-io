import * as db from "../util/db";
import { Request, Response, NextFunction } from "express";
import * as Access from '../business/access';
import * as Login from '../business/login';

export function verifyApiKey(request: Request, response: Response, next: NextFunction) {
    if (request.method == 'OPTIONS') return next();
    Access.findByKey(request.headers['dn-api-key']).then(access => {
        request.access = access;
        next();
    });
}

export function verifyAccess(request: Request, response: Response, next: NextFunction) {
    if (request.method == 'OPTIONS') return next();
    Access.findByKeyAndSecret(request.headers['dn-api-key'], request.headers['dn-api-secret']).then(access => {
        request.access = access;
        next();
    });
}

export function verifyTokenApi(request: Request, response: Response, next: NextFunction) {
    return verifyApi(request, response, next, 'token-api');
}

export function verifyCashApi(request: Request, response: Response, next: NextFunction) {
    return verifyApi(request, response, next, 'cash-api');
}

export function verifyClearingApi(request: Request, response: Response, next: NextFunction) {
    return verifyApi(request, response, next, 'clearing-api');
}

export function verifyAuthApi(request: Request, response: Response, next: NextFunction) {
    return verifyApi(request, response, next, 'auth-api');
}

export function verifyCustomer(request: Request, response: Response, next: NextFunction) {
    if (request.method == 'OPTIONS') return next();
    Login.findUserById(request.access.customer_id).then(user => {
        request.user = user;
        next();
    });
}

function verifyApi(request: Request, response: Response, next: NextFunction, scope: string) {
    if (request.method == 'OPTIONS') return next();
    if (!request.access || request.access.scope != scope) {
        response.status(401).json({error:"Invalid API access key or secret"});
        return null;
    } else {
        return next();
    }
}
