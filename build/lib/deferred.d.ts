import Callback = require('./callback');
declare class Deferred<E, V> {
    value: V;
    error: E;
    cb: Callback<E, V>;
    private _settled;
    private _cbs;
    private _scheduled;
    constructor();
    done(callback: Callback<E, V>): void;
    _trigger(): void;
}
export = Deferred;
