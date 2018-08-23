import { Router, Request, Response, NextFunction } from "express";
import * as Access from '../business/access';
import { clearingChangeNotifier } from "../util/notifier";
import * as uuid from "uuid/v4"; // Random-based UUID

export const clearingApiV1Ws: Router = Router();

// ------- token change live websocket ------------

/**
 * @swagger
 * wss:/dnapi/clearingws/v1/change/{listenKey}:
 *   head:
 *     summary: WebSocket endpoint for live clearing data change notifications
 *     description: (Note&colon; This is a WebSocket endpoint, not an HTTP endpoint. It is included here for documentation
 *                  purposes only.)
 *                  The clearing data change endpoint immediately notifies the listener about a new clearing entry. Note that only the token UUID
 *                  is reported on this interface for performance and security reasons.
 *     tags:
 *       - Clearing API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: listenKey
 *         description: The "listen key" is the Clearing API Key (DN-API-KEY).
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
clearingApiV1Ws.ws("/change/:listenKey", function (ws: WebSocket, req: Request) {
    let wsid = uuid();
    Access.findByKey(req.params.listenKey).then(access => {
        if (!access) {
            ws.close();
            return;
        }
        clearingChangeNotifier.addObserver(access.customer_id, wsid, t => {
            try {
                ws.send(JSON.stringify(t));
            } catch (err) {
                clearingChangeNotifier.removeObserver(access.customer_id, wsid);
            }
        });
        ws.onclose = () => {
            clearingChangeNotifier.removeObserver(access.customer_id, wsid);
        }
    });
});
