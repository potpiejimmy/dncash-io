import { Router, Request, Response, NextFunction } from "express";
import { changeNotifier } from "../util/notifier";
import * as uuid from "uuid/v4"; // Random-based UUID

export const routerAdminV1Ws: Router = Router();

// ------- live websocket ------------

routerAdminV1Ws.ws("/tokenchange/:id", function (ws: WebSocket, req: Request) {
    registerWebSocket(ws, req, "token");
});

routerAdminV1Ws.ws("/cardauthchange/:id", function (ws: WebSocket, req: Request) {
    registerWebSocket(ws, req, "cardauth");
});

function registerWebSocket(ws: WebSocket, req: Request, scope: string) {
    let wsid = uuid();
//    console.log("WS Connect " + wsid);
    changeNotifier.addObserver(scope+":"+req.params.id, wsid, () => {
        try {
            ws.send('change');
        } catch (err) {
//            console.log("WS Remove " + wsid);
            changeNotifier.removeObserver(scope+":"+req.params.id, wsid);
        }
    });
    ws.onclose = () => {
//        console.log("WS Remove " + wsid);
        changeNotifier.removeObserver(scope+":"+req.params.id, wsid);
    }
};
