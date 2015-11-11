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

Wate is a small (2kb minified and gzipped), fast, full-featured, easy-to-debug
control flow library for JavaScript and TypeScript. Rather than using
Promise-based libraries that swallow errors and lose stack traces in
production, use Wate to manage callbacks inside of lightweight Futures.

Wate also exposes functions that convert to and from Promises and Futures, so
you can interop with Promise libraries if needed.


Examples
================================================================================

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
var json = wate.transform(readFile('config.xml', 'utf-8'), function(xml) {
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
================================================================================


Futures
--------------------------------------------------------------------------------

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


Composing Futures
--------------------------------------------------------------------------------

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


##### `wate.firstValue(futures)`

*alias: `wate.first(futures)`*

Returns a Future that resolves to the first value that any of the given futures
resolve to, or to an array of all of the errors if none of the futures are
successful. For example:

```javascript
wate.firstValue([a, b, c]).done(function(errors, first) {
  if(!errors) console.log('value of first to finish successfully:', first);
  else console.log('all futures errored:', errors);
});
```


#### `wate.firstError(futures)`

Returns a Future that resolves to the first error that any of the given Futures
error out with, or to an array of all of the values if none of the Futures
error out. For example:

```javascript
wate.firstError([a, b, c]).done(function(values, firstError) {
  if(firstError) console.log('first error', firstError);
  else console.log('no errors, values were:', values);
});
```


#### `wate.lastValue(futures)`

*alias: `wate.last(futures)`*

Returns a Future that resolves to the last value that the given Futures resolve
to, or an array or all of the errors if none of the futures are successful. For
example:

```javascript
wate.lastValue([a, b, c]).done(function(errors, lastValue) {
  if(!errors) console.log('last value to succeed was:', lastValue);
  else console.log('all futures errored:', errors);
});
```


#### `wate.concatValues`

*alias: `wate.concat`*

Given an array of Futures that resolve to arrays of values, returns a Future
that resolves to the concatenation of all of the values. For example:

```javascript
const a = wate.value([ 10, 20 ]);
const b = wate.value([ 30, 40 ]);
const c = wate.value([ 50, 60 ]);

wate.concat([ a, b, c ]).done((err, values) => {
  // values is [ 10, 20, 30, 40, 50, 60 ]
});
```


#### `wate.concatErrors`

Similar to `wate.concatValues`, but for errors.



Working with Futures
--------------------------------------------------------------------------------

#### `wate.spreadValues(future, callback)`

*alias: `wate.spread(future, callback)`*

Given a Future that will resolve (if successful) to an array of values, calls
the callback with the values as an argument list. For example:

```javascript
var red = readFile('red.txt', 'utf-8');
var blue = readFile('blue.txt', 'utf-8');

wate.spreadValues(wate.all([red, blue]), function(redText, blueText) {
  console.log(redText);
  console.log(blueText);
});
```


#### `wate.spreadErrors(future, callback)`

Given a Future that will resolve (on errors) to an array of errors, calls the
callback with the errors as an argument list. For example:

```javascript
var explode = readFile('none.txt', 'utf-8');
var alsoExplode = readFile('none.txt', 'utf-8');

wate.spreadErrors(wate.firstValue([explode, alsoExplode]), function(err1, err2) {
  console.log(err1);
  console.log(err2);
});
```


#### `wate.spreadAllValues(futures, callback)`

*alias: `wate.spreadAll(futures, callback)`*

Given an array of futures and a callback, calls the callback with an argument
list of values if the futures all succeed. The values will be passed into the
callback in the order that the futures were passed in the array. For example:

```javascript
wate.spreadAll([a, b, c], function(aValue, bValue, cValue) {
  console.log('a:', aValue);
  console.log('b:', bValue);
  console.log('c:', cValue);
});
```

This is just a convenient wrapper around a common pattern:

```javascript
wate.spread(wate.all([a, b, c]), function(aValue, bValue, cValue) {
  console.log('a:', aValue);
  console.log('b:', bValue);
  console.log('c:', cValue);
});
```


#### `wate.transformValue(future, mapper)`

*aliases: `wate.transform(future, callback)`, `wate.bindValue(future,
callback)`, `wate.bind(future, callback)`*

Given a future, returns a future that will resolve to the value of the given
future, transformed by the given mapper function. For example:

```javascript
var fileContents = readFile('config.json', 'utf-8');
var config = wate.transform(fileContents, function(text) {
  return JSON.parse(text);
});
```


#### `wate.transformError(future, callback)`

*alias: `wate.bindError(future, callback)`*

Similar to `wate.transformValue`, but transforms errors.


#### `wate.invert(future)`

Given a future that resolves to an error, returns a future that resolves to
that error as its value. Similarly, given a future that resolves to a value,
returns a future that resolves to the value as its error. For example:

```javascript
const val = wate.value(10);
const inverted = wate.invert(val);
inverted.done((err) => {
  // err is 10 here
});
```


Creating Futures
--------------------------------------------------------------------------------

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
