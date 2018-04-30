import { Router, Request, Response, NextFunction } from "express";
import * as Device from "../business/device";
import * as Token from "../business/token";

export const tokenApiV1: Router = Router();

/**
 * Generic definitions for swagger UI
 * 
 * @swagger
 * tags:
 *   - name: Token API
 *     description: The Token API provides secure operations invoked by authorized entities
 *                  such as banking backends or secure personal wallets.
 *   - name: Cash API
 *     description: The Cash API is used by secure cash devices such as ATMs and cash registers.
 *   - name: Mobile API
 *     description: The Mobile API holds secure operations that can be directly executed from
 *                  mobile devices.
 *   - name: Clearing API
 *     description: The Clearing API provides access to account clearing information to be
 *                  used for settlement processes.
 * 
 * definitions:
 *   unauthorized:
 *      type: object
 *      properties:
 *        error:
 *          type: string
 *          example: 'Invalid API access key or secret'
 *   device_request:
 *      type: object
 *      properties:
 *        pubkey:
 *          type: string
 *          description: PEM encoded public key
 *          required: true
 *          example: -----BEGIN RSA PUBLIC KEY-----↵MIIBCgKCAQEA6gsDEQ6Z188fEKzA1xVoQ.....
 *        refname:
 *          type: string
 *          description: optional custom reference name
 *          example: Device reference name
 *        info:
 *          type: object
 *          description: generic custom JSON data
 *          example: {anyKey: "anyValue"}
 *   device_response:
 *      type: object
 *      properties:
 *        uuid:
 *          type: string
 *          description: a new, unique device UUID generated for the new device
 *   cash_device_request:
 *      type: object
 *      properties:
 *        type:
 *          type: string
 *          description: cash device type, defaults to 'ATM' if not specified
 *          example: ATM
 *          enum: [ATM,CASH_REGISTER,OTHER]
 *        lat:
 *          type: number
 *          description: latitude decimal value
 *          example: 50.043858
 *        lon:
 *          type: number
 *          description: longitude decimal value
 *          example: 8.679574
 *        refname:
 *          type: string
 *          description: optional custom reference name
 *          example: Device reference name, e.g. terminal ID
 *        info:
 *          type: object
 *          description: generic custom JSON data
 *          example: {anyKey: "anyValue"}
 *   cash_device_response:
 *      type: object
 *      properties:
 *        uuid:
 *          type: string
 *          description: a new, unique device UUID generated for the new device
 *   token_info:
 *     type: object
 *     description: Generic custom JSON data
 *     properties:
 *       denomData:
 *         type: array
 *         description: Optional denomination data
 *         items:
 *           type: object
 *           properties:
 *             d:
 *               type: number
 *               description: denomination value in smallest symbol units (e.g. cents)
 *               example: 5000
 *             c:
 *               type: number
 *               description: note count
 *               example: 2
 *       whatever:
 *         type: string
 *         description: Any other custom value
 *         example: Any value
 *   token_create:
 *      type: object
 *      properties:
 *        device_uuid:
 *          type: string
 *          required: true
 *          example: '916eb12e-4e8a-4833-8e78-be40115829e7'
 *        amount:
 *          type: number
 *          description: amount in smallest symbol units (e.g. cents)
 *          required: true
 *          example: 10000
 *        symbol:
 *          type: string
 *          description: the currency symbol
 *          required: true
 *          example: EUR
 *        type:
 *          type: string
 *          enum: [CASHOUT,CASHIN]
 *          required: true
 *          example: CASHOUT
 *        expires:
 *          type: number
 *          description: optional expiration timestamp in milliseconds since epoch
 *          example: 1577829600000
 *        refname:
 *          type: string
 *          description: custom reference name or number
 *          example: bookref_08154711
 *        info:
 *          $ref: '#/definitions/token_info'
 *   token_confirm:
 *      type: object
 *      properties:
 *        state:
 *          type: string
 *          description: token state
 *          required: true
 *          enum: [COMPLETED,CANCELED,FAILED,REJECTED,RETRACTED]
 *          example: COMPLETED
 *        amount:
 *          type: number
 *          description: actual amount dispensed or deposited in smallest symbol units (cents)
 *          example: 9750
 *   token_update:
 *      type: object
 *      properties:
 *        clearstate:
 *          type: number
 *          description: token clearing state (generic number)
 *          example: 1
 *        info:
 *          $ref: '#/definitions/token_info'
 *   token_response:
 *      type: object
 *      properties:
 *        uuid:
 *          type: string
 *          example: '256fb6a1-23c6-41b0-8e59-1824d1342d1f'
 *        device_uuid:
 *          type: string
 *          example: 'c716c0ca-fc93-442b-a295-93f62e6e3a1f'
 *        secure_code:
 *          type: string
 *          description: Secure code encrypted with device public key
 *        amount:
 *          type: number
 *          description: amount in smallest symbol units (e.g. cents for EUR symbol)
 *          example: 10000
 *        symbol:
 *          type: string
 *          description: the currency symbol
 *          example: EUR
 *        type:
 *          type: string
 *          enum: [CASHOUT,CASHIN]
 *          example: CASHOUT
 *        state:
 *          type: string
 *          description: token state
 *          enum: [OPEN,DELETED,LOCKED,COMPLETED,FAILED,EXPIRED,CLEARED,CANCELED,REJECTED]
 *          example: OPEN
 *        info:
 *          $ref: '#/definitions/token_info'
 */

