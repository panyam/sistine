
import * as geom from "../../Geom/models"
import * as geomutils from "../../Geom/utils"
import * as models from "../../Core/models"
import * as controller from "../../Core/controller"

const Length = geom.Length;

export class Circle extends models.Shape {
    constructor(configs) {
        super((configs = configs || {}));
        this.cx = configs.cx;
        this.cy = configs.cy;
        this.radius = configs.radius || 10;
    }

    get controllerClass() { return Circle.Controller; }

    get cx() { return this._cx; }
    get cy() { return this._cy; }
    get radius() { return this._radius; }
    set cx(value) { this._cx = Length.parse(value); }
    set cy(value) { this._cy = Length.parse(value); }
    set radius(value) {
        this._radius = Length.parse(value);
        if (this._radius.value < 0) {
            throw new Error("Radius cannot be negative");
        }
    }

    _evalBoundingBox() {
        var r = this._radius.pixelValue;
        return new geom.Bounds(this._cx.pixelValue - r, this._cy.pixelValue - r, r * 2, r * 2);
    }
    _setBounds(newBounds) {
        this._center.x = newBounds.centerX;
        this._center.y = newBounds.centerY;
        this._radius = newBounds.innerRadius;
    }
    canSetBounds(newBounds) {
        newBounds.width = newBounds.height = Math.min(newBounds.width, newBounds.height);
        return true;
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
