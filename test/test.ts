//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

import 'mocha';
import * as chai from 'chai';
import * as chaiHttp from 'chai-http';
import * as crypto from 'crypto';
import * as constants from 'constants';
import * as app from '../app';
import * as db from '../util/db';

let should = chai.should();

chai.use(chaiHttp);

const keypair = {"public":"-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAhcr0IHoJfuv6/crCoEoafN3qrV+BJ2hjch1Q8BOP8vGa4rcFteGfcdnXTACp\nGDLaNjex6PRYJdz6eQGTroBZs+YKhxHCgHBgUYXDRDugvulhOUJyHP0QKhnOxuiBNY7Tc0id\n68f4jvkUqGnPLWRaFIlYeaoIdTyDOlsKrPIUyu/lHCgNtjRJkHXh7k5kZlut30Krx36V60dt\n7CuRpHTc5RpB1GO6Vsev7+rhKGn+A89MyElnqW32ijAH1D2Th58prcVGH5/qQsbVibg8ljex\nBYeBrmmTHZE7EBb3fZYDTFAmCkXumNjrhH051uySLslIB9HEdoATA5G2LMJ/mmIoOQIDAQAB\n-----END RSA PUBLIC KEY-----\n","private":"-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAhcr0IHoJfuv6/crCoEoafN3qrV+BJ2hjch1Q8BOP8vGa4rcFteGfcdnX\nTACpGDLaNjex6PRYJdz6eQGTroBZs+YKhxHCgHBgUYXDRDugvulhOUJyHP0QKhnOxuiBNY7T\nc0id68f4jvkUqGnPLWRaFIlYeaoIdTyDOlsKrPIUyu/lHCgNtjRJkHXh7k5kZlut30Krx36V\n60dt7CuRpHTc5RpB1GO6Vsev7+rhKGn+A89MyElnqW32ijAH1D2Th58prcVGH5/qQsbVibg8\nljexBYeBrmmTHZE7EBb3fZYDTFAmCkXumNjrhH051uySLslIB9HEdoATA5G2LMJ/mmIoOQID\nAQABAoIBABCYYPmaSY09tg8+1C9PocN1P0OsAfgiYZto+X4d3xASWdTfQM0TpFRZ4fOibVb8\nD8cD14R+smRX6ZWS1X+imf3PfeTNFiQaTEgwYE0ZXFHx3sZccI0Z8qRWOSjA9C3xflbhXf09\n+524VZCiNzl5JhdABgJpTc1E6T4Wxtc2289kDVpFCDHabecep7vMpn/tCWB+KCAEaJmYNuIY\nSxipkqT08FSpOFkLXTU4qSN0SiB5SCbefec36RyyxekjQr7m/Bk8zvMqsH6rZ8+ZLpoov2Pw\n7jdlhyCc/RWluZ3wY49+3c0Fc1e3dshUsfJNxjoIK7GiqMDynrvZyMf6Ck/gL3UCgYEA4qss\nEtpeBjXYQHCQvd1FlGPXncLl3nQiKyTF8Fa/kKdQcSvmRZ8MneT75oFQr3G2KU5u1kw/DZh3\n2AhL/+I8XQySITltgL8I//L2AodSFrnVoxpFCzZN6o2Z9Y04SwIT/jGRxBhQg2wY9lxkAhVK\nOvnnXwMSBG1VKFg1EU31X0cCgYEAlxsXzexJqH1VhLFoTBpv9/0+YR7QD3xpHImin9s2iDeh\nBgzOjEwJWiQxw0EdGWNJthlPWRi5n2QKLFXXsZ8Yknz0iCHCkASsd42YPcuGKgEcdy31Zu02\nGOfuPsLL9VNSobmM0iE2Sm+kNypM1kUx511DylUvhgWbrAnv9fgy/H8CgYB0RqDGTxSalPaJ\nH/VwIFk4JPuPp1IqCmMYxLVxc96zQtEmLQHkRxG+0Z9TAJU2Wtu6VszOy7Awtj0MKj1qV1Dl\n3rP7rSz6NYVVXvpKE8bNd6kbETfH56SSpO8MotP0zm0ZIa6H7H0o3cP0ZTK8StWYaWgCOl38\nvWVI2+7lIJu1swKBgBRo4Go8BCbx5t8pZ0EAQSdp2Ucc9lVhJIFqRcD5xv/XI7TBfhSNIKZA\nRUhuPxPyyT4DZShPoqLYzFb4sU2Yg6Ulo5HPnYv+VZ1ATtPp7ZE23TVry72/RJNQoGlxvkLA\nomSdv1uSiNa9BZ095Wr7paXufv2RS/36O/Cc1wCOKbTZAoGAShHKkheXo81JSGxE2ZAzcWsm\nVFFbtlfpmdXLMDaEKvtGGTzH6Ohble9/VVxTLzU5xjcM7UOUbrRUNkxycun3ZG/v4Ik4o7vM\nnQoi5egDaZKzlOMo2g8CBxafLs89mILc7dnqmEHylPdakWfpKI+49vyrH9C5JMABIETigQdg\ndPY=\n-----END RSA PRIVATE KEY-----\n"};
let sessionToken;
let tokenApiKey;
let tokenApiSecret;
let cashApiKey;
let cashApiSecret;
let clearingApiKey;
let clearingApiSecret;
let mobileUid;
let atmUid1;
let atmUid2;
let radioCodeOut;
let radioCodeIn;
let tokenUid;
let triggerCode;

