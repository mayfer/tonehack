
function standingWave(options) {
    default_options = {
        freq: 220,
        volume_envelope: [0.5],
        freq_envelope: [0.5],
        duration: 1000,
        phase: 0,
        gain: 1,
        repeat: true,
    }
    var options = $.extend({}, default_options, options); 
    
    var freq = options.freq;
    var volume_envelope = options.volume_envelope;
    var freq_envelope = options.freq_envelope;
    var duration = options.duration;
    var phase = options.phase;
    var gain = options.gain;
    
    this.freq = freq;
    this.duration = duration;
    this.volume_envelope = volume_envelope;
    this.freq_envelope = freq_envelope;
    this.phase = phase;
    this.gain = gain;
    this.repeat = options.repeat;

    this.sin = function(x, rad_diff, amplitude) {
        return -amplitude * Math.sin(rad_diff * x);
    };
    this.currentEnvelopeValue = function(percent_progress) {
        var envelope = this.volume_envelope;
        var raw_decimal_index = (envelope.length-1) * percent_progress;
        var raw_index = Math.floor(raw_decimal_index);
        var index, decimal_index;
        
        if(this.repeat) {
            index = raw_index % envelope.length;
            decimal_index = raw_decimal_index % envelope.length;
        } else {
            index = Math.min(envelope.length-1, raw_index);
            decimal_index = Math.min(envelope.length-1, raw_decimal_index);
        }
        var value, current_val, next_val;
        
        // if possible, pick the volume_envelope value from a linear interpolation between indeces.
        // this should prevent popping/crackling
        if(index <= envelope.length-1) {
            if(raw_index == 0 && envelope.length > 1) {
                // this indicates that the sound just started playing.
                // initial value has no linear interpolation to do, so we force interpolate from zero
                current_val = 0;
                next_val = envelope[index+1];
            } else if(index == envelope.length-1) {
                current_val = envelope[index];
                next_val = envelope[0];
            } else {
                current_val = envelope[index];
                next_val = envelope[index+1];
            }
        
            value = current_val + (decimal_index - index) * (next_val - current_val);
        } else {
            // just in case index goes wild
            value = envelope[envelope.length-1];
        }
        return value;
    };
    this.currentPitchBend = function(percent_progress) {
        var envelope = this.freq_envelope;
        var raw_decimal_index = envelope.length * percent_progress;
        var raw_index = Math.floor(raw_decimal_index);
        
        if(this.repeat) {
            index = raw_index % envelope.length;
            decimal_index = raw_decimal_index % envelope.length;
        } else {
            index = Math.min(envelope.length-1, raw_index);
            decimal_index = Math.min(envelope.length-1, raw_decimal_index);
        }
        
        var value;
        
        if(index <= envelope.length-1) {
            value = envelope[index];
        } else {
            // just in case index goes wild
            value = envelope[envelope.length-1];
        }
        var pitch_bend = ( (value) - 0.5 ) * 24;
        return pitch_bend;
    }

}

