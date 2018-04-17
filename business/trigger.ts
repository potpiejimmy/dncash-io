import * as uuid from "uuid/v4"; // Random-based UUID
import * as Device from "./device";
import * as Token from "./token";
import * as redis from 'redis';
import * as config from "../config";

class TriggerEntry {
    triggercode: string;
    expires: number;
    cashDeviceId: number;
    response: any;
}

let triggerMap: Map<string, TriggerEntry> = new Map();

let redisSubscriber;
let redisPublisher;

if (config.USE_REDIS) {
    if (config.REDIS_URL) {
        redisSubscriber = redis.createClient({url:config.REDIS_URL});
        redisPublisher = redis.createClient({url:config.REDIS_URL});
    } else {
        redisSubscriber = redis.createClient();
        redisPublisher = redis.createClient();
    }
    redisSubscriber.on('message', (channel,message) => {
        if (channel === 'register') {
            let t = JSON.parse(message);
            triggerMap[t.triggercode] = t;
        } else if (channel === 'notify') {
            // TODO
        }
    });
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

        // create a new and unique id
        let triggercode = uuid();
        while (triggerMap[triggercode]) triggercode = uuid();

        triggerMap[triggercode] = {
            triggercode: triggercode,
            expires: Date.now() + config.TRIGGER_CODE_VALIDITY_SECONDS * 1000,
            cashDeviceId: cashDevice.id
        };

        // return the new trigger code
        return {
            triggercode: triggercode
        };
    });
}

export function registerTrigger(customer: any, triggercode: string): Promise<TriggerEntry> {
    cleanUp();

    let trigger = triggerMap[triggercode];
    if (!trigger) return Promise.reject("Trigger " + triggercode + " not found.");

    return Promise.resolve(trigger);
}

export function notifyTrigger(triggercode: string, radio_code: string): Promise<any> {
    let trigger = triggerMap[triggercode];
    if (!trigger) return Promise.reject("Trigger " + triggercode + " not found.");

    return Token.verifyAndLockByTrigger(trigger.cashDeviceId, radio_code).then(t => {
        // return token and trigger
        return {
            token: t,
            trigger: trigger
        }
    });
}
