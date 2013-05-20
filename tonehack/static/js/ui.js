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
            wave_height: 40,
        }
        this.options = $.extend({}, default_options, options_input); 

        if (! window.AudioContext) {
            if (! window.webkitAudioContext) {
                alert('Tonehack uses the newest Audio APIs that are only supported by Chrome, Safari, and FirefoxNightly.');
                return;
            }
            window.AudioContext = window.webkitAudioContext;
        }

        if(this.options.audio_context) {
            this.audio_context = this.options.audio_context;
        } else {
            this.audio_context = new AudioContext();
        }

        this.setup();

        var that = this;

        if(this.options.details) {
            $(document).keypress(function(e) {
                var k = e ? e.which : window.event.keyCode;
                if (k == 32) {
                e.preventDefault();
                    if(that.state == 'running') {
                        that.stop();
                    } else {
                        that.start();
                    }
                }
            });
        }

        return this;
    };

    this.setup = function() {
        this.initControls();
        this.initWaves();
        var container = $('<div>').addClass('wave-rows-container').appendTo(this.jq_elem)
        this.wave_rows = $('<div>').addClass('wave-rows').appendTo(container);

        var that = this;
        
        this.waves_canvas_parent = $('<div>').addClass('waves').appendTo(this.wave_rows);

        if(!this.options.details) {
            this.waves_canvas_parent.addClass('full');
        }

        this.waves_canvas = new Canvas(this.waves_canvas_parent);
        this.context = this.waves_canvas.get(0).getContext("2d");

        if(this.options.details) {
            var superposed_row = $('<div>').addClass('row superposed').appendTo(this.wave_rows);
            var superposed_controls = $('<div>').addClass('wave-controls');
            superposed_controls.appendTo(superposed_row);
        }
        
        var action_buttons = $('<div>').addClass('action-buttons').appendTo(superposed_controls);

        var spacer = $('<div>').addClass('spacer').appendTo(superposed_row);

        var envelope_switcher = $('<div>').addClass('envelope-switcher').html('Drawing mode: ').appendTo(superposed_controls);
        var vol_mode = $('<a>').attr('href', '#').html('Volume envelope').addClass('volume selected').appendTo(envelope_switcher);
        var freq_mode = $('<a>').attr('href', '#').html('Pitch bend').addClass('freq').appendTo(envelope_switcher);

        this.drawing_mode = 'volume';
        vol_mode.click(function(e){
            e.preventDefault();
            vol_mode.addClass('selected');
            freq_mode.removeClass('selected');
            $('.drawing-canvas.volume').addClass('active');
            $('.drawing-canvas.freq').removeClass('active');
            that.drawing_mode = 'volume';
        });
        freq_mode.click(function(e){
            e.preventDefault();
            freq_mode.addClass('selected');
            vol_mode.removeClass('selected');
            $('.drawing-canvas.freq').addClass('active');
            $('.drawing-canvas.volume').removeClass('active');
            that.drawing_mode = 'pitch';
        });


        for(var i = 0; i < this.waves.length; i++) {
            this.addWave(this.waves[i]);
        }
        this.saveWaves();

        if(this.options.details) {
            this.superposed_canvas = superposedStringCanvas(this.waves_canvas, this.wave_canvases, superposed_row.height()-spacer.height());
        }
        this.resetWavesCanvas();

        if(this.options.details) {
            var resulting_wave_label = $('<div>').addClass('wave-label resulting-wave').html('Resulting wave').appendTo(this.wave_rows).css({top: '5px', right: '5px'});
        }
        
        var all_durations = $('<label>').addClass('all-durations setting').html('Set all tone durations to: <input class="durations" type="text" />ms').appendTo(superposed_controls).find('input').keypress(function(e) {
            if(e.which == 13) {
                var duration = parseInt($(this).val());
                for(var i=0; i<that.waves.length; i++) {
                    that.waves[i].duration = duration;
                }
                $('.duration').val(duration);
                $(this).val('');
                that.saveWaves();
            }
        });

        var save_tone = $('<a>').addClass('save-tone setting')
            .attr('href', '#')
            .html('<span>¬</span> Save/Share current instrument')
            .appendTo(action_buttons)
            .on('click', function(e){
                e.preventDefault();
                var orig_html = $('#save').html();
                $('#save').show();
                $('#save').find('input').focus().on('keypress', function(e){ e.stopPropagation(); });
                $('#save .close').one('click', function(e){
                    e.preventDefault();
                    $('#save').hide();
                    $('#save').html(orig_html);
                });
                that.saveWaves();
                $('#save form').on('submit', function(e){
                    e.preventDefault();
                    var form = $(this);
                    var data = {
                        waves_json: window.localStorage['waves'],
                        name: form.find('input[name="name"]').val(),
                    };
                    form.html('Saving instrument...');
                    $.post(
                        form.data('url'),
                        data,
                        function(response) {
                            if(response.status == 'ok') {
                                form.html("<p>Your instrument is available at:</p><p><a href='"+response.url+"'>"+response.url+"</a></p>");
                            } else {
                                //asd
                            }
                        }, 'json'
                    ).error(function(){
                        alert('Things failed');
                    });
                });
            }
        );
        $('<br>').appendTo(action_buttons)
        var add_tone = $('<a>').addClass('add-tone setting')
            .attr('href', '#')
            .html('<span>+</span> Add a tone')
            .appendTo(action_buttons)
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
                        repeat: that.waves[last].repeat,
                    };
                } else {
                    wave = {
                        freq: 220,
                        duration: 1000,
                    };
                }
                wave = new standingWave(wave);
                that.waves.push(wave);
                var wave_row = that.addWave(wave);
                wave_row.find('.frequency').focus();
                that.resetWavesCanvas();
                that.saveWaves();
            }
        );

        this.wave_rows.bind('mouseup', function(e) {
            that.saveWaves();
        });
    }

    this.reSetup = function() {
        this.jq_elem.html('');
        this.wave_canvases = [];
        this.setup();
    }

    this.addWave = function(wave) {
        var row = $('<div>').addClass('row')

        if(this.options.details) {
            row.appendTo(this.wave_rows);
        }

        var controls_container = $('<div>').addClass('wave-controls').appendTo(row);
        var controls = $('<div>').addClass('wave-controls-inner').appendTo(controls_container);
        var envelopes = $('<div>').addClass('envelopes').appendTo(row);
        var spacer_elem = $('<div>').addClass('spacer').appendTo(row);

        wave.wave_index = this.wave_canvases.length;
        var that = this;
        $('<a>').attr('href', '#').html('&times;').addClass('remove').appendTo(controls).on('click', function(e) {
            e.preventDefault();
            row.remove();
            that.removeWave(wave.wave_index);
            that.saveWaves();
            that.resetWavesCanvas();
        });

        $('<label>').html('<span>Frequency:</span>').appendTo(controls)
            .append(
                $('<input type="text" />').addClass('frequency').val(wave.freq).on('keypress', function(e) {
                    if(e.which == 13) {
                        $(this).blur();
                    }
                }).on('blur', function(e){
                    var val = parseInt($(this).val());
                    $(this).val(val);
                    wave.freq = val;
                })
            )
            .append('Hz');

        $('<label>').html('<span>Duration:</span>').appendTo(controls)
            .append(
                $('<input type="text" />').addClass('duration').val(wave.duration).on('keypress', function(e) {
                    if(e.which == 13) {
                        $(this).blur();
                    }
                }).on('blur', function(e){
                    var duration = parseInt($(this).val());
                    $(this).val(duration);
                    wave.duration = duration;
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
        if(this.options.details) { 
            this.wave_height = envelopes.outerHeight();
            this.spacer = spacer_elem.outerHeight(true);
        } else {
            this.wave_height = this.options.wave_height;
            this.spacer = 10;
        }

        var string_canvas = new stringSubCanvas(this.waves_canvas, wave, base_freq, this.wave_height, this.spacer);
        string_canvas.setProgressElem(progress_elem);

        $('<a>').attr('href', '#').html('reset').appendTo(controls).addClass('reset').on('click', function(e){
            e.preventDefault();
            if(that.drawing_mode == 'volume') {
                for(var i = 0; i < wave.volume_envelope.length; i++) {
                    wave.volume_envelope[i] = 0.5;
                }
                volume_envelope_canvas.sync();
                that.drawEnvelope(volume_envelope_canvas.getCanvasElement(), wave.volume_envelope, VOLUME_ENV_COLOR);
            } else {
                for(var i = 0; i < wave.freq_envelope.length; i++) {
                    wave.freq_envelope[i] = 0.5;
                }
                freq_envelope_canvas.sync();
                that.drawEnvelope(freq_envelope_canvas.getCanvasElement(), wave.freq_envelope, FREQ_ENV_COLOR);
            }
            that.saveWaves();
        });

        $('<label>').html('Repeat').appendTo(controls)
            .prepend(
                $('<input type="checkbox" />').addClass('repeat').prop('checked', wave.repeat).on('change', function(e) {
                    wave.repeat = $(this).prop('checked');
                    that.saveWaves();
                })
            )

        $('.spacer').removeClass('last');
        spacer_elem.addClass('last');
        
        this.wave_canvases.push(string_canvas);
        that.saveWaves();
        return row;
    }

    this.removeWave = function(index) {
        this.waves.splice(index, 1);
        this.wave_canvases.splice(index, 1);
        // update the wave_index properties which will be used by the remove button for every wave below the removed one
        for(var i = index; i < this.waves.length; i++) {
            this.waves[i].wave_index = i;
        }
    }

    this.resetWavesCanvas = function() {
        if(this.options.details) {
            var height = (this.wave_canvases.length + 1) * (this.wave_height + this.spacer) - this.spacer;
        } else {
            var height = this.wave_canvases.length * (this.wave_height + this.spacer) - this.spacer;
        }
        var width = this.waves_canvas.innerWidth();
        setCanvasSize(this.waves_canvas, width, height);

        for(var i = 0; i < this.wave_canvases.length; i++) {
            this.wave_canvases[i].init();
        }

        this.context.clearRect(0, 0, this.context.width, this.context.height);
        this.time_diff = 0;
        this.drawFrame();
    }

    this.saveWaves = function() {
        var wave_data = [];
        for(var j=0; j<this.waves.length; j++) {
            var wave_struct = {
                freq: this.waves[j].freq,
                freq_envelope: this.waves[j].freq_envelope,
                volume_envelope: this.waves[j].volume_envelope,
                duration: this.waves[j].duration,
                repeat: this.waves[j].repeat,
            };
            wave_data.push(wave_struct);
        }
        window.localStorage['waves'] = JSON.stringify(wave_data);
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
                repeat: freqobj['repeat'],
            }));
        });
        this.soundwave = new soundWave(this.audio_context, this.waves);

    }

    this.drawFrame = function() {
        this.context.fillRect(0, 0, this.context.width, this.context.height);
        for(i = 0; i < this.wave_canvases.length; i++) {
            var index;
            if(this.options.details) {
                index = i+1;
            } else {
                index = i;
            }
            this.wave_canvases[i].draw(this.time_diff, index);
            this.wave_canvases[i].markProgress(this.time_diff);
        }
        if(this.options.details) {
            this.superposed_canvas.draw(this.time_diff);
        }
        this.time_diff = new Date().getTime() - this.start_time;
    }

    this.animLoop = function() {
        if(this.state == 'running') {
            this.anim_frame = requestAnimFrame(this.animLoop.bind(this));
            this.drawFrame();
        }
    }

    this.start = function() {
        jq_elem.find('.controls .preview.start').removeClass('start icon-play').addClass('pause icon-stop');
        if(this.state != 'running') {
            this.start_time = new Date().getTime();
            this.state = 'running';
            this.animLoop();
            this.soundwave.play();
        }
    };

    this.stop = function() {
        jq_elem.find('.controls .preview.pause').removeClass('pause icon-stop').addClass('start icon-play');
        this.state = 'stopped';
        cancelAnimFrame(this.anim_frame);
        this.resetWavesCanvas();
        this.soundwave.pause();
    };

    this.adjustGainLevels = function() {
        max_vol = 0;
        for(var i=0; i<this.waves.length; i++) {
            
        }
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
        $('<a>').addClass('preview start icon-play').attr('href', '#').appendTo(controls);

        if(this.options.details) {
            controls.append(
                $('<a>').addClass('show-presets').html("<span>▼</span> Presets").attr('href', '#').on('click', function(e){
                    e.preventDefault();
                    $('#presets').css('top', $(this).offset().top + $(this).height() + 'px');
                    $('#presets').toggle();
                })
            );
            controls.append(
                $('<a>').addClass('quick-help').html("<span>?</span> Quick Help").attr('href', '#').on('click', function(e){
                    e.preventDefault();
                    $('#help').show();
                    $('#help .close').one('click', function(e){
                        e.preventDefault();
                        $('#help').hide();
                    });
                })
            );

            $('<a>').addClass('record start icon-record').attr('href', '#').appendTo(controls).on('click', function(e){
                e.preventDefault();
                $(this).removeClass('start').addClass('working');
                
                WavSaver();
                $(this).removeClass('working').addClass('start');
            });;
        }
        
        controls.prependTo(jq_elem);

        controls.on('click', '.preview.start, .preview.pause, .preview.stop', function(e){
            e.preventDefault();
            if($(this).hasClass('start')) {
                that.start();
            } else if($(this).hasClass('pause')) {
                that.stop();
            } else if($(this).hasClass('stop')) {
                that.stop();
            }
        });
        controls.on('click', '.preview.stop', function(e){
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
                repeat: this.waves[i]['repeat'],
            })
            adjusted_waves.push(wave);
        }
        var notewave = new soundWave(this.audio_context, adjusted_waves);
        notewave.play();
        return notewave;
    };

    this.setLabel = function(label) {
        this.jq_elem.append($('<div>').addClass('label').html(label));
    };
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
