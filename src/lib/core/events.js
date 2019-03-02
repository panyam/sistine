
export class EventHandler {
    beforeEvent(eventType, event) { return true; }
    onEvent(eventType, event) { return true; }
}

export class EventHub {
    constructor() {
        this._handlers = {}
    }

    addHandler(eventType, handler) {
        var handlers = this._handlers;
        if (!(eventType in handlers)) {
            handlers[eventType] = [];
        }
        handlers[eventType].push(handler);
        return this;
    }

    removeHandler(eventType, handler) {
        var handlers = this._handlers[eventType] || [];
        for (var i = 0;i < handlers.length;i++) {
            if (handlers[i] == handler) {
                handlers.splice(i, 1);
                break;
            }
        }
        return this;
    }

    /**
     * This is called after a particular change has been approved to notify that 
     * a change has indeed gone through.
     */
    validateBefore(eventType, event) {
        var handlers = this._handlers[eventType] || [];
        var L = handlers.length;
        for (var i = 0;i < L;i++) {
            var handler = handlers[i];
            if (handler.beforeEvent(eventType, event) == false) {
                return false;
            }
        }
        return true;
    }

    triggerOn(eventType, event) {
        var handlers = this._handlers[eventType] || [];
        var L = handlers.length;
        for (var i = 0;i < L;i++) {
            var handler = handlers[i];
            if (handler.onEvent(eventType, event) == false) {
                return false;
            }
        }
        return true;
    }
}

export const GlobalHub = new EventHub();

export class Event {
    constructor(source) {
        this.source = source;
    }

    get name() { null.a = 3; }
}

export class PropertyChanged extends Event {
    constructor(property, oldValue, newValue) {
        super(null)
        this.property = property;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}

export class ShapeAdded extends Event {
    constructor(parent, shape) {
        super(null)
        this.parent = parent;
        this.shape = shape;
    }
}

export class ShapeRemoved extends Event {
    constructor(parent, shape) {
        super(null)
        this.parent = parent;
        this.shape = shape;
    }
}
