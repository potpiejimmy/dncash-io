import { Router, Request, Response, NextFunction } from "express";
import * as Device from "../business/device";
import * as Token from "../business/token";

export const tokenApiV1: Router = Router();

// ------- device ---------------------

/*
 * Registers a new device
 */
tokenApiV1.post("/devices", function (request: Request, response: Response, next: NextFunction) {
    Device.register(request.user, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});


// ------- token ---------------------

/*
 * Create a new cash token
 */
tokenApiV1.post("/tokens", function (request: Request, response: Response, next: NextFunction) {
    Token.createToken(request.user, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Gets all cash tokens for currently authenticated user
 * If the query parameter ?device_uuid=... is specified, only tokens for that device are returned.
 */
tokenApiV1.get("/tokens", function (request: Request, response: Response, next: NextFunction) {
    let result;
    if (request.query.device_uuid) {
        result = Token.findByDeviceUUID(request.user, request.query.device_uuid);
    } else {
        result = Token.findByCustomer(request.user);
    }
    result.then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Deletes a single token with the given ID.
 * Note: You must specify the corresponding device_uuid as a query parameter (for security reasons)
 */
tokenApiV1.delete("/tokens/:id", function (request: Request, response: Response, next: NextFunction) {
    Token.deleteByDeviceAndId(request.user, request.query.device_uuid, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});
