import { Router, Request, Response, NextFunction } from "express";
import * as Access from "../business/access";

export const routerAdminV1: Router = Router();

// ------ access ------------------------

/*
 * Create and returns new API access key (without secret)
 */
routerAdminV1.post("/access", function (request: Request, response: Response, next: NextFunction) {
    Access.createApiKey(request.user, request.body.scope)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Returns all API keys for given user (does not include secret)
 */
routerAdminV1.get("/access", function (request: Request, response: Response, next: NextFunction) {
    Access.findByCustomerAndScope(request.user, request.query.scope)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Returns API secret for given ID and customer, secure with password.
 */
routerAdminV1.put("/access/:id", function (request: Request, response: Response, next: NextFunction) {
    Access.findByCustomerAndId(request.user, request.body.password, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Delete given API key for given user
 */
routerAdminV1.delete("/access/:id", function (request: Request, response: Response, next: NextFunction) {
    Access.deleteByCustomerAndId(request.user, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});
