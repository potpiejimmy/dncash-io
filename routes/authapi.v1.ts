import { Router, Request, Response, NextFunction } from "express";
import * as XCard from "../business/xcard";

export const authApiV1: Router = Router();

// ------- card auth ---------------------

/**
 * @swagger
 * /dnapi/auth/v1/card:
 *   post:
 *     summary: Authorizes and creates a card authentication nonce in the server
 *     description: This operation enables cash or non-cash devices to request permits
 *                  based on card-based authentication mechanisms such as card + PIN.
 *                  
 *     tags:
 *       - Authorization-API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: DN-API-KEY
 *         description: Authorization API Key
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
authApiV1.post("/card", function (request: Request, response: Response, next: NextFunction) {
    XCard.createAuth(request.user, request.query.device_uuid, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});
