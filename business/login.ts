import * as fetch from "node-fetch";
import * as crypto from "crypto";
import * as FormData from 'form-data';
import * as speakeasy from 'speakeasy';
import * as pwgen from 'generate-password';
import * as db from "../util/db";
import * as Param from "./param";
import * as jwtauth from "../util/jwtauth";

class BadLogin {
    count: number;
    lastUsed: number;
}
let badLogins = new Map<string,BadLogin>();

/**
 * Registers a new user from the registration form using the chosen password.
 * @param user new user properties
 */
export function register(user: any): Promise<any> {
    return findUserByEmail(user.email).then(found => {
        if (found) return {"result": "Sorry, this email is already registered."};
        // insert new user
        if (!user.password || user.password.length < 8) return {"result": "Sorry, bad password"};
        //add here google api call -> use node-fetch for post request
        return verifyCaptcha(user.captcha).then(found => {
            if(found && found.success) {
                user.password = crypto.createHash('sha256').update(user.password).digest("hex");
                delete user.captcha;
                delete user.roles;
                user.status = 1; // 1 = OK
                return insertUser(user).then(() => readAndAuthenticate(user.email));
            } else {
                return {"result": "Sorry, I don`t think you are a real person! Please try again."}
            }
        })
    });
}

/**
 * Creates a new customer account for another entity or person. This is only
 * allowed for currently authenticated admin users. Returns a generated random password.
 * The new user will have to change the password upon first sign-in.
 * @param user currently authenticated admin user
 * @param email new email to register
 */
export function registerOther(user: any, email: string): Promise<any> {
    if (!user.roles.includes('admin')) throw "Illegal access: Not allowed.";
    return findUserByEmail(email).then(found => {
        if (found) throw "Sorry, this email is already in use.";
        let pw = pwgen.generate({length: 16, numbers: true, symbols: true});
        let newuser = {
            email: email,
            password: crypto.createHash('sha256').update(pw).digest("hex")
            // status defaults to 0 = password change required
        };
        // return the initial random password
        return insertUser(newuser).then(() => { return {email: email, initialpassword: pw} });
    });
}

/**
 * Changes the password for the currently authenticated user.
 */
export function changePassword(user: any, oldPassword: string, newPassword: string): Promise<any> {
    return findUserByEmail(user.email).then(dbuser => {
        if (dbuser && crypto.createHash('sha256').update(oldPassword || '').digest("hex") == dbuser.password) {
            if (!newPassword || newPassword.length < 8) throw "Sorry, bad new password";
            if (oldPassword == newPassword) throw "Sorry, the new password cannot be the same as the old password.";
            dbuser.password = crypto.createHash('sha256').update(newPassword).digest("hex");
            return updatePassword(dbuser).then(() => readAndAuthenticate(dbuser.email));
        } else {
            throw "Sorry, the password is incorrect.";
        }
    });        
}

export function login(email: string, password: string, twofatoken: string, skip2fa: boolean = false): Promise<any> {
    return findUserByEmail(email).then(user => {
        if (user && crypto.createHash('sha256').update(password || '').digest("hex") == user.password) {
            delete badLogins[email];
            if (user.twofasecret && !skip2fa) {
                // if 2FA is enabled, check the token:
                if (!twofatoken) return {"twofa": "Need 2FA token."};
                try {
                    verify2FAToken(user.twofasecret, twofatoken);
                } catch (err) {
                    return {"result": "Sorry, the token was incorrect."};
                }
            }
            return authenticate(user);
        } else {
            return handleBadLogins(email);
        }
    });        
}

export function getAllUsers(user: any): Promise<any> {
    if (!user.roles.includes('admin')) throw "Illegal access: Not allowed.";
    return db.querySingle("select * from customer").then(res => {
        res.forEach(c => {
            delete c.password;
            delete c.twofasecret;
        });
        return res;
    });
}

