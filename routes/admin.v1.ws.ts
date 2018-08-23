import { Router, Request, Response, NextFunction } from "express";
import { changeNotifier } from "../util/notifier";
import * as uuid from "uuid/v4"; // Random-based UUID

export const routerAdminV1Ws: Router = Router();

// ------- live websocket ------------

routerAdminV1Ws.ws("/tokenchange/:id", function (ws: WebSocket, req: Request) {
    let wsid = uuid();
//    console.log("WS Connect " + wsid);
    changeNotifier.addObserver("token:"+req.params.id, wsid, () => {
        try {
            ws.send('change');
        } catch (err) {
//            console.log("WS Remove " + wsid);
            changeNotifier.removeObserver("token:"+req.params.id, wsid);
        }
    });
    ws.onclose = () => {
//        console.log("WS Remove " + wsid);
        changeNotifier.removeObserver("token:"+req.params.id, wsid);
    }
});
