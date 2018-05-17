import { Router, Request, Response, NextFunction } from "express";
import * as Clearing from "../business/clearing";
import * as logging from "../util/logging";

export const clearingApiV1: Router = Router();

/**
 * Generic definitions for swagger UI
 * 
 * @swagger
 * definitions:
 *   clearing_data_response:
 *     type: object
 *     properties:
 *       date:
 *         type: string
 *         description: clearing creation date (date of cash completion)
 *         example: '2018-04-16T08:07:03.000Z'
 *       uuid:
 *         type: string
 *         description: the unique token UUID involved in the cash process
 *         example: '916eb12e-4e8a-4833-8e78-be40115829e7'
 *       type:
 *         type: string
 *         enum: [CASHOUT,CASHIN]
 *         required: true
 *         example: CASHOUT
 *       tokendevice:
 *         type: string
 *         description: custom reference name of the token device (token device refname)
 *         example: custommobile123
 *       refname:
 *         type: string
 *         description: custom reference name or number of the token as specified by the token creator
 *         example: bookref_08154711
 *       lockdevice:
 *         type: string
 *         description: custom reference name of the cash device (cash device refname)
 *         example: ATM-0001
 *       lockrefname:
 *         type: string
 *         description: custom reference name or number set by the cash device on token confirmation
 *         example: cashtsa_000173
 *       amount:
 *         type: number
 *         description: amount in smallest symbol units (e.g. cents)
 *         required: true
 *         example: 10000
 *       symbol:
 *         type: string
 *         description: the currency symbol
 *         required: true
 *         example: EUR
 *       debitor:
 *         $ref: '#/definitions/clearing_account_info'
 *       creditor:
 *         $ref: '#/definitions/clearing_account_info'
 *   clearing_account_info:
 *     type: object
 *     description: clearing account information
 *     properties:
 *       name:
 *         type: string
 *         description: Account name
 *         example: Test Bank AG
 *       iban:
 *         type: string
 *         description: Account IBAN
 *         example: DE1001100152389572932
 *   clearing_customer_response:
 *     type: object
 *     properties:
 *       id:
 *         type: number
 *         description: customer ID (admin only)
 *         example: 12345
 *       email:
 *         type: string
 *         description: customer email address
 *         example: test@dncash.io
 *       display_name:
 *         type: string
 *         description: customer display name
 *         example: John Doe
 *       roles:
 *         type: string
 *         description: comma-separated list of user roles
 *         example: user,bank
 *       info:
 *         type: string
 *         description: generic customer info string data
 *         example: {"customField":"customValue"}
 */

// ------- clearing data ---------------------

/**
 * @swagger
 * /dnapi/clearing/v1/:
 *   get:
 *     summary: Retrieves clearing data
 *     description: Reads and returns clearing data for the authenticated customer (or all for administrators).
 *     tags:
 *       - Clearing API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Clearing API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Clearing API Secret
 *         in: header
 *         required: true
 *         type: string
 *       - name: from
 *         type: string
 *         description: Return clearing data with a date greater than or equal to the given date
 *         in: query
 *         example: '2018-01-01T00:00:00Z'
 *       - name: to
 *         type: string
 *         description: Return clearing data with a date less than the given date
 *         in: query
 *         example: '2018-02-01T00:00:00Z'
 *       - name: type
 *         type: string
 *         description: Token type
 *         enum: [CASHOUT,CASHIN]
 *         in: query
 *         example: CASHOUT
 *       - name: customer_id
 *         type: number
 *         description: filter given customer ID (admin only, required for admin)
 *         in: query
 *         example: 12345
 * 
 *     responses:
 *       200:
 *         description: Returns clearing data
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/clearing_data_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
clearingApiV1.get("/", function (request: Request, response: Response, next: NextFunction) {
    Clearing.getClearingData(request.user, request.query)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * @swagger
 * /dnapi/clearing/v1/customers:
 *   get:
 *     summary: Retrieves customer data
 *     description: Reads and returns the customer data for the authenticated customer (or all for administrators).
 *     tags:
 *       - Clearing API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Clearing API Key
 *         in: header
 *         required: true
 *         type: string
 *       - name: DN-API-SECRET
 *         description: Clearing API Secret
 *         in: header
 *         required: true
 *         type: string
 * 
 *     responses:
 *       200:
 *         description: Returns customer data
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/clearing_customer_response'
 *       401:
 *         description: unauthorized
 *         schema:
 *           $ref: '#/definitions/unauthorized'
 */
clearingApiV1.get("/customers", function (request: Request, response: Response, next: NextFunction) {
    Clearing.getCustomerData(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});
