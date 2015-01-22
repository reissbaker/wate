```
                           /$$
                          | $$
 /$$  /$$  /$$  /$$$$$$  /$$$$$$    /$$$$$$
| $$ | $$ | $$ |____  $$|_  $$_/   /$$__  $$
| $$ | $$ | $$  /$$$$$$$  | $$    | $$$$$$$$
| $$ | $$ | $$ /$$__  $$  | $$ /$$| $$_____/
|  $$$$$/$$$$/|  $$$$$$$  |  $$$$/|  $$$$$$$
 \_____/\___/  \_______/   \___/   \_______/
```

Wate is a small, fast, full-featured, easy-to-debug control flow library for
JavaScript and TypeScript. Rather than using Promise-based libraries that
swallow errors and lose stack traces in production, use Wate to manage
callbacks inside of lightweight Futures.

Wate interops with most Promise-based libraries, if you use them, by exposing
functions that can convert to and from Promises and Futures. It integrates with
typical error-first Node functions by virtue of being built explicitly for
them.


Examples
--------------------------------------------------------------------------------

Wrap a Node function to make it return Futures:

```javascript
var fs = require('fs');

function readFile(filename, encoding) {
  return wate.make(function(callback) {
    fs.readFile(filename, encoding, callback);
  });
}
```


Transform a value as soon as it's loaded:

```javascript
var fs = xmlParser = require('xml2json');

// Transform to JSON
var json = readFile('config.xml', 'utf-8').transform(function(xml) {
  return xmlParser.toJson(xml);
});

// Print the JSON
json.done(function(err, jsonVal) {
  console.log(jsonVal);
});
```


Read some files in parallel and print them when you're done:

```javascript
// Read in parallel
var proust = readFile('proust.txt', 'utf-8');
var hemingway = readFile('hemingway.txt', 'utf-8');

// Print the values once they've both loaded
wate.spreadAll([proust, hemingway], function(proustText, hemingwayText) {
  console.log('proust said', proustText);
  console.log('hemingway said', hemingwayText);
});
```


API
--------------------------------------------------------------------------------

### Futures

Futures expose a single method:

#### `.done(callback)`

Given a callback of the form `function(err, val) {}`, calls the callback with
its error and value states when it resolves. For example:

```javascript
// Returns a future for the file
var fileFuture = readFile('test.txt', 'utf-8');

fileFuture.done(function(err, text) {
  // Ordinary Node-style callback.
  if(!err) console.log(text);
});
```


### Creating Futures

#### `wate.make(builder)`

Given a callback of the form `function(callback) {}`, returns a Future that
resolves to whatever the callback is called with. For example:

```javascript
var fs = require('fs');

var fileFuture = wate.make(function(callback) {
  fs.readFile('test.txt', 'utf-8', callback);
});

fileFuture.done(function(err, text) {
  if(!err) console.log(text);
});
```


#### `wate.fromPromise(promise)`

Turns a Promise into a Wate Future. For example:

```javascript
var future = wate.fromPromise(somePromiseReturningFn());
future.done(function(err, val) {
  if(!err) console.log(val);
});
```


#### `wate.fromDOMElement`

Given a DOM element that emits `'load'` and `'error'` events, returns a future
that resolves to a null error and the element if it loads, or an error if the
element fails to load. For example:

```javascript
var image = new Image();
image.src = 'test.png';
var imageFuture = wate.fromDOMElement(image);

// Append the image if it loads
imageFuture.done(function(err, image) {
  if(!err) document.body.appendChild(image);
});
```



### Composing Futures

#### `wate.all(futures)`

Returns a Future that waits until all the given futures are successful, or
errors out as soon as the first given Future does. For example:

```javascript
var proust = readFile('proust.txt', 'utf-8');
var hemingway = readFile('hemingway.txt', 'utf-8');

wate.all([proust, hemingway]).done(function(err, texts) {
  if(!err) {
    // Note: the below is a silly way to do this, and Wate provides better
    // syntax for this so that you wouldn't write your code this way. But for
    // the sake of a gradual introduction:
    console.log(texts[0]); // proust
    console.log(texts[1]); // hemingway
  }
});
```


#### `wate.none(futures)`

Returns a Future that waits until all of the given futures have errored out, or
errors out as soon as the first given future succeeds. For example:

```javascript
var planA = runPlan('a');
var planB = runPlan('b');

wate.none([planA, planB]).done(function(succeeded, allFailures) {
  if(!succeeded) {
    console.log("we're doomed");
  }
});
```


#### `wate.settled(futures)`

Returns a Future that waits until all of the given futures have either errored
out or succeeded. The future will resolve to a list of Result objects of the
form `{ value: val, error: err }`. For example:

```javascript
wate.settled([a, b, c]).done(function(_, results) {
  results.forEach(function(result) {
    if(result.error) console.log('error', result.error);
    else console.log('success', result.value);
  });
});
```
