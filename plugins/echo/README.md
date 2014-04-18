# Echo

This extension lets you use Mousetrap to record keyboard sequences and play them back;
it differs from the [record](https://github.com/ccampbell/mousetrap/tree/master/plugins/record) plugin by allowing character duplicates, retaining order, and ending the sequence after a defined break character.

Essentially, echo implements blind typing:

```html
<button onclick="echoType()">Echo</button>

<script>
  function echoType() {
    Mousetrap.echo(function(sequence) {
      // sequence is an array like ['t', 'h', 'i', 's', ' ',' i', 's']
      alert('You pressed: ' + sequence.join(' '));
    }, 'enter');
      // typing 'enter' will trigger the callback);
  }
</script>
```

Additionaly, echo allows ASCII-like return with a third parameter:

```Mousetrap.echo(callback, 'enter', {ASCII: true});```
