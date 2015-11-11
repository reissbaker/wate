'use strict';

import Deferred = require('./lib/deferred');
import Future = require('./lib/future');
import Result = require('./lib/result');
import Callback = require('./lib/callback');
import Promise = require('./lib/promise');

/*
 * Public interfaces
 * -------------------------------------------------------------------------------------------------
 */

export interface BuilderFunction<E, V> {
  (callback: Callback<E, V>): any;
}

export interface DoubledBuilderFn<E, V> {
  (fullfill: (v: V) => any, reject?: (e: E) => any): any;
}

export interface Thenable<E, V, Er, Vr> {
  then: (callback: (v: V) => Vr, errback: (e: E) => Er) => any;
}

export interface Transform<I, O> {
  (val: I): O;
}

export interface DOMEl {
  addEventListener: (key: string, listener: (v?: any) => any) => any;
}

/*
 * Factory functions
 * -------------------------------------------------------------------------------------------------
 */

/*
 * Factory that gives a useful node-style callback to pass around
 */
export function make<E, V>(builder: BuilderFunction<E, V>): Future<E, V> {
  const deferred = new Deferred<E, V>();
  builder(deferred.cb);
  return new Future(deferred);
}

/*
 * Factory that gives Promise-style fulfill() and reject() functions to call manually
 */
export function create<E, V>(builder: DoubledBuilderFn<E, V>): Future<E, V> {
  const deferred = new Deferred<E, V>();

  builder((v: V) => {
    deferred.cb(null, v);
  }, (e: E) => {
    deferred.cb(e);
  });

  return new Future(deferred);
}

/*
 * Generate resolved futures from raw values
 */
export function value<E, V>(value: V): Future<E, V> {
  return create((fulfill: (v: V) => any) => {
    fulfill(value);
  });
}

/*
 * Generate failed futures from raw error values
 */
export function error<E, V>(error: E): Future<E, V> {
  return make((callback: Callback<E, any>) => {
    callback(error);
  });
}

/*
 * Wrap loadable DOM elements, like images
 */
export function fromDOMElement<E>(el: DOMEl): Future<E, DOMEl> {
  return make((cb: Callback<E, DOMEl>) => {
    el.addEventListener('load', () => {
      cb(null, el);
    });
    el.addEventListener('error', (e: E) => {
      cb(e);
    });
  });
}


/*
 * Promise interop and helpers
 * -------------------------------------------------------------------------------------------------
 */

/*
 * Emulates the .then function from Promises/A, but as a function rather than a method
 */
export function then<E, V>(
  future: Future<E, V>,
  cb: (v: V) => any,
  eb?: (e: E) => any
): Future<E, V> {
  return future.done((err, val) => {
    if(err) {
      if(eb) eb(err);
    }
    else {
      cb(val);
    }
  });
}

/*
 * Turn a Promise into a Future
 */
export function fromPromise<E, V>(promise: Thenable<E, V, any, any>): Future<E, V> {
  return make((cb: Callback<E, V>) => {
    promise.then((val) => {
      cb(null, val);
    }, (err) => {
      cb(err);
    });
  });
}

/*
 * Turn a Future into a Promise
 */
export function toPromise<E, V>(future: Future<E, V>): Thenable<E, V, any, any> {
  return new Promise(future);
}


/*
 * Transformation functions
 * -------------------------------------------------------------------------------------------------
 */

/*
 * Transform values
 */
export function bindValue<E, V, OutV>(
  future: Future<E, V>,
  transform: Transform<V, OutV>
): Future<E, OutV> {
  return create((fulfill: (v: OutV) => any, reject: (e: E) => any) => {
    then(future, (v: V) => { fulfill(transform(v)); }, reject);
  });
}

export const bind = bindValue;
export const transform = bind;
export const transformValue = transform;

/*
 * Transform errors
 */
export function bindError<E, V, OutE>(
  future: Future<E, V>,
  transform: Transform<E, OutE>
): Future<OutE, V> {
  return create((fulfill: (v: V) => any, reject: (e: OutE) => any) => {
    then(future, fulfill, (e: E) => { reject(transform(e)); });
  });
}

export const transformError = bindError;

/*
 * Concat values
 */
export function concatValues<E, V>(futures: Array<Future<E, V[]>>): Future<E, V[]> {
  return transform(all(futures), flattenRaw);
}

export const concat = concatValues;

/*
 * Concat errors
 */
export function concatErrors<E, V>(futures: Array<Future<E[], V>>): Future<E[], V> {
  return transformError(none(futures), flattenRaw);
}


