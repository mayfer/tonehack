var player; // store embed tag

function interleave(leftChannel, rightChannel){
  var length = leftChannel.length + rightChannel.length;
  var result = new Float32Array(length);

  var inputIndex = 0;

  for (var index = 0; index < length; ){
    result[index++] = leftChannel[inputIndex];
    result[index++] = rightChannel[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeUTFBytes(view, offset, string){
  var lng = string.length;
  for (var i = 0; i < lng; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function makeWav(audiodata, sampleRate) {
    // we flat the left and right channels down
    var leftBuffer = audiodata[0];
    var rightBuffer = audiodata[1];
    // we interleave both channels together
    var interleaved = interleave ( leftBuffer, rightBuffer );

    // create the buffer and view to create the .WAV file
    var buffer = new ArrayBuffer(44 + interleaved.length * 2);
    var view = new DataView(buffer);

    // write the WAV container, check spec at: https://ccrma.stanford.edu/courses/422/projects/WaveFormat/
    // RIFF chunk descriptor
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 44 + interleaved.length * 2, true);
    writeUTFBytes(view, 8, 'WAVE');
    // FMT sub-chunk
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    // stereo (2 channels)
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    // data sub-chunk
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, interleaved.length * 2, true);

    // write the PCM samples
    var lng = interleaved.length;
    var index = 44;
    var volume = 1;
    for (var i = 0; i < lng; i++){
        view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
        index += 2;
    }

    // our final binary blob that we can hand off
    var blob = new Blob ( [ view ], { type : 'audio/wav' } );
    saveAs(blob);
}

function saveSoundWaves(soundWave, duration) {
    var buffer_size = duration * soundWave.sampleRate / 1000;
    var channels = [ new Float32Array(buffer_size), new Float32Array(buffer_size) ];

    var wave;
    var step;
    var current_amplitude;
    var y;

    var num_channels = channels.length;

    var cumulative_amplitude = 0;

    var x_increment = Math.PI * 2 / soundWave.sampleRate;

    var counter = 0;
    var fadeout_counter = 0;

    for (var i = 0; i < buffer_size; i++) {
        cumulative_amplitude = 0;

        for (var j = 0; j < soundWave.standing_waves.length; j++) {
            wave = soundWave.standing_waves[j];

            var envelope_amplitude = wave.currentEnvelopeValue(counter / (soundWave.sampleRateMillisecond * wave.duration));
            var pitch_bend = wave.currentPitchBend(counter / (soundWave.sampleRateMillisecond * wave.duration));
            var current_freq = Notes.relative_note(wave.freq, pitch_bend);

            // square env. amplitude to convert it to a logarithmic scale which better suits our perception
            current_amplitude = envelope_amplitude * envelope_amplitude * wave.gain;

            // accumulate wave vals for all tones
            if(soundWave.xs[j] == undefined) {
                soundWave.xs[j] = 0;
            }

            // buffer value for given wave
            y = Math.sin(soundWave.xs[j] + wave.phase);
            soundWave.xs[j] += Math.PI * 2 * current_freq / soundWave.sampleRate;
            
            cumulative_amplitude += (current_amplitude * y) / soundWave.standing_waves.length;
            
        }
        if(counter + 1000 >= buffer_size) {
            // fadeout to prevent popping during a pause/stop
            var fadeout_length = 10000;
            cumulative_amplitude -= cumulative_amplitude * (fadeout_counter++/fadeout_length)
            if(this.fadeout_counter >= fadeout_length) {
                counter = 0;
                fadeout_counter = 0;
                break;
            }
        }
        for(var k = 0; k < num_channels; k++) {
            channels[k][i] = cumulative_amplitude;
        }
        counter += 1;
    }

    makeWav(channels, soundWave.sampleRate);
}
