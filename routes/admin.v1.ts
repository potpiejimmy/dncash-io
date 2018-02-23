import { Router, Request, Response, NextFunction } from "express";
import * as Access from "../business/access";

export const routerAdminV1: Router = Router();

// ------ access ------------------------

/*
 * Create and returns new API access key and secret
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
    Access.findByCustomerId(request.user.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Delete all API keys for given user
 */
routerAdminV1.delete("/access", function (request: Request, response: Response, next: NextFunction) {
    Access.deleteByCustomerId(request.user.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});
