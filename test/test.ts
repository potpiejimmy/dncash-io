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
let radioCode;

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
//after(done => purgeDB(done));

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

    let tokenApiId;
    describe("POST /access", () => {
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
    describe("POST /access", () => {
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

    describe("PUT /access/:id", () => {
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

    let deviceUid;
    describe("GET /devices", () => {
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
                deviceUid = res.body[0].uuid;
                done();
            });
        });
    });

    describe("GET /devices/:uuid", () => {
        it("should return single device with given UUID", done => {
            chai.request(app)
            .get("/dnapi/token/v1/devices/"+deviceUid)
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('uuid');
                res.body.uuid.should.be.eql(deviceUid);
                done();
            });
        });
    });

    describe("POST /tokens", () => {
        it("should create new token of type CASHOUT", done => {
            chai.request(app)
            .post("/dnapi/token/v1/tokens")
            .set("DN-API-KEY", tokenApiKey)
            .set("DN-API-SECRET", tokenApiSecret)
            .send({device_uuid:deviceUid, amount:1000, symbol: 'EUR'})
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
                radioCode = res.body.uuid + crypto.privateDecrypt({
                    key: keypair.private,
                    padding: constants.RSA_PKCS1_PADDING
                }, new Buffer(res.body.secure_code, 'base64')).toString('hex');
                done();
            });
        });
    });
});

/** Testing /routes/cashapi.v1.ts **/

describe("cashapi.v1:", () => {

    let atmUid;
    describe("POST /devices", () => {
        it("should register a new cash device of type ATM", done => {
            chai.request(app)
            .post("/dnapi/cash/v1/devices")
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .send({refname:'testdevice1', pubkey:keypair.public, info:{myfield:'myvalue'}})
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('refname');
                res.body.should.have.property('type');
                res.body.should.have.property('info');
                res.body.refname.should.be.eql('testdevice1');
                res.body.type.should.be.eql('ATM');
                res.body.should.have.property('uuid');
                atmUid = res.body.uuid;
                done();
            });
        });
    });

    describe("GET /tokens/:radiocode", () => {
        it("should verify and lock token", done => {
            chai.request(app)
            .get("/dnapi/cash/v1/tokens/"+radioCode+"?device_uuid="+atmUid)
            .set("DN-API-KEY", cashApiKey)
            .set("DN-API-SECRET", cashApiSecret)
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('state');
                res.body.state.should.be.eql('LOCKED');
                done();
            });
        });
    });
});
