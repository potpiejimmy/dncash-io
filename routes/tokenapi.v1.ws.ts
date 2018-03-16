import { Router, Request, Response, NextFunction } from "express";
import * as Access from '../business/access';
import { tokenChangeNotifier } from "../util/notifier";
import * as uuid from "uuid/v4"; // Random-based UUID

export const tokenApiV1Ws: Router = Router();

// ------- token change live websocket ------------

/**
 * @swagger
 * wss:/dnapi/tokenws/v1/tokenchange/{listenKey}:
 *   head:
 *     summary: WebSocket endpoint for live token change notifications
 *     description: Note&colon; This is a live WebSocket endpoint, not an HTTP endpoint. It is included here for documentation
 *                  purposes only.
 *                  The token change endpoint immediately notifies the listener about token state changes. Only the token UUID
 *                  is reported on this interface for performance and security reasons.
 *     tags:
 *       - Token API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: listenKey
 *         description: The "listen key" is the Token API Key (DN-API-KEY) converted from its Base64 representation to a hex string
 *         in: path
 *         required: true
 *         type: string
 *         example: 461736a05219a2decc988ead849dbed3ec2e4e2eeaa982f576c4445fd0552ee818f1a1454cbc3fa7fadc3570eba56136
 *     responses:
 *       200:
 *         description: Return array of tokens
 *         schema:
 *           type: object
 *           properties:
 *             uuid:
 *               type: string
 *               description: the token UUID
 *               example: c716c0ca-fc93-442b-a295-93f62e6e3a1f
 */
tokenApiV1Ws.ws("/tokenchange/:listenKey", function (ws: WebSocket, req: Request) {
    let wsid = uuid();
    Access.findByKey(Buffer.from(req.params.listenKey, 'hex').toString('base64')).then(access => {
        if (!access) {
            ws.close();
            return;
        }
        tokenChangeNotifier.addObserver(access.customer_id, wsid, t => {
            try {
                ws.send(JSON.stringify(t));
            } catch (err) {
                tokenChangeNotifier.removeObserver(access.customer_id, wsid);
            }
        });
        ws.onclose = () => {
            tokenChangeNotifier.removeObserver(access.customer_id, wsid);
        }
    });
});
