'use strict';

import Callback = require('./callback');
import Deferred = require('./deferred');

class Future<E, V> {
  done: (cb: Callback<E, V>) => Future<E, V>;

  constructor(deferred: Deferred<E, V>) {
    this.done = function(cb: Callback<E, V>) {
      deferred.done(cb);
      return this;
    };
  }

  catch(callback: (e: E) => any): Future<E, V> {
    return this.done((err, val) => {
      if(err) callback(err);
    });
  }
}

export = Future;
