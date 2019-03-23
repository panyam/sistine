
import * as counters from "./counters";
import * as events from "./events";
import * as dlist from "../Utils/dlist";
import * as styles from "./styles";
import * as controller from "./controller";
import * as geom from "../Geom/models"
import * as geomutils from "../Geom/utils"

export const DEFAULT_CONTROL_SIZE = 5;

export const EV_PROPERTY_CHANGED = 0;
export const EV_SHAPE_ADDED = 1;
export const EV_SHAPE_REMOVED = 2;

const ShapeCounter = new counters.Counter("ShapeIDs");

/**
 * The Scene is the raw model where all layers and shapes are 
 * managed.  As far as possible this does not perform any view 
 * related operations as that is decoupled into the view entity.
 */
export class Scene {
    constructor(configs) {
        configs = configs || {};
        this._eventHub =  new events.EventHub();
        this._layers = []
        this.addLayer();
        this._selectedLayer = 0;
    }

    get eventHub() { return this._eventHub; }

    layerAtIndex(index) {
        return this._layers[index];
    }

    get layers() {
        return this._layers;
    }

    get layerCount() {
        return this._layers.length;
    }

    get selectedLayer() {
        return this._selectedLayer;
    }

    set selectedLayer(index) {
        if (index != this._selectedLayer) {
            if (index >= 0 && index < this.layerCount) {
                this._selectedLayer = index;
            }
        }
    }

    add(shape) {
        return this._layers[this.selectedLayer].add(shape);
    }

    addLayer() {
        return this.insertLayer(-1);
    }

    removeLayer(index) {
        var layer = this._layers[index];
        layer.setScene(null);
        this._layers.splice(index, 1);
        return layer;
    }

    insertLayer(index) {
        var layer = new Layer();
        layer.setScene(this);
        if (index < 0) {
            this._layers.push(layer);
        } else {
            this._layers.splice(index, 0, layer);
        }
        return layer;
    }

    on(eventTypes, handler) {
        if (this._eventHub == null) {
            this._eventHub = new events.EventHub();
        }
        this._eventHub.on(eventTypes, handler);
        return this;
    }

    before(eventTypes, handler) {
        if (this._eventHub == null) {
            this._eventHub = new events.EventHub();
        }
        this._eventHub.before(eventTypes, handler);
        return this;
    }
}

/**
 * Holds information about the instance of a shape.
 */
export class Shape extends events.EventSource {
    constructor(configs) {
        super();
        configs = configs || {};
        this.id = ShapeCounter.next();
        this._scene = null;
        this._parent = null;
        this.isVisible = true;
        this._globalTransform = new geom.Transform();
        this._logicalBounds = null;
        this.markTransformed();
        this.controlRadius = DEFAULT_CONTROL_SIZE;

        // Transform properties
        this._rotation = 0;
        this._translation = new geom.Point(0, 0);
        this._scaleFactor = new geom.Point(1, 1);
        this._shearFactor = new geom.Point(1, 1);

        // The reference width and height denote the "original" width and height
        // for this shape and is used as a way to know what the current "scale" is.
        this._controller = null; 

        // Observable properties
        this.name = configs.name || this.className;
        this.zIndex = configs.zIndex || 0;
        this.lineWidth = configs.lineWidth || 2;
        this.lineJoin = configs.lineJoin || null;
        this.lineCap = configs.lineCap || null;
        this.miterLimit = configs.miterLimit || null;
        this.fillStyle = configs.fillStyle || null;
        this.strokeStyle = configs.strokeStyle || null;
    }

    get hasChildren() { return false; }

    get logicalBounds() {
        if (this._logicalBounds == null) {
            this._logicalBounds = this._evalBounds();
        }
        return this._logicalBounds;
    }

    markUpdated() { this._lastUpdated = Date.now(); }
    markTransformed() { 
        this.markUpdated();
        this._lastTransformed = Date.now(); 
    }

    get parent() { return this._parent; } 
    get scene() { return this._scene; } 
    get controller() { 
        if (this._controller == null) {
            this._controller = new controller.ShapeController(this);
        }
        return this._controller; 
    }

