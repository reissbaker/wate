'use strict';

import Callback = require('./callback');

declare const process: { nextTick: (callback: () => any) => void; };

class Deferred<E, V> {
  value: V = null;
  error: E = null;
  cb: Callback<E, V>;

  private _settled: boolean = false;
  private _cbs: Array<Callback<E, V>> = [];
  private _scheduled: boolean = false;

  constructor() {
    this.cb = (err: E, value: V) => {
      if(this._settled) throw new Error('Called deferred callback twice.');

      this.error = err;
      this.value = value;
      this._settled = true;

      this._trigger();
    };
  }

  done(callback: Callback<E, V>) {
    this._cbs.push(callback);
    if(this._settled) this._trigger();
  }

  catch(callback: (e: E) => any) {
    this.done((err, val) => {
      if(err) callback(err);
    });
  }

  _trigger() {
    if(this._scheduled) return;
    this._scheduled = true;

    process.nextTick(() => {
      for(let i = 0; i < this._cbs.length; i++) {
        this._cbs[i](this.error, this.value);
      }
      this._cbs = [];
      this._scheduled = false;
    });
  }
}

export = Deferred;
