'use strict';
var Marker = (function () {
    function Marker() {
        var _this = this;
        this.value = null;
        this.error = null;
        this._settled = false;
        this._cbs = [];
        this.cb = function (err, value) {
            if (_this._settled)
                throw new Error('Called marker callback twice.');
            _this.error = err;
            _this.value = value;
            _this._settled = true;
            for (var i = 0, l = _this._cbs.length; i < l; i++) {
                _this._cbs[i](err, value);
            }
        };
    }
    Marker.prototype.done = function (callback) {
        var _this = this;
        if (!this._settled)
            this._cbs.push(callback);
        else
            setTimeout(function () {
                callback(_this.error, _this.value);
            }, 0);
    };
    return Marker;
})();
module.exports = Marker;
