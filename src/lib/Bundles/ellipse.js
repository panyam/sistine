

import * as models from "../Core/models"
import * as controller from "../Core/controller"
import * as geom from "../Utils/geom"

export function newShape(configs) {
    configs = configs || {};
    return new EllipseShape(configs);
}

export function newShapeForToolbar(configs) {
    configs = configs || {};
    configs.y = configs.height / 4;
    configs.height *= 0.7;
    return newShape(configs);
}

export class EllipseShape extends models.Shape {
    constructor(configs) {
        super(configs);
        this._controller = new EllipseController(this);
    }

    get className() { return "Ellipse"; };

    get radius() { return Math.min(this.bounds.width, this.bounds.height) / 2.0; }

    draw(ctx) {
        var lw = this.lineWidth + 1;
        var x = this.bounds.x + lw;
        var y = this.bounds.y + lw;
        var w = this.bounds.width - (2 * lw);
        var h = this.bounds.height - (2 * lw);

        ctx.beginPath();
        geom.pathEllipse(ctx, x, y, w, h);
        ctx.stroke();
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
export class EllipseController extends controller.ShapeController {
    constructor(shape) {
        super(shape);
    }
}