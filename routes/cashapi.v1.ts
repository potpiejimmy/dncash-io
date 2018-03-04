import { Router, Request, Response, NextFunction } from "express";
import * as Device from "../business/device";
import * as Token from "../business/token";

export const cashApiV1: Router = Router();

// ------- cash device ---------------------

/**
 * @swagger
 * /dnapi/cash/v1/devices:
 *   post:
 *     summary: Registers a new cash device
 *     description: Registers a new cash device
 *     tags:
 *       - Cash API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Cash API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Cash API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: body
 *         description: Device request data
 *         required: true
 *         in: body
 *         schema:
 *           $ref: '#/definitions/cash_device_request'
 *     responses:
 *       200:
 *         description: Returns new device UUID and other device data
 *         schema:
 *           $ref: '#/definitions/cash_device_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
cashApiV1.post("/devices", function (request: Request, response: Response, next: NextFunction) {
    if (!request.body.type) request.body.type='ATM'; // default to ATM
    Device.register(request.user, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});


// ------- token ---------------------

/**
 * @swagger
 * /dnapi/cash/v1/tokens/{radiocode}:
 *   get:
 *     summary: Verifies and locks a cash token
 *     description: Checks the given token radio access code for validity and if a valid and open token
 *                  was found for the given code, it is returned and locked in a single atomic operation.
 *     tags:
 *       - Cash API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Cash API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Cash API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: radiocode
 *         description: The radio access code
 *         in: path
 *         required: true
 *         type: string
 *       - name: device_uuid
 *         description: The device UUID of the cash device verifying the token (not the device the token was issued for)
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns the token data
 *         schema:
 *           $ref: '#/definitions/token_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 *       403:
 *         description: invalid radio access code
 */
cashApiV1.get("/tokens/:radiocode", function (request: Request, response: Response, next: NextFunction) {
    Token.verifyAndLock(request.user, request.query.device_uuid, request.params.radiocode)
    .then(res => response.json(res))
    .catch(err => {
        console.log(err);
        response.status(403).json({error:err});
    });
});

/**
 * @swagger
 * /dnapi/cash/v1/tokens/{uuid}:
 *   put:
 *     summary: Confirms a token
 *     description: Updates the given token, thus notifiying the server about succesful or failed cash processing.
 *                  You must specify the cash device UUID as a query parameter.
 *                  Tokens can only be updated by devices that have succesfully transfered the token into the locked state before.
 *                  Only the token state can be updated, and only from state LOCKED to one of COMPLETED, FAILED, CANCELED.
 *     tags:
 *       - Cash API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Cash API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Cash API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: uuid
 *         description: The token UUID
 *         in: path
 *         required: true
 *         type: string
 *       - name: device_uuid
 *         description: The cash device UUID that has locked the token
 *         in: query
 *         required: true
 *         type: string
 *       - name: body
 *         description: Token update data
 *         required: true
 *         in: body
 *         schema:
 *           $ref: '#/definitions/token_update'
 *     responses:
 *       200:
 *         description: Returns updated token
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/token_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
cashApiV1.put("/tokens/:uid", function (request: Request, response: Response, next: NextFunction) {
    Token.updateByLockDeviceAndUUID(request.user, request.query.device_uuid, request.params.uid, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});