function purgeDB(): Promise<void> {
    return db.connection().then(c => {
        let tables = ['clearing','journal','token','customer_device','customer_access','customer_param','customer'];
        tables.forEach(t => db.query(c, "delete from " + t));
        c.release();
        console.log("\n** DB purged **\n");
    })
}

// start with a clean DB
before(() => purgeDB());
//after(() => purgeDB());

/** Testing /routes/admin.v1.auth.ts **/

describe("admin.v1.auth:", () => {

    describe("Register a new user (bad password) | POST /auth/register with short password", () => {
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

    describe("Register a new user (ok) | POST /auth/register with long password", () => {
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

    describe("Sign in (bad password) | POST /auth with wrong password", () => {
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

    describe("Sign in (ok) | POST /auth with correct password", () => {
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

    describe("Read access (unauthorized) | GET /access without session token", () => {
        it("should return HTTP 401", done => {
            chai.request(app)
            .get("/dnapi/admin/v1/access?scope=token-api")
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
        });
    });

    let tokenApiId;
    describe("Create access Token API (ok) | POST /access", () => {
        it("should create new API credentials (token-api)", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/access")
            .set("authorization", "Bearer "+sessionToken)
            .send({scope:'token-api'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('id');
                res.body.should.have.property('scope');
                res.body.scope.should.be.eql('token-api');
                res.body.should.not.have.property('apisecret');
                tokenApiId = res.body.id;
                done();
            });
        });
    });

    let cashApiId;
    describe("Create access Cash API (ok) | POST /access", () => {
        it("should create new API credentials (cash-api)", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/access")
            .set("authorization", "Bearer "+sessionToken)
            .send({scope:'cash-api'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('id');
                res.body.should.have.property('scope');
                res.body.scope.should.be.eql('cash-api');
                res.body.should.not.have.property('apisecret');
                cashApiId = res.body.id;
                done();
            });
        });
    });

    let clearingApiId;
    describe("Create access Clearing API (ok) | POST /access", () => {
        it("should create new API credentials (clearing-api)", done => {
            chai.request(app)
            .post("/dnapi/admin/v1/access")
            .set("authorization", "Bearer "+sessionToken)
            .send({scope:'clearing-api'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('id');
                res.body.should.have.property('scope');
                res.body.scope.should.be.eql('clearing-api');
                clearingApiId = res.body.id;
                done();
            });
        });
    });

    describe("Read access Token API (ok) | GET /access?scope=token-api", () => {
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
                done();
            });
        });
    });

    describe("Delete access Token API (ok) | DELETE /access/:id", () => {
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

    describe("Read access Token API (empty) | GET /access?scope=token-api", () => {
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

    describe("Create access Token API (ok) | POST /access", () => {
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

    describe("Read API secret (bad password) | PUT /access/:id with wrong password", () => {
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

    describe("Read Token API secret (ok) | PUT /access/:id", () => {
        it("should return API key and secret (token-api)", done => {
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

    describe("Read Cash API secret (ok) | PUT /access/:id", () => {
        it("should return API key and secret (cash-api)", done => {
            chai.request(app)
            .put("/dnapi/admin/v1/access/"+cashApiId)
            .set("authorization", "Bearer "+sessionToken)
            .send({password:"12345678"})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('apikey');
                res.body.should.have.property('apisecret');
                cashApiKey = res.body.apikey;
                cashApiSecret = res.body.apisecret;
                done();
            });
        });
    });

    describe("Read Clearing API secret (ok) | PUT /access/:id", () => {
        it("should return API key and secret (clearing-api)", done => {
            chai.request(app)
            .put("/dnapi/admin/v1/access/"+clearingApiId)
            .set("authorization", "Bearer "+sessionToken)
            .send({password:"12345678"})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('apikey');
                res.body.should.have.property('apisecret');
                clearingApiKey = res.body.apikey;
                clearingApiSecret = res.body.apisecret;
                done();
            });
        });
    });

    describe("Set a parameter (ok) | PUT /params/:pkey", () => {
        it("should return HTTP 200 ok", done => {
            chai.request(app)
            .put("/dnapi/admin/v1/params/testparam")
            .set("authorization", "Bearer "+sessionToken)
            .send({somedatakey:"somedatavalue"})
            .end((err, res) => {
                res.should.have.status(200);
                done();
            });
        });
    });

    describe("Get a parameter (ok) | GET /params/:pkey", () => {
        it("should return parameter with correct value", done => {
            chai.request(app)
            .get("/dnapi/admin/v1/params/testparam")
            .set("authorization", "Bearer "+sessionToken)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('somedatakey');
                res.body.somedatakey.should.be.eql('somedatavalue');
                done();
            });
        });
    });

    describe("Update a parameter (ok) | PUT /params/:pkey", () => {
        it("should return HTTP 200 ok", done => {
            chai.request(app)
            .put("/dnapi/admin/v1/params/testparam")
            .set("authorization", "Bearer "+sessionToken)
            .send(["arrayvalue"])
            .end((err, res) => {
                res.should.have.status(200);
                done();
            });
        });
    });

    describe("Get updated parameter (ok) | GET /params/:pkey", () => {
        it("should return parameter with updated value", done => {
            chai.request(app)
            .get("/dnapi/admin/v1/params/testparam")
            .set("authorization", "Bearer "+sessionToken)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(1);
                res.body[0].should.be.eql("arrayvalue");
                done();
            });
        });
    });

    describe("Set a parameter 'clearing-account' (ok) | PUT /params/clearing-account", () => {
        it("should return HTTP 200 ok", done => {
            chai.request(app)
            .put("/dnapi/admin/v1/params/clearing-account")
            .set("authorization", "Bearer "+sessionToken)
            .send({name:"Max Mustermann", iban:"DE1234123412341234"})
            .end((err, res) => {
                res.should.have.status(200);
                done();
            });
        });
    });
});

/** Testing /routes/tokenapi.v1.ts **/

describe("tokenapi.v1:", () => {

    describe("Register token device (unauthorized) | POST /devices without API credentials", () => {
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

    describe("Register token device (bad credentials) | POST /devices with wrong API credentials", () => {
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

    describe("Register token device (ok) | POST /devices", () => {
        it("should register a new token device of type MOBILE", done => {
            chai.request(app)
            .post("/dnapi/token/v1/devices")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .send({refname:'testdevice1', pubkey:keypair.public, info:{myfield:'myvalue'}})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('refname');
                res.body.should.have.property('type');
                res.body.should.have.property('info');
                res.body.refname.should.be.eql('testdevice1');
                res.body.type.should.be.eql('MOBILE');
                done();
            });
        });
    });

    describe("Read devices (ok) | GET /devices", () => {
        it("should return array of devices, length 1", done => {
            chai.request(app)
            .get("/dnapi/token/v1/devices")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(1);
                res.body[0].should.have.property('refname');
                res.body[0].refname.should.be.eql('testdevice1');
                res.body[0].should.have.property('uuid');
                mobileUid = res.body[0].uuid;
                done();
            });
        });
    });

    describe("Read single device (ok) | GET /devices/:uuid", () => {
        it("should return single device with given UUID", done => {
            chai.request(app)
            .get("/dnapi/token/v1/devices/"+mobileUid)
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('uuid');
                res.body.uuid.should.be.eql(mobileUid);
                done();
            });
        });
    });

    describe("Create CASHOUT token (ok) | POST /tokens", () => {
        it("should create new token of type CASHOUT", done => {
            chai.request(app)
            .post("/dnapi/token/v1/tokens")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .send({device_uuid:mobileUid, amount:1000, symbol: 'EUR', refname: 'custref1234'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('amount');
                res.body.should.have.property('type');
                res.body.amount.should.be.eql(1000);
                res.body.type.should.be.eql('CASHOUT');
                res.body.should.not.have.property('id');
                res.body.should.have.property('secure_code');
                res.body.should.have.property('uuid');
                radioCodeOut = res.body.uuid + crypto.privateDecrypt({
                    key: keypair.private,
                    padding: constants.RSA_PKCS1_PADDING
                }, new Buffer(res.body.secure_code, 'base64')).toString('hex');
                done();
            });
        });
    });

    describe("Create CASHIN token (ok) | POST /tokens (CASHIN)", () => {
        it("should create new token of type CASHIN", done => {
            chai.request(app)
            .post("/dnapi/token/v1/tokens")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .send({device_uuid:mobileUid, type:'CASHIN', amount:0, symbol: 'EUR'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('type');
                res.body.type.should.be.eql('CASHIN');
                res.body.should.not.have.property('id');
                res.body.should.have.property('secure_code');
                res.body.should.have.property('uuid');
                radioCodeIn = res.body.uuid + crypto.privateDecrypt({
                    key: keypair.private,
                    padding: constants.RSA_PKCS1_PADDING
                }, new Buffer(res.body.secure_code, 'base64')).toString('hex');
                done();
            });
        });
    });

    describe("Read tokens (ok) | GET /tokens?device_uuid=:uuid", () => {
        it("should return array of tokens in state OPEN, length 2", done => {
            chai.request(app)
            .get("/dnapi/token/v1/tokens?device_uuid="+mobileUid)
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(2);
                done();
            });
        });
    });
});

/** Testing /routes/cashapi.v1.ts **/

describe("cashapi.v1:", () => {

    describe("Register cash device (ok) | POST /devices", () => {
        it("should register a new cash device of type ATM", done => {
            chai.request(app)
            .post("/dnapi/cash/v1/devices")
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({refname:'ATM1', info:{workstationId:'ATM0001'}})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('refname');
                res.body.should.have.property('type');
                res.body.should.have.property('info');
                res.body.refname.should.be.eql('ATM1');
                res.body.type.should.be.eql('ATM');
                res.body.should.have.property('uuid');
                atmUid1 = res.body.uuid;
                done();
            });
        });
    });

    describe("Register 2nd cash device (ok) | POST /devices", () => {
        it("should register another cash device of type ATM", done => {
            chai.request(app)
            .post("/dnapi/cash/v1/devices")
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({refname:'ATM2', info:{workstationId:'ATM0002'}})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('refname');
                res.body.should.have.property('type');
                res.body.should.have.property('info');
                res.body.refname.should.be.eql('ATM2');
                res.body.type.should.be.eql('ATM');
                res.body.should.have.property('uuid');
                atmUid2 = res.body.uuid;
                done();
            });
        });
    });

    describe("Claim token (wrong secure code) | GET /tokens/:radiocode with wrong secure code", () => {
        it("should return HTTP 403 with message 'Invalid token code'", done => {
            chai.request(app)
            .get("/dnapi/cash/v1/tokens/"+radioCodeOut+"ff?device_uuid="+atmUid1)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .end((err, res) => {
                res.should.have.status(403);
                res.body.should.be.a('object');
                res.body.should.have.property('error');
                res.body.error.should.contain('Invalid');
                done();
            });
        });
    });

    describe("Claim token (ok) | /tokens/:radiocode with correct secure code", () => {
        it("should verify and lock token", done => {
            chai.request(app)
            .get("/dnapi/cash/v1/tokens/"+radioCodeOut+"?device_uuid="+atmUid1)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('state');
                res.body.state.should.be.eql('LOCKED');
                res.body.should.have.property('uuid');
                tokenUid = res.body.uuid;
                done();
            });
        });
    });

    describe("Claim token again (fail) | GET /tokens/:radiocode with correct secure code, 2nd", () => {
        it("should return HTTP 403 with message 'Invalid token code'", done => {
            chai.request(app)
            .get("/dnapi/cash/v1/tokens/"+radioCodeOut+"?device_uuid="+atmUid1)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .end((err, res) => {
                res.should.have.status(403);
                res.body.should.be.a('object');
                res.body.should.have.property('error');
                res.body.error.should.contain('Invalid');
                done();
            });
        });
    });

    describe("Confirm token (different ATM) | PUT /tokens/:uuid with different ATM UUID", () => {
        it("should reject with message 'locked by another'", done => {
            chai.request(app)
            .put("/dnapi/cash/v1/tokens/"+tokenUid+"?device_uuid="+atmUid2)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({state:'COMPLETED'})
            .end((err, res) => {
                res.should.have.status(500);
                res.body.should.be.a('object');
                res.body.should.have.property('message');
                res.body.message.should.contain('locked by another');
                done();
            });
        });
    });

    describe("Confirm token (ok) | PUT /tokens/:uuid with same ATM UUID", () => {
        it("should confirm token", done => {
            chai.request(app)
            .put("/dnapi/cash/v1/tokens/"+tokenUid+"?device_uuid="+atmUid1)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({state:'COMPLETED'})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('state');
                res.body.state.should.be.eql('COMPLETED');
                done();
            });
        });
    });

    describe("Confirm token again (fail) | PUT /tokens/:uuid, 2nd confirmation", () => {
        it("should reject with message 'not in LOCKED state'", done => {
            chai.request(app)
            .put("/dnapi/cash/v1/tokens/"+tokenUid+"?device_uuid="+atmUid1)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({state:'COMPLETED'})
            .end((err, res) => {
                res.should.have.status(500);
                res.body.should.be.a('object');
                res.body.should.have.property('message');
                res.body.message.should.contain('not in LOCKED state');
                done();
            });
        });
    });

    describe("Create trigger code (ok) | POST /trigger", () => {
        it("should create new trigger code", done => {
            chai.request(app)
            .post("/dnapi/cash/v1/trigger?device_uuid="+atmUid2)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('triggercode');
                triggerCode = res.body.triggercode;
                done();
            });
        });
    });

    describe("Fetch triggered token (ok) | GET /trigger/:triggercode", () => {
        it("should receive new LOCKED token when triggered", done => {
            chai.request(app)
            .get("/dnapi/cash/v1/trigger/"+triggerCode)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .end((err, res) => {
                // Note: these will be checked with next test case on
                // PUT /dnapi/mobile/v1/trigger/:triggercode
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('state');
                res.body.state.should.be.eql('LOCKED');
                res.body.should.have.property('uuid');
                tokenUid = res.body.uuid;
            });
            // continue before receiving answer:
            done();
        });
    });
});

