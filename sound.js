// Built from Mohit Cheppudira's sine wave generator - http://0xfe.blogspot.com
// Modified by Murat Ayfer - http://muratayfer.com

soundWave = function(context, standing_waves) {
    // xs is a list of x (time) values, one per wave.
    // time is not represented as synchronized clicks or milliseconds, its passing is freq dependent
    // so that's why we keep a value per each wave.
    this.xs = [];
    this.counter = 0;
    this.context = context;
    this.sampleRate = this.context.sampleRate; // 44100 by default
    this.sampleRateMillisecond = this.sampleRate / 1000;
    this.playing = false;
    this.fadeout_counter = 0;

    this.standing_waves = standing_waves;

    for (var j = 0; j < this.standing_waves.length; j++) {
        this.xs[j] = 0;
    }

    this.node = context.createJavaScriptNode(1024, 0, 2);

    var that = this;
    this.node.onaudioprocess = function(e) { that.process(e) };
}

soundWave.prototype.process = function(e) {
    // Get a reference to the output buffer and fill it up.
    var channels = [ e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1) ];

    var wave;
    var step;
    var current_amplitude;
    var y;

    var buffer_size = channels[0].length;
    var num_channels = channels.length;
    var num_standing_waves = this.standing_waves.length;

    var cumulative_amplitude = 0;

    var x_increment = Math.PI * 2 / this.sampleRate;

    for (var i = 0; i < buffer_size; i++) {
        cumulative_amplitude = 0;

        for (var j = 0; j < num_standing_waves; j++) {
            wave = this.standing_waves[j];

            var envelope_amplitude = wave.currentEnvelopeValue(this.counter / (this.sampleRateMillisecond * wave.duration));
            var pitch_bend = wave.currentPitchBend(this.counter / (this.sampleRateMillisecond * wave.duration));
            var current_freq = Notes.relative_note(wave.freq, pitch_bend);

            // square env. amplitude to convert it to a logarithmic scale which better suits our perception
            current_amplitude = envelope_amplitude * envelope_amplitude * wave.gain;

            // buffer value for given wave
            y = Math.sin(this.xs[j] + wave.phase);
            this.xs[j] += Math.PI * 2 * current_freq / this.sampleRate;
            
            cumulative_amplitude += (current_amplitude * y) / num_standing_waves;
            
        }
        if(!this.playing) {
            // fadeout to prevent popping during a pause/stop
            var fadeout_length = 10000;
            cumulative_amplitude -= cumulative_amplitude * (this.fadeout_counter++/fadeout_length)
            if(this.fadeout_counter >= fadeout_length) {
                this.counter = 0;
                this.fadeout_counter = 0;
                this.node.disconnect();
                break;
            }
        }
        for(var k = 0; k < num_channels; k++) {
            channels[k][i] = cumulative_amplitude;
        }
        this.counter += 1;
    }
}

soundWave.prototype.play = function() {
    this.node.connect(this.context.destination);
    this.playing = true;
}

soundWave.prototype.pause = function() {
    this.playing = false;
}
