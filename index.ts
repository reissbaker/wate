'use strict';

import Deferred = require('./lib/deferred');
import Future = require('./lib/future');
import Result = require('./lib/result');
import Callback = require('./lib/callback');
import Promise = require('./lib/promise');

export interface BuilderFunction<E, V> {
  (callback: Callback<E, V>): any;
}

export interface Thenable<E, V, Er, Vr> {
  then: (callback: (v: V) => Vr, errback: (e: E) => Er) => any;
}

export interface Transform<I, O> {
  (val: I): O;
}

export function make<E, V>(builder: BuilderFunction<E, V>): Future<E, V> {
  var deferred = new Deferred<E, V>();
  builder(deferred.cb);
  return new Future(deferred);
}

export function fromPromise<E, V>(promise: Thenable<E, V, any, any>): Future<E, V> {
  return make((cb: Callback<E, V>) => {
    promise.then((val) => {
      cb(null, val);
    }, (err) => {
      cb(err);
    });
  });
}

export function toPromise<E, V>(future: Future<E, V>): Thenable<E, V, any, any> {
  return new Promise(future);
}

export function bindValue<E, V, OutV>(future: Future<E, V>, transform: Transform<V, OutV>): Future<E, OutV> {
  return make((cb: Callback<E, OutV>) => {
    future.done((err: E, val: V) => {
      var transformed: OutV;
      if(!err) transformed = transform(val);
      cb(err, transformed);
    });
  });
}

export var bind = bindValue;
export var transform = bind;
export var transformValue = transform;

export function bindError<E, V, OutE>(future: Future<E, V>, transform: Transform<E, OutE>): Future<OutE, V> {
  return make((cb: Callback<OutE, V>) => {
    future.done((err: E, val: V) => {
      var transformed: OutE;
      if(err) transformed = transform(err);
      cb(transformed, val);
    });
  });
}

export var transformError = bindError;

export function all<E,V>(futures: Array<Future<E, V>>): Future<E, V[]> {
  return make((cb: Callback<E, V[]>) => {
    run(collectValues, futures, cb);
  });
}

export function none<E, V>(futures: Array<Future<E, V>>): Future<V, E[]> {
  return make((cb: Callback<V, E[]>) => {
    run(collectErrors, futures, cb);
  });
}

export function settled<E, V>(futures: Array<Future<E, V>>): Future<any, Array<Result<E, V>>> {
  return make((cb: Callback<E, Array<Result<E, V>>>) => {
    run(collectAll, futures, cb);
  });
}

export function firstValue<E, V>(futures: Array<Future<E, V>>): Future<E[], V> {
  return invert(none(futures));
}

export var first = firstValue;

export function lastValue<E, V>(futures: Array<Future<E, V>>): Future<E[], V> {
  return make((cb: Callback<E[], V>) => {
    findLast(futures, hasValue, getValue, getError, cb);
  });
}

export var last = lastValue;

export function firstError<E, V>(futures: Array<Future<E, V>>): Future<V[], E> {
  return invert(all(futures));
}

export function lastError<E, V>(futures: Array<Future<E, V>>): Future<V[], E> {
  return make<V[], E>((cb: Callback<V[], E>) => {
    findLast(futures, hasError, getError, getValue, cb);
  });
}

export function invert<E, V>(future: Future<E, V>): Future<V, E> {
  return make(function(cb: Callback<V, E>) {
    future.done(function(err, value) { cb(value, err); });
  });
}

export function spreadValues<E, V>(future: Future<E, V[]>, cb: (...values: V[]) => any): void {
  future.done((err, values) => {
    if(!err) cb.apply(undefined, values);
  });
}

export var spread = spreadValues;

export function spreadErrors<E, V>(future: Future<E[], V>, cb: (...errors: E[]) => any): void {
  future.done((errors, val) => {
    if(errors) cb.apply(undefined, errors);
  });
}

function findLast<E, V, Ce, Cv>(
  futures: Array<Future<E, V>>,
  predicate: (r: Result<E, V>) => boolean,
  valueGetter: (r: Result<E, V>) => Cv,
  errorGetter: (r: Result<E, V>) => Ce,
  cb: Callback<Ce[], Cv>
): void {
  var timeOrdered = make((cb: Callback<E, Array<Result<E, V>>>) => {
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
  var last: Cv,
      errors: Ce[] = [],
      found = false;

  for(var i = 0, l = results.length; i < l; i++) {
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
  var vals: Cv[] = new Array(futures.length),
      erred = false,
      count = 0;

  for(var i = 0, l = futures.length; i < l; i++) {
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

function collectAll<E, V>(
  future: Future<E, V>,
  acc: Array<Result<E, V>>,
  index: number,
  cb: Callback<E, V>
) {
  future.done(function(err, value) {
    acc[index] = new Result(err, value);
    cb(err, value);
  });
}

function collectAllByTime<E, V>(
  future: Future<E, V>,
  acc: Array<Result<E, V>>,
  index: number,
  cb: Callback<E, V>
) {
  future.done(function(err, value) {
    acc.push(new Result(err, value));
    cb(err, value);
  });
}
