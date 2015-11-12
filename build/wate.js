(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.wate = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var Deferred = require('./lib/deferred');
var Future = require('./lib/future');
var Result = require('./lib/result');
var Promise = require('./lib/promise');
/*
 * Factory functions
 * -------------------------------------------------------------------------------------------------
 */
/*
 * Factory that gives a useful node-style callback to pass around
 */
function make(builder) {
    var deferred = new Deferred();
    builder(deferred.cb);
    return new Future(deferred);
}
exports.make = make;
/*
 * Factory that gives Promise-style fulfill() and reject() functions to call manually
 */
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
/*
 * Generate resolved futures from raw values
 */
function value(value) {
    return create(function (fulfill) {
        fulfill(value);
    });
}
exports.value = value;
/*
 * Generate failed futures from raw error values
 */
function error(error) {
    return make(function (callback) {
        callback(error);
    });
}
exports.error = error;
/*
 * Wrap loadable DOM elements, like images
 */
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
/*
 * Promise interop and helpers
 * -------------------------------------------------------------------------------------------------
 */
/*
 * Emulates the .then function from Promises/A, but as a function rather than a method
 */
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
/*
 * Turn a Promise into a Future
 */
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
/*
 * Turn a Future into a Promise
 */
function toPromise(future) {
    return new Promise(future);
}
exports.toPromise = toPromise;
/*
 * Transformation functions
 * -------------------------------------------------------------------------------------------------
 */
/*
 * Transform values
 */
// Transform a single value
function bindValue(future, transform) {
    return create(function (fulfill, reject) {
        then(future, function (v) { fulfill(transform(v)); }, reject);
    });
}
exports.bindValue = bindValue;
// Transform an array of values
function bindValues(future, transform) {
    return make(function (callback) {
        var allFutures = all(future);
        allFutures.done(function (err, values) {
            if (err)
                callback(err);
            else
                callback(null, transform.apply(null, values));
        });
    });
}
exports.bindValues = bindValues;
// Overload impl (not counted in overload list during typecheck)
function bind(future, transform) {
    if (future instanceof Array) {
        return bindValues(future, transform);
    }
    return bindValue(future, transform);
}
exports.bind = bind;
exports.transform = bind;
exports.transformValue = bindValue;
/*
 * Transform errors
 */
function bindError(future, transform) {
    return create(function (fulfill, reject) {
        then(future, fulfill, function (e) { reject(transform(e)); });
    });
}
exports.bindError = bindError;
exports.transformError = bindError;
function bindErrors(futures, transform) {
    return make(function (callback) {
        var noneFutures = none(futures);
        noneFutures.done(function (errors, val) {
            if (val)
                callback(null, val);
            else
                callback(transform.apply(null, errors));
        });
    });
}
exports.bindErrors = bindErrors;
/*
 * Concat values
 */
function concatValues(futures) {
    return exports.transform(all(futures), flattenRaw);
}
exports.concatValues = concatValues;
exports.concat = concatValues;
/*
 * Concat errors
 */
function concatErrors(futures) {
    return exports.transformError(none(futures), flattenRaw);
}
exports.concatErrors = concatErrors;
/*
 * Unwrap inner futures from the value position
 */
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
/*
 * Unwrap inner futures from the error position
 */
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
/*
 * Flattens nested resolved futures
 */
function flatten(future) {
    return make(function (callback) {
        var descend = function (err, val) {
            if (err) {
                callback(err);
                return;
            }
            if (!(val instanceof Future)) {
                callback(null, val);
                return;
            }
            val.done(descend);
        };
        future.done(descend);
    });
}
exports.flatten = flatten;
function flatBind(future, transform) {
    if (future instanceof Array) {
        return flatten(bindValues(future.map(flatten), transform));
    }
    return flatten(bindValue(flatten(future), transform));
}
exports.flatBind = flatBind;
exports.flatTransform = flatBind;
/*
 * Invert a future
 */
function invert(future) {
    return make(function (cb) {
        future.done(function (err, value) { cb(value, err); });
    });
}
exports.invert = invert;
/*
 * Collection functions
 * -------------------------------------------------------------------------------------------------
 */
/*
 * Compose multiple futures into a single future with all of their values in an array
 */
function all(futures) {
    return make(function (cb) {
        run(collectValues, futures, cb);
    });
}
exports.all = all;
/*
 * Compose multiple futures into a single future with all of their errors in an array
 */
function none(futures) {
    return invert(make(function (cb) {
        run(collectErrors, futures, cb);
    }));
}
exports.none = none;
/*
 * Compose multiple futures into a single future that contains all of their errors and values as
 * Result tuples in an array
 */
function settled(futures) {
    return make(function (cb) {
        run(collectAll, futures, cb);
    });
}
exports.settled = settled;
/*
 * Get the first value to resolve
 */
exports.firstValue = none;
exports.first = exports.firstValue;
/*
 * Get the last value to resolve
 */
function lastValue(futures) {
    return make(function (cb) {
        findLast(futures, hasValue, getValue, getError, cb);
    });
}
exports.lastValue = lastValue;
exports.last = lastValue;
/*
 * Get the first error to occur
 */
exports.firstError = all;
/*
 * Get the last error to occur
 */
function lastError(futures) {
    return invert(make(function (cb) {
        findLast(futures, hasError, getError, getValue, cb);
    }));
}
exports.lastError = lastError;
/*
 * Error and value spreading
 * -------------------------------------------------------------------------------------------------
 */
/*
 * Splat the values from a single future that resolves to an array of values into a callback
 */
function spreadValues(future, cb) {
    return future.done(function (err, values) {
        if (!err)
            cb.apply(undefined, values);
    });
}
exports.spreadValues = spreadValues;
exports.splatValues = spreadValues;
/*
 * Splat the values from an array of futures into a callback
 */
function spreadAll(futures, cb) {
    return spreadValues(all(futures), cb);
}
exports.spreadAll = spreadAll;
exports.splatAll = spreadAll;
exports.splat = spreadAll;
/*
 * Splat the errors from a single future with an array of errors into a callback
 */
function spreadErrors(future, cb) {
    return future.done(function (errors, val) {
        if (errors)
            cb.apply(undefined, errors);
    });
}
exports.spreadErrors = spreadErrors;
exports.splatErrors = spreadErrors;
/*
 * Internal helper functions
 * -------------------------------------------------------------------------------------------------
 */
function findLast(futures, predicate, valueGetter, errorGetter, cb) {
    var timeOrdered = make(function (cb) {
        run(collectAllByTime, futures, cb);
    });
    timeOrdered.done(function (err, allValues) {
        collectLast(allValues, predicate, valueGetter, errorGetter, cb);
    });
}
function collectLast(results, predicate, valueGetter, errorGetter, cb) {
    var errors = [];
    var found = false;
    var last;
    for (var i = 0; i < results.length; i++) {
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
    var vals = new Array(futures.length);
    var erred = false;
    var count = 0;
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
    for (var i = 0; i < arr.length; i++) {
        var inner = arr[i];
        for (var innerIndex = 0; innerIndex < inner.length; innerIndex++) {
            out.push(inner[innerIndex]);
        }
    }
    return out;
}

},{"./lib/deferred":2,"./lib/future":3,"./lib/promise":4,"./lib/result":5}],2:[function(require,module,exports){
(function (process){
'use strict';
var Deferred = (function () {
    function Deferred() {
        var _this = this;
        this.value = null;
        this.error = null;
        this._settled = false;
        this._cbs = [];
        this._scheduled = false;
        this.cb = function (err, value) {
            if (_this._settled)
                throw new Error('Called deferred callback twice.');
            _this.error = err;
            _this.value = value;
            _this._settled = true;
            _this._trigger();
        };
    }
    Deferred.prototype.done = function (callback) {
        this._cbs.push(callback);
        if (this._settled)
            this._trigger();
    };
    Deferred.prototype.catch = function (callback) {
        this.done(function (err, val) {
            if (err)
                callback(err);
        });
    };
    Deferred.prototype._trigger = function () {
        var _this = this;
        if (this._scheduled)
            return;
        this._scheduled = true;
        process.nextTick(function () {
            for (var i = 0; i < _this._cbs.length; i++) {
                _this._cbs[i](_this.error, _this.value);
            }
            _this._cbs = [];
            _this._scheduled = false;
        });
    };
    return Deferred;
})();
module.exports = Deferred;

}).call(this,require('_process'))
},{"_process":6}],3:[function(require,module,exports){
'use strict';
var Future = (function () {
    function Future(deferred) {
        this.done = function (cb) {
            deferred.done(cb);
            return this;
        };
    }
    Future.prototype.catch = function (callback) {
        return this.done(function (err, val) {
            if (err)
                callback(err);
        });
    };
    return Future;
})();
module.exports = Future;

},{}],4:[function(require,module,exports){
'use strict';
// Promises/A interop (not A+, but A+ interops with A, so it should work for conformant impls)
var Promise = (function () {
    function Promise(future) {
        this._future = future;
    }
    Promise.prototype.then = function (callback, errback) {
        this._future.done(function (err, val) {
            if (err) {
                if (errback)
                    errback(err);
            }
            else {
                if (callback)
                    callback(val);
            }
        });
    };
    return Promise;
})();
module.exports = Promise;

},{}],5:[function(require,module,exports){
'use strict';
var Result = (function () {
    function Result(err, value) {
        this.error = err;
        this.value = value;
    }
    return Result;
})();
module.exports = Result;

},{}],6:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});