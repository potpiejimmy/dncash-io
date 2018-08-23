/**
 * (c) dncash.io
 * February 20, 2018
 * 
 * The world's first truly digital and cloud-native cash service
 * 
 * @author thorsten.liese@dieboldnixdorf.com
 */
import * as express from 'express';
import * as expressWs from 'express-ws';
import { json } from 'body-parser';
import * as nocache from 'nocache';
import * as morgan from 'morgan';

import * as redis from './util/redis';
import * as mqtt from './util/mqtt';
import * as jobs from './util/jobs';
import * as swagger from './util/swagger';
import * as jwtauth from "./util/jwtauth";
import * as apiauth from "./util/apiauth";
import * as logging from "./util/logging";

logging.logger.info("Setting up Express");

const app: express.Application = express();

logging.logger.info("Building API docs");

// Build and serve swagger UI API docs:
swagger.setup(app);
// and prevent favicon 404:
app.get('/favicon.ico', (req, res) => res.status(204));

// enable web sockets for express (do this before loading routes)
expressWs(app);

logging.logger.info("Loading routes");

// Routes:
import { routerAdminV1Auth } from "./routes/admin.v1.auth";
import { routerAdminV1 } from "./routes/admin.v1";
import { routerAdminV1Ws } from "./routes/admin.v1.ws";
import { tokenApiV1 } from "./routes/tokenapi.v1";
import { tokenApiV1Ws } from "./routes/tokenapi.v1.ws";
import { cashApiV1 } from "./routes/cashapi.v1";
import { mobileApiV1 } from "./routes/mobileapi.v1";
import { clearingApiV1 } from "./routes/clearingapi.v1";
import { clearingApiV1Ws } from "./routes/clearingapi.v1.ws";

app.use(nocache());
app.use(json());

// add CORS headers
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", req.headers.origin); // XXX do not allow all origins for production
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, DN-API-KEY, DN-API-SECRET");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    next();
});
  
// morgan logger for HTTP logging, log to winston appenders:
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan("combined", { stream: logging.stream }));
}

logging.logger.info("Setting up routes");

app.get('/', (req, res) => res.send('dncash.io is running on /dnapi.'))
app.get('/dnapi', (req, res) => res.send('<a href="/dnapi/docs">API Docs</a>'));

// Routes:
// unsecured route without middleware for authentication:
app.use("/dnapi/admin/v1", routerAdminV1Auth);
// JWT secured route for Admin API (web frontend)
app.use("/dnapi/admin/v1", jwtauth.verifyToken(), routerAdminV1);
// High-security route for Token API using DB-verified access secret:
app.use("/dnapi/token/v1", apiauth.verifyAccess, apiauth.verifyTokenApi, apiauth.verifyCustomer, tokenApiV1);
// High-security route for Cash API using DB-verified access secret:
app.use("/dnapi/cash/v1", apiauth.verifyAccess, apiauth.verifyCashApi, apiauth.verifyCustomer, cashApiV1);
// High-security route for Clearing API using DB-verified access secret:
app.use("/dnapi/clearing/v1", apiauth.verifyAccess, apiauth.verifyClearingApi, apiauth.verifyCustomer, clearingApiV1);
// Mobile API (intentionally unsecured, since it provides the secure trigger API)
app.use("/dnapi/mobile/v1", mobileApiV1);

// WebSocket routes (unsecured)
app.use("/dnapi/adminws/v1", routerAdminV1Ws);
app.use("/dnapi/tokenws/v1", tokenApiV1Ws);
app.use("/dnapi/clearingws/v1", clearingApiV1Ws);

if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy, allows sending secure cookies even if SSL terminated on proxy  
  }
  
// catch 404 and forward to error handler
app.use(function(req: express.Request, res: express.Response, next) {
    let err = new Error('Not Found: ' + req.originalUrl);
    next(err);
});

// production error handler
// no stacktrace leaked to user
app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
    if (process.env.NODE_ENV !== 'test') {
        logging.logger.error(err);
    }
    res.status(err.status || 500);
    res.json({
        error: {},
        message: err.message || err
    });
});

export let appReady = redis.waitForRedisReady().then(() => 
                      mqtt.waitForMQTTReady().then(() => {

    // schedule jobs:
    jobs.scheduleJobs();

    logging.logger.info("Server initialized successfully");

    return new Promise(resolve => {
        // listen:
        let port = process.env.PORT || 3000;
        app.listen(port, () => {
            logging.logger.info('dncash.io is up and running, listening on port ' + port)
            resolve();
        });
    });
}));

// export app for test code in test/test.ts
export let testApp = app;
