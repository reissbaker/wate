'use strict';
var Future = (function () {
    function Future(deferred) {
        this.done = function (cb) {
            deferred.done(cb);
            return this;
        };
    }
    return Future;
})();
module.exports = Future;
