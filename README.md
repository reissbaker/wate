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

Wate is a small (2.1kb minified and gzipped), fast, full-featured, easy-to-debug
control flow library for JavaScript and TypeScript. Rather than using
Promise-based libraries that swallow errors and lose stack traces in
production, use Wate to manage callbacks inside of lightweight Futures.

Wate also exposes functions that convert to and from Promises and Futures, so
you can interop with Promise libraries if needed.


Examples
================================================================================

Wrap a Node function to make it return Futures:

```javascript
const fs = require('fs');

function readFile(filename, encoding) {
  return wate.make((callback) => {
    fs.readFile(filename, encoding, callback);
  });
}
```


Transform a value as soon as it's loaded:

```javascript
const xmlParser = require('xml2json');

// Read the file using the fn we defined above
const file = readFile('config.xml', 'utf-8');

// Transform to JSON
const json = wate.transform(file, (xmlText) => xmlParser.toJson(xmlText));

// Print the JSON
json.done((err, jsonVal) => {
  console.log(jsonVal);
});
```


Read some files in parallel and print them when you're done:

```javascript
// Read in parallel
const proust = readFile('proust.txt', 'utf-8');
const hemingway = readFile('hemingway.txt', 'utf-8');

// Get all the of values out of the futures once they've loaded
wate.splat([ proust, hemingway ], (proustText, hemingwayText) => {
  // Print the values
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
const fileFuture = readFile('test.txt', 'utf-8');

fileFuture.done((err, text) => {
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
const proust = readFile('proust.txt', 'utf-8');
const hemingway = readFile('hemingway.txt', 'utf-8');

wate.all([ proust, hemingway ]).done((err, texts) => {
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

Returns a Future that collects all of the errors and returns them in an array
as the `err` parameters to its `done` function, or succeeds if any of the
futures succeed.

```javascript
const planA = runPlan('a');
const planB = runPlan('b');

