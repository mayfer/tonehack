jQuery.extend({
    deepclone: function(objThing) {
        // return jQuery.extend(true, {}, objThing);
        /// Fix for arrays, without this, arrays passed in are returned as OBJECTS! WTF?!?!
        if ( jQuery.isArray(objThing) ) {
            return jQuery.makeArray( jQuery.deepclone($(objThing)) );
        }
        return jQuery.extend(true, {}, objThing);
    },

    nextWrap: function() {
        var $next = this.next();
        return ($next.length === 0) ? this.siblings().first() : $next;
    },
    
    prevWrap: function() {
        var $prev = this.prev();
        return ($prev.length === 0) ? this.siblings().last() : $prev;
    },

});
