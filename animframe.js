window.requestAnimFrame = (function(){
    return window.requestAnimationFrame || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame || 
        window.oRequestAnimationFrame || 
        window.msRequestAnimationFrame || 
        function(callback, element){
            return window.setTimeout(callback, 1000 / 60);
        };
})();
window.cancelAnimFrame = (function(){
    return window.cancelAnimationFrame || 
        window.cancelRequestAnimationFrame || 
        window.webkitCancelAnimationFrame || 
        window.webkitCancelRequestFrame || 
        window.mozCancelAnimationFrame || 
        window.mozCancelRequestAnimationFrame || 
        window.oCancelAnimationFrame || 
        window.oCancelRequestAnimationFrame || 
        window.msCancelAnimationFrame || 
        window.msCancelRequestAnimationFrame || 
        function(handler){
            clearTimeout(handler);
        };
})();
