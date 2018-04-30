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
 *                  token data to the cash device. This operation may be directly invoked from the
 *                  mobile device to establish a secure and direct communication channel for the verification
 *                  process. If a direct communication call outside the regular mobile phone's communication
 *                  channel is not feasible or not desired, the call can be routed through the appropriate
 *                  backend channels. To allow this, the call carries an additional signature field, signing
 *                  the random temporary trigger code along with the verification radio code with the device's
 *                  private key (the public key is known to dncash.io) so that the radio code alone can not
 *                  be used re-used if it is intercepted.
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
 *             signature:
 *               type: string
 *               description: signature from the trigger code string-concatenated with the radio code (fed into signature algorithm as ASCII string), using the device's public key, encoded as Base64
 *     responses:
 *       204:
 *         description: No content. Successful operation.
 */
mobileApiV1.put("/trigger/:triggercode", function (request: Request, response: Response, next: NextFunction) {
    Trigger.notifyTrigger(request.params.triggercode, request.body.radiocode, request.body.signature)
    .then(res => {
        response.status(204).send();
    })
    .catch(err => next(err));
});
