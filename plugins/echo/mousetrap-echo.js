(function(Mousetrap) {
   
    var _text = [];

    var _echoCallback;

    var _allowAllKeys;

    // store text entered until breaker
    // reset _handleKey and call callback on text
    // pass breaker to Mousetrap

    var _handleKey = function(character, modifiers, e) {
       if (character === breaker) {
         _echoCallback
    };




    
    Mousetrap.echo = function(callback, breaker, allowAllCharacters) {
	_echoCallback = callback;
	_breaker = breaker;
	_allowAllKeys = allowAllKeys;
	Mousetrap.handleKey = _handleKey;
    };

})(Mousetrap);
