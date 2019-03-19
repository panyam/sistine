
import * as geom from "../Geom/models"
import * as geomutils from "../Geom/utils"
import * as models from "../Core/models"
import * as controller from "../Core/controller"

export function newShape(configs) {
    configs = configs || {};
    return new CircleShape(configs);
}

export function newShapeForToolbar(x, y, width, height, configs) {
    configs = configs || {};
    configs.center = new geom.Point(x + width / 2, y + height / 2);
    configs.radius = Math.min(width, height) / 2;
    return newShape(configs);
}

export class CircleShape extends models.Shape {
    constructor(configs) {
        super(configs);
        this._center = configs.center || new geom.Point(0, 0);
        this._radius = configs.radius || 10;
        this._controller = new CircleController(this);
    }

    _evalBounds() {
        return new geom.Bounds(this._center.x - this._radius,
                               this._center.y - this._radius,
                               this._radius * 2,
                               this._radius * 2);
    }

    get className() { return "Circle"; }

    get radius() { return this._radius; }

    setSize(w, h, force) {
        this._radius = Math.min(w, h);
        return super.setSize(this._radius, this._radius, force);
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this._center.x, this._center.y, this._radius, 0, 2 * Math.PI);
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
export class CircleController extends controller.ShapeController {
    constructor(shape) {
        super(shape);
    }
}
