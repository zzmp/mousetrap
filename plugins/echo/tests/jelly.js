/**
 * Peanut butter goes great with jelly.
 *
 * @author Dan Tao <daniel.tao@gmail.com>
 */
var Jelly = (function() {
    var recordButton = $("button.test-record"),
        recordResult = $("div.test-record-result");

    function _formatSequenceAsHtml(sequence) {
        var combos = [],
            i;

        for (i = 0; i < sequence.length; ++i) {
            combos.push('<span>' + _formatKeysAsHtml(sequence[i].split('+')) + '</span>');
        }

        return combos.join(' ');
    }

    function _formatKeysAsHtml(keys) {
        var htmlKeys = [],
            i;

        for (i = 0; i < keys.length; ++i) {
            htmlKeys.push('<kbd>' + keys[i] + '</kbd>');
        }

        return htmlKeys.join('+');
    }

    function _prepareEchoTest() {
        echoButton.prop('disabled', true);
        echoButton.text('Recording');

        Mousetrap.echo(function(sequence) {
            echoResult.html(_formatSequenceAsHtml(sequence));
            echoButton.prop('disabled', false);
            echoButton.text('Echo');
        });

        // take focus away from the button so that Mousetrap will actually
        // capture keystrokes
        echoButton.blur();
    }

    return {
        spread: function() {
            recordButton.click(_prepareEchoTest);
        }
    };

})();
