import * as redis from 'redis';
import * as cfg from '../config';
import * as logging from './logging';

export function isEnabled() {
    return cfg.USE_REDIS;
}

/**
 * Returns a new Redis client using default connection parameters
 * or the URL specified in environment variable REDIS_URL if present.
 */
export function createClient(): any {
    if (cfg.REDIS_URL)
        return redis.createClient({url:cfg.REDIS_URL});
    else
        return redis.createClient();
}

export function waitForRedisReady(): Promise<void> {
    return new Promise(resolve => {
        if (!cfg.USE_REDIS) {
            // return if not enabled
            logging.logger.warn("Redis is disabled, clustering not supported");
            return resolve(); 
        }
        // wait until Redis connection ready
        let c = createClient();
        c.on('ready', () => {
            logging.logger.info("Redis ready");
            c.quit();
            resolve();
        });
        c.on('error', err => {
            logging.logger.error("Redis not ready: " + err);
        });
    });
}

export function getValue(client: any, key: string): Promise<any> {
    return new Promise(resolve => {
        client.get(key, (err,res) => resolve(res ? JSON.parse(res) : null));
    });
}

export function setValue(client: any, key: string, value: any, expiresInSec: number): Promise<void> {
    return new Promise(resolve => {
        client.set(key, JSON.stringify(value), 'EX', expiresInSec, (err, res) => resolve());
    });
}

export function deleteValue(client: any, key: string): Promise<void> {
    return new Promise(resolve => {
        client.del(key, (err, res) => resolve());
    });
}