wate.none([ planA, planB ]).done((allFailures, succeeded) => {
  if(!succeeded) {
    console.log("we're doomed");
    console.log(allFailures);
  }
});
```


#### `wate.settled(futures)`

Returns a Future that waits until all of the given futures have either errored
out or succeeded. The future will resolve to a list of Result objects of the
form `{ value: val, error: err }`. For example:

```javascript
wate.settled([ a, b, c ]).done((_, results) => {
  results.forEach((result) => {
    if(result.error) console.log('error', result.error);
    else console.log('success', result.value);
  });
});
```


#### `wate.firstValue(futures)`

*alias: `wate.first(futures)`*

Returns a Future that resolves to the first value that any of the given futures
resolve to, or to an array of all of the errors if none of the futures are
successful. For example:

```javascript
wate.firstValue([ a, b, c ]).done((errors, first) => {
  if(!errors) console.log('value of first to finish successfully:', first);
  else console.log('all futures errored:', errors);
});
```


#### `wate.firstError(futures)`

Returns a Future that resolves to the first error that any of the given Futures
error out with, or to an array of all of the values if none of the Futures
error out. For example:

```javascript
wate.firstError([ a, b, c ]).done((values, firstError) => {
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
wate.lastValue([ a, b, c ]).done((errors, lastValue) => {
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

*alias: `wate.splatValues`*

Given a Future that will resolve (if successful) to an array of values, calls
the callback with the values as an argument list. For example:

```javascript
const red = readFile('red.txt', 'utf-8');
const blue = readFile('blue.txt', 'utf-8');

wate.spreadValues(wate.all([ red, blue ]), (redText, blueText) => {
  console.log(redText);
  console.log(blueText);
});
```


#### `wate.spreadErrors(future, callback)`

*alias: `wate.splatErrors`*

Given a Future that will resolve (on errors) to an array of errors, calls the
callback with the errors as an argument list. For example:

```javascript
const explode = readFile('none.txt', 'utf-8');
const alsoExplode = readFile('none.txt', 'utf-8');

wate.spreadErrors(wate.firstValue([ explode, alsoExplode ]), (err1, err2) => {
  console.log(err1);
  console.log(err2);
});
```


#### `wate.spreadAll(futures, callback)`

*alias: `wate.splatAll`, `wate.splat`*

Given an array of futures and a callback, calls the callback with an argument
list of values if the futures all succeed. The values will be passed into the
callback in the order that the futures were passed in the array. For example:

```javascript
wate.spreadAll([ a, b, c ], (aValue, bValue, cValue) => {
  console.log('a:', aValue);
  console.log('b:', bValue);
  console.log('c:', cValue);
});
```

This is just a convenient wrapper around a common pattern:

```javascript
wate.spread(wate.all([ a, b, c ]), (aValue, bValue, cValue) => {
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
const fileContents = readFile('config.json', 'utf-8');
const config = wate.transform(fileContents, (text) => {
  return JSON.parse(text);
});
```


#### `wate.transformError(future, callback)`

*alias: `wate.bindError(future, callback)`*

Similar to `wate.transformValue`, but transforms errors.


#### `wate.unwrapValue`

*alias: `wate.unwrap`*

Given a future that resolves to another future, unwraps the inner future.

```javascript
const urlToLoad = wate.make((callback) => {
  fs.readFile("url-to-load.txt", "utf-8", callback);
});

const networkFuture = wate.transform(urlToLoad, (url) => {
  // For bind() calls, ordinarily we return a value. Here, however, we're
  // returning another future, since we need to make an async request to get
  // the data. That means "networkFuture" will actually resolve to... another
  // future.
  return wate.make((callback) => {
    networkRequest(url, callback);
  });
});

// Hence, we unwrap it:
const network = wate.unwrap(networkFuture);

// In practice, you'd probably just use the unwrapTransform convenience
// function like so:

const network = wate.unwrapTransform(urlToLoad, (url) => {
  return wate.make((callback) => {
    networkRequest(url, callback);
  });
});
```


#### `wate.unwrapError`

Similar to `unwrapValue`, but unwraps a future returned as an error rather than a
future that's returned as a value.


#### `wate.unwrapBind`

*alias: `wate.unwrapTransform`*

Composes the `bindValue` and `unwrapValue` calls. For example:

```javascript
const urlToLoad = wate.make((callback) => {
  fs.readFile('url-to-load.txt', 'utf-8', callback);
});
const network = wate.unwrapTransform(urlToLoad, (url) => {
  return wate.make((callback) => {
    networkRequest(url, callback);
  });
});

network.done((err, val) => {
  // assuming success, val is the value of the network call
});
```


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
const fs = require('fs');

const fileFuture = wate.make((callback) => {
  fs.readFile('test.txt', 'utf-8', callback);
});

fileFuture.done((err, text) => {
  if(!err) console.log(text);
});
```


#### `wate.value(val)`

Creates a future of a raw value. For example:

```javascript
const future = wate.value(10);
```


#### `wate.error(err)`

Creates a failed future given a raw error (or any JS value). For example:

```javascript
const future = wate.error("an error string");
```


#### `wate.fromDOMElement`

Given a DOM element that emits `'load'` and `'error'` events, returns a future
that resolves to a null error and the element if it loads, or an error if the
element fails to load. For example:

```javascript
const image = new Image();
image.src = 'test.png';
const imageFuture = wate.fromDOMElement(image);

// Append the image if it loads
imageFuture.done((err, image) => {
  if(!err) document.body.appendChild(image);
});
```


Promise Interop
--------------------------------------------------------------------------------

#### `wate.fromPromise(promise)`

Turns a Promise into a Wate Future. For example:

```javascript
const promise = somePromiseReturningFn();
const future = wate.fromPromise(promise);
```


#### `wate.toPromise(future)`

Turns a Future into a Promises/A compatible promise. Note that the Promises/A+
spec mandates interop with Promises/A, so this should work even with
Promises/A+ libraries. For example:

```javascript
const future = wate.value(10);
const promise = wate.toPromise(future);
```
