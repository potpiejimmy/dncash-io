class Notifier {

    observers = {};

    addObserver(scope: string, id: string, observer: (payload: any) => void) {
        if (!(scope in this.observers)) this.observers[scope] = {};
        this.observers[scope][id] = observer;
    }

    removeObserver(scope: string, id: string) {
        if (scope in this.observers) {
            delete this.observers[scope][id];
        }
    }

    notifyObservers(scope: string, payload: any) {
        if (scope in this.observers) {
          Object.keys(this.observers[scope]).forEach(key => this.observers[scope][key](payload));
        }
    }
}

export let tokenChangeNotifier = new Notifier();
