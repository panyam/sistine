
function loadShapes() {
    var shape_icons = $(".shape_icon");
    shape_icons.each(function(index, icondiv) {
        // We have divs where these buttons should go.
        // What we need is some kind of element in these buttons, that will:
        // 1. Show the icon corresponding to that button
        // 2. Add a drag handler that will let us drop that *component* onto the canvas
        // 3. Associate the button to an actual node component.
        // 4. This implies the node component corresponding to the ID will be responsible for the above.
        var $icondiv = $(icondiv)
        $icondiv.empty()

        var shapeId = icondiv.id.replace(/holder_/, "");
        var iconStage = iconStages[shapeId] = new Sistine.Views.Stage.Stage(icondiv.id);
        var topPane = iconStage.getPane("main");
        var $child = topPane.element;

        var margin = 3;
        var toolbarShape = DefaultBundle[shapeId].newShapeForToolbar({
            lineWidth: 2,
            x: margin,
            y: margin,
            width: $child.width() - (
                Sistine.Utils.DOM.getcssint($child, "margin-left") +
                Sistine.Utils.DOM.getcssint($child, "margin-right")
            ) - (margin * 2),
            height: $child.height() - (
                Sistine.Utils.DOM.getcssint($child, "margin-top") +
                Sistine.Utils.DOM.getcssint($child, "margin-bottom")
            ) - (margin * 2)
        });
        iconStage.scene.add(toolbarShape);
        iconStage.layout();
        // topPane.element.tooltip();

        // Setup highlighter!
        topPane.element.mouseover(function(event) {
            $(event.currentTarget).addClass("toolbar_button_highlighted");
        }).mouseout(function(event) {
            $(event.currentTarget).removeClass("toolbar_button_highlighted");
        }).click(function(event) {
            // Add the shape on the canvas at the center
            var id = event.currentTarget.id.replace(/mainpane_holder_/, "");
            var configs = Object.assign({}, shapeDefaults);
            theStage.setTouchContext(TouchModes.CREATE, DefaultBundle[id].newShape(configs));
        });
    });
}
