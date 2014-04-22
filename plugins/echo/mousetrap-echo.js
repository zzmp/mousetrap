(function (Mousetrap) {

  var _record = [];

  var _callback;

  var _breakers = {};

  // store original handleKey
  var _superHandleKey = Mousetrap.handleKey;

  var _extractBreaker = function (combination) {
    combination = combination.split('+');
    var character;

    combination.forEach(function (key, index) {
      if (key.length === 1) character = character = character ? -1 : index;
    });
    if (character === -1) return;

    character = character === undefined ? [] : combination.splice(character, 1);

    return _modifyCharacter(character, combination);
  };

  var _modifyCharacter = function (character, modifiers) {
    var combination = modifiers.sort(function (x, y) {
      return x > y ? 1 : -1;
    }).concat(character);
   
    // if a meta key is held, only take the keydown -- see original for keyup/keydown/keypress distinctions

    return combination.length ? combination : undefined;
  };

  var _parseBreakers = function (combinations) {
    var breakers = {};
    combinations = Array.isArray(combinations) ? combinations : [combinations];
  
    combinations.forEach(function (combination) {
      var breaker = _extractBreaker(combination);
      if (breaker) breakers[breaker] = true; 
    });

    return breakers;
  };

  var _fireCallback = function (callback) {
    Mousetrap.handleKey = _superHandleKey;
    callback(_record);
  };

  var _recordKey = function (character, modifiers) {
    _record.push(character);
  };

  var _handleKey = function (character, modifiers, e) {
    if (_breakers[character] ||
      _breakers[_modifyCharacter(character, modifiers)]) {
      _fireCallback(_callback);
      return;
    }

    _recordKey(character, modifiers);
  };





  Mousetrap.echo = function (callback, breaker) {
    _callback = callback;
    _breakers = _parseBreakers(breaker);
    Mousetrap.handleKey = _handleKey;
  };

})(Mousetrap);
