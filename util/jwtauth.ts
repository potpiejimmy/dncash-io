
import * as jwt from "jsonwebtoken";
import * as expressjwt from "express-jwt";
import * as config from '../config';

export function createToken(data:any):any {
    // WARNING: signData must be an object literal for exp to be set, clone it:
    let signData = JSON.parse(JSON.stringify(data));
    let result = jwt.sign(signData, config.JWT_SECRET, {
            expiresIn: 60 * 60 * 12 // 12 hours
    });
    return result;
}

export function verifyToken() {
    return expressjwt({secret: config.JWT_SECRET});
}
