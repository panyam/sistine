
import * as geom from "../../Geom/models"
import * as geomutils from "../../Geom/utils"
import * as models from "../../Core/models"
import * as controller from "../../Core/controller"

export class Triangle extends models.Shape {
    constructor(configs) {
        super((configs = configs || {}));
        this._p0 = configs.p0 || new geom.Point();
        this._p1 = configs.p1 || new geom.Point();
        this._p2 = configs.p2 || new geom.Point();
        this._controller = new Triangle(this);
    }

    _evalBounds() {
        var left = Math.min(this._p0.x, this._p1.x, this._p2.x);
        var top = Math.min(this._p0.y, this._p1.y, this._p2.y);
        var right = Math.max(this._p0.x, this._p1.x, this._p2.x);
        var bottom = Math.max(this._p0.y, this._p1.y, this._p2.y);
        return new geom.Bounds(left, top, right - left, bottom - top);
    }

    get className() { return "SVG"; }

    draw(ctx) {
        var p0x = this.bounds.left;
        var p0y = this.bounds.bottom;

        var p1x = (this.bounds.left + this.bounds.right) / 2;
        var p1y = this.bounds.top;

        var p2x = this.bounds.right;
        var p2y = this.bounds.bottom;

        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p0x, p0y);
        if (this.fillStyle) {
            ctx.fill();
        }
        if (this.lineWidth > 0) {
            ctx.stroke();
        }
    }
}

/**
 * The controller responsible for handling updates and manipulations of the Shape.
 */
Triangle.Controller = class TriangleController extends controller.ShapeController {
    constructor(shape) {
        super(shape);
    }
}