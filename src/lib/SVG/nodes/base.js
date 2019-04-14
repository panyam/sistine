
import { Geom } from "../../Geom/index"
import { Utils } from "../../Utils/index"
import * as parser from "../parser"
import * as models from "../models"

const NumbersTokenizer = parser.NumbersTokenizer;
const PathDataParser = parser.PathDataParser;
const TransformParser = parser.TransformParser;
const Length = Geom.Models.Length;
const Point = Geom.Models.Point;
const forEachChild = Utils.DOM.forEachChild;
const forEachAttribute = Utils.DOM.forEachAttribute;

export const conditionalProcessingAttributes = [
    "requiredFeatures", "requiredExtensions", "systemLanguage"
];
export const coreAttributes = [
    "id", "xml:base", "xml:lang", "xml:space"
];
export const documentEventAttributes = [
    "onunload", "onabort", "onerror", "onresize", "onscroll", "onzoom"
];
export const graphicalEventAttributes = [
    "onfocusin", "onfocusout", "onactivate", "onclick", "onmousedown",
    "onmouseup", "onmouseover", "onmousemove", "onmouseout", "onload"
];
export const presentationAttributes = [
    "alignment-baseline", "baseline-shift", "clip", "clip-path", "clip-rule",
    "color", "color-interpolation", "color-interpolation-filters", 
    "color-profile", "color-rendering", "cursor", "direction", "display", 
    "dominant-baseline", "enable-background", "fill", "fill-opacity", 
    "fill-rule", "filter", "flood-color", "flood-opacity", "font-family", 
    "font-size", "font-size-adjust", "font-stretch", "font-style", 
    "font-variant", "font-weight", "glyph-orientation-horizontal", 
    "glyph-orientation-vertical", "image-rendering", "kerning", 
    "letter-spacing", "lighting-color", "marker-end", "marker-mid", 
    "marker-start", "mask", "opacity", "overflow", "pointer-events", 
    "shape-rendering", "stop-color", "stop-opacity", "stroke", 
    "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", 
    "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke-width", 
    "text-anchor", "text-decoration", "text-rendering", "unicode-bidi", 
    "visibility", "word-spacing", "writing-mode"
];
export const xlinkAttributes = [
    "xlink:href", "xlink:show", "xlink:actuate", "xlink:type", "xlink:role",
    "xlink:arcrole", "xlink:title"
];

export const textContentChildElements = [ "altGlyph", "textPath", "tref", "tspan" ];

export const animationElements = [
    "animate", "animateColor", "animateMotion", "animateTransform", "set"
];

export const descriptiveElements = [ "desc", "metadata", "title" ];

export const shapeElements = [
    "circle", "ellipse", "line", "path", "polygon", "polyline", "rect"
];
export const structuralElements = [ "defs", "g", "svg", "symbol", "use" ];
export const gradientElements = [ "linearGradient", "radialGradient" ];

function getAttribute(elem, attrib) {
    var value = elem.getAttribute(attrib);
    for (var i = 2;i < arguments.length;i++) {
        value = arguments[i](value);
    }
    return value;
}

export class NodeProcessor {
    constructor(loader) {
        this.loader = loader;
    }

    get configs() {
        return this.loader.configs;
    }

    get validChildren() {
        return [];
    }

    get validAttributes() {
        return [];
    }

    getLength(elem, attrib) {
        return Length.parse(elem.getAttribute(attrib) || 0);
    }

    processChildrenOf(elem, parent) {
        var loader = this.loader;
        forEachChild(elem, function(child, index) {
            loader.processElement(child, parent);
        });
    }

    processElement(elem, shape) {
        if (this.hasStyles) this.processStyleAttributes(elem, shape);
        if (this.hasTransforms) this.processTransformAttributes(elem, shape);
    }

    /**
     * Processing of different kinds of attributes.
     */
    processStyleAttributes(elem, shape) {
        shape.fillStyle = elem.getAttribute("fill");
        shape.fillRule = elem.getAttribute("fill-rule");
        shape.fillOpacity = elem.getAttribute("fill-opacity")
        shape.strokeStyle = elem.getAttribute("stroke");
        shape.lineWidth = elem.getAttribute("stroke-width");
        shape.lineCap = elem.getAttribute("stroke-linecap");
        shape.lineJoin = elem.getAttribute("stroke-linejoin");
        shape.miterLimit = elem.getAttribute("stroke-miterlimit");
        shape.strokeOpacity = elem.getAttribute("stroke-opacity");
        shape.dashArray = elem.getAttribute("stroke-dasharray");
        shape.dashOffset = elem.getAttribute("stroke-dashoffset");
        return shape;
    }

    processMetaAttributes(elem, shape) {
        if (elem.hasAttribute("version")) {
            shape.setMiscData("version", elem.getAttribute("version"));
        }
        if (elem.hasAttribute("baseProfile")) {
            shape.setMiscData("baseProfile", elem.getAttribute("baseProfile"));
        }
    }

    processBoundsAttributes(elem, bounds) {
        if (elem.hasAttribute("x")) {
            bounds.x = elem.getAttribute("x");
        }
        if (elem.hasAttribute("y")) {
            bounds.y = elem.getAttribute("y");
        }
        if (elem.hasAttribute("width")) {
            bounds.width = elem.getAttribute("width");
        }
        if (elem.hasAttribute("height")) {
            bounds.height = elem.getAttribute("height");
        }
    }

    processTransformAttributes(elem, shape) {
        var attrib = elem.getAttribute("transform");
        if (attrib) {
            var parser = new TransformParser(attrib);
            while (parser.hasNext()) {
                var command = parser.next();
                shape[command.name].apply(shape, command.args);
            }
        }
    }
}