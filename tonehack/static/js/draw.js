
function Canvas(jq_elem) {
    // create a canvas inside another element
    // and set the height&width to fill the element
    var canvas_jq = $('<canvas>');
    var canvas = canvas_jq.get(0);
    var width = jq_elem.innerWidth();
    var height = jq_elem.innerHeight();
    
    canvas_jq.attr('width', width);
    canvas_jq.attr('height', height);
    var context = canvas.getContext("2d");
    // make the h/w accessible from context obj as well
    context.width = width;
    context.height = height;
    canvas_jq.appendTo(jq_elem);
    return canvas_jq;
}

function drawingCanvas(jq_elem) {
    var jq_elem = jq_elem;
    var canvas_jq = new Canvas(jq_elem).addClass('drawing-canvas');
    var canvas = canvas_jq.get(0);
    var resolution = 512; //canvas_jq.innerWidth();
    var ctx = canvas.getContext("2d");
    var that = this;
    var points = new Float32Array(resolution);
    var draw = false;
    var prev_position = null;
    
    for(var j=0; j<resolution; j++) {
        points[j] = 0.5;
    }

    this.getCanvasElement = function() {
        return canvas_jq;
    }

    this.setPoints = function(envelope) {
        if(envelope.length > 2) {
            // support for arbitrary sized envelopes
            resolution = envelope.length;
            points = [];
        }
        for(var j=0; j<resolution; j++) {
            // this needs to be revised.
            // should be stretching nicely according to the provided envelope length
            points[j] = 1 - envelope[j%envelope.length];
        }
    }

    this.getPoints = function() {
        var amp_points = [];
        for(var i=0; i<resolution; i++) {
            // y is inverted on the canvas, so 1 - val.
            // also, limit to between 0 and 1
            amp_points[i] = Math.min(1, Math.max(0, 1 - points[i]));
            // ignore screwy values
            if(isNaN(amp_points[i]) && i==0) amp_points[i] = 0;
            else if(isNaN(amp_points[i])) amp_points[i] = amp_points[i-1];
        }
        return amp_points;
    }

    this.init = function(color) {
        this.resetLineHistory();
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        if(color) {
            ctx.strokeStyle = color;
        } else {
            ctx.strokeStyle = '#aa6000';
        }

        $(document).on("mousemove", function(e) {
            if(draw == true) {
                var current_position = that.getCursorPosition(e);
                that.drawLine(prev_position, current_position);
                prev_position = current_position;
            }
        });
        $(document).on("mouseup", function() {
            that.stopDrawing();
        });

        canvas_jq.mousedown(function(e) {
            e.preventDefault();
            that.startDrawing();
        }).mouseup(function() {
            that.stopDrawing();
        });
    }

    this.startDrawing = function() {
        draw = true;
    }
    this.stopDrawing = function() {
        draw = false;
        this.resetLineHistory();
    }
    this.resetLineHistory = function() {
        prev_position = { x: null, y: null };
    }
    this.drawLine = function(prev_position, current_position) {
        if(prev_position == null || prev_position.x==null || prev_position.y==null) {
            prev_position.x = current_position.x;
            prev_position.y = current_position.y;
        }
            
        var adjusted_px = parseInt((prev_position.x / ctx.width) * resolution);
        var adjusted_cx = parseInt((current_position.x / ctx.width) * resolution);
        var from, to;
        if(adjusted_px < adjusted_cx) {
            from = adjusted_px;
            to = adjusted_cx;
        } else {
            from = adjusted_cx;
            to = adjusted_px;
        }
        var y_diff = current_position.y - prev_position.y;
        for(var i = from; i <= to; i++) {
            if(from != to) {
                // linear values between from and to coordinates
                points[i] = (prev_position.y + (y_diff * (Math.abs(adjusted_px-i)/Math.abs(adjusted_cx-adjusted_px)))) / ctx.height;
            }
        }
        this.drawPoints();
    }
    this.drawPoints = function() {
        ctx.clearRect(0, 0, ctx.width, ctx.height);
        ctx.beginPath();
        for(var i=0; i<resolution; i++) {
            ctx.lineTo(i*(ctx.width/resolution), points[i]*ctx.height);
        }
        ctx.stroke();
    }
    this.getCursorPosition = function(e) {
        var x = e.pageX - canvas_jq.offset().left
        var y = e.pageY - canvas_jq.offset().top
        if(x < 0) x = 0;
        if(y < 0) y = 0;
        return {x: x, y: y};
    }
}

