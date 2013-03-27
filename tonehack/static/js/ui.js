var VOLUME_ENV_COLOR = '#aa6600';
var FREQ_ENV_COLOR = '#00aa00';

function waveCanvas(jq_elem, freqs) {
    this.freqs = freqs;
    this.jq_elem = jq_elem;
    this.start_time = new Date().getTime();
    this.time_diff = 0;
    this.waves = [];
    this.wave_canvases = [];
    this.wave_rows = [];
    this.state = 'stopped';
    this.soundwave = null;
    this.anim_frame = null;
    this.options = null;
    this.audio_context = null;

    this.init = function(options_input) {
        default_options = {
            details: true,
            scale: 1,
            
        }
        this.options = $.extend({}, default_options, options_input); 

        if(this.options.audio_context) {
            this.audio_context = this.options.audio_context;
        } else {
            this.audio_context = new webkitAudioContext();
        }

        this.newsetup();
        return this;
    };

    this.newsetup = function() {
        this.initControls();
        this.initWaves();
        var container = $('<div>').addClass('wave-rows-container').appendTo(this.jq_elem)
        this.wave_rows = $('<div>').addClass('wave-rows').appendTo(container);

        var that = this;
        
        this.waves_canvas_parent = $('<div>').addClass('waves').appendTo(this.wave_rows);
        this.waves_canvas = new Canvas(this.waves_canvas_parent);
        this.context = this.waves_canvas.get(0).getContext("2d");

        var superposed_row = $('<div>').addClass('row superposed').appendTo(this.wave_rows);
        var superposed_controls = $('<div>').addClass('wave-controls').appendTo(superposed_row);
        $('<span>').addClass('duration').html('<label>Set all tone durations to: <input class="durations" type="text" />ms</label>').attr('href', '#').appendTo(superposed_controls).find('input').keypress(function(e) {
            if(e.which == 13) {
                var duration = parseInt($(this).val());
                for(var i=0; i<that.waves.length; i++) {
                    that.waves[i].duration = duration;
                }
            }
        });
        var spacer = $('<div>').addClass('spacer').appendTo(superposed_row);

        var vol_mode = $('<a>').attr('href', '#').html('Volume').addClass('volume selected').appendTo(superposed_controls);
        var freq_mode = $('<a>').attr('href', '#').html('Pitch').addClass('freq').appendTo(superposed_controls);

        vol_mode.click(function(e){
            e.preventDefault();
            vol_mode.addClass('selected');
            freq_mode.removeClass('selected');
            $('.drawing-canvas.volume').addClass('active');
            $('.drawing-canvas.freq').removeClass('active');
        });
        freq_mode.click(function(e){
            e.preventDefault();
            freq_mode.addClass('selected');
            vol_mode.removeClass('selected');
            $('.drawing-canvas.freq').addClass('active');
            $('.drawing-canvas.volume').removeClass('active');
        });


        for(var i = 0; i < this.waves.length; i++) {
            this.addWave(this.waves[i]);
        }
        this.saveWaves();

        this.superposed_canvas = superposedStringCanvas(this.waves_canvas, this.wave_canvases, superposed_row.height());
        this.resetWavesCanvas();

        var add_tone = $('<a>')
            .addClass('add-tone')
            .attr('href', '#')
            .html('Add a tone [+]')
            .appendTo(superposed_controls)
            .on('click', function(e){
                e.preventDefault();
                var wave;
                // use the duration of the first wave if possible
                if(that.waves.length) {
                    var last = that.waves.length - 1;
                    wave = {
                        freq: that.waves[last].freq * 2,
                        duration: that.waves[last].duration,
                        volume_envelope: that.waves[last].volume_envelope.slice(0),
                        freq_envelope: that.waves[last].freq_envelope.slice(0),
                    };
                } else {
                    wave = {
                        freq: 220,
                        duration: 1000,
                    };
                }
                wave = new standingWave(wave);
                that.waves.push(wave);
                that.addWave(wave);
                that.resetWavesCanvas();
            });

        this.wave_rows.bind('mouseup', function(e) {
            that.saveWaves();
        });
    }

    this.addWave = function(wave) {
        var row = $('<div>').addClass('row').appendTo(this.wave_rows);
        var controls_container = $('<div>').addClass('wave-controls').appendTo(row);
        var controls = $('<div>').addClass('wave-controls-inner').appendTo(controls_container);
        var envelopes = $('<div>').addClass('envelopes').appendTo(row);
        var spacer_elem = $('<div>').addClass('spacer').appendTo(row);

        $('<label>').html('<span>Frequency:</span>').appendTo(controls)
            .append(
                $('<input type="text" />').addClass('frequency').val(wave.freq).keypress(function(e) {
                    if(e.which == 13) {
                        var val = parseInt($(this).val());
                        wave.freq = val;
                        $(this).blur();
                    }
                })
            )
            .append('Hz');

        $('<label>').html('<span>Duration:</span>').appendTo(controls)
            .append(
                $('<input type="text" />').addClass('duration').val(wave.duration).keypress(function(e) {
                    if(e.which == 13) {
                        var duration = parseInt($(this).val());
                        wave.duration = duration;
                        $(this).blur();
                    }
                })
            )
            .append('ms');

        var freq_bg = new Canvas(envelopes);
        this.drawBackground(freq_bg);

        var freq_envelope_canvas = new drawingCanvas(envelopes, wave.freq_envelope);
        freq_envelope_canvas.init(FREQ_ENV_COLOR);
        freq_envelope_canvas.getCanvasElement().addClass('freq');
        this.drawEnvelope(freq_envelope_canvas.getCanvasElement(), wave.freq_envelope, FREQ_ENV_COLOR);

        var volume_envelope_canvas = new drawingCanvas(envelopes, wave.volume_envelope);
        volume_envelope_canvas.init(VOLUME_ENV_COLOR);
        volume_envelope_canvas.getCanvasElement().addClass('volume active');
        this.drawEnvelope(volume_envelope_canvas.getCanvasElement(), wave.volume_envelope, VOLUME_ENV_COLOR);
        
        var progress_elem = new Canvas(envelopes).addClass('progress');

        var base_freq = 110;
        this.wave_height = envelopes.outerHeight();
        this.spacer = spacer_elem.outerHeight(true);

        var string_canvas = new stringSubCanvas(this.waves_canvas, wave, base_freq, this.wave_height, this.spacer);
        string_canvas.setProgressElem(progress_elem);

        $('.spacer').removeClass('last');
        spacer_elem.addClass('last');
        
        this.wave_canvases.push(string_canvas);
    }

    this.removeWave = function(index) {
        this.waves.splice(index, 1);
        this.wave_canvases.splice(index, 1);
    }

    this.resetWavesCanvas = function() {
        var height = (this.wave_canvases.length + 1) * (this.wave_height + this.spacer) - this.spacer;
        var width = this.waves_canvas.innerWidth();
        setCanvasSize(this.waves_canvas, width, height);

        for(var i = 0; i < this.wave_canvases.length; i++) {
            this.wave_canvases[i].init();
        }

        this.context.clearRect(0, 0, this.context.width, this.context.height);
        this.time_diff = 0;
        this.drawFrame();
    }

    this.setup = function() {
        function compare(a, b) {
          if (a.freq < b.freq)
             return -1;
          if (a.freq > b.freq)
            return 1;
          return 0;
        }
        freqs.sort(compare);

        BASE_FREQ = freqs[0].freq;
    }

    this.saveWaves = function() {
        var wave_data = [];
        for(var j=0; j<this.waves.length; j++) {
            var wave_struct = {
                freq: this.waves[j].freq,
                freq_envelope: this.waves[j].freq_envelope,
                volume_envelope: this.waves[j].volume_envelope,
                duration: this.waves[j].duration,
            };
            wave_data.push(wave_struct);
        }
        window.localStorage['waves'] = JSON.stringify(wave_data);
    }

    this.reSetup = function() {
        this.jq_elem.html('');
        this.wave_canvases = [];
        this.newsetup();
    }

    this.loadPreset = function(preset) {
        this.freqs = preset;
        this.reSetup();
    }

    this.initWaves = function() {
        this.waves = [];
        var that = this;
        $.each(this.freqs, function(i, freqobj) {
            that.waves.push(new standingWave({
                freq: freqobj['freq'],
                volume_envelope: freqobj['volume_envelope'],
                freq_envelope: freqobj['freq_envelope'],
                duration: freqobj['duration'],
            }));
        });
        this.soundwave = new soundWave(this.audio_context, this.waves);

    }

    this.drawFrame = function() {
        this.context.fillRect(0, 0, this.context.width, this.context.height);
        for(i = 0; i < this.wave_canvases.length; i++) {
            this.wave_canvases[i].draw(this.time_diff, i+1);
            this.wave_canvases[i].markProgress(this.time_diff);
        }
        this.superposed_canvas.draw(this.time_diff);
        this.time_diff = new Date().getTime() - this.start_time;
    }

    this.animLoop = function() {
        if(this.state == 'running') {
            this.anim_frame = requestAnimFrame(this.animLoop.bind(this));
            this.drawFrame();
        }
    }

    this.start = function() {
        jq_elem.find('.controls .start').removeClass('start icon-play').addClass('pause icon-pause');
        if(this.state != 'running') {
            this.start_time = new Date().getTime();
            this.state = 'running';
            this.animLoop();
            this.soundwave.play();
        }
    };

    this.stop = function() {
        jq_elem.find('.controls .pause').removeClass('pause icon-pause').addClass('start icon-play');
        this.state = 'stopped';
        cancelAnimFrame(this.anim_frame);
        this.resetWavesCanvas();
        this.soundwave.pause();
    };

    this.initEnvelopes = function() {
        var adsr_container = $('<div>').addClass('adsr').appendTo(parent);
        var box_height = adsr_container.height() / (this.waves.length + 1) - 10;
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

        $(document).bind('keyup', function(e) {
            if(e.keyCode == 27) {
                // escape pressed
                that.closeEnvelopeEditor();
            }
        });
    }

    this.adjustGainLevels = function() {
        max_vol = 0;
        for(var i=0; i<this.waves.length; i++) {
            
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
                if(this.state == 'running') {
                    that.stop();
                    autostart = true;
                }
                freqs[wave_index].freq = parseInt(freq.val());
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
                if(this.state == 'running') {
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
        $('<div>').addClass('graph-label x-min').html('0 ms').appendTo(draw_area);
        $('<div>').addClass('graph-label x-max').html('<input type="text" class="duration" value="'+wave.duration+'" /> ms').appendTo(draw_area);
        $('<div>').addClass('graph-label y').html('Amplitude').appendTo(draw_area);
        $('<div>').addClass('graph-label y-min').html('0%').appendTo(draw_area);
        $('<div>').addClass('graph-label y-max').html('100%').appendTo(draw_area);
        
        var mode_switch = $('<div>').addClass('draw-mode').html('').appendTo(modal);

        var freq_bg = new Canvas(draw_area);
        this.drawBackground(freq_bg);
        
        freq_envelope_canvas = new drawingCanvas(draw_area, wave.freq_envelope);
        freq_envelope_canvas.init(FREQ_ENV_COLOR);
        freq_envelope_canvas.getCanvasElement().addClass('freq');
        this.drawEnvelope(freq_envelope_canvas.getCanvasElement(), wave.freq_envelope, FREQ_ENV_COLOR);

        volume_envelope_canvas = new drawingCanvas(draw_area, wave.volume_envelope);
        volume_envelope_canvas.init(VOLUME_ENV_COLOR);
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

    this.drawBackground = function(canvas_jq) {
        var canvas = canvas_jq.get(0);
        var context = canvas.getContext("2d");
        context.lineWidth = 1;
        context.lineCap = "round";
        context.clearRect(0, 0, context.width, context.height);
        
        var grid_size = 12; // px
        
        // vertical lines
        for(var i = grid_size; i < context.width; i += grid_size) {
            if((i / grid_size) % 5 == 0) {
                context.strokeStyle = "#aaa";
            } else {
                context.strokeStyle = "#ddd";
            }
            context.beginPath();
            context.moveTo(i+0.5, 0);
            context.lineTo(i+0.5, context.height);
            context.stroke();
        }
        
        // for the horiz lines, start from the middle,
        for(var i = 0; i < context.height / 2; i += grid_size) {
            if((i / grid_size) % 5 == 0) {
                context.strokeStyle = "#aaa";
            } else {
                context.strokeStyle = "#ddd";
            }
            // then stroke one above
            context.beginPath();
            context.moveTo(0, context.height/2 - i+0.5);
            context.lineTo(context.width, context.height/2 - i+0.5);
            context.stroke();

            // and one below
            context.beginPath();
            context.moveTo(0, context.height/2 + i+0.5);
            context.lineTo(context.width, context.height/2 + i+0.5);
            context.stroke();
        }

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

    this.initControls = function(){
        var that = this;
        var controls = $('<div>').addClass('controls');
        $('<a>').addClass('start icon-play').attr('href', '#').appendTo(controls);
        
        controls.prependTo(jq_elem);

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
            this.state = 'stopped';
        });
    };

    this.playNote = function(note_freq) {
        var base_freq = 110;
        var multiplier = note_freq / base_freq;
        var adjusted_waves = [];
        for(var i=0; i<this.waves.length; i++) {
            // deep copy of the waves only seems to work this way
            var wave = new standingWave({
                freq: this.waves[i]['freq'] * multiplier,
                volume_envelope: this.waves[i]['volume_envelope'],
                freq_envelope: this.waves[i]['freq_envelope'],
                duration: this.waves[i]['duration'],
            })
            adjusted_waves.push(wave);
        }
        var notewave = new soundWave(this.audio_context, adjusted_waves);
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
