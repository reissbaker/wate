'use strict';
var Deferred = require('./lib/deferred');
var Future = require('./lib/future');
var Result = require('./lib/result');
var Promise = require('./lib/promise');
function make(builder) {
    var deferred = new Deferred();
    builder(deferred.cb);
    return new Future(deferred);
}
exports.make = make;
function create(builder) {
    var deferred = new Deferred();
    builder(function (v) {
        deferred.cb(null, v);
    }, function (e) {
        deferred.cb(e);
    });
    return new Future(deferred);
}
exports.create = create;
function fromPromise(promise) {
    return make(function (cb) {
        promise.then(function (val) {
            cb(null, val);
        }, function (err) {
            cb(err);
        });
    });
}
exports.fromPromise = fromPromise;
function fromDOMElement(el) {
    return make(function (cb) {
        el.addEventListener('load', function () {
            cb(null, el);
        });
        el.addEventListener('error', function (e) {
            cb(e);
        });
    });
}
exports.fromDOMElement = fromDOMElement;
function toPromise(future) {
    return new Promise(future);
}
exports.toPromise = toPromise;
function value(value) {
    return create(function (fulfill) {
        fulfill(value);
    });
}
exports.value = value;
function error(error) {
    return make(function (callback) {
        callback(error);
    });
}
exports.error = error;
function bindValue(future, transform) {
    return create(function (fulfill, reject) {
        then(future, function (v) { fulfill(transform(v)); }, reject);
    });
}
exports.bindValue = bindValue;
exports.bind = bindValue;
exports.transform = exports.bind;
exports.transformValue = exports.transform;
function bindError(future, transform) {
    return create(function (fulfill, reject) {
        then(future, fulfill, function (e) { reject(transform(e)); });
    });
}
exports.bindError = bindError;
exports.transformError = bindError;
function concatValues(futures) {
    return exports.transform(all(futures), flattenRaw);
}
exports.concatValues = concatValues;
exports.concat = concatValues;
function concatErrors(futures) {
    return exports.transformError(none(futures), flattenRaw);
}
exports.concatErrors = concatErrors;
// TODO: use this more internally to reduce code duplication
function then(future, cb, eb) {
    return future.done(function (err, val) {
        if (err) {
            if (eb)
                eb(err);
        }
        else {
            cb(val);
        }
    });
}
exports.then = then;
function all(futures) {
    return make(function (cb) {
        run(collectValues, futures, cb);
    });
}
exports.all = all;
function none(futures) {
    return invert(make(function (cb) {
        run(collectErrors, futures, cb);
    }));
}
exports.none = none;
function settled(futures) {
    return make(function (cb) {
        run(collectAll, futures, cb);
    });
}
exports.settled = settled;
exports.firstValue = none;
exports.first = exports.firstValue;
function lastValue(futures) {
    return make(function (cb) {
        findLast(futures, hasValue, getValue, getError, cb);
    });
}
exports.lastValue = lastValue;
exports.last = lastValue;
exports.firstError = all;
function lastError(futures) {
    return invert(make(function (cb) {
        findLast(futures, hasError, getError, getValue, cb);
    }));
}
exports.lastError = lastError;
function invert(future) {
    return make(function (cb) {
        future.done(function (err, value) { cb(value, err); });
    });
}
exports.invert = invert;
function spreadValues(future, cb) {
    return future.done(function (err, values) {
        if (!err)
            cb.apply(undefined, values);
    });
}
exports.spreadValues = spreadValues;
exports.spread = spreadValues;
function spreadAll(futures, cb) {
    return spreadValues(all(futures), cb);
}
exports.spreadAll = spreadAll;
function spreadErrors(future, cb) {
    return future.done(function (errors, val) {
        if (errors)
            cb.apply(undefined, errors);
    });
}
exports.spreadErrors = spreadErrors;
function unwrapValue(future) {
    return make(function (cb) {
        future.done(function (err, val) {
            if (err) {
                cb(err);
                return;
            }
            val.done(cb);
        });
    });
}
exports.unwrapValue = unwrapValue;
exports.unwrap = unwrapValue;
function unwrapError(future) {
    return make(function (cb) {
        future.done(function (err, val) {
            if (err == null) {
                cb(null, val);
                return;
            }
            err.done(cb);
        });
    });
}
exports.unwrapError = unwrapError;
function unwrapBind(future, transform) {
    return exports.unwrap(bindValue(future, transform));
}
exports.unwrapBind = unwrapBind;
exports.unwrapTransform = unwrapBind;
function findLast(futures, predicate, valueGetter, errorGetter, cb) {
    var timeOrdered = make(function (cb) {
        run(collectAllByTime, futures, cb);
    });
    timeOrdered.done(function (err, allValues) {
        collectLast(allValues, predicate, valueGetter, errorGetter, cb);
    });
}
function collectLast(results, predicate, valueGetter, errorGetter, cb) {
    var last, errors = [], found = false;
    for (var i = 0, l = results.length; i < l; i++) {
        if (predicate(results[i])) {
            last = valueGetter(results[i]);
            found = true;
        }
        else {
            errors.push(errorGetter(results[i]));
        }
    }
    if (found)
        cb(null, last);
    else
        cb(errors);
}
function hasValue(result) {
    return !result.error;
}
function hasError(result) {
    return !!result.error;
}
function getValue(result) {
    return result.value;
}
function getError(result) {
    return result.error;
}
function run(collectFn, futures, cb) {
    var vals = new Array(futures.length), erred = false, count = 0;
    for (var i = 0; i < futures.length; i++) {
        if (!futures[i])
            continue;
        count++;
        collectFn(futures[i], vals, i, function (err) {
            if (erred)
                return;
            if (err) {
                erred = true;
                cb(err);
                return;
            }
            count--;
            if (count === 0) {
                cb(null, vals);
            }
        });
    }
}
function collectValues(future, acc, index, cb) {
    future.done(function (err, value) {
        if (!err)
            acc[index] = value;
        cb(err, value);
    });
}
function collectErrors(future, acc, index, cb) {
    future.done(function (err, value) {
        if (err)
            acc[index] = err;
        cb(value, err);
    });
}
function collectMapValues(mapper) {
    return function (future, acc, index, cb) {
        future.done(function (err, value) {
            if (!err) {
                var outValue = mapper(value);
                acc[index] = outValue;
                cb(err, outValue);
            }
            else {
                cb(err);
            }
        });
    };
}
function collectMapErrors(mapper) {
    return function (future, acc, index, cb) {
        future.done(function (err, value) {
            if (err) {
                var outError = mapper(err);
                acc[index] = outError;
                cb(value, outError);
            }
            else {
                cb(value);
            }
        });
    };
}
function collectAll(future, acc, index, cb) {
    future.done(function (err, value) {
        var result = acc[index] = new Result(err, value);
        // We collect errors in results, so this function itself never errors out
        cb(null);
    });
}
function collectAllByTime(future, acc, index, cb) {
    future.done(function (err, value) {
        var inserted = false;
        for (var i = 0; i < acc.length; i++) {
            if (!acc[i]) {
                acc[i] = new Result(err, value);
                inserted = true;
                break;
            }
        }
        if (!inserted)
            throw new Error("Couldn't insert; wtf happened");
        // We collect errors in results, so this function itself never errors out
        cb(null);
    });
}
function flattenRaw(arr) {
    var out = [];
    for (var i = 0, l = arr.length; i < l; i++) {
        var inner = arr[i];
        for (var innerIndex = 0, innerLength = inner.length; innerIndex < innerLength; innerIndex++) {
            out.push(inner[innerIndex]);
        }
    }
    return out;
}
