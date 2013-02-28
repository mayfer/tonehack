

(function( $ ) {
  $.fn.piano = function(options) {
	var containing_div = this;
	
	var settings = $.extend({
      number_of_keys: 20,
      key_width: 30,
      key_height: 130,
      keyboard_play: false,
    }, options);
    
    return this.each(function() {  
		var number_of_keys = settings.number_of_keys;
		var key_width = settings.key_width;
		var key_height = settings.key_height;
		
		var black_key_offset = parseInt(key_width / 4); // offset (distance - offset = width between keys)   
		var black_key_width = parseInt(key_width/2);
		var black_key_height = parseInt(key_height/1.65);
		var black_key_position = 0;
		var white_key_counter = 0;
		
		var white_key_position = 0;
		
		var key_notes = Notes.NOTE_NAMES;
		
		$(containing_div).append('<div id="vpcf_container"></div>');
		
        var start_from = key_notes.indexOf('A');
		for(var key = start_from; key <= number_of_keys+start_from; key++){
            var key_jq = $('<div>')
                .addClass('note note-'+key_notes[(key)%12]+' octave-'+Math.floor(key/12))
			// if key is a black key
			if(key_notes[key%12].length > 1){
                // string length > 1 means sharp or flat
			    black_key_position = (key_width * white_key_counter) - black_key_offset;
		    	key_jq.addClass('vpcf_black_key')
                    .attr('id', 'vpcf_key_'+key)
                    .css({
                        'margin-left': black_key_position+'px',
                        width: black_key_width+'px',
                        height: black_key_height+'px',
                    });
			} else {
		    	key_jq.addClass('vpcf_white_key')
                    .attr('id', 'vpcf_key_'+key)
                    .css({
                        'margin-left': white_key_position+'px',
                        width: key_width+'px',
                        height: key_height+'px',
                    });
		    	white_key_position = white_key_position + key_width;
		    	white_key_counter++;
		    }
            key_jq.data('freq', Notes.relative_note(Notes.FUNDAMENTAL, key));
            $('#vpcf_container').append(key_jq);
		}
		
		var border_width = 2;
		var total_width = (white_key_counter * key_width) + border_width;
		var total_height = key_height + border_width;
		$('#vpcf_container').width(total_width);
		$('#vpcf_container').height(total_height);

        if(settings.keyboard_play == true) {
            var key_bindings = {
                65: 'A2', // a
                83: 'B2', // s
                68: 'C2', // d
                70: 'D2', // f
                71: 'E2', // g
                72: 'F2', // h
                74: 'G2', // j
                75: 'A3', // k
                76: 'B3', // l

                87: 'B2b', // w
                82: 'C2#', // r
                84: 'E2b', // t
                85: 'F2#', // u
                73: 'G2#', // i
                79: 'B3b', // o
            };

            $.each(key_bindings, function(i, val){
                var piano_key = $(containing_div).find('#vpcf_key_' + Notes.note_to_halftone(val));
                piano_key.append($('<div>').addClass('keyboard-label').html(String.fromCharCode(i)));
            });
            
            $('body').on('keydown', function(e){
                var key = e.which;
                if(key in key_bindings) {
                    var piano_key = $(containing_div).find('#vpcf_key_' + Notes.note_to_halftone(key_bindings[key]));
                    if(!piano_key.hasClass('playing')) {
                        piano_key.click();
                    }
                }
            });
            $('body').on('keyup', function(e){
                var key = e.which;
                if(key in key_bindings) {
                    var piano_key = $(containing_div).find('#vpcf_key_' + Notes.note_to_halftone(key_bindings[key]));
                    if(piano_key.hasClass('playing')) {
                        piano_key.click();
                    }
                }
            });
        }
	 });
  };
})( jQuery );
