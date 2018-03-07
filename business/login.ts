import * as fetch from "node-fetch";
import * as crypto from "crypto";
import * as FormData from 'form-data';
import * as db from "../util/db";
import * as jwtauth from "../util/jwtauth";

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
                return insertUser(user).then(() => readAndAuthenticate(user.email));
            } else {
                return {"result": "Sorry, I don`t think you are a real person! Please try again."}
            }
        })
    });
}

export function login(email: string, password: string): Promise<any> {
    return findUserByEmail(email).then(user => {
        if (user && crypto.createHash('sha256').update(password || '').digest("hex") == user.password) {
            return authenticate(user);
        } else {
            return {"result": "Sorry, wrong user or password."};
        }
    });        
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

function readAndAuthenticate(email: string): Promise<any> {
    return findUserByEmail(email).then(user => authenticate(user));
}

function authenticate(user): any {
    user.roles = user.roles.split(','); // roles as array
    delete user.password;
    let token = jwtauth.createToken(user);
    return {token:token};
}


function verifyCaptcha(captcha : string) : Promise<any> {
    // return Promise.resolve({success:true});
    var form = new FormData();
    form.append('secret', process.env.CAPTCHA_SECRET || '6Lc7zEcUAAAAALq3kHl5F4WPe_Jiqc3vT0vq3m0F');
    form.append('response', captcha);
    return fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: form })
        .then(res => {
            return res.json();
        }).catch(function(err) {
            console.log(err);
        });
};
