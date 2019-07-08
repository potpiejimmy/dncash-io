import { Router, Request, Response, NextFunction } from "express";
import * as Device from "../business/device";
import * as Token from "../business/token";
import * as Trigger from "../business/trigger";
import * as XCard from "../business/xcard";
import * as logging from "../util/logging";

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
 *       - Cash-API
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
 *       - Cash-API
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
        if (process.env.NODE_ENV !== 'test') {
            logging.logger.error(err);
        }
        response.status(403).json({error:err});
    });
});

/**
 * @swagger
 * /dnapi/cash/v1/tokens/{uuid}:
 *   put:
 *     summary: Confirms a token
 *     description: Updates the given token, thereby notifying the server about successful or failed cash processing.
 *                  You must specify the cash device UUID as a query parameter.
 *                  A token can only be updated by the device that has successfully transfered the token into the locked state before.
 *                  The token state may be updated only from state LOCKED to one of
 *                  COMPLETED (completed normally, amount to be settled),
 *                  FAILED (technical failure),
 *                  CANCELED (operation canceled by the user or merchant),
 *                  REJECTED (process rejected or aborted by the system),
 *                  RETRACTED (dispensed money retracted).
 *                  Also, the field lockrefname can be updated, for instance to hold a custom cash-side transaction reference
 *                  (will be part of the clearing information).
 *                  In addition, the amount can be updated to the actual deposit or dispense amount (optional). If, for a
 *                  CASHOUT token, the amount is specified and it is less than the token amount, the token completion
 *                  amount and clearing data is set to the specified amount. If partial cashouts are enabled, a new
 *                  open CASHOUT token is automatically spawned for the remaining amount inheriting the original's token
 *                  plain and secure codes.
 *                  Furthermore, you may optionally specify arbitrary JSON data to update the token's processing_info field.
 *     tags:
 *       - Cash-API
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
 *           $ref: '#/definitions/token_confirm'
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
    Token.confirmByLockDeviceAndUUID(request.user, request.query.device_uuid, request.params.uid, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/cash/v1/trigger:
 *   post:
 *     summary: Creates and returns a new trigger code for cash devices
 *     description: Cash devices may use a secure API trigger
 *                  to receive token information pushed onto the ATM by the token server.
 *                  This can be used by cash devices without radio or scanning capabilities - or to support
 *                  scenarios where it is desired that no information is transferred from the mobile device
 *                  to the cash device, but vice-versa only.
 *                  This method returns a random, globally unique trigger code that is only valid for the given
 *                  period of time (for instance, 60 seconds) before it expires.
 *                  After receiving the trigger code, the ATM either opens a GET request on the /trigger/{triggercode}
 *                  API endpoint or it subscribes to the MQTT topic 'dncash-io/trigger/v1/{triggercode}' (if dncash.io is 
 *                  configured for MQTT support) to receive an instant and locked token as soon as it is triggered by the
 *                  mobile device. After opening the endpoint or after subscribing to the MQTT topic, the ATM should display the unique
 *                  trigger code either rendered as a QR-code on the screen or broadcast via NFC, allowing the mobile device to scan
 *                  the QR-code or receive the NFC data and securely verify and push a locked token onto the ATM via the Mobile API.
 *                  
 *     tags:
 *       - Cash-API
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
 *       - name: expiresIn
 *         description: In seconds, sets the trigger expiration time, default is 60 seconds
 *         in: query
 *         type: number
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
    Trigger.createTrigger(request.user, request.query.device_uuid, request.query.expiresIn)
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
 *       - Cash-API
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
    Trigger.registerTrigger(request.user, request.params.triggercode, response)
    .then(() => {}) // wait until triggered
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/cash/v1/xcard/auth:
 *   post:
 *     summary: Authorizes and creates a card authentication nonce in the server
 *     description: This operation enables cash or non-cash devices to request permits
 *                  based on card-based authentication mechanisms such as card + PIN.
 *                  
 *     tags:
 *       - Cash-API
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
 *         description: The cash (card) device UUID
 *         in: query
 *         required: true
 *         type: string
 *       - name: body
 *         description: Card track data
 *         required: true
 *         in: body
 *         example:
 *             t2: '6725902100325021973D22122012534107044'
 *     responses:
 *       200:
 *         description: Returns an authorization nonce and additional customer data
 *         schema:
 *           type: object
 *           properties:
 *             nonce:
 *               type: string
 *               description: a globally unique and random nonce
 *               example: 66a57085-07ad-4550-ad21-22eac31d0ad0
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
cashApiV1.post("/xcard/auth", function (request: Request, response: Response, next: NextFunction) {
    XCard.createAuth(request.user, request.query.device_uuid, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});