// ------- device ---------------------

/**
 * @swagger
 * /dnapi/token/v1/devices:
 *   post:
 *     summary: Registers a new token device
 *     description: Registers a new token device. To register a new token device, the device's PEM-encoded 
 *                  RSA public key needs to be included in the request. Note that each token that is created later
 *                  through the create-token endpoint holds a secure code encrypted with the target device's public
 *                  key to ensure true end-to-end encryption for scenarios where the calling entity is not the same as
 *                  the target device (usually banking backends performing account authorization prior
 *                  to calling the create method).
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: body
 *         description: Device request data
 *         required: true
 *         in: body
 *         schema:
 *           $ref: '#/definitions/device_request'
 *     responses:
 *       200:
 *         description: Returns new device UUID and other device data
 *         schema:
 *           $ref: '#/definitions/device_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
tokenApiV1.post("/devices", function (request: Request, response: Response, next: NextFunction) {
    if (!request.body.type) request.body.type='MOBILE'; // default to MOBILE
    Device.register(request.user, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/token/v1/devices:
 *   get:
 *     summary: Gets registered devices
 *     description: Returns the list of registered devices for the authenticated user.
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns list of devices
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/device_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
tokenApiV1.get("/devices", function (request: Request, response: Response, next: NextFunction) {
    Device.findByCustomer(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/token/v1/devices/{uuid}:
 *   get:
 *     summary: Gets a single registered device
 *     description: Returns the device data for the given device UUID
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: uuid
 *         description: A device UUID
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns device information
 *         schema:
 *           $ref: '#/definitions/device_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 *       404:
 *         description: device UUID not found
 */
tokenApiV1.get("/devices/:uid", function (request: Request, response: Response, next: NextFunction) {
    Device.findByCustomerAndUUID(request.user, request.params.uid)
    .then(res => {
        if (res) response.json(res);
        else response.status(404).json("Not found");
    })
    .catch(err => next(err));
});

// ------- token ---------------------

