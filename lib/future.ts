'use strict';

import Callback = require('./callback');
import Deferred = require('./deferred');

class Future<E, V> {
  done: (cb: Callback<E, V>) => void;

  constructor(deferred: Deferred<E, V>) {
    this.done = function(cb: Callback<E, V>) {
      deferred.done(cb);
    };
  }
}

export = Future;
