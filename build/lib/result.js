'use strict';
var Result = (function () {
    function Result(err, value) {
        this.error = err;
        this.value = value;
    }
    return Result;
})();
module.exports = Result;