/**
 * @swagger
 * /dnapi/token/v1/tokens:
 *   post:
 *     summary: Creates a new cash token
 *     description: Creates a new cash token, secured for the given token device. The new token's secure code
 *                  can only be decrypted on the token device holding the corresponding private key.
 *                  The token server does not store the original unencrypted secure code, so that even compromised
 *                  token data cannot be used by someone else without physical access to the target device.
 *                  The request body must at least contain the information about the amount, currency symbol,
 *                  type and the target device_uuid. Other fields are optional. The info field is an 
 *                  arbitrary JSON object that may contain the denomData array as shown (to specify a desired
 *                  note selection) and any number of additional custom data fields to be stored along with the token.
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: body
 *         description: Token request data
 *         required: true
 *         in: body
 *         schema:
 *           $ref: '#/definitions/token_create'
 *     responses:
 *       200:
 *         description: Returns new token
 *         schema:
 *           $ref: '#/definitions/token_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
tokenApiV1.post("/tokens", function (request: Request, response: Response, next: NextFunction) {
    Token.createToken(request.user, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/token/v1/tokens:
 *   get:
 *     summary: Gets cash tokens
 *     description: Gets all cash tokens for the currently authenticated user.
 *                  If the query parameter ?device_uuid=... is specified, only tokens in state OPEN for that device are returned.
 *                  Otherwise, additional query parameters such as 'state' and/or 'clearstate' may be used to filter the result set accordingly.
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: device_uuid
 *         description: A Device UUID
 *         in: query
 *         type: string
 *       - name: state
 *         description: a single token state to filter
 *         in: query
 *         type: string
 *         example: COMPLETED
 *       - name: clearstate
 *         description: value of column clearstate to filter (tokens have value 0 in clearstate by default).
 *         in: query
 *         type: number
 *         example: 0
 *     responses:
 *       200:
 *         description: Return array of tokens
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/token_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
tokenApiV1.get("/tokens", function (request: Request, response: Response, next: NextFunction) {
    let result;
    if (request.query.device_uuid) {
        result = Token.getOpenForDevice(request.user, request.query.device_uuid);
    } else {
        result = Token.getByCustomer(request.user, request.query);
    }
    result.then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/token/v1/tokens/{uuid}:
 *   get:
 *     summary: Gets a single cash token
 *     description: Returns the cash token with the given UUID
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: uuid
 *         description: A token UUID
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns token information
 *         schema:
 *           $ref: '#/definitions/token_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 *       404:
 *         description: token UUID not found
 */
tokenApiV1.get("/tokens/:uid", function (request: Request, response: Response, next: NextFunction) {
    Token.getByUUID(request.user, request.params.uid)
    .then(res => {
        if (res) response.json(res);
        else response.status(404).json("Not found");
    })
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/token/v1/tokens/{uuid}:
 *   delete:
 *     summary: Deletes a token
 *     description: Deletes a single token with the given UUID.
 *                  Note that you must also specify the corresponding device_uuid as a query parameter (for security reasons).
 *                  A token can only be deleted if it is still in OPEN state.
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: uuid
 *         description: The token UUID
 *         in: path
 *         required: true
 *         type: string
 *       - name: device_uuid
 *         description: A Device UUID
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns updated token
 *         schema:
 *           $ref: '#/definitions/token_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 *       404:
 *         description: token UUID not found
 */
tokenApiV1.delete("/tokens/:uid", function (request: Request, response: Response, next: NextFunction) {
    Token.deleteByDeviceAndUUID(request.user, request.query.device_uuid, request.params.uid)
    .then(res => {
        if (res) response.json(res);
        else response.status(404).json("Not found");
    })
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/token/v1/tokens/{uuid}:
 *   put:
 *     summary: Updates token data
 *     description: Updates specific information about a token. This function can be used to update
 *                  the clearing and/or settling information of a token. Currently, only updating
 *                  of the fields 'clearstate' and/or 'info' is allowed.
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Token API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Token API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: uuid
 *         description: The token UUID
 *         in: path
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
 *           $ref: '#/definitions/token_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 *       404:
 *         description: token UUID not found
 */
tokenApiV1.put("/tokens/:uid", function (request: Request, response: Response, next: NextFunction) {
    Token.updateByUUID(request.user, request.params.uid, request.body)
    .then(res => {
        if (res) response.json(res);
        else response.status(404).json("Not found");
    })
    .catch(err => next(err));
});
