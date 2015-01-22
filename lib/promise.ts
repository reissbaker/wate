'use strict';

import Future = require('./future');

// Promises/A interop (not A+, but A+ interops with A, so it should work for conformant impls)
class Promise<E, V> {
  private _future: Future<E, V>;

  constructor(future: Future<E, V>) {
    this._future = future;
  }

  then(callback: (v: V) => any, errback?: (e: E) => any): void  {
    this._future.done((err, val) => {
      if(err) {
        if(errback) errback(err);
      } else {
        if(callback) callback(val);
      }
    });
  }
}

export = Promise;
