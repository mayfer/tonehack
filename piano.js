

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
        var pos_jq = $('<div>')
            .addClass('keyboard-position');
		
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
                        'left': black_key_position+'px',
                        width: black_key_width+'px',
                        height: black_key_height+'px',
                    });
			} else {
		    	key_jq.addClass('vpcf_white_key')
                    .attr('id', 'vpcf_key_'+key)
                    .css({
                        'left': white_key_position+'px',
                        width: key_width+'px',
                        height: key_height+'px',
                    });
		    	white_key_position = white_key_position + key_width;
		    	white_key_counter++;

                
                var button_jq = $('<div>')
                    .addClass('button')
                    .css({'width': key_width})
                    .data('halftone', key)
                    .addClass('halftone-'+key)
                    .on('click', function(e){
                        bind_keyboard_to_notes($(this).data('halftone'));
                    });
                pos_jq.append(button_jq);
		    }
            key_jq.data('freq', Notes.relative_note(Notes.FUNDAMENTAL, key));
            $('#vpcf_container').append(key_jq).append(pos_jq);
		}
		
		var border_width = 2;
		var total_width = (white_key_counter * key_width) + border_width;
		var total_height = key_height + border_width + 10;
		$('#vpcf_container').width(total_width);
		$('#vpcf_container').height(total_height);

        if(settings.keyboard_play == true) {
            
            var char_codes_white = [
                65, // a
                83, // s
                68, // d
                70, // f
                71, // g
                72, // h
                74, // j
                75, // k
                76, // l
            ];
            var char_codes_black = [
                87, // w
                69, // e
                82, // r
                84, // t
                89, // y
                85, // u
                73, // i
                79, // o
                80, // p
            ];

            var key_bindings = {};

            var bind_keyboard_to_notes = function(halftone) {
                $(containing_div).find('.keyboard-position .button').removeClass('selected');
                $(containing_div).find('.keyboard-position .halftone-'+halftone).addClass('selected');
                key_bindings = {};
                        
                var white = 0;
                var black = 0;
                while(white < char_codes_white.length && black < char_codes_black.length) {
                    var jq_key = $(containing_div).find('#vpcf_key_' + halftone);
                    if(jq_key.hasClass('vpcf_white_key')) {
                        key_bindings[char_codes_white[white]] = halftone;
                        white++;
                    } else {
                        key_bindings[char_codes_black[black]] = halftone;
                        black++;
                    }

                    halftone += 1;
                    var jq_next_key = $(containing_div).find('#vpcf_key_' + halftone);
                    if(jq_key.hasClass('vpcf_white_key') && jq_next_key.hasClass('vpcf_white_key')) {
                        // if there are two adjacent white keys, skip one black key assignment
                        black++;
                    }
                }
                $(containing_div).find('.keyboard-label').html('');
                $.each(key_bindings, function(i, val){
                    var piano_key = $(containing_div).find('#vpcf_key_' + val);
                    piano_key.append($('<div>').addClass('keyboard-label').html(String.fromCharCode(i)));
                });
            }
            
        
            // place the keyboard assignment mover

            // initial binding
            bind_keyboard_to_notes(Notes.note_to_halftone('A1'));
            
            
            // bind keyboard press events
            $('body').on('keydown', function(e){
                var key = e.which;
                if(key in key_bindings) {
                    var piano_key = $(containing_div).find('#vpcf_key_' + key_bindings[key]);
                    if(!piano_key.hasClass('playing')) {
                        piano_key.click();
                    }
                }
            });
            $('body').on('keyup', function(e){
                var key = e.which;
                if(key in key_bindings) {
                    var piano_key = $(containing_div).find('#vpcf_key_' + key_bindings[key]);
                    if(piano_key.hasClass('playing')) {
                        piano_key.click();
                    }
                }
            });
        }
	 });
  };
})( jQuery );
