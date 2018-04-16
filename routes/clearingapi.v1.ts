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
 *       refname:
 *         type: string
 *         description: custom reference name or number as specified by the token creator
 *         example: bookref_08154711
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
 *         type: object
 *         description: debitor account information
 *       creditor:
 *         type: object
 *         description: creditor account information
 */

// ------- clearing data ---------------------

/**
 * @swagger
 * /dnapi/clearing/v1/:
 *   get:
 *     summary: Retrieves clearing data
 *     description: Reads and returns clearing data for the authenticated customer.
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
    Clearing.getClearingData(request.user.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});
