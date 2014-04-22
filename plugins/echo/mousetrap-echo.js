(function (Mousetrap) {

  var _nextAction;
  // callback to take _record array
  var _callback;
  // breaker/event combos on which to trigger callback
  var _breakers = {};
  // recorded keystrokes
  var _record = [];
  var _recordString = [];
  // original handleKey to reset Mousetrap after callback
  var _superHandleKey = Mousetrap.handleKey;

  // convert character and modifiers to a sorted array for parsing
  var _modifyCharacter = function (character, modifiers) {
    var combination = modifiers.sort(function (x, y) {
      return x > y ? 1 : -1;
    }).concat(character);

    return combination.length ? combination : undefined;
  };

  // convert 
  var _extractBreaker = function (combination) {
    combination = combination.split('+');
    var character;

    combination.forEach(function (key, index) {
      if (key.length === 1) {
        // only allow one character per breaker (excluding modifiers)
        character = character ? -1 : index;
      }
    });
    if (character === -1) return;

    character = character === undefined ?
      [] : combination.splice(character, 1);

    return _modifyCharacter(character, combination);
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

  var _preventDefault = function (e) {
    if (e.preventDefault) {
      e.preventDefault();
      return;
    }

    e.returnValue = false;
  }

  var _stopPropogation = function (e) {
    if (e.stopPropogation) {
      e.stopPropogation();
      return;
    }

    e.cancelBubble = true;
  }

  var _fireCallback = function (callback) {
    Mousetrap.handleKey = _superHandleKey;
    if ( callback(_record, _recordString.join('')) === false ) {
      _preventDefault(e);
      _stopPropogation(e);
    }
  };

  var _recordKey = function (character, modifiers, e) {
    if (modifiers.length) {
      // only record shifted keys
      _nextAction = e.type === 'keyup' ? 'keydown' : 'keypress';
    } else {
      _nextAction = _nextAction && 'keydown';
    }

    if (_nextAction && e.type !== _nextAction) {
      return;
    }

    // general record
    var memo = {
      char: character,
      mods: modifiers
    };
    _record.push(memo);
    
    // blind type record
    if (character.length === 1) {
      _recordString.push(character);
    } else if (character === 'enter') {
      _recordString.push('\\n');
    } else if (character === 'tab') {
      _recordString.push('\\r');
    } else if (character === 'space') {
      _recordString.push(' ');
    } else if (character === 'backspace') {
      _recordString.pop();
    }
  };

  var _handleKey = function (character, modifiers, e) {
    if (e.type = _event &&
      (_breakers[character] || 
        _breakers[_modifyCharacter(character, modifiers)] )
      )
    {
      _fireCallback(_callback);
      return;
    }

    _recordKey(character, modifiers, e);
  };

  Mousetrap.echo = function (callback, breaker, e) {
    _nextAction;
    _record = [];
    _recordString = [];
    _callback = callback;
    _event = e || 'keypress';
    _breakers = _parseBreakers(breaker, e);
    Mousetrap.handleKey = _handleKey;
  };

})(Mousetrap);
