
import * as events from "./events";
import * as geom from "./geom";

export const DEFAULT_CONTROL_SIZE = 5;

const ShapeGlobals = {
    _shapeCounter: 1
}

/**
 * Holds information about the instance of a shape.
 */
export class Shape {
    constructor(configs) {
        configs = configs || {};
        this.id = ShapeGlobals._shapeCounter++;
        this._scene = null;
        this._parent = null;
        this.isGroup = false;
        this.isVisible = true;
        this._children = [];
        this._globalTransform = new geom.Transform();
        this._lastTransformed = Date.now();

        this._bounds = new geom.Bounds(configs)
        // The reference width and height denote the "original" width and height
        // for this shape and is used as a way to know what the current "scale" is.
        this._refWidth = this._bounds.width;
        this._refHeight = this._bounds.height;
        this._controller = new ShapeController(this);

        // Observable properties
        this.name = configs.name || "";
        this.angle = configs.angle || 0;
        this.scale = configs.scale || new geom.Point(1, 1);
        this.zIndex = configs.zIndex || 0;
        this.lineWidth = configs.lineWidth || 2;
        this.lineJoin = configs.lineJoin || null;
        this.lineCap = configs.lineCap || null;
        this.miterLimit = configs.miterLimit || null;
        this.fillStyle = configs.fillStyle || null;
        this.strokeStyle = configs.strokeStyle || null;
    }

    childAtIndex(i) { return this._children[i]; } 
    get hasChildren() { return this._children.length > 0; } 
    get childCount() { return this._children.length; } 
    get parent() { return this._parent; } 
    get bounds() { return this._bounds; }
    get scene() { return this._scene; } 
    get controller() { return this._controller; }

    // Observable Properties that will trigger change events
    get name() { return this._name; }
    set name(value) { return this.set("name", value); }

    get angle() { return this._angle; }
    set angle(value) { return this.set("angle", value); }

    get zIndex() { return this._zIndex; }
    set zIndex(value) { return this.set("zIndex", value); }

    get lineWidth() { return this._lineWidth; }
    set lineWidth(value) { return this.set("lineWidth", value); }

    get lineJoin() { return this._lineJoin; }
    set lineJoin(value) { return this.set("lineJoin", value); }

    get lineCap() { return this._lineCap; }
    set lineCap(value) { return this.set("lineCap", value); }

    get miterLimit() { return this._miterLimit; }
    set miterLimit(value) { return this.set("miterLimit", value); }

    get strokeStyle() { return this._strokeStyle; }
    set strokeStyle(value) { 
        if (value != null && typeof value === "string") {
            value = new styles.Literal(value);
        }
        return this.set("strokeStyle", value); 
    }

    get fillStyle() { return this._fillStyle; }
    set fillStyle(value) { 
        if (value != null && typeof value === "string") {
            value = new styles.Literal(value);
        }
        return this.set("fillStyle", value); 
    }

    /**
    * There are two ways to handle coordinates.  Globally or Locally
    * In Global method, a global coordinate (say on the screen) remains as is
    * and each element on the screen can tell you if a given global point 
    * lies within itself.   This is great when we are doing things like
    * handling mouse/touch hits to see where a global point falls within 
    * a shape.
    *
    * In the local method, the global coordinates are converted into a 
    * local system each time it is needed.  This way the shape does not need to know about screen coordinates and transformations etc.
    *
    * The second method is easier from the Shape's perspective but the global 
    * point has to be transformed through each parent in the hierarchy while doing a hit test.
    *
    * With the first method, a global transform change on a parent will modify the global transform parameter for all its children.   So if we expect transformations to be small enough making this parameter change in all children is not bad.
    *
    * But a transform could happen either via animation or via ui controls, so if a high refresh rate is required a tree walk to update this parameter could be expensive.  Instead updating on read could be a better option by seeing if a parent's transform has changed and only updating if the timestamp is newer.
    */
    get globalTransform() {
        var gt = this._globalTransform;
        if (this._parent != null) {
            var pt = this._parent.globalTransform;
            if (pt.timeStamp > gt.timeStamp ||
                this._lastTransformed > gt.timeStamp) {
                // updated ourselves
                this._globalTransform = this._updateTransform(pt.copy());
            }
        } else if (this._lastTransformed > gt.timeStamp) {
            this._globalTransform = this._updateTransform();
        }
        return this._globalTransform;
    }
    _updateTransform(result) {
        result = result || new geom.Transform();
        var cx = this._bounds.centerX;
        var cy = this._bounds.centerY;
        // Notice we are doing "invserse transforms here"
        // since we need to map a point "back" to global form
        result.translate(cx, cy)
              .rotate(- this.angle)
              .scale(1.0 / this.scale.x, 1.0 / this.scale.y)
              .translate(-cx, -cy);
        console.log("updated transform: ", this, result);
        return result;
    }

