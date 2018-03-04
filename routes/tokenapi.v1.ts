import { Router, Request, Response, NextFunction } from "express";
import * as Device from "../business/device";
import * as Token from "../business/token";

export const tokenApiV1: Router = Router();

/**
 * Generic definitions for swagger UI
 * 
 * @swagger
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
 *        info:
 *          type: object
 *          description: generic custom JSON data
 *          example: {anyKey: "anyValue, e.g ATM workstation ID"}
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
 *               description: denomination value in whole symbols
 *               example: 50
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
 *          example: '916eb12e-4e8a-4833-8e78-be40115829e7'
 *        amount:
 *          type: number
 *          example: 100
 *        symbol:
 *          type: string
 *          example: EUR
 *        type:
 *          type: string
 *          enum: [CASHOUT,CASHIN]
 *          example: CASHOUT
 *        info:
 *          $ref: '#/definitions/token_info'
 *   token_update:
 *      type: object
 *      properties:
 *        state:
 *          type: string
 *          description: token state
 *          enum: [COMPLETED,FAILED,CANCELED]
 *          example: COMPLETED
 *   token_response:
 *      type: object
 *      properties:
 *        uuid:
 *          type: string
 *          example: '256fb6a1-23c6-41b0-8e59-1824d1342d1f'
 *        secure_code:
 *          type: string
 *          description: Secure code encrypted with device public key
 *        amount:
 *          type: number
 *          example: 100
 *        symbol:
 *          type: string
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
 *     description: Registers a new token device
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


// ------- token ---------------------

/**
 * @swagger
 * /dnapi/token/v1/tokens:
 *   post:
 *     summary: Creates a new cash token
 *     description: Creates a new cash token
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
 *     summary: Get cash tokens
 *     description: Gets all cash tokens for currently authenticated user.
 *                  If the query parameter ?device_uuid=... is specified, only tokens for that device are returned.
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
        result = Token.findByDeviceUUID(request.user, request.query.device_uuid);
    } else {
        result = Token.findByCustomer(request.user);
    }
    result.then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/token/v1/tokens/{uuid}:
 *   delete:
 *     summary: Deletes a token
 *     description: Deletes a single token with the given UUID.
 *                  Note that you must also specify the corresponding device_uuid as a query parameter (for security reasons)
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
tokenApiV1.delete("/tokens/:uid", function (request: Request, response: Response, next: NextFunction) {
    Token.deleteByDeviceAndUUID(request.user, request.query.device_uuid, request.params.uid)
    .then(res => response.json(res))
    .catch(err => next(err));
});
