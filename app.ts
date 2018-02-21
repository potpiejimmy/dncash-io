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

// Routes:
import { routerAdminV1 } from "./routes/admin.v1";

const app: express.Application = express();

app.use(nocache());
app.use(json());

// add CORS headers
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", req.headers.origin); // XXX do not allow all origins for production
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    next();
});
  
app.get('/', (req, res) => res.send('dncash.io is running.'))

// Routes:
app.use("/dnapi/admin/v1", routerAdminV1);

let port = process.env.PORT || 3000;
app.listen(port, () => console.log('dncash.io listening on port ' + port));
