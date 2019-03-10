
/**
 * Connect events from the different components to affect each other's behaviours.
 */
function connectEventHandlers() {
    // 1. When selection changes, we want different panels/toolbuttons to react to this.
    var theStage = theApp.stage;
    var selection = theStage.selection;
    theStage.selection.on("ShapesSelected", function(event, eventType) {
        console.log("Shapes Selected: ", event.shapes);
        if (selection.count == 1) {
            // if we have a single shape in our selection, we can set fill properties from this shape
            setFillPropertiesFromShape(selection.get(0));
        }
    }).on("ShapesUnselected", function(event, eventType) {
        console.log("Shapes Unselected: ", event.shapes);
        if (selection.count == 1) {
            setFillPropertiesFromShape(selection.get(0));
        }
    });

    // 2. When properties in sidebar changes, we want shapes to reflect those
    // theSidebar.fillProperties
    theApp.fillPropertiesPanel.on("opacityChanged", function(event) {
        console.log("Opacity: ", event);
        selection.forEach(function(shape) {
            shape.opacity = event.opacity;
        });
    }).on("styleChanged", function(event, eventType) {
        console.log(eventType, event);
        selection.forEach(function(shape) {
            shape.opacity = event.opacity;
        });
    });
}

function setFillPropertiesFromShape(shape) {
}
