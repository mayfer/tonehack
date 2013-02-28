var VOLUME_ENV_COLOR = '#aa6600';
var FREQ_ENV_COLOR = '#00aa00';

function waveCanvas(jq_elem, freqs) {
    var jq_elem = jq_elem;
    var superposed = null;
    var start_time = new Date().getTime();
    var time_diff = 0;
    var pause_time_diff = 0;
    var state = 'stopped';
    var anim_frame;
    var waves = [];
    var parent;
    var waves_canvas;
    var waves_context;
    var waves_canvas_jq;
    var soundwave;
    var drawMode = 'overtones';
    var options;

    this.init = function(options_input) {
        default_options = {
            details: true,
            scale: 1,
            
        }
        options = $.extend({}, default_options, options_input); 

        if(options.audio_context) {
            audio_context = options.audio_context;
        } else {
            audio_context = new webkitAudioContext();
        }

        this.setup();
        return this;
    };

    this.setup = function() {
        parent = $('<div class="parent-canvas">').css('height', (freqs.length*75*options.scale + 80*options.scale) + "px");
        $(jq_elem).append(parent);

        waves_canvas_jq = new Canvas(parent).addClass('waves');
        if(!options.details) {
            waves_canvas_jq.css({
                width: '100%',
                margin: 0,
            });
        }
        waves_canvas = waves_canvas_jq.get(0);
        waves_context = waves_canvas.getContext("2d");

        function compare(a, b) {
          if (a.freq < b.freq)
             return -1;
          if (a.freq > b.freq)
            return 1;
          return 0;
        }
        freqs.sort(compare);

        BASE_FREQ = freqs[0].freq;

        this.drawWaveMode();
        this.initControls();
        this.initWaves();
        if(options.details) {
            this.initEnvelopes();
        }
        this.reset();

        var wave_data = [];
        for(var j=0; j<waves.length; j++) {
            wave_struct = {
                freq: waves[j].freq,
                freq_envelope: waves[j].freq_envelope,
                volume_envelope: waves[j].volume_envelope,
                duration: waves[j].duration,
            };
            wave_data.push(wave_struct);
        }
        window.localStorage['waves'] = JSON.stringify(wave_data);
    }

    this.reSetup = function() {
        parent.parent().html('');
        this.setup();
    }

    this.loadPreset = function(preset) {
        freqs = preset;
        this.reSetup();
    }

    this.initWaves = function() {
        waves = [];
        var index = 1;
        $.each(freqs, function(i, freqobj) {
            waves.push(new standingWave(waves_context, {
                    index: index,
                    num_waves: freqs.length,
                    freq: freqobj['freq'],
                    amplitude: ((waves_context.height / freqs.length) / 3) * options.scale,
                    volume_envelope: freqobj['volume_envelope'],
                    freq_envelope: freqobj['freq_envelope'],
                    duration: freqobj['duration'],
            }));
            index++;
        });
        superposed = new superposedWave(waves_context, 1, 1, waves);
        soundwave = new soundWave(audio_context, waves);

    }

    this.setWaves = function(input_waves) {
        waves = input_waves;
    };

    this.drawWaveMode = function() {
        context = waves_context;
        context.fillStyle = "rgba(255,255,255, 0.3)";
        context.lineWidth = 2;
        context.strokeStyle = "#000";
    };

    this.drawFrame = function() {
        context = waves_context;
        context.fillRect(0, 0, context.width, context.height);
        if(drawMode == 'overtones') {
            for(i = 0; i < waves.length; i++) {
                waves[i].draw(time_diff);
                waves[i].markProgress(time_diff);
            }
        } else if (drawMode == 'superposed') {
            superposed.draw(time_diff);
            for(i = 0; i < waves.length; i++) {
                waves[i].markProgress(time_diff);
            }
        }
        time_diff = new Date().getTime() - start_time;
    }

    this.animLoop = function() {
        if(state == 'running') {
            anim_frame = requestAnimFrame(this.animLoop.bind(this));
            this.drawFrame();
        }
        frames++;
    }

    this.start = function() {
        jq_elem.find('.controls .start').removeClass('start icon-play').addClass('pause icon-pause');
        if(state != 'running') {
            if(state == 'stopped') {
                start_time = new Date().getTime();
            } else if(state == 'paused') {
                start_time = new Date().getTime() - pause_time_diff;
            }
            state = 'running';
            this.animLoop();
        }
        soundwave.play();
    };

    this.pause = function() {
        jq_elem.find('.controls .pause').removeClass('pause icon-pause').addClass('start icon-play');
        state = 'paused';
        pause_time_diff = new Date().getTime() - start_time;
        soundwave.pause();
    };

    this.stop = function() {
        jq_elem.find('.controls .pause').removeClass('pause icon-pause').addClass('start icon-play');
        state = 'stopped';
        cancelAnimFrame(anim_frame);
        this.reset()
        soundwave.pause();
    };

    this.restart = function() {
        // graceful
        start_time = new Date().getTime();
    }

    this.clear = function() {
        context = waves_context;
        context.fillStyle = "rgba(255,255,255, 1)";
        context.fillRect(0, 0, context.width, context.height);
        this.drawWaveMode();
    }

    this.reset = function() {
        this.clear();
        time_diff = 0;
        this.drawFrame();
    };

    this.initEnvelopes = function() {
        var adsr_container = $('<div>').addClass('adsr').appendTo(parent);
        var box_height = adsr_container.height() / (waves.length + 1) - 10;
        var box_width = adsr_container.width() - 40;
        var that = this;
        $('<div>').addClass('adsr-title').html('Overtones<br /><span class="tip">(click to edit)</span>').appendTo(adsr_container);

        for(var i = 0; i < waves.length; i++) {
            var box = $('<a>').addClass('adsr-link')
                .attr('href', '#')
                .width(box_width)
                .height(box_height)
                .css('top', (waves[i].position - (box_height/2)) + 'px')
                .css('left', 20)
                .appendTo(adsr_container)
                .data('wave_index', i);
            var volume_env_canvas = new Canvas(box);
            var freq_env_canvas = new Canvas(box);
            
            var progress_canvas = new Canvas(box)
                .css('position', 'absolute')
                .css('top', 0)
                .css('left', 0);

            box.on('click', function(e) {
                e.preventDefault();
                that.editEnvelope($(this).data('wave_index'));
            });
            that.drawEnvelope(volume_env_canvas, waves[i].volume_envelope, VOLUME_ENV_COLOR);
            that.drawEnvelope(freq_env_canvas, waves[i].freq_envelope, FREQ_ENV_COLOR);
            waves[i].setProgressElem(progress_canvas);
            $('<div>').addClass('freq').html(waves[i].freq + " Hz, "+(waves[i].duration/1000)+"s").appendTo(box);
        }

        var add_tone = $('<a>')
            .addClass('add-tone')
            .attr('href', '#')
            .html('Add a tone [+]')
            .appendTo(adsr_container)
            .on('click', function(e){
                e.preventDefault();
                var duration = 1000;
                // use the duration of the first wave if possible
                if(freqs.length) duration = freqs[0].duration;
                freqs.push({freq: 220, duration: duration});
                that.reSetup();
            });

        $(document).bind('keyup', function(e) {
            if(e.keyCode == 27) {
                // escape pressed
                that.closeEnvelopeEditor();
            }
        });
    }

    this.adjustGainLevels = function() {
        max_vol = 0;
        for(var i=0; i<waves.length; i++) {
            
        }
    }

    this.editEnvelope = function(wave_index) {
        var wave = waves[wave_index];
        var that = this;
        var volume_envelope_canvas;
        var freq_envelope_canvas;
        
        var modal = $('<div>')
            .addClass('modal-adsr')
            .appendTo($('body'))
            .css({
                top: $(document).scrollTop(),
            });
        var freq = $('<input type="text" />').val(wave.freq);
        $('<div>')
            .addClass('title')
            .appendTo(modal)
            .append($('<a>').addClass('close').html('x').attr('href', '#').click(function(e){
                e.preventDefault();
                that.closeEnvelopeEditor();
            }))
            .append($('<h3>').html('ADSR envelope for ').append(freq).append(' Hz'));

        var draw_area = $('<div>')
            .addClass('draw-adsr')
            .css('width', (modal.innerWidth() - 30 - 15) + "px")
            .appendTo(modal);
        $('<div>')
            .addClass('actions')
            .appendTo(modal)
            .append($('<a>').addClass('save').attr('href', '#').html('Save').click(function(e){
                e.preventDefault();
                var autostart = false;
                if(state == 'running') {
                    that.stop();
                    autostart = true;
                }
                freqs[wave_index].freq = parseInt(freq.val());
                freqs[wave_index].volume_envelope = volume_envelope_canvas.getPoints();
                freqs[wave_index].freq_envelope = freq_envelope_canvas.getPoints();
                freqs[wave_index].duration = modal.find('.duration').val();
                that.adjustGainLevels();
                that.closeEnvelopeEditor();
                that.reSetup();
                if(autostart) {
                    that.start();
                }
            }))
            .append($('<a>').addClass('delete').attr('href', '#').html('Delete overtone').click(function(e) {
                e.preventDefault();
                var autostart = false;
                if(state == 'running') {
                    that.stop();
                    autostart = true;
                }
                freqs.splice(wave_index, 1);
                that.closeEnvelopeEditor();
                that.reSetup();
                if(autostart) {
                    that.start();
                }
            }))
            .append($('<a>').addClass('reset-freq-envelope').attr('href', '#').html('Reset pitch envelope').click(function(e) {
                e.preventDefault();
                freq_envelope_canvas.setPoints([0.5]);
                freq_envelope_canvas.drawPoints();
            }))
            .append($('<a>').addClass('reset-volume-envelope').attr('href', '#').html('Reset volume envelope').click(function(e) {
                e.preventDefault();
                volume_envelope_canvas.setPoints([0.5]);
                volume_envelope_canvas.drawPoints();
            }));

        $('<div>').addClass('graph-label x').html('Time').appendTo(draw_area);
        $('<div>').addClass('graph-label x-min').html('0').appendTo(draw_area);
        $('<div>').addClass('graph-label x-max').html('<input type="text" class="duration" value="'+wave.duration+'" /> ms').appendTo(draw_area);
        $('<div>').addClass('graph-label y').html('Amplitude').appendTo(draw_area);
        $('<div>').addClass('graph-label y-min').html('0%').appendTo(draw_area);
        $('<div>').addClass('graph-label y-max').html('100%').appendTo(draw_area);
        
        var mode_switch = $('<div>').addClass('draw-mode').html('').appendTo(modal);
        var vol_mode = $('<a>').attr('href', '#').html('Volume').addClass('volume selected').appendTo(mode_switch);
        var freq_mode = $('<a>').attr('href', '#').html('Pitch').addClass('freq').appendTo(mode_switch);

        vol_mode.click(function(e){
            e.preventDefault();
            vol_mode.addClass('selected');
            freq_mode.removeClass('selected');
            volume_envelope_canvas.getCanvasElement().addClass('active');
            freq_envelope_canvas.getCanvasElement().removeClass('active');
            freq.focus();
        });
        freq_mode.click(function(e){
            e.preventDefault();
            freq_mode.addClass('selected');
            vol_mode.removeClass('selected');
            freq_envelope_canvas.getCanvasElement().addClass('active');
            volume_envelope_canvas.getCanvasElement().removeClass('active');
            freq.focus();
        });

        freq_envelope_canvas = new drawingCanvas(draw_area);
        freq_envelope_canvas.init(FREQ_ENV_COLOR);
        freq_envelope_canvas.setPoints(wave.freq_envelope);
        freq_envelope_canvas.getCanvasElement().addClass('freq');
        this.drawEnvelope(freq_envelope_canvas.getCanvasElement(), wave.freq_envelope, FREQ_ENV_COLOR);

        volume_envelope_canvas = new drawingCanvas(draw_area);
        volume_envelope_canvas.init(VOLUME_ENV_COLOR);
        volume_envelope_canvas.setPoints(wave.volume_envelope);
        volume_envelope_canvas.getCanvasElement().addClass('volume active');
        this.drawEnvelope(volume_envelope_canvas.getCanvasElement(), wave.volume_envelope, VOLUME_ENV_COLOR);
        
        freq.focus();
        modal.on('keypress', function(e){
            if(e.keyCode==13) {
                // enter pressed
                modal.find('.save').click();
            }
        });
    }

    this.closeEnvelopeEditor = function() {
        var modal = $('.modal-adsr');
        modal.remove();
    }

    this.drawEnvelope = function(canvas_jq, envelope, color) {
        // fills the given canvas elem with the adsr drawing
        var canvas = canvas_jq.get(0);
        var context = canvas.getContext("2d");

        if(color) {
            context.strokeStyle = color;
        } else {
            context.strokeStyle = VOLUME_ENV_COLOR;
        }
        context.lineWidth = 2;
        context.lineCap = "round";
        context.clearRect(0, 0, context.width, context.height);
        
        context.beginPath();
        context.moveTo(0, (1-envelope[0])*context.height);
        
        if(envelope.length == 1) {
            // special case for when envelope is a single value
            context.lineTo(context.width, (1-envelope[0])*context.height);
        } else {
            for(var i=1; i<envelope.length; i++) {
                // the 1-envelope[i] is to inverse y axis for the canvas
                context.lineTo(i*(context.width/envelope.length), (1-envelope[i])*context.height);
            }
        }
        context.stroke();
    }

    this.setMode = function(mode) {
        if(mode == 'overtones') {
            jq_elem.find('.superpose').removeClass('selected');
            jq_elem.find('.split').addClass('selected');
            drawMode = mode;
        } else if(mode == 'superposed') {
            jq_elem.find('.split').removeClass('selected');
            jq_elem.find('.superpose').addClass('selected');
            drawMode = mode;
        } else {
            alert('unsupported mode');
        }
        this.reset();
    };

    this.initControls = function(){
        var that = this;
        var controls = $('<div>').addClass('controls');
        $('<a>').addClass('start icon-play').attr('href', '#').appendTo(controls);
        if(options.details) {
            $('<span>').addClass('duration').html('<label>Set all tone durations to: <input class="durations" type="text" />ms</label>').attr('href', '#').appendTo(controls);
            //$('<a>').addClass('stop icon-stop'),
            //$('<a>').addClass('faster').html('faster'),
            //$('<a>').addClass('slower').html('slower'),
        }
        if(options.details || freqs.length > 1) {
            $('<a>').addClass('superpose tab').html('resulting vibration').attr('href', '#').appendTo(controls);
            $('<a>').addClass('split tab selected').html('breakdown of overtones').attr('href', '#').appendTo(controls);
        }
        
        controls.prependTo(jq_elem);

        controls.find('.durations').keypress(function(e) {
            if(e.which == 13) {
                var duration = parseInt($(this).val());
                for(var i=0; i<freqs.length; i++) {
                    freqs[i].duration = duration;
                }
                that.stop();
                that.reSetup();
            }
        });
        controls.on('click', '.start, .pause, .stop', function(e){
            e.preventDefault();
            if($(this).hasClass('start')) {
                that.start();
            } else if($(this).hasClass('pause')) {
                that.stop();
            } else if($(this).hasClass('stop')) {
                that.stop();
            }
        });
        controls.on('click', '.stop', function(e){
            e.preventDefault();
            state = 'stopped';
        });
        controls.on('click', '.faster, .slower', function(e){
            e.preventDefault();
            var diff = 0;
            if($(this).hasClass('faster')) diff = 1;
            else diff = -1;
                    
            for(i = 0; i < waves.length; i++) {
                waves[i].changeSpeed(diff);
            }
            that.restart();
        });
        controls.on('click', '.split', function(e) {
            e.preventDefault();
            that.setMode('overtones');
        });
        controls.on('click', '.superpose', function(e) {
            e.preventDefault();
            that.setMode('superposed');
        });
    };
    this.setLabel = function(label) {
        jq_elem.append($('<div>').addClass('label').html(label));
    };

    this.playNote = function(note_freq) {
        var base_freq = 110;
        var multiplier = note_freq / base_freq;
        var adjusted_waves = [];
        for(var i=0; i<waves.length; i++) {
            // deep copy of the waves only seems to work this way
            var wave = new standingWave(waves_context, {
                freq: waves[i]['freq'] * multiplier,
                volume_envelope: waves[i]['volume_envelope'],
                freq_envelope: waves[i]['freq_envelope'],
                duration: waves[i]['duration'],
            })
            adjusted_waves.push(wave);
        }
        var notewave = new soundWave(audio_context, adjusted_waves);
        notewave.play();
        return notewave;
    }
}
        
$(document).ready(function(){
    fps_elem = $('#fps');
    showfps = false;
    if(showfps){
        setInterval(function(){
            fps_elem.html(frames);
            frames = 0;
        }, 1000);
    }
});
