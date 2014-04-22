(function (Mousetrap) {

  var _record = [];

  var _callback;

  var _breaker;

  var _superHandleKey = Mousetrap.handleKey;
  // store text entered until breaker
  // reset _handleKey and call callback on text
  // pass breaker to Mousetrap
  //
  // make for 1 combo then refactor to allow arrays on entry

  var _modifiedCharacter(character, modifiers) {

  }

  var _fireCallback = function (callback) {
    Mousetrap.handleKey = _superHandleKey;
    callback(_record);
  };

  var _handleKey = function(character, modifiers, e) {
    if (_breaker[character] ||
      _breaker[_modifiedCharacter(character, modifiers)]) {
      _fireCallback(_callback);
      return;
    }

    _recordKey(character, modifiers);
  };





  Mousetrap.echo = function(callback, breaker) {
   _callback = callback;
   _breaker = _parseBreakers(breaker);
   _allowAllKeys = allowAllKeys;
   Mousetrap.handleKey = _handleKey;
  };

})(Mousetrap);
