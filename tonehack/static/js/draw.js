X_INCREMENT = 1;

function setCanvasSize(canvas_jq, width, height) {
    canvas_jq.css('width', width);
    canvas_jq.css('height', height);
    canvas_jq.attr('width', width);
    canvas_jq.attr('height', height);
    var canvas = canvas_jq.get(0);
    var context = canvas.getContext("2d");
    // make the h/w accessible from context obj as well
    context.width = width;
    context.height = height;

    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio || context.backingStorePixelRatio || 1;
    var ratio = devicePixelRatio / backingStoreRatio;

    // upscale the canvas if the two ratios don't match
    if(devicePixelRatio !== backingStoreRatio) {
        var oldWidth = canvas.width;
        var oldHeight = canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        context.scale(ratio, ratio);
    }

}
    
function Canvas(jq_elem) {
    // create a canvas inside another element
    // and set the height&width to fill the element
    var canvas_jq = $('<canvas>');
    var width = jq_elem.innerWidth();
    var height = jq_elem.innerHeight();
    
    setCanvasSize(canvas_jq, width, height);

    canvas_jq.appendTo(jq_elem);
    return canvas_jq;
}

function stringSubCanvas(waves_canvas, wave, base_freq, wave_height, spacer) {
    this.waves_canvas = waves_canvas;
    this.wave = wave;
    this.context = this.waves_canvas.get(0).getContext("2d");
    this.standing = Math.PI / this.context.width; // resonant wavelength for canvas width
    
    this.wave_height = wave_height;
    this.wave_halfheight = this.wave_height / 2;
    this.spacer = spacer;

    this.speed = 2; // whatevs
    
    this.current_plot_coordinates = null;
    
    this.init = function() {
        this.context.fillStyle = "rgba(255,255,255, 0.3)";
        this.context.lineWidth = 2;
        this.context.strokeStyle = "#000";
    };

    this.getPlotCoordinates = function(time_diff) {
        this.relative_freq = this.standing * wave.freq / base_freq;
        if(this.last_plot === time_diff) {
            // no need to recalculate
            return this.current_plot_coordinates;
        }
        
        this.step = (this.speed / (base_freq * 2)) * time_diff * (Math.PI/2) % Math.PI*2;
        var volume_envelope_amplitude = this.wave.currentEnvelopeValue(time_diff / this.wave.duration);
        var current_relative_freq = Notes.relative_note(this.relative_freq, this.wave.currentPitchBend(time_diff / this.wave.duration));
        
        var current_amplitude = Math.sin(this.step + this.wave.phase) * volume_envelope_amplitude * this.wave_halfheight;
        var x = 0;
        var y = 0;
        var points = [];
        while(x <= this.context.width) {
            x += X_INCREMENT;
            y = this.wave.sin(x, current_relative_freq, current_amplitude);
            var point = {
                x: x,
                y: y,
            };
            points.push(point);
        }
        this.last_plot = time_diff;
        this.current_plot_coordinates = points;
        return points;
    };

    this.draw = function(time_diff, index) {
        var center = index * (this.wave_height + this.spacer) + this.wave_halfheight;
        var plot_coordinates = this.getPlotCoordinates(time_diff);
        this.context.beginPath();
        this.context.moveTo(0, center);
        for(var i = 1; i < plot_coordinates.length; i++) {
            coord = plot_coordinates[i];
            this.context.lineTo(coord.x, coord.y + center);
        }
        this.context.stroke();
    };

    this.clear = function() {
        this.context.clearRect(0, 0, this.context.width, this.context.height);
    }


    this.setProgressElem = function(jq_progress_elem) {
        this.progress_elem = jq_progress_elem.get(0).getContext("2d");
        this.progress_elem.lineWidth = 2;
        this.progress_elem.strokeStyle = "#a00";
    };
    this.markProgress = function(time_diff) {
        if(this.progress_elem !== undefined) {
            var percent_progress;
            if(this.wave.repeat || time_diff < this.wave.duration) {
                percent_progress = ((time_diff % this.wave.duration) / this.wave.duration);
            } else {
                percent_progress = 1;
            }
            var context = this.progress_elem;
            context.clearRect(0, 0, context.width, context.height);
            context.beginPath();
            context.moveTo(context.width*percent_progress, 0);
            context.lineTo(context.width*percent_progress, context.height);
            context.stroke();
        }
    };
}

function superposedStringCanvas(waves_canvas, strings, wave_height) {
    this.waves_canvas = waves_canvas;
    this.strings = strings;
    this.context = this.waves_canvas.get(0).getContext("2d");
    this.wave_height = wave_height;
    this.wave_halfheight = this.wave_height / 2;
    this.center = this.wave_halfheight;
    this.num_steps = Math.floor(this.context.width / X_INCREMENT);
    
    this.draw = function(time_diff) {
        this.context.fillRect(0, 0, this.context.width, this.context.height);
        this.context.beginPath();
        this.context.moveTo(0, this.center);
        for(var i = 0; i <= this.num_steps; i++) {
            var coords = {x: 0, y: 0};
            for(var j = 0; j < this.strings.length; j++) {
                var current_coords = this.strings[j].getPlotCoordinates(time_diff);
                // x is same for all anyways
                coords.x = current_coords[i].x;
                coords.y += current_coords[i].y;
            }

            coords.y = coords.y / this.strings.length;
            coords.y = Math.min(coords.y, this.wave_halfheight);
            coords.y = Math.max(coords.y, -this.wave_halfheight);
            this.context.lineTo(coords.x, coords.y + this.center);
        }
        this.context.stroke();
    };

    return this;
}
    
function drawingCanvas(jq_elem, envelope) {
    var jq_elem = jq_elem;
    var envelope = envelope;
    var canvas_jq = new Canvas(jq_elem).addClass('drawing-canvas');
    var canvas = canvas_jq.get(0);
    var resolution = 900;
    var ctx = canvas.getContext("2d");
    var that = this;
    var points = new Float32Array(resolution); // inverse y vals
    var draw = false;
    var prev_position = null;
    
    this.sync = function() {
        for(var j=0; j<resolution; j++) {
            if(envelope != undefined) {
                // take mod of length just in case envelope is somehow smaller than resolution
                points[j] = 1 - envelope[j%envelope.length];
            } else {
                points[j] = 0.5;
            }
        }

        // truncate envelope if it's somehow larger than the expected size
        while(envelope.length > resolution) {
            envelope.shift();
        }
        for(var j=0; j<resolution; j++) {
            envelope[j] = 1 - points[j];
        }
    }

    this.getCanvasElement = function() {
        return canvas_jq;
    }

    this.getValue = function(index) {
        // y is inverted on the canvas, so 1 - val.
        // also, limit to between 0 and 1
        var value = Math.min(1, Math.max(0, 1 - points[index]));
        // ignore screwy values
        if(isNaN(value)) value = 0;
        return value;
    }

    this.getPoints = function() {
        var amp_points = [];
        for(var i=0; i<resolution; i++) {
            amp_points[i] = this.getValue(i);
        }
        return amp_points;
    }

    this.init = function(color) {
        this.sync();
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
            if(from != to && i < resolution) {
                // linear values between from and to coordinates
                points[i] = (prev_position.y + (y_diff * (Math.abs(adjusted_px-i)/Math.abs(adjusted_cx-adjusted_px)))) / ctx.height;
                envelope[i] = this.getValue(i);
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

