'use strict';

class Result<E, V> {
  error: E;
  value: V;

  constructor(err: E, value: V) {
    this.error = err;
    this.value = value;
  }
}

export = Result;