    // Observable Properties that will trigger change events
    get name() { return this._name; }
    set name(value) { return this.set("name", value); }

    get rotation() { return this._rotation; }
    set rotation(value) { return this.set("rotation", value); }

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

    get globalTransform() {
        var gt = this._globalTransform;
        if (this._parent != null) {
            var pt = this._parent.globalTransform;
            if (pt.timeStamp > gt.timeStamp ||
                this._lastUpdated > gt.timeStamp) {
                // updated ourselves
                this._globalTransform = this._updateTransform(pt.copy());
            }
        } else if (this._lastUpdated > gt.timeStamp) {
            this._globalTransform = this._updateTransform();
        }
        return this._globalTransform;
    }
    _updateTransform(result) {
        result = result || new geom.Transform();
        var cx = this._translation.x;
        var cy = this._translation.y;
        // Notice we are doing "invserse transforms here"
        // since we need to map a point "back" to global form
        result.translate(cx, cy)
              .rotate(- this._rotation)
              .scale(1.0 / this._scaleFactor.x, 1.0 / this._scaleFactor.y)
              .translate(-cx, -cy);
        console.log("updated transform: ", this, result);
        return result;
    }

    set controller(c) {
        if (this._controller != c) {
            this._controller = c;
        }
    }

    setScene(s) {
        if (this._scene != s) {
            // unchain previous scene
            this.markUpdated();
            if (this._scene) {
                this._eventHub.unchain(this._scene.eventHub);
            }
            this._scene = s;
            if (this._scene) {
                this._eventHub.chain(this._scene.eventHub);
            }
            return true;
        }
        return false;
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
        var event = new events.PropertyChanged(this, property, oldValue, newValue);
        if (this.validateBefore("PropertyChanged:" + property, event) == false)
            return null;
        return event;
    }

    set(property, newValue) {
        var event = this.canSetProperty(property, newValue);
        if (event == null)
            return false;
        this["_" + property] = newValue;
        this.markUpdated();
        this.triggerOn("PropertyChanged:" + property, event);
        return true;
    }

    move(dx, dy) { return this.moveTo(this._translation.x + dx, this._translation.y + dy); } 
    moveTo(x, y) {
        var oldX = this._translation.x;
        var oldY = this._translation.y;
        if (x == oldX && y == oldY) return false;

        var event = new events.GeometryChanged(this, "location", [ oldX, oldY ], [ x, y ]);

        if (this.validateBefore(event.name, event) == false) return false;

        this._translation.x = x;
        this._translation.y = y;
        this.markTransformed();
        this._locationChanged(oldX, oldY);
        this.triggerOn(event.name, event);
        return true;
    }
    scale(sx, sy) { return this.scaleTo(this._scaleFactor.x * sx, this._scaleFactor.y * sy); } 
    scaleTo(x, y) {
        var oldScaleX = this._scaleFactor.x;
        var oldScaleY = this._scaleFactor.y;
        if (x == oldScaleX && y == oldScaleY) return false;

        // Check minimum sizes
        var C2 = this.controlRadius + this.controlRadius;
        if (x * this.logicalBounds.width <= C2 || y * this.logicalBounds.height <= C2) return false;

        var event = new events.GeometryChanged(this, "scale", [ oldScaleX, oldScaleY ], [ x, y ]);
        if (this.validateBefore(event.name, event) == false) return false;

        this._scaleFactor.set(x, y);
        this.markTransformed();
        this._scaleChanged(oldScaleX, oldScaleY);
        this.triggerOn(event.name, event);
        return true;
    }
    rotate(theta) { return this.rotateTo(this._rotation + theta); }
    rotateTo(theta) {
        if (theta == this._rotation) return false;

        var event = new events.GeometryChanged(this, "angle", this._rotation, theta);
        if (this.validateBefore(event.name, event) == false) return false;

        var oldAngle = this._rotation;
        this._rotation = theta;
        this.markTransformed();
        this._rotationChanged(oldAngle);
        this.triggerOn(event.name, event);
        return true;
    }

