X_INCREMENT = 10;
    
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

function stringCanvas(jq_elem, wave) {
    this.jq_elem = jq_elem;
    this.wave = wave;
    this.canvas_jq = new Canvas(this.jq_elem).addClass('string-canvas');
    this.context = this.canvas_jq.get(0).getContext("2d");
    this.standing = Math.PI / this.context.width; // resonant wavelength for canvas width
    this.wave_height = this.context.height;
    this.speed = 14;
    
    this.last_plot = null;
    this.current_plot_coordinates = null;
    

    this.init = function() {
        this.context.fillStyle = "rgba(255,255,255, 0.3)";
        this.context.lineWidth = 2;
        this.context.strokeStyle = "#000";
    };

    this.setProgressElem = function(jq_progress_elem) {
        this.jq_progress = jq_progress_elem;
        this.progress_canvas = this.jq_progress.get(0);
        this.progress_context = this.progress_canvas.getContext("2d");
        this.progress_context.strokeStyle = '#a00';
    };

    this.getPlotCoordinates = function(time_diff) {
        if(this.last_plot == time_diff) {
            // no need to recalculate
            return this.current_plot_coordinates;
        }
        
        this.step = this.speed * time_diff * (Math.PI/20) * this.relative_freq % Math.PI*2;
        var volume_envelope_amplitude = wave.currentEnvelopeValue(time_diff / wave.duration);
        var current_relative_freq = Notes.relative_note(this.relative_freq, wave.currentPitchBend(time_diff / wave.duration));
        
        var current_amplitude = Math.sin(this.step + wave.phase) * volume_envelope_amplitude * 2;
        var x = 0, y = wave.sin(x, current_relative_freq, current_amplitude);
        var points = [];
        while(x < this.context.width) {
            var from = {
                x: x,
                y: y,
            };
            x += this.X_INCREMENT;
            y = wave.sin(x, current_relative_freq, current_amplitude);
            var to = {
                x: x,
                y: y,
            };
            points.push({from: from, to: to});
        }
        this.last_plot = time_diff;
        this.current_plot_coordinates = points;
        return points;
    };

    this.draw = function(time_diff) {
        var center = this.context.height / 2;
        var plot_coordinates = this.getPlotCoordinates(time_diff);
        this.context.beginPath();
        this.context.moveTo(0, center);
        for(var i = 1; i < plot_coordinates.length; i++) {
            coord = plot_coordinates[i];
            this.context.lineTo(coord.to.x, coord.to.y + center);
        }
        this.context.stroke();
    };

    this.markProgress = function(time_diff) {
        if(this.progress_context !== null) {
            var percent_progress = (time_diff % this.duration) / this.duration;

            this.progress_context.clearRect(0, 0, this.progress_context.width, this.progress_context.height);
            this.progress_context.beginPath();
            this.progress_context.moveTo(percent_progress*this.progress_context.width, 0);
            this.progress_context.lineTo(percent_progress*this.progress_context.width, this.progress_context.height);
            this.progress_context.stroke();
        }
    };
}

function superposedStringCanvas(jq_elem, strings) {
    this.jq_elem = jq_elem;
    this.strings = strings;
    this.canvas_jq = new Canvas(this.jq_elem).addClass('string-canvas');
    this.context = this.canvas_jq.get(0).getContext("2d");
    this.num_steps = Math.round(context.width / X_INCREMENT);
    var coords, current_coords;
    
    this.draw = function(time_diff) {
        this.context.fillRect(0, 0, this.context.width, this.context.height);
        this.context.beginPath();
        this.context.moveTo(0, position);
        for(var i = 0; i < num_steps; i++) {
            coords = {from: {x: 0, y: 0}, to: {x: 0, y: 0}};
            for(var j = 0; j < this.strings.length; j++) {
                current_coords = this.strings[j].getPlotCoordinates(time_diff);
                // x is same for all anyways
                coords.from.x = current_coords[i].from.x;
                coords.from.y += current_coords[i].from.y;
                coords.to.x = current_coords[i].to.x;
                coords.to.y += current_coords[i].to.y;
            }
            this.context.lineTo(coords.to.x, coords.to.y + position);
        }
        this.context.stroke();
    };
}
    
function drawingCanvas(jq_elem, envelope) {
    var jq_elem = jq_elem;
    var envelope = envelope;
    var canvas_jq = new Canvas(jq_elem).addClass('drawing-canvas');
    var canvas = canvas_jq.get(0);
    var resolution = 512;
    var ctx = canvas.getContext("2d");
    var that = this;
    var points = new Float32Array(resolution); // inverse y vals
    var draw = false;
    var prev_position = null;
    
    for(var j=0; j<resolution; j++) {
        if(envelope != undefined) {
            // take mod of length just in case envelope is somehow smaller than resolution
            points[j] = 1 - envelope[j%envelope.length];
        } else {
            points[j] = 0.5;
        }
    }

    // truncate envelope if it's somehow larger than the expected size
    if(envelope.length > resolution) {
        while(envelope.length > resolution) {
            envelope.pop();
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

