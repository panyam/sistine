
import * as base from "./base"
import { Core } from "../../Core/index"
import { Geom } from "../../Geom/index"
import { Utils } from "../../Utils/index"
import { Bundles } from "../../Bundles/index"
import * as parser from "../parser"
import * as models from "../models"
import * as layouts from "../layouts"

const CM = layouts.defaultCM;
const Builtins = Bundles.Builtins;
const Bounds = Geom.Models.Bounds;
const NumbersTokenizer = parser.NumbersTokenizer;
const PathDataParser = parser.PathDataParser;
const TransformParser = parser.TransformParser;
const Length = Geom.Models.Length;
const Point = Geom.Models.Point;
const forEachChild = Utils.DOM.forEachChild;
const forEachAttribute = Utils.DOM.forEachAttribute;

export class RectNodeProcessor extends base.NodeProcessor {
    get validChildren() {
        return base.animationElements.concat(base.descriptiveElements);
    }

    get validAttributes() {
        return base.conditionalProcessingAttributes
                .concat(base.coreAttributes)
                .concat(base.graphicalEventAttributes)
                .concat(base.presentationAttributes)
                .concat([ "class", "style", "externalResourcesRequired",
                          "transform", "x", "y", "rx", "ry",
                          "width", "height"]);
    }

    hasStyles() { return true; }
    hasTransforms() { return true; }

    processElement(elem, parent) {
        var out = new Builtins.Rectangle(configs);
        super.processElement(elem, out);
        CM.addXConstraint(out, "x", this.getLength(elem, "x"));
        CM.addYConstraint(out, "y", this.getLength(elem, "y"));
        CM.addXConstraint(out, "width", this.getLength(elem, "width"));
        CM.addYConstraint(out, "height", this.getLength(elem, "height"));
        CM.addXYConstraint(out, "rx", this.getLength(elem, "rx"));
        CM.addXYConstraint(out, "ry", this.getLength(elem, "ry"));
        parent.add(out);
        return out;
    }
}