    /**
     * A easy wrapper to control shape dimensions by just setting its bounds.
     * This will also reset the scaleFactor to 1.
     */
    setBounds(newBounds) {
        if (this.canSetBounds(newBounds)) {
            var oldBounds = this.logicalBounds.copy();
            var event = new events.GeometryChanged(this, "bounds", oldBounds, newBounds);
            if (this.validateBefore(event.name, event) == false) return false;
            this._scaleFactor.x = this._scaleFactor.y = 1.0;
            this._setBounds(newBounds);
            this._logicalBounds = null;
            this.markTransformed();
            this.triggerOn(event.name, event);
            return true;
        }
    } 
    canSetBounds(newBounds) { return true; }
    _setBounds(newBounds) {
        throw Error("Not Implemented for: ", this);
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
            if (this.validateBefore("ShapeAdded", event) != false) {
                // remove from old parent - Important!
                if (shape.removeFromParent()) {
                    this._children.push(shape);
                    shape._parent = this;
                    shape.setScene(this.scene);
                    this.triggerOn("ShapeAdded", event);
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
            if (this.validateBefore("ShapeRemoved", event) != false) {
                for (var i = 0;i < this._children.length;i++) {
                    if (this._children[i] == shape) {
                        this._children.splice(i, 1);
                        shape._parent = null;
                        this.triggerOn("ShapeRemoved", event);
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
     * Changes the index of a given shape within the parent.  The indexOrDelta 
     * parameter denotes whether a shape is to be moved to an absolute index or 
     * relative to its current position depending on the 'relative' parameter.
     */
    changeShapeIndex(shape, indexOrDelta, relative) {
        if (shape.parent != this) return ;

        var newIndex = indexOrDelta;
        if (relative || false) {
            newIndex = index + indexOrDelta;
        }

        if (newIndex < 0)
            newIndex = 0;
        if (newIndex >= this._children.length)
            newIndex = this._children.length - 1;

        var index = this._children.indexOf(shape);
        if (newIndex == index) {
            return ;
        }
        var event = new events.ShapeIndexChanged(shape, index, newIndex);
        if (this.validateBefore("ShapeIndexChanged", event) != false) {
            this._children.splice(index, 1);
            this._children.splice(newIndex, 0, shape);
            this.triggerOn("ShapeIndexChanged", event);
        }
    }

    /**
     * Brings a child shape forward by one level.
     */
    bringForward(shape) {
        return this.changeShapeIndex(shape, 1, true);

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
        return this.changeShapeIndex(shape, -1, true);

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
        return this.changeShapeIndex(shape, this._children.length, false);

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
        return this.changeShapeIndex(shape, 0, false);

        if (index > 0) {
            this._children.splice(index, 1);
            this._children.splice(0, 0, shape);
        }
    }

    draw(ctx) {
        if (this._children.length > 0) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 0.5;
            var lBounds = this.logicalBounds;
            ctx.strokeRect(lBounds.left, lBounds.top, lBounds.width, lBounds.height);
        }
    }

    /**
     * Draws this shape on a given context.
     */
    applyStyles(ctx, options) {
        if (this.fillStyle) {
            this.fillStyle.apply(this, "fillStyle", ctx);
        } else {
            ctx.fillStyle = null;
        }
        if (this.lineWidth > 0) {
            if (this.strokeStyle) {
                this.strokeStyle.apply(this, "strokeStyle", ctx);
            } else {
                ctx.strokeStyle = null;
            }
            ctx.lineJoin = this.lineJoin;
            ctx.lineCap = this.lineCap;
            ctx.setLineDash(this.lineDash || []);
            ctx.lineWidth = this.lineWidth;
            ctx.lineDashOffset = this.lineDashOffset;
        }
    }

    applyTransforms(ctx) {
        var angle = this._rotation;
        if (angle || this._scaleFactor.x != 1 || this._scaleFactor.y != 1 ||
            this._translation.x || this._translation.y) {
            ctx.save(); 
            var lBounds = this.logicalBounds;
            var cx = this.logicalBounds.centerX;
            var cy = this.logicalBounds.centerY;
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.scale(this._scaleFactor.x, this._scaleFactor.y);
            ctx.translate(-cx + this._translation.x, -cy + this._translation.y);
        }
    }

    revertTransforms(ctx) {
        var angle = this._rotation;
        if (angle) {
            ctx.restore(); 
        }
    }

    drawControls(ctx, options) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.5
        var lBounds = this.logicalBounds;
        var l = lBounds.left;
        var r = lBounds.right;
        var t = lBounds.top;
        var b = lBounds.bottom;
        ctx.strokeRect(l, t, lBounds.width, lBounds.height);
        ctx.fillStyle = "yellow";

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
            ctx.fillRect(px - this.controlRadius, py - this.controlRadius,
                           this.controlRadius + this.controlRadius,
                           this.controlRadius + this.controlRadius);
            ctx.strokeRect(px - this.controlRadius, py - this.controlRadius,
                           this.controlRadius + this.controlRadius,
                           this.controlRadius + this.controlRadius);
        }
        // Draw the "rotation" control
        ctx.beginPath();
        geomutils.pathEllipse(ctx, lBounds.right + 50 - this.controlRadius, 
                         lBounds.centerY - this.controlRadius, 
                         this.controlRadius * 2, this.controlRadius * 2);
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.moveTo(lBounds.right, lBounds.centerY);
        ctx.lineTo(lBounds.right + 50, lBounds.centerY);
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    }

    /**
     * Returns true if this shape contains a particular coordinate, 
     * false otherwise.
     */
    containsPoint(x, y) {
        var newp = this.globalTransform.apply(x, y, {});
        return this.logicalBounds.containsPoint(newp.x, newp.y);
    }

    /**
     * Returns true if this shape intersects another bounds instance,
     * false otherwise.
     */
    intersects(anotherBounds) {
        return this.logicalBounds.intersects(anotherBounds);
    }

    _locationChanged(oldX, oldY) { }
    _scaleChanged(oldW, oldH) { }
    _rotationChanged(oldAngle) { }
}

/**
 * Creating explicit group class to handle groups of objects so that we 
 * can extend this to performing layouts etc on child chapes.
 */
export class Group extends Shape {
    constructor(configs) {
        super(configs);
        this._children = [];
    }

    setScene(s) {
        if (!super.setScene(s)) return false;
        for (var i = 0, L = this._children.length;i < L;i++) {
            this._children[i].setScene(s);
        }
        return true;
    }

    childAtIndex(i) { return this._children[i]; } 
    get hasChildren() { return this._children.length > 0; } 
    get childCount() { return this._children.length; } 
}

export class Layer extends Group { 
    _evalBounds() {
        return new geom.Bounds(0, 0, 0, 0);
    }
}

/**
 * A wrapper over a path.
 */
export class Path extends Shape {
    constructor(configs) {
        super(configs);
        configs = configs || {};
        this._closed = configs.closed || false;
        this._moveTo = configs.moveTo || null;
        this._componentList = new dlist.DList();
        this._controller = new controller.PathController(this);
    }

    _setBounds(newBounds) {
        var oldBounds = this.logicalBounds;
        var sx = newBounds.width / oldBounds.width;
        var sy = newBounds.height / oldBounds.height;
        if (this._moveTo) {
            this._moveTo.x = newBounds.x + ((this._moveTo.x - oldBounds.x) * sx);
            this._moveTo.y = newBounds.y + ((this._moveTo.y - oldBounds.y) * sy);
        }
        var currComp = this._componentList.head;
        while (currComp != null) {
            var nCPT = currComp.numControlPoints;
            for (var i = nCPT - 1;i >= 0;i--) {
                var cpt = currComp.getControlPoint(i);
                var nx = newBounds.x + ((cpt.x - oldBounds.x) * sx);
                var ny = newBounds.y + ((cpt.y - oldBounds.y) * sy);
                currComp.setControlPoint(i, nx, ny);
            }
            currComp = currComp.next;
        }
    }

    _evalBounds() {
        var out = new geom.Bounds();
        if (this._moveTo) {
            out.x = this._moveTo.x;
            out.y = this._moveTo.y;
        }
        var currComp = this._componentList.head;
        while (currComp != null) {
            out.union(currComp.logicalBounds);
            currComp = currComp.next;
        }
        out.x -= 5;
        out.y -= 5;
        out.width += 10;
        out.height += 10;
        if (this.lineWidth > 0) {
            out.x -= this.lineWidth / 2;
            out.y -= this.lineWidth / 2;
            out.width += this.lineWidth;
            out.height += this.lineWidth;
        }
        return out;
    }

    /**
     * Add a new path component at the end of the path.
     */
    addComponent(component) {
        this._componentList.add(component);
        this.markTransformed();
    }

    get componentCount() {
        return this._componentList.count;
    }

    moveTo(x, y) {
        this._moveTo = new geom.Point(x, y);
        this.markTransformed();
    }

    close(yesorno) {
        this._closed = yesorno;
        this.markTransformed();
    }

    lineTo(x, y) { 
        this.addComponent(new LineToComponent(x, y));
    }
    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
        this.addComponent(new ArcComponent(x, y, radius, startAngle, endAngle, anticlockwise));
    }
    arcTo(x1, y1, x2, y2, radius) {
        this.addComponent(new ArcToComponent(this._cmdArcTo, x1, y1, x2, y2, radius));
    }
    quadraticCurveTo(cp1x, cp1y, x, y) {
        this.addComponent(new QuadraticCurveToComponent(cp1x, cp1y, x, y));
    }
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.addComponent(this.BezierCurveToComponent, cp1x, cp1y, cp2x, cp2y, x, y);
    }

    draw(ctx) {
        ctx.beginPath();
        if (this._moveTo != null)
            ctx.moveTo(this._moveTo.x, this._moveTo.y);
        var currComp = this._componentList.head;
        while (currComp != null) {
            currComp.draw(ctx);
            currComp = currComp.next;
        }
        if (this._closed) ctx.closePath();
        if (this.fillStyle) {
            ctx.fill();
        }
        if (this.lineWidth > 0) {
            ctx.stroke();
        }
        // Draw fornow till we figure out hit tests and bounding boxes
        // this.drawControls(ctx);
    }

    drawControls(ctx, options) {
        super.drawControls(ctx, options);
        ctx.fillStyle = "yellow";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        if (this._moveTo != null) {
            ctx.beginPath();
            ctx.arc(this._moveTo.x, this._moveTo.y, DEFAULT_CONTROL_SIZE, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        var currComp = this._componentList.head;
        while (currComp != null) {
            currComp.draw(ctx);
            for (var i = currComp.numControlPoints - 1;i >= 0;i--) {
                var cpt = currComp.getControlPoint(i);
                ctx.beginPath();
                ctx.arc(cpt.x, cpt.y, DEFAULT_CONTROL_SIZE, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
            currComp = currComp.next;
        }
    }
}

/**
 * A path is composed of several path components and form different kinds of units in a path
 * like lines, arcs, quadratic beziers etc.
 */
export class PathComponent {
    constructor() {
        this.next = null;
        this.prev = null;
        this._logicalBounds = null;
    }

    get logicalBounds() {
        if (this._logicalBounds == null) {
            this._logicalBounds = this._evalBounds();
        }
        return this._logicalBounds;
    }

    getControlPoint(i) { throw new Error( "Not implemented"); }
    setControlPoint(index, x, y) { throw new Error( "Not implemented"); }
    // get controlPoints() { return this._controlPoints; } 
    // setControlPoint(index, x, y) { this._controlPoints[index].set(x, y); this.markTransformed(); }
    get numControlPoints() { return 0; } 
}

export class LineToComponent extends PathComponent {
    constructor(x, y) {
        super();
        this._endPoint = new geom.Point(x, y);
    }

    _evalBounds() {
        var minx = this._endPoint.x;
        var miny = this._endPoint.y;
        var maxx = minx;
        var maxy = miny;
        if (this.prev) {
            minx = Math.min(minx, this.prev.endPoint.x);
            miny = Math.min(miny, this.prev.endPoint.y);
            maxx = Math.max(maxx, this.prev.endPoint.x);
            maxy = Math.max(maxy, this.prev.endPoint.y);
        }
        return new geom.Bounds(minx, miny, maxx - minx, maxy - miny);
    }

    get endPoint() { return this._endPoint; }

    draw(ctx) {
        ctx.lineTo(this._endPoint.x, this._endPoint.y);
    }

    getControlPoint(index) {
        return this._endPoint;
    }

    setControlPoint(index, x, y) {
        this._endPoint.set(x, y);
        this._logicalBounds = null;
    }

    get numControlPoints() {
        return 1;
    }
}

export class ArcComponent extends PathComponent {
    constructor(x, y, radius, startAngle, endAngle, anticlockwise) {
        super();
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.anticlockwise = anticlockwise;
        this._startPoint = geomutils.pointOnCircle(radius, startAngle);
        this._endPoint = geomutils.pointOnCircle(radius, endAngle);
        this._arcCenter = new geom.Point(x, y);
    }

    get endPoint() { return this._endPoint; }

    getControlPoint(index) {
        if (index == 0) {
            return this._endPoint;
        } else if (index == 1) {
            return this._startPoint;
        } else {
            return this._arcCenter;
        }
    }

    _evalBounds() {
        var minx = this._controlPoints[0].x;
        var miny = this._controlPoints[0].y;
        var maxx = minx;
        var maxy = miny;
        if (this.prev) {
            minx = Math.min(minx, this.prev.endPoint.x);
            miny = Math.min(miny, this.prev.endPoint.y);
            maxx = Math.max(maxx, this.prev.endPoint.x);
            maxy = Math.max(maxy, this.prev.endPoint.y);
        }
        return new geom.Bounds(minx, miny, maxx - minx, maxy - miny);
    }

    get numControlPoints() {
        return 1;
    }
}

export class ArcToComponent extends PathComponent {
    constructor(x1, y1, x2, y2, radius) {
        super();
        this.p1 = new geom.Point(x1, y1);
        this.p2 = new geom.Point(x2, y2);
        // TODO
        this._arcCenter = new geom.Point(-1, -1);
        this.radius = radius;
    }

    get endPoint() { return this.p2; }

    getControlPoint(index) {
        if (index == 0) {
            return this.p1;
        } else if (index == 1) {
            return this.p2;
        } else {
            return this._arcCenter;
        }
    }

    get numControlPoints() {
        return 3;
    }

    _evalBounds() {
        var minx = Math.min(this.p1.x, this.p2.x);
        var miny = Math.min(this.p1.y, this.p2.y);
        var maxx = Math.max(this.p1.x, this.p2.x);
        var maxy = Math.max(this.p1.y, this.p2.y);
        if (this.prev) {
            minx = Math.min(minx, this.prev.endPoint.x);
            miny = Math.min(miny, this.prev.endPoint.y);
            maxx = Math.max(maxx, this.prev.endPoint.x);
            maxy = Math.max(maxy, this.prev.endPoint.y);
        }
        return new geom.Bounds(minx, miny, maxx - minx, maxy - miny);
    }

    draw(ctx) {
        ctx.arcTo(this.p1.x, this.p1.y, this.p2.x, this.p2.x, this.radius);
    }
}

export class QuadraticToComponent extends PathComponent {
    constructor(x1, y1, x2, y2) {
        super();
        this.p1 = new geom.Point(x1, y1);
        this.p2 = new geom.Point(x2, y2);
    }

    _evalBounds() {
        var minx = Math.min(this.p1.x, this.p2.x);
        var miny = Math.min(this.p1.y, this.p2.y);
        var maxx = Math.max(this.p1.x, this.p2.x);
        var maxy = Math.max(this.p1.y, this.p2.y);
        if (this.prev) {
            minx = Math.min(minx, this.prev.endPoint.x);
            miny = Math.min(miny, this.prev.endPoint.y);
            maxx = Math.max(maxx, this.prev.endPoint.x);
            maxy = Math.max(maxy, this.prev.endPoint.y);
        }
        return new geom.Bounds(minx, miny, maxx - minx, maxy - miny);
    }

    draw(ctx) {
        ctx.quadraticCurveTo(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    }

    get endPoint() {
        return this.p2;
    }

    setControlPoint(index, x, y) {
        if (index == 0) {
            this.p1.set(x, y);
        } else {
            this.p2.set(x, y);
        }
        this._logicalBounds = null;
    }

    get numControlPoints() {
        return 2;
    }
}

export class BezierToComponent extends PathComponent {
    constructor(x1, y1, x2, y2, x3, y3) {
        super();
        this.p1 = new geom.Point(x1, y1);
        this.p2 = new geom.Point(x2, y2);
        this.p3 = new geom.Point(x3, y3);
    }

    draw(ctx) {
        ctx.bezierCurveTo(this.p1.x, this.p1.y, this.p2.x, this.p2.y, this.p3.x, this.p3.y);
    }

    get endPoint() {
        return this.p3;
    }

    setControlPoint(index, x, y) {
        if (index == 0) {
            this.p1.set(x, y);
        } else if (index == 1) {
            this.p2.set(x, y);
        } else {
            this.p3.set(x, y);
        }
        this._logicalBounds = null;
    }

    getControlPoint(i) {
        if (i == 0) {
            return this.p1;
        } else if (i == 1) {
            return this.p2;
        } else {
            return this.p3;
        }
    }

    get numControlPoints() {
        return 3;
    }

    _evalBounds() {
        var minx = Math.min(this.p1.x, this.p2.x, this.p3.x);
        var miny = Math.min(this.p1.y, this.p2.y, this.p3.y);
        var maxx = Math.max(this.p1.x, this.p2.x, this.p3.x);
        var maxy = Math.max(this.p1.y, this.p2.y, this.p3.y);
        if (this.prev) {
            minx = Math.min(minx, this.prev.endPoint.x);
            miny = Math.min(miny, this.prev.endPoint.y);
            maxx = Math.max(maxx, this.prev.endPoint.x);
            maxy = Math.max(maxy, this.prev.endPoint.y);
        }
        var out = new geom.Bounds(minx, miny, maxx - minx, maxy - miny);
        return out;
    }
}

export class Selection extends events.EventSource {
    constructor() {
        super();
        this._shapes = [];
        this._shapesById = {};
        this.savedInfos = {};
    }

    get count() {
        return this._shapes.length;
    }

    get allShapes() {
        var out = [];
        this.forEach(function(shape) {
            out.push(shape);
        });
        return out;
    }

    forEach(handler, self, mutable) {
        var shapesById = this._shapesById;
        if (mutable == true) {
            shapesById = Object.assign({}, shapesById);
        }
        for (var shapeId in shapesById) {
            var shape = shapesById[shapeId];
            if (handler(shape, self) == false)
                break;
        }
    }

    contains(shape) {
        return shape.id in this._shapesById;
    }
    
    get(index) {
        return this._shapes[index];
    }

    add(shape) {
        var event = new events.ShapesSelected(this, [shape]);
        if (this.validateBefore("ShapesSelected", event) != false) {
            if ( ! (shape.id in this._shapesById)) {
                this._shapes.push(shape);
            }
            this._shapesById[shape.id] = shape;
            this.savedInfos[shape.id] = shape.controller.snapshotFor();
            this.triggerOn("ShapesSelected", event);
        }
    }

    remove(shape) {
        var event = new events.ShapesUnselected(this, [shape]);
        if (this.validateBefore("ShapesUnselected", event) != false) {
            if ( shape.id in this._shapesById ) {
                for (var i = 0;i < this._shapes.length;i++) {
                    if (this._shapes[i].id == shape.id) {
                        this._shapes.splice(i, 1);
                        break ;
                    }
                }
            }
            delete this._shapesById[shape.id];
            delete this.savedInfos[shape.id];
            this.triggerOn("ShapesUnselected", event);
        }
    }

    checkpointShapes(hitInfo) {
        // Updated the save info for all selected shapes
        this.forEach(function(shape, self) {
            self.savedInfos[shape.id] = shape.controller.snapshotFor(hitInfo);
        }, this);
    }

    getSavedInfo(shape) {
        return this.savedInfos[shape.id];
    }

    toggleMembership(shape) {
        if (shape == null) return false;
        if (this.contains(shape)) {
            this.remove(shape);
            return false;
        } else {
            this.add(shape);
            return true;
        }
    }

    clear() {
        var event = new events.ShapesUnselected(this, this.allShapes);
        this.triggerOn("ShapesUnselected", event);
        this.savedInfos = {};
        this._shapes = [];
        this._shapesById = {};
        this._count = 0;
    }

    /**
     * Brings the selected shapes forward by one level within their parents.
     */
    bringForward() {
        this.forEach(function(shape) {
            shape.parent.bringForward(shape);
        });
    }

    /**
     * Sends the selected shapes backward by one level within their parents.
     */
    sendBackward() {
        this.forEach(function(shape) {
            shape.parent.sendBackward(shape);
        });
    }

    /**
     * Brings the selected shapes to the front of the stack within their parents.
     */
    bringToFront() {
        this.forEach(function(shape) {
            shape.parent.bringToFront(shape);
        });
    }

    /**
     * Sends the selected shapes to the back of the stack within their parents.
     */
    sendToBack() {
        this.forEach(function(shape) {
            shape.parent.sendToBack(shape);
        });
    }

    /**
     * Create a group out of the elements in this Selection.
     */
    group() {
        // Collect all shapes in this selection
        // Identify their parents.
        // Do they all have the same parent?
        // if all parents are "null" then they are all at the top level
        // if they are all non null but same then they are all at teh same 
        // level under the same parent so same as above and OK.
        // But if different shapes have different parents then only
        // those shapes that share a parent can be grouped together.
        var groups = {};
        this.forEach(function(shape) {
            var parId = shape.parent;
            if (parId) {
                parId = shape.parent.id;
            }
            if (! (parId in groups)) {
                groups[parId] = {
                    parent: shape.parent,
                    logicalBounds: shape.logicalBounds.copy(),
                    shapes: []
                };
            }
            groups[parId].shapes.push(shape);
            groups[parId].logicalBounds.union(shape.logicalBounds);
        });

        this.clear();
        for (var parentId in groups) {
            var currGroup = groups[parentId];
            var currBounds = currGroup.logicalBounds;
            var currParent = currGroup.parent;
            // Here create a new shape group if we have atleast 2 shapes
            if (currGroup.shapes.length > 1)  {
                var newParent = new models.Group();
                currParent.add(newParent);
                newParent.setLocation(currBounds.x, currBounds.y);
                newParent.setSize(currBounds.width, currBounds.height);
                currGroup.shapes.forEach(function(child, index) {
                    newParent.add(child);
                    child.setLocation(child.logicalBounds.x - currBounds.x, child.logicalBounds.y - currBounds.y);
                });
                this.add(newParent);
            }
        }
    }

    /**
     * Ungroups all elements in the current selection.  This is a no-op if number
     * of elements in the selection is not 1 and the existing element is not a ShapeGroup.
     */
    ungroup() {
        var selection = this;
        this.forEach(function(shape, self) {
            if (shape.isGroup) {
                selection.remove(shape);
                var newParent = shape.parent;
                var lBounds = shape.logicalBounds;
                shape.forEachChild(function(child, index, self) {
                    newParent.add(child);
                    child.setLocation(lBounds.x + child.logicalBounds.x,
                                      lBounds.y + child.logicalBounds.y);
                    selection.add(child);
                }, this, true);
                newParent.remove(shape);
            }
        }, this, true);
    }

    /**
     * Regroups elements in the selection.  This is useful if elements are added after
     * grouping and we want to add to existing groups consolidating multiple groups
     * into a single group.
     */
    regroup() {
    }

    /**
     * "Copies" the shapes in this selection to the clipboard along with their current state
     * so that it can be pasted later.   The "cut" parameter also dictates whether the
     * selected shapes are to be removed from the Scene model too.
     */
    copyToClipboard(cut) {
    }

    /**
     * Paste a copy of shapes stored in the clipboard.
     */
    pasteFromClipboard() {
    }
}
