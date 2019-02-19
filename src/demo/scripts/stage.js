
iconStages = { };
theScene = null;
theStage = null;

function setupStage() {
    theScene = new Sistine.core.Scene();
    theStage = new Sistine.stage.Stage("stage_div", theScene);
    var DefaultBundle = Sistine.registry.DefaultBundle;
    var triangle = new DefaultBundle.Triangle.newShape({
        "x": 20, "y": 50, "width": 200, "height": 200, "lineWidth": 2
    });
    var rect = new DefaultBundle.Rectangle.newShape({
        "x": 200, "y": 100, "width": 100, "height": 50, "lineWidth": 2
    });
    var square = new DefaultBundle.Square.newShape({
        "x": 550, "y": 100, "width": 200, "height": 100, "fillStyle": 'red'
    });
    theScene.add(rect);
    theScene.add(triangle);
    theScene.add(square);

    theStage.repaint();
    theStage.isEditable = true;
    theStage.showBackground = true;
}

x = null;
ctx = null;
function drawSample(x, y, w, h, angle, clear) { if (clear)
        ctx.clearRect(0, 0, 2000, 2000);
    ctx.save();
    ctx.lineWidth = 2.0;
    cx = x + w / 2;
    cy = y + h / 2;
    ctx.translate(cx, cy);
    var theta = Math.PI * angle / 180;
    ctx.rotate(theta);
    ctx.translate(-cx, -cy);
    costheta = Math.cos(theta) / 2;
    sintheta = Math.sin(theta);
    ctx.strokeRect(x, y, w, h);

    // Draw Center
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "green";
    ctx.fill();
    ctx.restore();
}

function test() {
    ctx = theStage.getPane("main").context;
    x = theScene._layers[0]._children[0];
    x.rotate(30);
    // scaling when drawing is using the "wrong" offset.  For some reason x and y are fine but still looks "jilted"

    drawSample(100, 50);
}