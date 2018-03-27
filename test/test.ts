//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

import 'mocha';
import * as chai from 'chai';
import * as chaiHttp from 'chai-http';
import * as app from '../app';
import * as db from '../util/db';

let should = chai.should();

chai.use(chaiHttp);

let sessionToken;
let tokenApiKey;
let tokenApiSecret;

function purgeDB(done) {
    db.connection().then(c => {
        let tables = ['journal','token','customer_device','customer_access','customer'];
        tables.forEach(t => db.query(c, "delete from " + t));
        c.release();
        console.log("** DB purged **\n");
        done();
    })
}

before(done => purgeDB(done));
after(done => purgeDB(done));

/** Testing /routes/admin.v1.auth.ts **/

describe("admin.v1.auth:", () => {

    describe("POST /auth/register with short password", () => {
        it("should respond with 'bad password'", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/auth/register")
            .send({email:'test@test.de',password:'123'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('result');
                res.body.result.should.contain('bad password');
                done();
            });
        });
    });

    describe("POST /auth/register with long password", () => {
        it("should respond with session token", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/auth/register")
            .send({email:'test@test.de',password:'12345678'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('token');
                done();
            });
        });
    });

    describe("POST /auth with wrong password", () => {
        it("should return 'wrong user or password'", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/auth")
            .send({user:'test@test.de',password:'wrong'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('result');
                res.body.result.should.contain('wrong');
                done();
            });
        });
    });

    describe("POST /auth with correct password", () => {
        it("should return session token", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/auth")
            .send({user:'test@test.de',password:'12345678'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('token');
                sessionToken = res.body.token;
                done();
            });
        });
    });
});

/** Testing /routes/admin.v1.ts **/

describe("admin.v1:", () => {

    describe("GET /access without session token", () => {
        it("should return HTTP 401", done => {
            chai.request(app)
            .get("/dnapi/admin/v1/access?scope=token-api")
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
        });
    });

    describe("POST /access", () => {
        it("should create new API credentials", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/access")
            .set("authorization", "Bearer "+sessionToken)
            .send({scope:'token-api'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('scope');
                res.body.scope.should.be.eql('token-api');
                res.body.should.not.have.property('apisecret');
                done();
            });
        });
    });

    let tokenApiId;
    describe("GET /access?scope=token-api", () => {
        it("should return array of API credentials, length 1", done => {
            chai.request(app)
            .get("/dnapi/admin/v1/access?scope=token-api")
            .set("authorization", "Bearer "+sessionToken)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(1);
                res.body[0].should.have.property('apikey');
                res.body[0].should.not.have.property('apisecret');
                tokenApiId = res.body[0].id;
                done();
            });
        });
    });

    describe("DELETE /access/:id", () => {
        it("should delete API credentials", done => {
            chai.request(app)
            .delete("/dnapi/admin/v1/access/"+tokenApiId)
            .set("authorization", "Bearer "+sessionToken)
            .send({scope:'token-api'})
            .end((err, res) => {
                res.should.have.status(200);
                done();
            });
        });
    });

    describe("GET /access?scope=token-api", () => {
        it("should return empty array", done => {
            chai.request(app)
            .get("/dnapi/admin/v1/access?scope=token-api")
            .set("authorization", "Bearer "+sessionToken)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            });
        });
    });

    describe("POST /access", () => {
        it("should create new API credentials (2)", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/access")
            .set("authorization", "Bearer "+sessionToken)
            .send({scope:'token-api'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.have.property('id');
                tokenApiId = res.body.id;
                done();
            });
        });
    });

    describe("PUT /access/:id with wrong password", () => {
        it("should fail with HTTP 500", done => {
            chai.request(app)
            .put("/dnapi/admin/v1/access/"+tokenApiId)
            .set("authorization", "Bearer "+sessionToken)
            .send({password:"12345679"})
            .end((err, res) => {
                res.should.have.status(500);
                done();
            });
        });
    });

    describe("PUT /access/:id", () => {
        it("should return API key and secret", done => {
            chai.request(app)
            .put("/dnapi/admin/v1/access/"+tokenApiId)
            .set("authorization", "Bearer "+sessionToken)
            .send({password:"12345678"})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('apikey');
                res.body.should.have.property('apisecret');
                tokenApiKey = res.body.apikey;
                tokenApiSecret = res.body.apisecret;
                done();
            });
        });
    });
});

/** Testing /routes/tokenapi.v1.ts **/

describe("tokenapi.v1:", () => {

    describe("POST /devices without API credentials", () => {
        it("should return HTTP 401", done => {
            chai.request(app)
            .post("/dnapi/token/v1/devices")
            .send({refname:'testdevice1'})
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
        });
    });

    describe("POST /devices with wrong API credentials", () => {
        it("should return HTTP 401", done => {
            chai.request(app)
            .post("/dnapi/token/v1/devices")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", 'wrong')
            .send({refname:'testdevice1'})
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
        });
    });

    describe("POST /devices", () => {
        it("should register a new token device of type MOBILE", done => {
            chai.request(app)
            .post("/dnapi/token/v1/devices")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .send({refname:'testdevice1'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('refname');
                res.body.should.have.property('type');
                res.body.refname.should.be.eql('testdevice1');
                res.body.type.should.be.eql('MOBILE');
                done();
            });
        });
    });
});