/*
 * Unwrap inner futures from the value position
 */
export function unwrapValue<E, V, OutE>(
  future: Future<E, Future<OutE, V>>
): Future<E|OutE, V> {
  return make((cb) => {
    future.done((err, val) => {
      if(err) {
        cb(err);
        return;
      }
      val.done(cb);
    });
  });
}

export const unwrap = unwrapValue;

/*
 * Unwrap inner futures from the error position
 */
export function unwrapError<E, V, OutV>(
  future: Future<Future<E, OutV>, V>
): Future<E, V|OutV> {
  return make((cb) => {
    future.done((err, val) => {
      if(err == null) {
        cb(null, val);
        return;
      }
      err.done(cb);
    });
  });
}

/*
 * Convenience function composing unwrap() and bind()
 */
export function unwrapBind<E, V, OutE, OutV>(
  future: Future<E, V>,
  transform: (v: V) => Future<OutE, OutV>
): Future<E|OutE, OutV> {
  return unwrap(bindValue(future, transform));
}

export const unwrapTransform = unwrapBind;

/*
 * Invert a future
 */
export function invert<E, V>(future: Future<E, V>): Future<V, E> {
  return make(function(cb: Callback<V, E>) {
    future.done(function(err, value) { cb(value, err); });
  });
}


/*
 * Collection functions
 * -------------------------------------------------------------------------------------------------
 */

/*
 * Compose multiple futures into a single future with all of their values in an array
 */
export function all<E,V>(futures: Array<Future<E, V>>): Future<E, V[]> {
  return make((cb: Callback<E, V[]>) => {
    run(collectValues, futures, cb);
  });
}

/*
 * Compose multiple futures into a single future with all of their errors in an array
 */
export function none<E, V>(futures: Array<Future<E, V>>): Future<E[], V> {
  return invert(make((cb: Callback<V, E[]>) => {
    run(collectErrors, futures, cb);
  }));
}

/*
 * Compose multiple futures into a single future that contains all of their errors and values as
 * Result tuples in an array
 */
export function settled<E, V>(futures: Array<Future<E, V>>): Future<any, Array<Result<E, V>>> {
  return make((cb: Callback<E, Array<Result<E, V>>>) => {
    run(collectAll, futures, cb);
  });
}

/*
 * Get the first value to resolve
 */
export const firstValue = none;
export const first = firstValue;

/*
 * Get the last value to resolve
 */
export function lastValue<E, V>(futures: Array<Future<E, V>>): Future<E[], V> {
  return make((cb: Callback<E[], V>) => {
    findLast(futures, hasValue, getValue, getError, cb);
  });
}

export const last = lastValue;

/*
 * Get the first error to occur
 */
export const firstError = all;


/*
 * Get the last error to occur
 */
export function lastError<E, V>(futures: Array<Future<E, V>>): Future<E, V[]> {
  return invert(make<V[], E>((cb: Callback<V[], E>) => {
    findLast(futures, hasError, getError, getValue, cb);
  }));
}


/*
 * Error and value spreading
 * -------------------------------------------------------------------------------------------------
 */

/*
 * Splat the values from a single future that resolves to an array of values into a callback
 */
export function spreadValues<E, V>(
  future: Future<E, V[]>,
  cb: (...values: V[]) => any
): Future<E, V[]> {
  return future.done((err, values) => {
    if(!err) cb.apply(undefined, values);
  });
}

export const splatValues = spreadValues;

/*
 * Splat the values from an array of futures into a callback
 */
export function spreadAll<E, V>(
  futures: Array<Future<E, V>>,
  cb: (...values: V[]) => any
): Future<E, V[]> {
  return spreadValues(all(futures), cb);
}

export const splatAll = spreadAll;
export const splat = spreadAll;

/*
 * Splat the errors from a single future with an array of errors into a callback
 */
export function spreadErrors<E, V>(
  future: Future<E[], V>,
  cb: (...errors: E[]) => any
): Future<E[], V> {
  return future.done((errors, val) => {
    if(errors) cb.apply(undefined, errors);
  });
}
export const splatErrors = spreadErrors;


/*
 * Internal helper functions
 * -------------------------------------------------------------------------------------------------
 */

function findLast<E, V, Ce, Cv>(
  futures: Array<Future<E, V>>,
  predicate: (r: Result<E, V>) => boolean,
  valueGetter: (r: Result<E, V>) => Cv,
  errorGetter: (r: Result<E, V>) => Ce,
  cb: Callback<Ce[], Cv>
): void {
  const timeOrdered = make((cb: Callback<E, Array<Result<E, V>>>) => {
    run(collectAllByTime, futures, cb);
  });

  timeOrdered.done((err: E, allValues: Array<Result<E, V>>) => {
    collectLast(allValues, predicate, valueGetter, errorGetter, cb);
  });
}

