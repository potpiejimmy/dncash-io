/**
 * (c) dncash.io
 * February 20, 2018
 * 
 * The world's first truly digital and cloud-native cash service
 * 
 * @author thorsten.liese@dieboldnixdorf.com
 */
import * as express from 'express';
import { json } from 'body-parser';
import * as nocache from 'nocache';

import * as jwtauth from "./util/jwtauth";
import * as apiauth from "./util/apiauth";

// Routes:
import { routerAdminV1Auth } from "./routes/admin.v1.auth";
import { routerAdminV1 } from "./routes/admin.v1";
import { tokenApiV1 } from "./routes/tokenapi.v1";

const app: express.Application = express();

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
  
app.get('/', (req, res) => res.send('dncash.io is running.'))

// verifies the jwt for protected API routes
let verifyTokenMiddleware = jwtauth.verifyToken();

// Routes:
app.use("/dnapi/admin/v1", routerAdminV1Auth); // unsecured
app.use("/dnapi/admin/v1", verifyTokenMiddleware, routerAdminV1);
app.use("/dnapi/token/v1", apiauth.verifyAccess, apiauth.verifyTokenApi, apiauth.verifyCustomer, tokenApiV1);

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
    console.log(err);
    res.status(err.status || 500);
    res.json({
        error: {},
        message: err.message || err
    });
});
  
// listen:
let port = process.env.PORT || 3000;
app.listen(port, () => console.log('dncash.io listening on port ' + port));
