// anonymous function invocation to add Mousetrap to the global object
(function(window, document, undefined) {

    // map ascii to human-readable names
    var _MAP = {
            8: 'backspace',
            9: 'tab',
            13: 'enter',
            16: 'shift',
            17: 'ctrl',
            18: 'alt',
            20: 'capslock',
            27: 'esc',
            32: 'space',
            33: 'pageup',
            34: 'pagedown',
            35: 'end',
            36: 'home',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            45: 'ins',
            46: 'del',
            91: 'meta',
            93: 'meta',
            224: 'meta'
        },

    // map ascii to special characters 
        _KEYCODE_MAP = {
            106: '*',
            107: '+',
            109: '-',
            110: '.',
            111 : '/',
            186: ';',
            187: '=',
            188: ',',
            189: '-',
            190: '.',
            191: '/',
            192: '`',
            219: '[',
            220: '\\',
            221: ']',
            222: '\''
        },

    // map shifted keys to unshifted characters
        _SHIFT_MAP = {
            '~': '`',
            '!': '1',
            '@': '2',
            '#': '3',
            '$': '4',
            '%': '5',
            '^': '6',
            '&': '7',
            '*': '8',
            '(': '9',
            ')': '0',
            '_': '-',
            '+': '=',
            ':': ';',
            '\"': '\'',
            '<': ',',
            '>': '.',
            '?': '/',
            '|': '\\'
        },

    // map alternate names to modifier characters
        _SPECIAL_ALIASES = {
            'option': 'alt',
            'command': 'meta',
            'return': 'enter',
            'escape': 'esc',
            'mod': /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl'
        },

        _REVERSE_MAP,

    // map of bound callbacks
        _callbacks = {},

    // map of combos to callbacks (used in trigger)
        _directMap = {},

    // tracks current sequence levels for overlapping bindings (ex.: 'a + b', 'a + c')
        _sequenceLevels = {},

    // setTimeout return ID (for sequencing)
        _resetTimer,

    // marker to ignore next keyup event
        _ignoreNextKeyup = false,

    // marker to ignore next keypress event
        _ignoreNextKeypress = false,

    // marker for next expected event (false if not in sequence)
        _nextExpectedAction = false;

    // add function keys to _MAP (F1, etc.)
    for (var i = 1; i < 20; ++i) {
        _MAP[111 + i] = 'f' + i;
    }

    // add numpad keys to _MAP
    for (i = 0; i <= 9; ++i) {
        _MAP[i + 96] = i;
    }

    // cross-browser compatibility
    function _addEvent(object, type, callback) {
        if (object.addEventListener) {
            object.addEventListener(type, callback, false);
            return;
        }

        object.attachEvent('on' + type, callback);
    }

    // return character from event
    function _characterFromEvent(e) {

        if (e.type == 'keypress') {
            var character = String.fromCharCode(e.which);

            if (!e.shiftKey) {
                character = character.toLowerCase();
            }

            return character;
        }

        if (_MAP[e.which]) {
            return _MAP[e.which];
        }

        if (_KEYCODE_MAP[e.which]) {
            return _KEYCODE_MAP[e.which];
        }

        return String.fromCharCode(e.which).toLowerCase();
    }

    // check if two arrays contain the same modifiers
    function _modifiersMatch(modifiers1, modifiers2) {
        return modifiers1.sort().join(',') === modifiers2.sort().join(',');
    }

    // reset all sequence levels except for those in doNotReset
    function _resetSequences(doNotReset) {
        doNotReset = doNotReset || {};

        var activeSequences = false,
            key;

        for (key in _sequenceLevels) {
            if (doNotReset[key]) {
                activeSequences = true;
                continue;
            }
            _sequenceLevels[key] = 0;
        }

        if (!activeSequences) {
            _nextExpectedAction = false;
        }
    }

    // return all matching callbacks
    function _getMatches(character, modifiers, e, sequenceName, combination, level) {
        var i,
            callback,
            matches = [],
            action = e.type;

        if (!_callbacks[character]) {
            return [];
        }

	// detect modifiers
        if (action == 'keyup' && _isModifier(character)) {
            modifiers = [character];
        }

	// for all callbacks using this character
        for (i = 0; i < _callbacks[character].length; ++i) {
            callback = _callbacks[character][i];

	    // only check callbacks that terminate at this sequence level
            if (!sequenceName && callback.seq && _sequenceLevels[callback.seq] != callback.level) {
                continue;
            }

	    // only check callback that terminate at this event action (keypress, etc.)
            if (action != callback.action) {
                continue;
            }

            if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

		// overwrite old bindings
                var deleteCombo = !sequenceName && callback.combo == combination;
                var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
                if (deleteCombo || deleteSequence) {
                    _callbacks[character].splice(i, 1);
                }

                matches.push(callback);
            }
        }

        return matches;
    }

    // translate keys to modifiers
    function _eventModifiers(e) {
        var modifiers = [];

        if (e.shiftKey) {
            modifiers.push('shift');
        }

        if (e.altKey) {
            modifiers.push('alt');
        }

        if (e.ctrlKey) {
            modifiers.push('ctrl');
        }

        if (e.metaKey) {
            modifiers.push('meta');
        }

        return modifiers;
    }

    // stop event default
    function _preventDefault(e) {
        if (e.preventDefault) {
            e.preventDefault();
            return;
        }

        e.returnValue = false;
    }

    // stop event propogation
    function _stopPropagation(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
            return;
        }

        e.cancelBubble = true;
    }

    // invoke the callback; stop default/propgation is callback returns false
    function _fireCallback(callback, e, combo, sequence) {

        if (Mousetrap.stopCallback(e, e.target || e.srcElement, combo, sequence)) {
            return;
        }

        if (callback(e, combo) === false) {
            _preventDefault(e);
            _stopPropagation(e);
        }
    }

    // handle key events
    function _handleKey(character, modifiers, e) {
        var callbacks = _getMatches(character, modifiers, e),
            i,
            doNotReset = {},
            maxLevel = 0,
            processedSequenceCallback = false;

	// calculate maxLevel of matching callbacks (only longest sequence should be called)
        for (i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].seq) {
                maxLevel = Math.max(maxLevel, callbacks[i].level);
            }
        }

	// for all matching callbacks
        for (i = 0; i < callbacks.length; ++i) {

	    // for all sequences
            if (callbacks[i].seq) {

		// only fire callbacks at maxLevel (to prevent subsequences, i.e. 'g + t' v. 'a + g + t')
                if (callbacks[i].level != maxLevel) {
                    continue;
                }

                processedSequenceCallback = true;

		// record processed sequences
                doNotReset[callbacks[i].seq] = 1;
		// invoke callback on sequence (e.g. keep it alive)
                _fireCallback(callbacks[i].callback, e, callbacks[i].combo, callbacks[i].seq);
                continue;
            }

	    // invoke callback on combo (if no sequence was found)
            if (!processedSequenceCallback) {
                _fireCallback(callbacks[i].callback, e, callbacks[i].combo);
            }
        }

	// reset unmatched sequences
        var ignoreThisKeypress = e.type == 'keypress' && _ignoreNextKeypress;
        if (e.type == _nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
            _resetSequences(doNotReset);
        }

        _ignoreNextKeypress = processedSequenceCallback && e.type == 'keydown';
    }

    // handle keydown events
    function _handleKeyEvent(e) {

        // see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
        if (typeof e.which !== 'number') {
            e.which = e.keyCode;
        }

        // retrieve character from event
        var character = _characterFromEvent(e);

        if (!character) {
            return;
        }

        if (e.type == 'keyup' && _ignoreNextKeyup === character) {
            _ignoreNextKeyup = false;
            return;
        }

	// pass to helper function
        Mousetrap.handleKey(character, _eventModifiers(e), e);
    }

    // return modifier name
    function _isModifier(key) {
        return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
    }

    // time pauses in sequence (1s)
    function _resetSequenceTimer() {
        clearTimeout(_resetTimer);
        _resetTimer = setTimeout(_resetSequences, 1000);
    }

    // reverse map lookup
    function _getReverseMap() {
        if (!_REVERSE_MAP) {
            _REVERSE_MAP = {};
            for (var key in _MAP) {

                // pull out the numeric keypad from here cause keypress should
                // be able to detect the keys from the character
                if (key > 95 && key < 112) {
                    continue;
                }

                if (_MAP.hasOwnProperty(key)) {
                    _REVERSE_MAP[_MAP[key]] = key;
                }
            }
        }
        return _REVERSE_MAP;
    }

    // pick action based on key
    function _pickBestAction(key, modifiers, action) {

	// if no action is passed, pick the best one based on mapping
        if (!action) {
            action = _getReverseMap()[key] ? 'keydown' : 'keypress';
        }

	// modifiers trigger keydown action
        if (action == 'keypress' && modifiers.length) {
            action = 'keydown';
        }

        return action;
    }

    // bind key sequence
    function _bindSequence(combo, keys, callback, action) {

	// initialize sequence level
        _sequenceLevels[combo] = 0;

	// increase sequence level and reset other sequences
        function _increaseSequence(nextAction) {
            return function() {
                _nextExpectedAction = nextAction;
                ++_sequenceLevels[combo];
                _resetSequenceTimer();
            };
        }

	// fire callback and reset sequences
        function _callbackAndReset(e) {
            _fireCallback(callback, e, combo);

            // prevent double-triggering
	    if (action !== 'keyup') {
                _ignoreNextKeyup = _characterFromEvent(e);
            }

	    // avoid race condition
            setTimeout(_resetSequences, 10);
        }

	// bind the sequence
        for (var i = 0; i < keys.length; ++i) {
            var isFinal = i + 1 === keys.length;
            var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence(action || _getKeyInfo(keys[i + 1]).action);
            _bindSingle(keys[i], wrappedCallback, action, combo, i);
        }
    }

    // Get keys from string representation
    function _keysFromString(combination) {
        if (combination === '+') {
            return ['+'];
        }

        return combination.split('+');
    }

    // Get information on bound keys
    function _getKeyInfo(combination, action) {
        var keys,
            key,
            i,
            modifiers = [];

	// Get keys from string representation (as an array)
        keys = _keysFromString(combination);

        for (i = 0; i < keys.length; ++i) {
            key = keys[i];

            // normalize key names
            if (_SPECIAL_ALIASES[key]) {
                key = _SPECIAL_ALIASES[key];
            }

	    // use shifted keys
            if (action && action != 'keypress' && _SHIFT_MAP[key]) {
                key = _SHIFT_MAP[key];
                modifiers.push('shift');
            }

	    // detect modifiers
            if (_isModifier(key)) {
                modifiers.push(key);
            }
        }

	// find the best action
        action = _pickBestAction(key, modifiers, action);

        // return key combination information
        return {
            key: key,
            modifiers: modifiers,
            action: action
        };
    }

    // bind combo
    function _bindSingle(combination, callback, action, sequenceName, level) {

	// map callback (for Mousetrap.trigger)
        _directMap[combination + ':' + action] = callback;

	// trim excess space (' ')
        combination = combination.replace(/\s+/g, ' ');

        var sequence = combination.split(' '),
            info;

	// detect multiple combos
        if (sequence.length > 1) {
            _bindSequence(combination, sequence, callback, action);
            return;
        }

        info = _getKeyInfo(combination, action);

        _callbacks[info.key] = _callbacks[info.key] || [];

	// remove duplicates
        _getMatches(info.key, info.modifiers, {type: info.action}, sequenceName, combination, level);

	// unshift sequences, push combos
        _callbacks[info.key][sequenceName ? 'unshift' : 'push']({
            callback: callback,
            modifiers: info.modifiers,
            action: info.action,
            seq: sequenceName,
            level: level,
            combo: combination
        });
    }

    // bind combos
    function _bindMultiple(combinations, callback, action) {
        for (var i = 0; i < combinations.length; ++i) {
            _bindSingle(combinations[i], callback, action);
        }
    }

    // start!
    _addEvent(document, 'keypress', _handleKeyEvent);
    _addEvent(document, 'keydown', _handleKeyEvent);
    _addEvent(document, 'keyup', _handleKeyEvent);

    // the library, bound to the global object
    var Mousetrap = {

	// bind callback to mousetrap
	// > can be a single key, a combination of keys separated with +, an array of keys, or a sequence of keys separated by spaces
        bind: function(keys, callback, action) {
            keys = keys instanceof Array ? keys : [keys];
            _bindMultiple(keys, callback, action);
            return this;
        },

	// unbind callback from mousetrap
        unbind: function(keys, action) {
            return Mousetrap.bind(keys, function() {}, action);
        },

	// trigger bound callback
        trigger: function(keys, action) {
            if (_directMap[keys + ':' + action]) {
                _directMap[keys + ':' + action]({}, keys);
            }
            return this;
        },

	// reset bound callbacks
        reset: function() {
            _callbacks = {};
            _directMap = {};
            return this;
        },

	// stop callbacks if DOM element should not use Mousetrap
        stopCallback: function(e, element) {

	    // allow callbacks if DOM element has class mousetrap
            if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
                return false;
            }

	    // disallow callbacks for input, select, and textarea elements
            return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || element.isContentEditable;
        },

	// OMG an exposed key: for plugins like mine!
        handleKey: _handleKey
    };

    // expose Mousetrap to the global object (browser)
    window.Mousetrap = Mousetrap;

    // expose Mousetrap to the global object (AMD)
    if (typeof define === 'function' && define.amd) {
        define(Mousetrap);
    }
}) (window, document);
