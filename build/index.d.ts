import Future = require('./lib/future');
import Result = require('./lib/result');
import Callback = require('./lib/callback');
export interface BuilderFunction<E, V> {
    (callback: Callback<E, V>): any;
}
export interface DoubledBuilderFn<E, V> {
    (fullfill: (v: V) => any, reject?: (e: E) => any): any;
}
export interface Thenable<E, V, Er, Vr> {
    then: (callback: (v: V) => Vr, errback: (e: E) => Er) => any;
}
export interface Transform<I, O> {
    (val: I): O;
}
export interface DOMEl {
    addEventListener: (key: string, listener: (v?: any) => any) => any;
}
export declare function make<E, V>(builder: BuilderFunction<E, V>): Future<E, V>;
export declare function create<E, V>(builder: DoubledBuilderFn<E, V>): Future<E, V>;
export declare function value<E, V>(value: V): Future<E, V>;
export declare function error<E, V>(error: E): Future<E, V>;
export declare function fromDOMElement<E>(el: DOMEl): Future<E, DOMEl>;
export declare function then<E, V>(future: Future<E, V>, cb: (v: V) => any, eb?: (e: E) => any): Future<E, V>;
export declare function fromPromise<E, V>(promise: Thenable<E, V, any, any>): Future<E, V>;
export declare function toPromise<E, V>(future: Future<E, V>): Thenable<E, V, any, any>;
export declare function bindValue<E, V, OutV>(future: Future<E, V>, transform: Transform<V, OutV>): Future<E, OutV>;
export declare const bind: typeof bindValue;
export declare const transform: typeof bindValue;
export declare const transformValue: typeof bindValue;
export declare function bindError<E, V, OutE>(future: Future<E, V>, transform: Transform<E, OutE>): Future<OutE, V>;
export declare const transformError: typeof bindError;
export declare function concatValues<E, V>(futures: Array<Future<E, V[]>>): Future<E, V[]>;
export declare const concat: typeof concatValues;
export declare function concatErrors<E, V>(futures: Array<Future<E[], V>>): Future<E[], V>;
export declare function unwrapValue<E, V, OutE>(future: Future<E, Future<OutE, V>>): Future<E | OutE, V>;
export declare const unwrap: typeof unwrapValue;
export declare function unwrapError<E, V, OutV>(future: Future<Future<E, OutV>, V>): Future<E, V | OutV>;
export declare function unwrapBind<E, V, OutE, OutV>(future: Future<E, V>, transform: (v: V) => Future<OutE, OutV>): Future<E | OutE, OutV>;
export declare const unwrapTransform: typeof unwrapBind;
export declare function invert<E, V>(future: Future<E, V>): Future<V, E>;
export declare function all<E, V>(futures: Array<Future<E, V>>): Future<E, V[]>;
export declare function none<E, V>(futures: Array<Future<E, V>>): Future<E[], V>;
export declare function settled<E, V>(futures: Array<Future<E, V>>): Future<any, Array<Result<E, V>>>;
export declare const firstValue: typeof none;
export declare const first: typeof none;
export declare function lastValue<E, V>(futures: Array<Future<E, V>>): Future<E[], V>;
export declare const last: typeof lastValue;
export declare const firstError: typeof all;
export declare function lastError<E, V>(futures: Array<Future<E, V>>): Future<E, V[]>;
export declare function spreadValues<E, V>(future: Future<E, V[]>, cb: (...values: V[]) => any): Future<E, V[]>;
export declare const splatValues: typeof spreadValues;
export declare function spreadAll<E, V>(futures: Array<Future<E, V>>, cb: (...values: V[]) => any): Future<E, V[]>;
export declare const splatAll: typeof spreadAll;
export declare const splat: typeof spreadAll;
export declare function spreadErrors<E, V>(future: Future<E[], V>, cb: (...errors: E[]) => any): Future<E[], V>;
export declare const splatErrors: typeof spreadErrors;
