import Callback = require('./callback');
import Deferred = require('./deferred');
declare class Future<E, V> {
    done: (cb: Callback<E, V>) => Future<E, V>;
    constructor(deferred: Deferred<E, V>);
}
export = Future;
