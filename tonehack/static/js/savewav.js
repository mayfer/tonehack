//<![CDATA[
var player; // store embed tag

// This is where the magic happens
function generate(f) {
    /*
    var channels = parseInt(f.channels.value);
    var sampleRate = parseInt(f.sampleRate.value);
    var bitsPerSample = parseInt(f.bitDepth.value);
    var seconds = parseFloat(f.length.value);
    var volume = parseInt(f.volume.value);
    var frequency = parseInt(f.frequency.value);
    var showDump = f.showDump.checked;
    */
    var channels = 1;
    var sampleRate = 44100;
    var bitsPerSample = 16;
    var seconds = 2;
    var volume = 32767;
    var showDump = false;


    var data = [];
    var samples = 0;
    
    // Generate the sine waveform
    for (var i = 0; i < sampleRate * seconds; i++) {
        for (var c = 0; c < channels; c++) {
            var v = volume * Math.sin((2 * Math.PI) * (i / sampleRate) * frequency);
            data.push(pack("v", v));
            samples++;
        }
    }
    
    data = data.join('');
    
    // Format sub-chunk
    var chunk1 = [
        "fmt ", // Sub-chunk identifier
        pack("V", 16), // Chunk length
        pack("v", 1), // Audio format (1 is linear quantization)
        pack("v", channels),
        pack("V", sampleRate),
        pack("V", sampleRate * channels * bitsPerSample / 8), // Byte rate
        pack("v", channels * bitsPerSample / 8),
        pack("v", bitsPerSample)
    ].join('');

    // Data sub-chunk (contains the sound)
    var chunk2 = [
        "data", // Sub-chunk identifier
        pack("V", samples * channels * bitsPerSample / 8), // Chunk length
        data
    ].join('');
    
    // Header
    var header = [
        "RIFF",
        pack("V", 4 + (8 + chunk1.length) + (8 + chunk2.length)), // Length
        "WAVE"
    ].join('');

    var out = [header, chunk1, chunk2].join('');

    return out;

    /*
    var dataURI = "data:audio/wav;base64," + escape(btoa(out));
    
    // Append embed player
    if (player) {
        player.parentNode.removeChild(player);
    }
    player = document.createElement("embed");
    player.setAttribute("src", dataURI);
    player.setAttribute("width", 400);
    player.setAttribute("height", 100);
    player.setAttribute("autostart", true);
    document.getElementById('player-container').appendChild(player);
    
    document.getElementById('result').style.display = 'block';
    document.getElementById('wav-length').innerHTML = out.length + ' bytes';
    document.getElementById('uri-length').innerHTML = dataURI.length + ' bytes';
    
    // Generate the hex dump
    if (showDump) {
        document.getElementById('dump').style.display = 'block';
        document.getElementById('dump-contents').innerHTML = hexDump(out);
    } else {
        document.getElementById('dump').style.display = 'none';
        document.getElementById('dump-contents').innerHTML = '';
    }
    */
}

// Base 64 encoding function, for browsers that do not support btoa()
// by Tyler Akins (http://rumkin.com), available in the public domain
if (!window.btoa) {
    function btoa(input) {
        var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + 
                     keyStr.charAt(enc3) + keyStr.charAt(enc4);
        } while (i < input.length);

        return output;
    }
}

// pack() emulation (from the PHP version), for binary crunching
function pack(fmt) {
    var output = '';
    
    var argi = 1;
    for (var i = 0; i < fmt.length; i++) {
        var c = fmt.charAt(i);
        var arg = arguments[argi];
        argi++;
        
        switch (c) {
            case "a":
                output += arg[0] + "\0";
                break;
            case "A":
                output += arg[0] + " ";
                break;
            case "C":
            case "c":
                output += String.fromCharCode(arg);
                break;
            case "n":
                output += String.fromCharCode((arg >> 8) & 255, arg & 255);
                break;
            case "v":
                output += String.fromCharCode(arg & 255, (arg >> 8) & 255);
                break;
            case "N":
                output += String.fromCharCode((arg >> 24) & 255, (arg >> 16) & 255, (arg >> 8) & 255, arg & 255);
                break;
            case "V":
                output += String.fromCharCode(arg & 255, (arg >> 8) & 255, (arg >> 16) & 255, (arg >> 24) & 255);
                break;
            case "x":
                argi--;
                output += "\0";
                break;
            default:
                throw new Error("Unknown pack format character '"+c+"'");
        }
    }
    
    return output;
}

// Generates a hex dump
function hexDump(out) {
    var lines = [];
    
    for (var i = 0; i < out.length; i += 16) {
        var hex = [];
        var ascii = [];           
        
        for (var x = 0; x < 16; x++) {
            var b = out.charCodeAt(i + x).toString(16).toUpperCase();
            b = b.length == 1 ? '0' + b : b;
            hex.push(b + " ");
            
            if (out.charCodeAt(i + x) > 126 || out.charCodeAt(i + x) < 32) {
                ascii.push('.');
            } else {
                ascii.push(out.charAt(i + x));
            }
            
            if ((x + 1) % 8 == 0) {
                hex.push(" ");
            }
        }
        
        lines.push([hex.join(''), ascii.join('')].join(''));
    }
    
    return lines.join('\n');
}

var saveSoundWaves = function(e) {
    // Get a reference to the output buffer and fill it up.
    var channels = [ e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1) ];

    var wave;
    var step;
    var current_amplitude;
    var y;

    var buffer_size = channels[0].length;
    var num_channels = channels.length;

    var cumulative_amplitude = 0;

    var x_increment = Math.PI * 2 / this.sampleRate;

    for (var i = 0; i < buffer_size; i++) {
        cumulative_amplitude = 0;

        for (var j = 0; j < this.standing_waves.length; j++) {
            wave = this.standing_waves[j];

            var envelope_amplitude = wave.currentEnvelopeValue(this.counter / (this.sampleRateMillisecond * wave.duration));
            var pitch_bend = wave.currentPitchBend(this.counter / (this.sampleRateMillisecond * wave.duration));
            var current_freq = Notes.relative_note(wave.freq, pitch_bend);

            // square env. amplitude to convert it to a logarithmic scale which better suits our perception
            current_amplitude = envelope_amplitude * envelope_amplitude * wave.gain;

            // accumulate wave vals for all tones
            if(this.xs[j] == undefined) {
                this.xs[j] = 0;
            }

            // buffer value for given wave
            y = Math.sin(this.xs[j] + wave.phase);
            this.xs[j] += Math.PI * 2 * current_freq / this.sampleRate;
            
            cumulative_amplitude += (current_amplitude * y) / this.standing_waves.length;
            
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