/** Testing /routes/mobileapi.v1.ts **/

describe("mobileapi.v1:", () => {

    describe("Claim and trigger (ok) | PUT /trigger/:triggercode", () => {
        it("should response with HTTP 204 no content and trigger ATM", done => {
            chai.request(app)
            .put("/dnapi/mobile/v1/trigger/"+triggerCode)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({radiocode:radioCodeIn})
            .end((err, res) => {
                res.should.have.status(204);
                done();
            });
        });
    });
});

describe("cashapi.v1 (continue):", () => {

    describe("Confirm triggered token (ok) | PUT /tokens/:uuid", () => {
        it("should confirm triggered token", done => {
            chai.request(app)
            .put("/dnapi/cash/v1/tokens/"+tokenUid+"?device_uuid="+atmUid2)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({state:'FAILED',amount:15000})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('state');
                res.body.state.should.be.eql('FAILED');
                res.body.should.have.property('amount');
                res.body.amount.should.be.eql(15000);
                done();
            });
        });
    });
});

describe("tokenapi.v1 (continue):", () => {

    describe("Get open tokens for device (empty) | GET /tokens?device_uuid=:uuid", () => {
        it("should return empty array (no tokens in state OPEN)", done => {
            chai.request(app)
            .get("/dnapi/token/v1/tokens?device_uuid="+mobileUid)
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            });
        });
    });

    describe("Read filtered tokens, state FAILED (ok) | GET /tokens?state=FAILED", () => {
        it("should return one token in state FAILED", done => {
            chai.request(app)
            .get("/dnapi/token/v1/tokens?state=FAILED")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(1);
                res.body[0].should.have.property('state');
                res.body[0].state.should.be.eql('FAILED');
                res.body[0].should.have.property('uuid');
                tokenUid = res.body[0].uuid;
                done();
            });
        });
    });

    describe("Update token clearstate (ok) | PUT /tokens/:uuid", () => {
        it("should update token clearstate", done => {
            chai.request(app)
            .put("/dnapi/token/v1/tokens/"+tokenUid)
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .send({clearstate:1})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('clearstate');
                res.body.clearstate.should.be.eql(1);
                done();
            });
        });
    });

    describe("Read filtered tokens, clearstate 0 (ok) | GET /tokens?clearstate=0", () => {
        it("should return one remaining token with clearstate 0", done => {
            chai.request(app)
            .get("/dnapi/token/v1/tokens?clearstate=0")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(1);
                res.body[0].should.have.property('clearstate');
                res.body[0].clearstate.should.be.eql(0);
                res.body[0].should.have.property('uuid');
                tokenUid = res.body[0].uuid;
                done();
            });
        });
    });

    describe("Update token clearstate and info (ok) | PUT /tokens/:uuid", () => {
        it("should update token clearstate and info with custom field", done => {
            chai.request(app)
            .put("/dnapi/token/v1/tokens/"+tokenUid)
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .send({clearstate:1,info:{clearingref:"ref01"}})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('clearstate');
                res.body.clearstate.should.be.eql(1);
                res.body.should.have.property('info');
                res.body.info.should.have.property('clearingref');
                res.body.info.clearingref.should.be.eql('ref01');
                done();
            });
        });
    });

    describe("Read filtered tokens, clearstate 0 (empty) | GET /tokens?clearstate=0", () => {
        it("should return empty array", done => {
            chai.request(app)
            .get("/dnapi/token/v1/tokens?clearstate=0")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            });
        });
    });
});

/** Testing /routes/clearingapi.v1.ts **/

describe("clearingapi.v1:", () => {

    describe("Read clearing data (bad credentials) | GET /", () => {
        it("should return HTTP 401", done => {
            chai.request(app)
            .get("/dnapi/clearing/v1")
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
        });
    });

    describe("Read clearing data (ok) | GET /", () => {
        it("should return one clearing with refname 'custref1234'", done => {
            chai.request(app)
            .get("/dnapi/clearing/v1")
            .set("DN-API-KEY", clearingApiKey)
            .set("DN-API-SECRET", clearingApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(1);
                res.body[0].should.have.property('refname');
                res.body[0].refname.should.be.eql('custref1234');
                res.body[0].should.have.property('debitor');
                res.body[0].debitor.should.have.property('iban');
                res.body[0].debitor.iban.should.be.eql('DE1234123412341234');
                done();
            });
        });
    });
});