export function deleteUser(user: any, email: string): Promise<any> {
    if (!user.roles.includes('admin')) throw "Illegal access: Not allowed.";
    return db.querySingle("delete from customer where email=?",[email]);
}

function handleBadLogins(email: string): Promise<any> {
    Object.keys(badLogins).forEach(k => {
        if (Date.now() - badLogins[k].lastUsed > 24*60*60*1000) delete badLogins[k];
    });
    let badLogin: BadLogin = badLogins[email];
    if (!badLogin) {
        badLogin = {count: 0, lastUsed: 0};
        badLogins[email] = badLogin;
    };
    badLogin.count++;
    badLogin.lastUsed = Date.now();
    return new Promise<any>(resolve => setTimeout(() => 
        resolve({"result": "Sorry, wrong user or password."}),
        (Math.pow(2,badLogin.count-1)-1) * 1000)
    );
}

function findUserByEmail(email: string): Promise<any> {
    return db.querySingle("select * from customer where email=?",[email]).then(res => res[0]);
}

export function findUserById(id: number): Promise<any> {
    return db.querySingle("select * from customer where id=?",[id]).then(res => res[0]);
}

function insertUser(user: any): Promise<any> {
    return db.querySingle("insert into customer set ?", [user]);
}

function updatePassword(user: any): Promise<any> {
    return db.querySingle("update customer set status=1, password=? where email=?", [user.password, user.email]);
}

function readAndAuthenticate(email: string): Promise<any> {
    return findUserByEmail(email).then(user => authenticate(user));
}

function authenticate(user): any {
    user.roles = user.roles.split(','); // roles as array
    delete user.password;
    if (user.twofasecret) {
        // add a role "twofa" if 2FA-enabled
        user.roles.push("twofa");
        delete user.twofasecret;
    }
    let token = jwtauth.createToken(user);
    return {token:token};
}

function verifyCaptcha(captcha : string) : Promise<any> {
    if (process.env.NODE_ENV === 'test') {
        return Promise.resolve({success:true});
    }
    let form = new FormData();
    form.append('secret', process.env.CAPTCHA_SECRET || '6Lc7zEcUAAAAALq3kHl5F4WPe_Jiqc3vT0vq3m0F');
    form.append('response', captcha);
    return fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: form })
        .then(res => {
            return res.json();
        }).catch(function(err) {
            console.log(err);
        });
};

// --- two-factor authentication ---

/**
 * Creates temporary 2FA secret, stores it temporarily to params
 * and returns the OTP auth URL and secret.
 */
export function initialize2FA(user: any): Promise<any> {
    let secret = speakeasy.generateSecret({length: 20});
    return Param.writeParam(user.id, "twofa_temp", secret.base32).then(() => {
        return {
            secret: secret.base32,
            url: speakeasy.otpauthURL({secret: secret.ascii, label: encodeURIComponent('dncash.io (' + user.email + ')')})
        };
    });
}

/**
 * Verifies the initial token and if it is correct, enables 2FA
 * by setting the temporary secret to customer.twofa field and
 * returning a new, updated JWT.
 */
export function enable2FA(user: any, token: string): Promise<any> {
    return Param.readParam(user.id, "twofa_temp").then(base32secret => {
        verify2FAToken(base32secret, token);
        return db.querySingle("update customer set twofasecret=? where id=?", [base32secret, user.id])
               .then(()=>Param.removeParam(user.id, "twofa_temp"))
               .then(()=>findUserById(user.id))
               // issue a new JWT with the role 'twofa'
               .then(u=>authenticate(u));
    });
}

/**
 * Disables 2FA for the given user
 */
export function disable2FA(user: any): Promise<any> {
    return db.querySingle("update customer set twofasecret=null where id=?", [user.id])
    .then(()=>findUserById(user.id))
    .then(u=>authenticate(u));
}

function verify2FAToken(base32secret: string, token: string): void {
    if (!speakeasy.totp.verify({ secret: base32secret,
        encoding: 'base32',
        token: token
    })) throw "Invalid 2FA token";
}
