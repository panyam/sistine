
import * as text from "./text"
import * as path from "./path"
import * as circle from "./circle"
import * as ellipse from "./ellipse"
import * as line from "./line"
import * as rect from "./rect"
import * as g from "./g"
import * as svg from "./svg"
import * as defs from "./defs"
import * as use from "./use"
import * as audio from "./audio"
import * as desc from "./desc"
import * as gradients from "./gradients"

export const Nodes = {
    UseNodeProcessor: use.UseNodeProcessor,
    AudioNodeProcessor: audio.AudioNodeProcessor,
    DefsNodeProcessor: defs.DefsNodeProcessor,
    TextNodeProcessor: text.TextNodeProcessor,
    TSpanNodeProcessor: text.TSpanNodeProcessor,
    PathNodeProcessor: path.PathNodeProcessor,
    GNodeProcessor: g.GNodeProcessor,
    SVGNodeProcessor: svg.SVGNodeProcessor,
    LineNodeProcessor: line.LineNodeProcessor,
    CircleNodeProcessor: circle.CircleNodeProcessor,
    EllipseNodeProcessor: ellipse.EllipseNodeProcessor,
    RectNodeProcessor: rect.RectNodeProcessor,
    TitleNodeProcessor: desc.TitleNodeProcessor,
    DescNodeProcessor: desc.DescNodeProcessor,
    LinearGradientNodeProcessor: gradients.LinearGradientNodeProcessor,
    RadialGradientNodeProcessor: gradients.RadialGradientNodeProcessor,
}

