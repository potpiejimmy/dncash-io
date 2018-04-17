import * as redis from 'redis';
import * as logging from './logging';
import * as cfg from '../config';

class RedisNotifier {

    observers = {};
    redisSubscriber;
    redisPublisher;
    
    constructor() {
        if (cfg.USE_REDIS) {
            if (cfg.REDIS_URL) {
                this.redisSubscriber = redis.createClient({url:cfg.REDIS_URL});
                this.redisPublisher = redis.createClient({url:cfg.REDIS_URL});
            } else {
                this.redisSubscriber = redis.createClient();
                this.redisPublisher = redis.createClient();
            }

            this.redisSubscriber.on('ready', () => {
                logging.logger.info("Redis ready");
            });
            this.redisSubscriber.on('error', err => {
                logging.logger.error("Redis not ready: " + err);
            });
            this.redisSubscriber.on('message', (channel,message) => {
                this.localNotifyObservers(channel, JSON.parse(message));
            });
        }
    }

    private localNotifyObservers(scope: string, payload: any) {
        if (scope in this.observers) {
          Object.keys(this.observers[scope]).forEach(key => this.observers[scope][key](payload));
        }
    }

    addObserver(scope: string, id: string, observer: (payload: any) => void) {
        if (!(scope in this.observers)) {
            this.observers[scope] = {};
            if (this.redisSubscriber) this.redisSubscriber.subscribe(scope);
        }
        this.observers[scope][id] = observer;
    }

    removeObserver(scope: string, id: string) {
        if (scope in this.observers) {
            delete this.observers[scope][id];
            if (!Object.keys(this.observers[scope]).length) {
                delete this.observers[scope];
                if (this.redisSubscriber) this.redisSubscriber.unsubscribe(scope);
            }
        }
    }

    notifyObservers(scope: string, payload: any) {
        if (cfg.USE_REDIS)
            this.redisPublisher.publish(scope, JSON.stringify(payload));
        else
            this.localNotifyObservers(scope, payload);
    }
}

export let tokenChangeNotifier = new RedisNotifier();
