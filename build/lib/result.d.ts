declare class Result<E, V> {
    error: E;
    value: V;
    constructor(err: E, value: V);
}
export = Result;
