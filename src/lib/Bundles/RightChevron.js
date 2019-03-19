
import * as rightArrows from "./RightArrow"
import * as geom from "../Geom/models"
import * as geomutils from "../Geom/utils"

export function newShape(configs) {
    configs = configs || {};
    configs.shaftWidth = 1.0;
    configs.backDepth = 0.2;
    configs.tipLength = 0.2;
    configs._name = configs._name || "RightChevron";
    return new rightArrows.RightArrowShape(configs);
}

export function newShapeForToolbar(x, y, width, height, configs) {
    configs = configs || {};
    y += height / 4;
    height *= 0.6;
    configs.backDepth = 0.2;
    configs.tipLength = 0.2;
    configs.p1 = new geom.Point(x, y);
    configs.p2 = new geom.Point(x + width, y + height);
    return newShape(configs);
}