    set scene(s) {
        if (this.scene != s) {
            this._scene = s;
            for (var i = 0, L = this._children.length;i < L;i++) {
                this._children[i].scene = s;
            }
        }
    }

    forEachChild(handler, self, mutable) {
        var shapes = this._children;
        if (mutable == true) {
            shapes = shapes.slice(0, shapes.length);
        }
        for (var index in shapes) {
            var shape = shapes[index];
            if (handler(shape, index, self) == false)
                break;
        }
    }

    canSetProperty(property, newValue) {
        var oldValue = this["_" + property];
        if (oldValue == newValue) 
            return null;
        var event = new events.PropertyChanged(property, oldValue, newValue);
        if (this.shouldTrigger(event) == false)
            return null;
        return event;
    }

    set(property, newValue) {
        var event = this.canSetProperty(property, newValue);
        if (event == null)
            return false;
        this["_" + property] = newValue;
        this.eventTriggered(event);
        return true;
    }

    canSetLocation(x, y) {
        if (x == this._bounds._x && y == this._bounds._y)
            return null;
        var oldValue = [ this._bounds._x, this._bounds._y ];
        var event = new events.PropertyChanged("location", oldValue, [ x, y ]);
        if (this.shouldTrigger(event) == false) 
            return null;
        return event;
    }

    setLocation(x, y) {
        var event = this.canSetLocation(x, y);
        if (event == null) return false;
        this._bounds._x = x;
        this._bounds._y = y;
        this._lastTransformed = Date.now();
        this.eventTriggered(event);
        return true;
    }

    canSetCenter(x, y) {
        if (x == this._bounds.centerX && y == this._bounds.centerY)
            return null;
        var oldValue = [ this._bounds.midX, this._bounds.midY ];
        var event = new events.PropertyChanged("center", oldValue, [x, y]);
        if (this.shouldTrigger(event) == false) 
            return null;
        return event;
    }

    setCenter(x, y) {
        event = this.canSetCenter(x, y);
        if (event == null) return false;
        this._bounds.centerX = x;
        this._bounds.centerY = y;
        this._lastTransformed = Date.now();
        this.eventTriggered(event);
        return true;
    }

    canSetSize(w, h) {
        var oldWidth = this._bounds._width;
        var oldHeight = this._bounds._height;
        if (w == oldWidth && h == oldHeight)
            return null;
        var oldValue = [ oldWidth, oldHeight ];
        var event = new events.PropertyChanged("bounds", oldValue, [ w, h ]);
        if (this.shouldTrigger(event) == false)
            return null;
        var C2 = DEFAULT_CONTROL_SIZE + DEFAULT_CONTROL_SIZE;
        if (w <= C2 || h <= C2)
            return null;
        return event;
    }

    setSize(w, h) {
        var event = this.canSetSize(w, h);
        if (event == null) return false;
        this._bounds.width = w;
        this._bounds.height = h;
        this._lastTransformed = Date.now();
        this.eventTriggered(event);
        return true;
    }

    canSetAngle(theta) {
        if (theta == this._angle) 
            return null;
        var event = new events.PropertyChanged("angle", this.angle, theta);
        if (this.shouldTrigger(event) == false)
            return null;
        return event;
    }

