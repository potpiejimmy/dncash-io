import * as uuid from "uuid/v4"; // Random-based UUID
import * as Device from "./device";
import * as Token from "./token";
import * as redis from '../util/redis';
import * as config from "../config";

class TriggerEntry {
    expires: number;
    cashDeviceId: number;
    response: any;
}

let triggerMap: Map<string, TriggerEntry> = new Map();

let redisSubscriber;
let redisPublisher;
let redisTriggerMap;

if (redis.isEnabled()) {
    redisSubscriber = redis.createClient();
    redisPublisher = redis.createClient();
    redisTriggerMap = redis.createClient();
    redisSubscriber.on('message', (channel,message) => {
        let data = JSON.parse(message);
        localSendToken(data.triggercode, data.token);
    });
    redisSubscriber.subscribe('trigger');
}

function cleanUp() {
    // clean out expired entries:
    let now = Date.now();
    Object.keys(triggerMap).forEach(t => {
        if (triggerMap[t].expires < now) {
            delete triggerMap[t];
        }
    })
}

export function createTrigger(customer: any, device_uuid: string): Promise<any> {
    cleanUp();

    return Device.findByCustomerAndUUID(customer, device_uuid).then(cashDevice => {
        if (!cashDevice) throw "Sorry, device with UUID " + device_uuid + " not found.";

        // create a new unique id
        let triggercode = uuid();
        let trigger = {
            expires: Date.now() + config.TRIGGER_CODE_VALIDITY_SECONDS * 1000,
            cashDeviceId: cashDevice.id
        };

        triggerMap[triggercode] = trigger;

        let result = {
            triggercode: triggercode
        };

        let response = Promise.resolve();
        if (redis.isEnabled())
            response = response.then(() => redis.setValue(redisTriggerMap, triggercode, trigger, config.TRIGGER_CODE_VALIDITY_SECONDS));

        // return the new trigger code
        return response.then(() => result);
    });
}

export function registerTrigger(customer: any, triggercode: string, tokenReceiver: any): Promise<TriggerEntry> {
    cleanUp();

    return getTrigger(triggercode).then(trigger => {
        if (!trigger) return Promise.reject("Trigger " + triggercode + " not found.");

        // set response field in local trigger
        trigger.response = tokenReceiver;
    });
}

export function notifyTrigger(triggercode: string, radio_code: string): Promise<any> {
    return getTrigger(triggercode).then(trigger => {
        if (!trigger) return Promise.reject("Trigger " + triggercode + " not found.");

        return Token.verifyAndLockByTrigger(trigger.cashDeviceId, radio_code).then(t => {
            // send the token out
            sendToken(triggercode, t);
        });
    });
}

function getTrigger(triggercode: string): Promise<TriggerEntry> {
    let trigger = triggerMap[triggercode];
    if (!trigger && redis.isEnabled()) {
        // read from redis if not locally available
        return redis.getValue(redisTriggerMap, triggercode).then(trigger => {
            if (trigger) triggerMap[triggercode] = trigger;
            return trigger;  
        });

    } else {
        return Promise.resolve(trigger);
    }
}

function sendToken(triggercode: string, token: any) {
    if (redis.isEnabled()) {
        redisPublisher.publish('trigger', JSON.stringify({
            triggercode: triggercode,
            token: token
        }));
    } else {
        localSendToken(triggercode, token);
    }
}

function localSendToken(triggercode: string, token: any) {
    let trigger = triggerMap[triggercode];
    // do nothing if not known locally
    if (!trigger || !trigger.response) return;
    // send the token to the trigger registrar
    trigger.response.json(token);
}
