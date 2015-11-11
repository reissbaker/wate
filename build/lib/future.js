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
