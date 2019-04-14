
import * as base from "./base"
import { Core } from "../../Core/index"
import { Geom } from "../../Geom/index"
import { Utils } from "../../Utils/index"
import { Bundles } from "../../Bundles/index"
import * as parser from "../parser"
import * as layouts from "../layouts"
import * as models from "../models"

const CM = layouts.defaultCM;
const Builtins = Bundles.Builtins;
const Bounds = Geom.Models.Bounds;
const NumbersTokenizer = parser.NumbersTokenizer;
const PathDataParser = parser.PathDataParser;
const TransformParser = parser.TransformParser;
const Point = Geom.Models.Point;
const forEachChild = Utils.DOM.forEachChild;
const forEachAttribute = Utils.DOM.forEachAttribute;

export class CircleNodeProcessor extends base.NodeProcessor {
    get validChildren() {
        return base.animationElements.concat(base.descriptiveElements);
    }

    get validAttributes() {
        return base.conditionalProcessingAttributes
                .concat(base.coreAttributes)
                .concat(base.graphicalEventAttributes)
                .concat(base.presentationAttributes)
                .concat([ "class", "style", "externalResourcesRequired",
                          "transform", "cx", "cy", "r"]);
    }

    hasStyles() { return true; }
    hasTransforms() { return true; }

    processElement(elem, parent) {
        var out = new Builtins.Circle();
        super.processElement(elem, out);
        CM.addXConstraint(out, "cx", this.getLength(elem, "cx"));
        CM.addYConstraint(out, "cy", this.getLength(elem, "cy"));
        CM.addXYConstraint(out, "radius", this.getLength(elem, "r"));
        parent.add(out);
        return out;
    }
}