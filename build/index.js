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
function toPromise(future) {
    return new Promise(future);
}
exports.toPromise = toPromise;
function bindValue(future, transform) {
    return make(function (cb) {
        future.done(function (err, val) {
            var transformed;
            if (!err)
                transformed = transform(val);
            cb(err, transformed);
        });
    });
}
exports.bindValue = bindValue;
exports.bind = bindValue;
exports.transform = exports.bind;
exports.transformValue = exports.transform;
function bindError(future, transform) {
    return make(function (cb) {
        future.done(function (err, val) {
            var transformed;
            if (err)
                transformed = transform(err);
            cb(transformed, val);
        });
    });
}
exports.bindError = bindError;
exports.transformError = bindError;
function all(futures) {
    return make(function (cb) {
        run(collectValues, futures, cb);
    });
}
exports.all = all;
function none(futures) {
    return make(function (cb) {
        run(collectErrors, futures, cb);
    });
}
exports.none = none;
function settled(futures) {
    return make(function (cb) {
        run(collectAll, futures, cb);
    });
}
exports.settled = settled;
function firstValue(futures) {
    return invert(none(futures));
}
exports.firstValue = firstValue;
exports.first = firstValue;
function lastValue(futures) {
    return make(function (cb) {
        findLast(futures, hasValue, getValue, getError, cb);
    });
}
exports.lastValue = lastValue;
exports.last = lastValue;
function firstError(futures) {
    return invert(all(futures));
}
exports.firstError = firstError;
function lastError(futures) {
    return make(function (cb) {
        findLast(futures, hasError, getError, getValue, cb);
    });
}
exports.lastError = lastError;
function invert(future) {
    return make(function (cb) {
        future.done(function (err, value) {
            cb(value, err);
        });
    });
}
exports.invert = invert;
function spreadValues(future, cb) {
    future.done(function (err, values) {
        if (!err)
            cb.apply(undefined, values);
    });
}
exports.spreadValues = spreadValues;
exports.spread = spreadValues;
function spreadErrors(future, cb) {
    future.done(function (errors, val) {
        if (errors)
            cb.apply(undefined, errors);
    });
}
exports.spreadErrors = spreadErrors;
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
    for (var i = 0, l = futures.length; i < l; i++) {
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
function collectAll(future, acc, index, cb) {
    future.done(function (err, value) {
        acc[index] = new Result(err, value);
        cb(err, value);
    });
}
function collectAllByTime(future, acc, index, cb) {
    future.done(function (err, value) {
        acc.push(new Result(err, value));
        cb(err, value);
    });
}
