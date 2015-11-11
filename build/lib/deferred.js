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
