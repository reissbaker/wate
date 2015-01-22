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
