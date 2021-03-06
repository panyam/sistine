
/**
 * Connect events from the different components to affect each other's behaviours.
 */
function connectEventHandlers() {
    // 1. When selection changes, we want different panels/toolbuttons to react to this.
    var theStage = theApp.stage;
    var selection = theStage.selection;
    theStage.selection.on("ShapesSelected", function(eventType, source, event) {
        console.log("Shapes Selected: ", event.shapes);
        if (selection.count == 1) {
            // if we have a single shape in our selection, we can set fill properties from this shape
            setFillPropertiesFromShape(selection.get(0));
        }
    }).on("ShapesUnselected", function(eventType, source, event) {
        console.log("Shapes Unselected: ", event.shapes);
        if (selection.count == 1) {
            setFillPropertiesFromShape(selection.get(0));
        }
    });

    // 2. When properties in sidebar changes, we want shapes to reflect those
    // theSidebar.fillProperties
    theApp.fillPropertiesPanel.on("styleChanged", function(eventType, source, event) {
        var currentStyle = theApp.fillPropertiesPanel.paintStylePanel.currentStyle;
        console.log(eventType, event, "Style: ", currentStyle);
        selection.forEach(function(shape) {
            if (currentStyle.copy) {
                currentStyle = currentStyle.copy();
            }
            shape.fillStyle = currentStyle;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });

    // 2. When properties in sidebar changes, we want shapes to reflect those
    // theSidebar.fillProperties
    theApp.strokePropertiesPanel.on("styleChanged", function(eventType, source, event) {
        var currentStyle = theApp.strokePropertiesPanel.paintStylePanel.currentStyle;
        console.log(eventType, event, "Style: ", currentStyle);
        selection.forEach(function(shape) {
            if (currentStyle.copy) {
                currentStyle = currentStyle.copy();
            }
            shape.strokeStyle = currentStyle;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });

    theApp.strokePropertiesPanel.on("dashOffsetChanged", function(eventType, source, event) {
        selection.forEach(function(shape) {
            shape.lineDashOffset = theApp.strokePropertiesPanel.dashOffset;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });

    theApp.strokePropertiesPanel.on("miterLimitChanged", function(eventType, source, event) {
        selection.forEach(function(shape) {
            shape.miterLimit = theApp.strokePropertiesPanel.miterLimit;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });

    theApp.strokePropertiesPanel.on("lineWidthChanged", function(eventType, source, event) {
        selection.forEach(function(shape) {
            shape.lineWidth = theApp.strokePropertiesPanel.lineWidth;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });

    theApp.strokePropertiesPanel.on("lineCapChanged", function(eventType, source, event) {
        selection.forEach(function(shape) {
            shape.lineCap = theApp.strokePropertiesPanel.lineCap;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });

    theApp.strokePropertiesPanel.on("lineJoinChanged", function(eventType, source, event) {
        selection.forEach(function(shape) {
            shape.lineJoin = theApp.strokePropertiesPanel.lineJoin;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });

    theApp.strokePropertiesPanel.on("lineDashChanged", function(eventType, source, event) {
        selection.forEach(function(shape) {
            shape.lineDash = theApp.strokePropertiesPanel.lineDash;
            theStage.paneNeedsRepaint(shape.pane);
        });
    });
}

function setFillPropertiesFromShape(shape) {
}
