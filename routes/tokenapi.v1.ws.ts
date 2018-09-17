import { Router, Request, Response, NextFunction } from "express";
import * as Access from '../business/access';
import { changeNotifier } from "../util/notifier";
import * as uuid from "uuid/v4"; // Random-based UUID

export const tokenApiV1Ws: Router = Router();

// ------- token change live websocket ------------

/**
 * @swagger
 * wss:/dnapi/tokenws/v1/tokenchange/{listenKey}:
 *   head:
 *     summary: WebSocket endpoint for live token change notifications
 *     description: (Note&colon; This is a WebSocket endpoint, not an HTTP endpoint. It is included here for documentation
 *                  purposes only.)
 *                  The token change endpoint immediately notifies the listener about token state changes. Note that only the token UUID
 *                  is reported on this interface for performance and security reasons.
 *     tags:
 *       - Token-API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: listenKey
 *         description: The "listen key" is the Token API Key (DN-API-KEY).
 *                      If the listen key is incorrect, the websocket is closed immediately from the remote end.
 *         in: path
 *         required: true
 *         type: string
 *         example: 8tgbqp8rxxby5bkp1kf9nm47k2m8yyepnxw3tpebntw1n5c8g49zmu30f83tqhn1
 *     responses:
 *       200:
 *         description: Sends out a token UUID in the below format every time a token changes.
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
    Access.findByKey(req.params.listenKey).then(access => {
        if (!access || access.scope!='token-api') {
            ws.close();
            return;
        }
        changeNotifier.addObserver("token:"+access.customer_id, wsid, t => {
            try {
                ws.send(JSON.stringify(t));
            } catch (err) {
                changeNotifier.removeObserver("token:"+access.customer_id, wsid);
            }
        });
        ws.onclose = () => {
            changeNotifier.removeObserver("token:"+access.customer_id, wsid);
        }
    });
});
