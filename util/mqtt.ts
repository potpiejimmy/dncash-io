import * as mqtt from 'mqtt';
import * as cfg from '../config';
import * as logging from './logging';
import * as mosca  from 'mosca';

let moscaServer;

export function isEnabled() {
    return cfg.USE_MQTT;
}

export function createClient(): any {
    if (cfg.MQTT_USE_EMBEDDED) return null;
    return mqtt.connect(cfg.MQTT_URL, { username:cfg.MQTT_USER, password:cfg.MQTT_PASSWORD });
}

export function waitForMQTTReady(): Promise<void> {
    if (!cfg.USE_MQTT) return Promise.resolve();
    if (cfg.MQTT_USE_EMBEDDED) {
        logging.logger.info("MQTT enabled, starting embbeded instance using " + cfg.REDIS_URL);
        let redisURL = new URL(cfg.REDIS_URL);
        return new Promise(resolve => {
            moscaServer = new mosca.Server({
                port: cfg.MQTT_EMBEDDED_PORT,
                backend: {
                    type: 'redis',
                    redis: require('redis'),
                    db: 12,
                    port: redisURL.port,
                    return_buffers: true,
                    host: redisURL.hostname
                },
                persistence: {
                    factory: mosca.persistence.Redis,
                    host: redisURL.hostname,
                    port: redisURL.port
                },
                http: {
                    port: cfg.MQTT_EMBEDDED_PORT_HTTP,
                    bundle: true,
                    static: './'
                }
            });
            // allow only internal publishing:
            moscaServer.authorizePublish = (client, topic, payload, callback) => {
                logging.logger.warn("MQTT external publishing not allowed");
                callback(null, false);
            };
            moscaServer.on('ready', () => {
                logging.logger.info("MQTT embedded instance ready");
                resolve();
            });
            moscaServer.on('clientConnected', client => {
                logging.logger.info("MQTT client connected:", client.id);
            });
            moscaServer.on('clientDisconnected', client => {
                logging.logger.info("MQTT client disconnected:", client.id);
            });
        });
    } else {
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
}

export function publish(client: any, topic: string, data: any) {
    if (cfg.MQTT_USE_EMBEDDED) {
        moscaServer.publish({topic: topic, payload: JSON.stringify(data)});
    } else {
        client.publish(topic, JSON.stringify(data));
    }
}
