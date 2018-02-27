import { Router, Request, Response, NextFunction } from "express";
import * as Device from "../business/device";

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
