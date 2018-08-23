import * as redis from './redis';
import * as logging from './logging';

class RedisNotifier {

    observers = {};
    redisSubscriber;
    redisPublisher;
    
    constructor() {
        if (redis.isEnabled()) {
            this.redisSubscriber = redis.createClient();
            this.redisPublisher = redis.createClient();

            this.redisSubscriber.on('message', (channel,message) => {
                this.localNotifyObservers(channel, JSON.parse(message));
            });
            this.redisSubscriber.on('error', err => {
                logging.logger.error("Notifier: Redis not ready: " + err);
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
        if (redis.isEnabled())
            this.redisPublisher.publish(scope, JSON.stringify(payload));
        else
            this.localNotifyObservers(scope, payload);
    }
}

export let changeNotifier = new RedisNotifier();
