jQuery.extend({
    deepclone: function(objThing) {
        // return jQuery.extend(true, {}, objThing);
        /// Fix for arrays, without this, arrays passed in are returned as OBJECTS! WTF?!?!
        if ( jQuery.isArray(objThing) ) {
            return jQuery.makeArray( jQuery.deepclone($(objThing)) );
        }
        return jQuery.extend(true, {}, objThing);
    },
});
