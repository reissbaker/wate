import Future = require('./future');
declare class Promise<E, V> {
    private _future;
    constructor(future: Future<E, V>);
    then(callback: (v: V) => any, errback?: (e: E) => any): void;
}
export = Promise;
