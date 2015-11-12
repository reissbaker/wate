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
export declare function bindValues<OutV>(future: Array<Future<any, any>>, transform: Transform<any[], OutV>): Future<any, OutV>;
export declare function bind<E, V, OutV>(future: Future<E, V>, transform: (...vs: any[]) => OutV): Future<E, OutV>;
export declare function bind<OutV>(future: Array<Future<any, any>>, transform: Transform<any[], OutV>): Future<any, OutV>;
export declare const transform: typeof bind;
export declare const transformValue: typeof bindValue;
export declare function bindError<E, V, OutE>(future: Future<E, V>, transform: Transform<E, OutE>): Future<OutE, V>;
export declare const transformError: typeof bindError;
export declare function bindErrors<OutE>(futures: Array<Future<any, any>>, transform: (...es: any[]) => OutE): Future<OutE, any>;
export declare function concatValues<E, V>(futures: Array<Future<E, any[]>>): Future<E, V[]>;
export declare const concat: typeof concatValues;
export declare function concatErrors<E, V>(futures: Array<Future<any[], V>>): Future<E[], V>;
export declare function unwrapValue<E, V, OutE>(future: Future<E, Future<OutE, V>>): Future<E | OutE, V>;
export declare const unwrap: typeof unwrapValue;
export declare function unwrapError<E, V, OutV>(future: Future<Future<E, OutV>, V>): Future<E, V | OutV>;
export declare function flatten(future: Future<any, any>): Future<any, any>;
export declare function flatBind<E, V, OutE, OutV>(future: Future<E, V>, transform: (v: V) => Future<OutE, OutV>): Future<E | OutE, OutV>;
export declare function flatBind<OutV>(futures: Array<Future<any, any>>, transform: (...v: any[]) => Future<any, OutV>): Future<any, OutV>;
export declare const flatTransform: typeof flatBind;
export declare function invert<E, V>(future: Future<E, V>): Future<V, E>;
export declare function all(futures: Array<Future<any, any>>): Future<any, any[]>;
export declare function none(futures: Array<Future<any, any>>): Future<any[], any>;
export declare function settled(futures: Array<Future<any, any>>): Future<any, Array<Result<any, any>>>;
export declare const firstValue: typeof none;
export declare const first: typeof none;
export declare function lastValue(futures: Array<Future<any, any>>): Future<any[], any>;
export declare const last: typeof lastValue;
export declare const firstError: typeof all;
export declare function lastError(futures: Array<Future<any, any>>): Future<any, any[]>;
export declare function spreadValues<E>(future: Future<E, any[]>, cb: (...values: any[]) => any): Future<E, any[]>;
export declare const splatValues: typeof spreadValues;
export declare function spreadAll(futures: Array<Future<any, any>>, cb: (...values: any[]) => any): Future<any, any[]>;
export declare const splatAll: typeof spreadAll;
export declare const splat: typeof spreadAll;
export declare function spreadErrors<V>(future: Future<any[], V>, cb: (...errors: any[]) => any): Future<any[], V>;
export declare const splatErrors: typeof spreadErrors;
