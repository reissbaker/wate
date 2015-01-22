'use strict';

interface Callback<E, V> {
  (err: E, value?: V): any;
}

export = Callback;
