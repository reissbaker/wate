'use strict';

import Callback = require('./callback');

class Deferred<E, V> {
  value: V = null;
  error: E = null;
  cb: Callback<E, V>;

  private _settled: boolean = false;
  private _cbs: Array<Callback<E, V>> = [];

  constructor() {
    this.cb = (err: E, value: V) => {
      if(this._settled) throw new Error('Called deferred callback twice.');

      this.error = err;
      this.value = value;
      this._settled = true;

      for(var i = 0, l = this._cbs.length; i < l; i++) {
        this._cbs[i](err, value);
      }
    };
  }

  done(callback: Callback<E, V>) {
    if(!this._settled) this._cbs.push(callback);
    // TODO: process.nextTick
    else setTimeout(() => {
      callback(this.error, this.value);
    }, 0);
  }
}

export = Deferred;
