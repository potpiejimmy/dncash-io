import { Router, Request, Response, NextFunction } from "express";
import * as Login from "../business/login";

export const routerAdminV1Auth: Router = Router();

// ------ auth ------------------------

/*
 * Sign in using user name and password
 */
routerAdminV1Auth.post("/auth", function (request: Request, response: Response, next: NextFunction) {
    Login.login(request.body.user, request.body.password)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Register a new user
 */
routerAdminV1Auth.post("/auth/register", function (request: Request, response: Response, next: NextFunction) {
    Login.register(request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});
