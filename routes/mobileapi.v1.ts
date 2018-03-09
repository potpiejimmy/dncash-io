import { Router, Request, Response, NextFunction } from "express";
import * as Trigger from "../business/trigger";

export const mobileApiV1: Router = Router();

/**
 * @swagger
 * /dnapi/mobile/v1/trigger/{triggercode}:
 *   put:
 *     summary: Verifies, locks and securely delivers a token to a cash device that has no radio or scanning capabilities
 *     description: This method verifies the given radio code, locks the associated token for
 *                  the cash device waiting on the trigger code endpoint and sends the
 *                  token data to the cash device.
 *                  
 *     tags:
 *       - Mobile API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: triggercode
 *         description: The trigger code scanned from the ATM
 *         in: path
 *         required: true
 *         type: string
 *       - name: body
 *         description: Radio code data
 *         required: true
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             radiocode:
 *               type: string
 *               description: the token's decrypted radio code
 *               example: 99237a8a-12b8-493b-9fc8-6cae149cb68403b14a962671
 *     responses:
 *       204:
 *         description: No content. Successful operation.
 */
mobileApiV1.put("/trigger/:triggercode", function (request: Request, response: Response, next: NextFunction) {
    Trigger.notifyTrigger(request.params.triggercode, request.body.radiocode)
    .then(res => {
        // send the token to the trigger registrar
        res.trigger.response.json(res.token);
        response.status(204).send();
    })
    .catch(err => next(err));
});
