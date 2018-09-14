import { Router, Request, Response, NextFunction } from "express";
import * as Trigger from "../business/trigger";

export const mobileApiV1: Router = Router();

/**
 * @swagger
 * /dnapi/mobile/v1/trigger:
 *   post:
 *     summary: Verifies, locks and securely delivers a token to a cash device
 *     description: This method verifies the given radio code, locks the associated token for
 *                  the cash device waiting on the trigger code endpoint and sends the
 *                  token data to the cash device. This operation may be directly invoked from the
 *                  mobile device to establish a secure and direct communication channel for the verification
 *                  process. If a direct communication call outside the regular mobile phone's communication
 *                  channel is not feasible or not desired, the call can also be routed through the appropriate
 *                  backend channels. Therefore, the call carries an additional signature field, signing
 *                  the random temporary trigger code along with the verification radio code with the device's
 *                  private key so that the radio code alone can not be used on other cash devices if it is intercepted.
 *
 *     tags:
 *       - Mobile API
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: Signed trigger and radio code data
 *         required: true
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             triggercode:
 *               type: string
 *               description: The trigger code scanned or received from the ATM
 *               example: 75442486-0878-440c-9db1-a7006c25a39f
 *             radiocode:
 *               type: string
 *               description: the token's radio code (the token UUID + the decrypted secure_code as hex string)
 *               example: 99237a8a-12b8-493b-9fc8-6cae149cb68403b14a962671
 *             signature:
 *               type: string
 *               description: SHA256-hashed signature of the string-concatenation of triggercode+radiocode (fed into the algorithm as ASCII string), using the device's public key, encoded as Base64
 *               example: FEoIoW9LaGavgjPy8uGdkRRnq0kGy95/ZIebqyPrrEGwdTvqqFjn8LKmUrkePzzQuTVPFqs/cpT/OiDNpA4TbE4i1tlRfdBTaz1l/jwgf2XE/9zc4+D7qiMHnnt6lMnm2+AJj0KzAUplRr5OeXAi4UyunmKxfHRVH2E4J9Vcu0c547MQNYICp2mcYvYhK5zHPol6UNS4ISVaabqP+BsasyvUL/92EQ5tn5dgXseV6ULGnS3/q34wkJ2+hZs5ergFm0zBQus6wYe4n5J82jelLng31ukLHZnNAMG7a6lE7FBBKl8aPN7z09EC/XhCR3pSnDHRGLSbq5eaqNlGuI+Q9w==
 *     responses:
 *       204:
 *         description: No content. Successful operation.
 */
mobileApiV1.post("/trigger", function (request: Request, response: Response, next: NextFunction) {
    Trigger.notifyTrigger(request.body.triggercode, request.body.radiocode, request.body.signature)
    .then(res => {
        response.status(204).send();
    })
    .catch(err => next(err));
});
