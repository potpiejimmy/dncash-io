import * as mqtt from 'mqtt';
import * as cfg from '../config';
import * as logging from './logging';

export function isEnabled() {
    return cfg.USE_MQTT;
}

export function createClient(): any {
    return mqtt.connect(cfg.MQTT_URL);
}

export function waitForMQTTReady(): Promise<void> {
    if (!cfg.USE_MQTT) return Promise.resolve();
    logging.logger.info("MQTT enabled, trying to connnect " + cfg.MQTT_URL);
    return new Promise(resolve => {
        // wait until MQTT connection ready
        let c = createClient();
        c.on('connect', () => {
            logging.logger.info("MQTT ready");
            c.publish('dncash-io','dncash.io ready');
            c.end();
            resolve();
        });
        c.on('error', err => {
            logging.logger.error("MQTT not ready: " + err);
        });
    });
}
