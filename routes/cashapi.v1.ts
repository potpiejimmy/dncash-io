import { Router, Request, Response, NextFunction } from "express";
import * as Device from "../business/device";
import * as Token from "../business/token";
import * as Trigger from "../business/trigger";

export const cashApiV1: Router = Router();

// ------- cash device ---------------------

/**
 * @swagger
 * /dnapi/cash/v1/devices:
 *   post:
 *     summary: Registers a new cash device
 *     description: Registers a new cash device, making it known to the system.
 *                  This is to be executed only once per machine and
 *                  the returned device UUID can be stored and used for all subsequent requests.
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
 *     summary: Verifies and locks a cash token by a received radio or scan code
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
 *     description: Updates the given token, thereby notifying the server about succesful or failed cash processing.
 *                  You must specify the cash device UUID as a query parameter.
 *                  A token can only be updated by the device that has succesfully transfered the token into the locked state before.
 *                  Only the token state can be updated, and only from state LOCKED to one of
 *                  COMPLETED (completed normally, amount to be settled),
 *                  FAILED (technical failure),
 *                  CANCELED (operation canceled by the user),
 *                  REJECTED (process rejected or aborted by the system),
 *                  RETRACTED (dispensed money retracted).
 *                  In addition, the amount can be updated to the actual deposit or dispense amount (optional).
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

/**
 * @swagger
 * /dnapi/cash/v1/trigger:
 *   post:
 *     summary: Creates and returns a new trigger code for cash devices without radio or scanning capabilities
 *     description: Cash devices without radio or scanning capabilities may use a secure API trigger
 *                  to fetch token information pushed onto the ATM by the token server.
 *                  This method returns a random, globally unique trigger code that is only valid for a short
 *                  period of time (a couple of seconds) before it expires.
 *                  After receiving the trigger code, the ATM opens a GET request on the /triggers/{triggercode}
 *                  endpoint to receive an instant and locked token as soon as it is triggered by the
 *                  mobile device. After opening the endpoint, the ATM should display the unique
 *                  trigger code rendered as a QR-code on the screen, allowing the mobile device to scan
 *                  the QR-code and securely verify and push a locked token onto the ATM.
 *                  
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
 *       - name: device_uuid
 *         description: The cash device UUID
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns a new trigger code
 *         schema:
 *           type: object
 *           properties:
 *             triggercode:
 *               type: string
 *               description: a globally unique and random trigger code
 *               example: 66a57085-07ad-4550-ad21-22eac31d0ad0
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
cashApiV1.post("/trigger", function (request: Request, response: Response, next: NextFunction) {
    Trigger.createTrigger(request.user, request.query.device_uuid)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/cash/v1/trigger/{triggercode}:
 *   get:
 *     summary: Requests a locked cash token, waiting for its data to be pushed by a mobile device
 *     description: This method waits for a new cash token to be triggered through the Mobile API.
 *                  If the request times out, the ATM should abort the process, remove the QR code
 *                  from the screen and not re-use the trigger code again.
 *                  Ideally, the HTTP request timeout for this method should be set to 30 seconds,
 *                  which is the default validity time for newly generated trigger codes.
 *                  If a token is received through this method, it is already locked for this
 *                  device to be processed just like a token received through the
 *                  radiocode method.
 *                  
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
 *       - name: triggercode
 *         description: The trigger code received through the POST method on /trigger
 *         in: path
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
 */
cashApiV1.get("/trigger/:triggercode", function (request: Request, response: Response, next: NextFunction) {
    Trigger.registerTrigger(request.user, request.params.triggercode)
    .then(res => res.response = response) // store response in trigger entry
    .catch(err => next(err));
});
