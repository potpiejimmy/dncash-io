import { Router, Request, Response, NextFunction } from "express";
import * as Access from "../business/access";
import * as Device from "../business/device";

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
 * Returns all API keys for the authenticated user (does not include secret)
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
 * Delete given API key the authenticated user
 */
routerAdminV1.delete("/access/:id", function (request: Request, response: Response, next: NextFunction) {
    Access.deleteByCustomerAndId(request.user, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------ devices ------------------------

/*
 * Returns all devices for the authenticated user
 */
routerAdminV1.get("/devices", function (request: Request, response: Response, next: NextFunction) {
    Device.findByCustomer(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Deletes the given device for the authenticated user
 */
routerAdminV1.delete("/devices/:id", function (request: Request, response: Response, next: NextFunction) {
    Device.deleteByCustomerAndId(request.user, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});