function collectLast<E, V, Ce, Cv>(
  results: Array<Result<E, V>>,
  predicate: (r: Result<E, V>) => boolean,
  valueGetter: (r: Result<E, V>) => Cv,
  errorGetter: (r: Result<E, V>) => Ce,
  cb: Callback<Ce[], Cv>
) {
  const errors: Ce[] = [];
  let found = false;
  let last: Cv;

  for(let i = 0; i < results.length; i++) {
    if(predicate(results[i])) {
      last = valueGetter(results[i]);
      found = true;
    } else {
      errors.push(errorGetter(results[i]));
    }
  }

  if(found) cb(null, last);
  else cb(errors);
}

function hasValue<E, V>(result: Result<E, V>): boolean {
  return !result.error;
}

function hasError<E, V>(result: Result<E, V>): boolean {
  return !!result.error;
}

function getValue<E, V>(result: Result<E, V>): V {
  return result.value;
}

function getError<E, V>(result: Result<E, V>): E {
  return result.error;
}


function run<E, V, Ce, Cv>(
  collectFn: Collector<E, V, Cv, Ce>,
  futures: Array<Future<E,V>>,
  cb: Callback<Ce, Cv[]>
) {
  const vals: Cv[] = new Array(futures.length);
  let erred = false;
  let count = 0;

  for(let i = 0; i < futures.length; i++) {
    if(!futures[i]) continue;
    count++;
    collectFn(futures[i], vals, i, (err) => {
      if(erred) return;

      if(err) {
        erred = true;
        cb(err);
        return;
      }

      count--;
      if(count === 0) {
        cb(null, vals);
      }
    });
  }
}

interface Collector<E, V, Cv, Ce> {
  (future: Future<E, V>, acc: Cv[], index: number, cb: Callback<Ce, Cv>): void;
}

function collectValues<E, V>(future: Future<E, V>, acc: V[], index: number, cb: Callback<E, V>) {
  future.done(function(err, value) {
    if(!err) acc[index] = value;
    cb(err, value);
  });
}

function collectErrors<E, V>(future: Future<E, V>, acc: E[], index: number, cb: Callback<V, E>) {
  future.done(function(err, value) {
    if(err) acc[index] = err;
    cb(value, err);
  });
}

function collectMapValues<E, V, OutV>(mapper: Transform<V, OutV>): Collector<E, V, OutV, E> {
  return (future: Future<E, V>, acc: OutV[], index: number, cb: Callback<E, OutV>) => {
    future.done((err, value) => {
      if(!err) {
        const outValue = mapper(value);
        acc[index] = outValue;
        cb(err, outValue);
      } else {
        cb(err);
      }
    });
  };
}

function collectMapErrors<E, V, OutE>(mapper: Transform<E, OutE>): Collector<E, V, OutE, V> {
  return (future: Future<E, V>, acc: OutE[], index: number, cb: Callback<V, OutE>) => {
    future.done((err, value) => {
      if(err) {
        const outError = mapper(err);
        acc[index] = outError;
        cb(value, outError);
      } else {
        cb(value);
      }
    });
  };
}

function collectAll<E, V>(
  future: Future<E, V>,
  acc: Array<Result<E, V>>,
  index: number,
  cb: Callback<E, V>
) {
  future.done(function(err, value) {
    const result = acc[index] = new Result(err, value);
    // We collect errors in results, so this function itself never errors out
    cb(null);
  });
}

function collectAllByTime<E, V>(
  future: Future<E, V>,
  acc: Array<Result<E, V>>,
  index: number,
  cb: Callback<E, V>
) {
  future.done(function(err, value) {
    let inserted = false;
    for(let i = 0; i < acc.length; i++) {
      if(!acc[i]) {
        acc[i] = new Result(err, value);
        inserted = true;
        break;
      }
    }
    if(!inserted) throw new Error("Couldn't insert; wtf happened");
    // We collect errors in results, so this function itself never errors out
    cb(null);
  });
}

function flattenRaw<T>(arr: T[][]): T[] {
  const out: T[] = [];
  for(let i = 0; i < arr.length; i++) {
    const inner = arr[i];
    for(let innerIndex = 0; innerIndex < inner.length; innerIndex++) {
      out.push(inner[innerIndex]);
    }
  }
  return out;
}
