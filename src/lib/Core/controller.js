
import * as events from "./events";
import * as geom from "../Geom/models";

/////////////// Controllers 

export const HitType = {
    MOVE: 0,
    SIZE: 1,
    ROTATE: 2,
    CONTROL: 3,

    SIZE_N: 0,
    SIZE_NE: 1,
    SIZE_E: 2,
    SIZE_SE: 3,
    SIZE_S: 4,
    SIZE_SW: 5,
    SIZE_W: 6,
    SIZE_NW: 7,
}

export class ControlPoint {
    constructor(x, y, pointType, pointIndex, cursor, extraData) {
        this.x = x;
        this.y = y;
        this.pointType = pointType || 0;
        this.pointIndex = pointIndex || 0;
        this.cursor = cursor || "auto";
        this.extraData = extraData || null;
    }
}

export class HitInfo {
    constructor(shape, hitType, hitIndex, cursor, controlPoint) {
        this.hitShape = shape;
        this.controlPoint = controlPoint;
        this.hitType = hitType || 0;
        this.hitIndex = hitIndex || 0;
        this.cursor = cursor;
        this.controlPoint = controlPoint || null;
    }
}

/**
 * ShapeControllers provide information needed to facilitate updates to a shape as 
 * well as in accepting events to make updates to shapes.
 */
export class ShapeController {
    constructor(shape) {
        this._shape = shape;
        this._controlPointTS = 0;
        this._controlPoints = null;
    }

    get shape() {
        return this._shape;
    }

    get controlPoints() {
        if (this._controlPoints == null || this.shape._lastTransformed > this._controlPointTS) {
            this._controlPoints = this._evalControlPoints();
        }
        return this._controlPoints;
    }

    _evalControlPoints() {
        this._controlPointTS = Date.now();
        var lBounds = this.shape.boundingBox;
        var controlRadius = this.shape.controlRadius;
        var l = lBounds.left;
        var r = lBounds.right;
        var t = lBounds.top;
        var b = lBounds.bottom;
        var out = [];
        out.push(new ControlPoint((l + r) / 2, t, HitType.SIZE, 0, "n-resize"));
        out.push(new ControlPoint(r, t, HitType.SIZE, 1, "ne-resize"));
        out.push(new ControlPoint(r, (t + b) / 2, HitType.SIZE, 2, "e-resize"));
        out.push(new ControlPoint(r, b, HitType.SIZE, 3, "se-resize"));
        out.push(new ControlPoint((l + r) / 2, b, HitType.SIZE, 4, "s-resize"));
        out.push(new ControlPoint(l, b, HitType.SIZE, 5, "sw-resize"));
        out.push(new ControlPoint(l, (t + b) / 2, HitType.SIZE, 6, "w-resize"));
        out.push(new ControlPoint(l, t, HitType.SIZE, 7, "nw-resize"));

        var rotX = lBounds.right + 50;
        var rotY = lBounds.centerY;
        out.push(new ControlPoint(rotX, rotY, HitType.ROTATE, 0, "grab"));
        return out;
    }

    /**
     * Returns the "topmost" shape that can be hit at a given coordinate.
     */
    getHitInfo(gx, gy) {
        var newp = this.shape.globalTransform.apply(gx, gy, {});
        var x = newp.x;
        var y = newp.y;
        var controlRadius = this.shape.controlRadius;
        var controlPoints = this.controlPoints;
        for (var i = controlPoints.length - 1;i >= 0;i--) {
            var cp = controlPoints[i];
            if (cp.point.isWithin(x, y, controlRadius)) {
                return new HitInfo(this.shape, cp.pointType, cp.pointIndex, cp.cursor, cp);
            }
        }

        return this._checkMoveHitInfo(x, y)
    }

    _checkMoveHitInfo(x, y) {
        var boundingBox = this.shape.boundingBox;
        if (boundingBox.containsPoint(x, y)) {
            return new HitInfo(this.shape, HitType.MOVE, 0, "move");
        }
        return null;
    }

    snapshotFor(hitInfo) {
        return {'boundingBox': this.shape.boundingBox.copy(), rotation: this.shape.rotation};
    }

    applyHitChanges(hitInfo, savedInfo, downX, downY, currX, currY) {
        var deltaX = currX - downX;
        var deltaY = currY - downY;
        var shape = this.shape;
        console.log("ShapeController.applyHitInfo: ", deltaX, deltaY, shape.isGroup);
        if (hitInfo.hitType == HitType.MOVE) {
            shape.setBounds(savedInfo.boundingBox.move(deltaX, deltaY));
        } else if (hitInfo.hitType == HitType.SIZE) {
            var newTop = savedInfo.boundingBox.top;
            var newLeft = savedInfo.boundingBox.left;
            var newHeight = savedInfo.boundingBox.height;
            var newWidth = savedInfo.boundingBox.width;
            if (hitInfo.hitIndex == HitType.SIZE_N) {
                newHeight -= deltaY;
                newTop += deltaY;
            } else if (hitInfo.hitIndex == HitType.SIZE_NE) {
                newHeight -= deltaY;
                newWidth += deltaX;
                newTop += deltaY;
            } else if (hitInfo.hitIndex == HitType.SIZE_E) {
                newWidth += deltaX;
            } else if (hitInfo.hitIndex == HitType.SIZE_SE) {
                newHeight += deltaY;
                newWidth += deltaX;
            } else if (hitInfo.hitIndex == HitType.SIZE_S) {
                newHeight += deltaY;
            } else if (hitInfo.hitIndex == HitType.SIZE_SW) {
                newHeight += deltaY;
                newWidth -= deltaX;
                newLeft += deltaX;
            } else if (hitInfo.hitIndex == HitType.SIZE_W) {
                newLeft += deltaX;
                newWidth -= deltaX;
            } else if (hitInfo.hitIndex == HitType.SIZE_NW) {
                newHeight -= deltaY;
                newTop += deltaY;
                newLeft += deltaX;
                newWidth -= deltaX;
            }
            shape.setBounds(new geom.Bounds(newLeft, newTop, newWidth, newHeight));
        } else if (hitInfo.hitType == HitType.ROTATE) {
            var centerX = hitInfo.hitShape.boundingBox.centerX;
            var centerY = hitInfo.hitShape.boundingBox.centerY;
            var deltaX = currX - centerX;
            var deltaY = currY - centerY;
            var newAngle = 0;
            if (deltaX == 0) {
                if (deltaY > 0) {
                    newAngle = Math.PI / 2;
                } else {
                    newAngle = Math.PI * 3 / 2;
                }
            } else {
                newAngle = Math.atan(deltaY / deltaX);
            }
            if (deltaX < 0) {
                newAngle += Math.PI;
            }
            console.log("Rotating: ", deltaX, deltaY,
                        (deltaX == 0 ? "Inf" : deltaY / deltaX), newAngle);
            shape.rotateTo(newAngle);
        }
    }
}