    setAngle(theta) {
        var event = this.canSetAngle(theta);
        if (event == null) return false;
        this._angle = theta;
        this._lastTransformed = Date.now();
        this.eventTriggered(event);
        return true;
    }

    setScale(sx, sy) {
        if (sx == 0 || sy == 0) return false;
        this.configs._scaleX = sx;
        this.configs._scaleY = sy;
        this._lastTransformed = Date.now();
        return true;
    }

    move(dx, dy) {
        return this.setLocation(this.bounds.x + dx, this.bounds.y + dy);
    }

    scale(dx, dy) {
        return this.setSize(this.bounds.width * dx, this.bounds.height * dy);
    }

    rotate(dtheta, dy) {
        return this.setAngle(this.angle + dtheta);
    }

    /**
     * Adds a new shape to this group.
     * Returns true if a shape was successfully added
     * false if the addition was blocked.
     */
    add(shape, index) {
        index = index || -1;
        if (shape.parent != this) {
            var event = new events.ShapeAdded(this, shape);
            if (this.shouldTrigger(event) != false) {
                // remove from old parent - Important!
                if (shape.removeFromParent()) {
                    this._children.push(shape);
                    shape._parent = this;
                    shape.scene = this.scene;
                    this.eventTriggered(event);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Removes an existing shape from this group.
     * Returns true if a shape was successfully removed,
     * false if the removal was blocked.
     */
    remove(shape) {
        if (shape.parent == this) {
            var event = new events.ShapeRemoved(this, shape);
            if (this.shouldTrigger(event) != false) {
                for (var i = 0;i < this._children.length;i++) {
                    if (this._children[i] == shape) {
                        this._children.splice(i, 1);
                        shape._parent = null;
                        this.eventTriggered(event);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    removeFromParent() {
        if (this.parent == null) return true;
        if (this.parent.remove(this)) {
            this._parent = null;
            return true;
        }
        return false;
    }

    /**
     * Brings a child shape forward by one level.
     */
    bringForward(shape) {
        if (shape.parent != this) return ;
        var index = this._children.indexOf(shape);
        if (index >= 0 && index < this._children.length - 1) {
            var temp = this._children[index];
            this._children[index] = this._children[index + 1];
            this._children[index + 1] = temp;
        }
    }

    /**
     * Sends a child shape backward by one index.
     */
    sendBackward(shape) {
        if (shape.parent != this) return ;
        var index = this._children.indexOf(shape);
        if (index > 0) {
            var temp = this._children[index];
            this._children[index] = this._children[index - 1];
            this._children[index - 1] = temp;
        }
    }

    /**
     * Brings a child shape to the front of the child stack.
     */
    bringToFront(shape) {
        if (shape.parent != this) return ;
        var index = this._children.indexOf(shape);
        if (index >= 0 && index < this._children.length - 1) {
            this._children.splice(index, 1);
            this._children.push(shape);
        }
    }

    /**
     * Sends a child shape to the back of the child stack.
     */
    sendToBack(shape) {
        if (shape.parent != this) return ;
        var index = this._children.indexOf(shape);
        if (index > 0) {
            this._children.splice(index, 1);
            this._children.splice(0, 0, shape);
        }
    }

    draw(ctx) {
        if (this._children.length > 0) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(this.bounds.left, this.bounds.top, this.bounds.width, this.bounds.height);
        }
    }

    /**
     * Draws this shape on a given context.
     */
    applyStyles(ctx, options) {
        if (this.fillStyle) {
            this.fillStyle.apply(this, "fillStyle", ctx);
        }
        if (this.strokeStyle) {
            this.strokeStyle.apply(this, "strokeStyle", ctx);
        }
        if (this.lineJoin) {
            ctx.lineJoin = this.lineJoin;
        }
        if (this.lineCap) {
            ctx.lineCap = this.lineCap;
        }
        if (this.lineWidth) {
            ctx.lineWidth = this.lineWidth;
        }
    }

    applyTransforms(ctx) {
        var angle = this.angle;
        if (angle) {
            ctx.save(); 
            var cx = this.bounds.centerX;
            var cy = this.bounds.centerY;
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.translate(-cx, -cy);
        }
    }

    revertTransforms(ctx) {
        var angle = this.angle;
        if (angle) {
            ctx.restore(); 
        }
    }

    drawControls(ctx, options) {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(this.bounds.left, this.bounds.top, this.bounds.width, this.bounds.height);

        var l = this.bounds.left;
        var r = this.bounds.right;
        var t = this.bounds.top;
        var b = this.bounds.bottom;
        var sizePoints = [
            [l, t],
            [(l + r) / 2, t],
            [r, t],
            [r, (t + b) / 2],
            [r, b],
            [(l + r) / 2, b],
            [l, b],
            [l, (t + b) / 2]
        ]
        for (var i = sizePoints.length - 1;i >= 0;i--) {
            var px = sizePoints[i][0];
            var py = sizePoints[i][1];
            ctx.strokeRect(px - DEFAULT_CONTROL_SIZE, py - DEFAULT_CONTROL_SIZE,
                           DEFAULT_CONTROL_SIZE + DEFAULT_CONTROL_SIZE,
                           DEFAULT_CONTROL_SIZE + DEFAULT_CONTROL_SIZE);
        }
        // Draw the "rotation" control
        ctx.beginPath();
        geom.pathEllipse(ctx, this.bounds.right + 50 - DEFAULT_CONTROL_SIZE, 
                         this.bounds.centerY - DEFAULT_CONTROL_SIZE, 
                         DEFAULT_CONTROL_SIZE * 2, DEFAULT_CONTROL_SIZE * 2);
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.moveTo(this.bounds.right, this.bounds.centerY);
        ctx.lineTo(this.bounds.right + 50, this.bounds.centerY);
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    }

    /**
     * Returns true if this shape contains a particular coordinate, 
     * false otherwise.
     */
    containsPoint(x, y) {
        var newp = this.globalTransform.apply(x, y, {});
        return this.bounds.containsPoint(newp.x, newp.y);
    }

    /**
     * Returns true if this shape intersects another bounds instance,
     * false otherwise.
     */
    intersects(anotherBounds) {
        return this.bounds.intersects(anotherBounds);
    }

    // Event handling
    /**
     * All events are syncronous and follow a "shouldTriggerX" followed by a 
     * "triggerX" call.  This is a chance for listeners to "prevent" the sending 
     * of the event there by preventing a certain change that may be going on.
     */
    shouldTrigger(event) {
        // TODO: Currently we are using a Scene as a single "broker" for our 
        // events.  But this could be inefficient based on patterns.  So
        // at some point we may want to have multiple "brokers" we want to use
        // to optimise for different cases, eg:
        // Many listeners for same kind of event
        // Many listeners for all events on a single shape only
        // Many listeners for all events etc.
        if (this.scene) {
            event.source = this;
            var out = true;
            if (this._controller)
                out = this._controller.shouldTrigger(event) != false;
            return out && (this.scene.shouldTrigger(event) != false);
        }
        return true;
    }

    /**
     * This is called after a particular change has been approved to 
     * notify that a change has indeed gone through.
     */
    eventTriggered(event) {
        if (this.scene) {
            event.source = this;
            var out = this.scene.eventTriggered(event) != false;
            if (this._controller) 
                out = out && (this._controller.eventTriggered(event) != false);
            return out;
        }
    }
}

/**
 * Creating explicit group class to handle groups of objects so that we 
 * can extend this to performing layouts etc on child chapes.
 */
export class Group extends Shape {
    constructor(configs) {
        super(configs);
        this.isGroup = true;
    }

    canSetSize(w, h) {
        var event = super.canSetSize(w, h);
        if (event != null) {
            // check if children sizes can be set.
        }
        return event;
    }

    /**
     * This is called after a particular change has been approved to 
     * notify that a change has indeed gone through.
     */
    eventTriggered(event) {
        super.eventTriggered(event);
        if (event.name == "PropertyChanged" && event.property == "bounds") {
            // adjust child sizes
        }
    }
}