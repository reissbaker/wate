'use strict';

const wate = require('../build/index.js');
const chai = require('chai');
const expect = chai.expect;

describe("make", () => {
  it("makes a future from an error-first callback", (done) => {
    const future = wate.make((callback) => {
      process.nextTick(callback);
    });
    future.done(done);
  });

  it("passes along errors", (done) => {
    const error = "an error string lol";
    const future = wate.make((callback) => {
      callback(error);
    });
    future.done((err) => {
      expect(err).to.equal(error);
      done();
    });
  });

  it("passes along data", (done) => {
    const data = 10;
    const future = wate.make((callback) => {
      callback(null, data);
    });
    future.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(data);
      done();
    });
  });
});

describe("create", () => {
  it("makes a future from fulfill/reject callbacks", (done) => {
    const future = wate.create((fulfill, reject) => {
      fulfill();
    });
    future.done(() => {
      done();
    });
  });

  it("passes along errors given to reject", (done) => {
    const error = "uh";
    const future = wate.create((fulfill, reject) => {
      reject(error);
    });
    future.done((err) => {
      expect(err).to.equal(error);
      done();
    });
  });

  it("passes along data given to fulfill", (done) => {
    const data = 10;
    const future = wate.create((fulfill, reject) => {
      fulfill(data);
    });

    future.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(data);
      done();
    });
  });
});

describe("toPromise", () => {
  it("converts a Future into a Promises/A promise", (done) => {
    const promise = wate.toPromise(wate.value(10));
    promise.then((val) => {
      expect(val).to.equal(10);
      done();
    });
  });

  it("works with errors", (done) => {
    const failed = wate.toPromise(wate.error("error"));
    failed.then(() => {}, (err) => {
      expect(err).to.equal("error");
      done();
    });
  });
});

describe("fromPromise", () => {
  it("converts a promise to a future", (done) => {
    const future = wate.fromPromise(wate.toPromise(wate.value(10)));
    future.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(10);
      done();
    });
  });

  it("passes along errors", (done) => {
    const future = wate.fromPromise(wate.toPromise(wate.error("error")));
    future.done((err, val) => {
      expect(err).to.equal("error");
      expect(val).to.equal(undefined);
      done();
    });
  });
});

describe("bindValue", () => {
  it("transforms values", (done) => {
    const val = wate.value(10);
    const transformed = wate.bindValue(val, (val) => { return val * 2; });
    transformed.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(20);
      done();
    });
  });

  it("ignores errors", (done) => {
    const err = wate.error("error");
    const transformed = wate.bindValue(err, (val) => { return val + " hello"; });
    transformed.done((err, val) => {
      expect(err).to.equal("error");
      expect(val).to.equal(undefined);
      done();
    });
  });
});

describe("bindError", () => {
  it("transforms errors", (done) => {
    const err = wate.error("error");
    const transformed = wate.bindError(err, (err) => { return err + " hello"; });
    transformed.done((err, val) => {
      expect(err).to.equal("error hello");
      expect(val).to.equal(undefined);
      done();
    });
  });

  it("ignore values", (done) => {
    const val = wate.value(10);
    const transformed = wate.bindError(val, (err) => { return err + 10; });
    transformed.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(10);
      done();
    });
  });
});

describe("bindErrors", () => {
  it("works with an array of futures", (done) => {
    const a = wate.error(10);
    const b = wate.error(20);

    const transformed = wate.bindErrors([ a, b ], (aVal, bVal) => {
      return aVal + bVal;
    });

    transformed.done((err, val) => {
      expect(val).to.equal(undefined);
      expect(err).to.equal(30);
      done();
    });
  });
});

describe("bind", () => {
  it("works with single futures", (done) => {
    const val = wate.value(10);
    const transformed = wate.bindValue(val, (val) => { return val * 2; });
    transformed.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(20);
      done();
    });
  });

  it("works with an array of futures", (done) => {
    const a = wate.value(10);
    const b = wate.value(20);

    const transformed = wate.bind([ a, b ], (aVal, bVal) => {
      return aVal + bVal;
    });

    transformed.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(30);
      done();
    });
  });
});

describe("all", () => {
  it("combines values from an array of futures into a future with an array of values", (done) => {
    const a = wate.value(10);
    const b = wate.value(20);
    const c = wate.value(30);
    wate.all([ a, b, c ]).done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.deep.equal([ 10, 20, 30 ]);
      done();
    });
  });

  it("errors if any error", (done) => {
    const a = wate.value(10);
    const b = wate.error("error");
    const c = wate.value(20);
    wate.all([ a, b, c ]).done((err, val) => {
      expect(err).to.equal("error");
      expect(val).to.equal(undefined);
      done();
    });
  });
});

describe("none", () => {
  it("combines errors from an array of futures into a future with an array of errors", (done) => {
    const a = wate.error("ha");
    const b = wate.error("ho");
    const c = wate.error("he");
    wate.none([ a, b, c ]).done((err, val) => {
      expect(err).to.deep.equal([ "ha", "ho", "he" ]);
      expect(val).to.equal(null);
      done();
    });
  });

  it("succeeds immediately if any succeed", (done) => {
    const a = wate.error("ha");
    const b = wate.value(10);
    const c = wate.error("he");
    wate.none([ a, b, c ]).done((err, val) => {
      expect(err).to.equal(undefined);
      expect(val).to.equal(10);
      done();
    });
  });
});

describe("concatValues", () => {
  it("concats arrays from multiple futures", (done) => {
    const a = wate.value([ 10, 20 ]);
    const b = wate.value([ 30 ]);

    const concated = wate.concatValues([ a, b ]);
    concated.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.deep.equal([ 10, 20, 30 ]);
      done();
    });
  });
});

describe("concatErrors", () => {
  it("concats arrays of errors from multiple futures", (done) => {
    const a = wate.error([ 10, 20 ]);
    const b = wate.error([ 30, 40 ]);
    wate.concatErrors([ a, b ]).done((errs, val) => {
      expect(val).to.equal(undefined);
      expect(errs).to.deep.equal([ 10, 20, 30, 40 ]);
      done();
    });
  });
});

describe("unwrapValue", () => {
  it("unwraps the future in the value position", (done) => {
    const a = wate.value(wate.value(10));
    wate.unwrap(a).done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(10);
      done();
    });
  });
});

describe("unwrapError", () => {
  it("unwraps the future in the error position", (done) => {
    const a = wate.error(wate.value(10));
    wate.unwrapError(a).done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(10);
      done();
    });
  });
});

describe("flatTransform", () => {
  it("transforms a future and flattens its result", (done) => {
    const a = wate.value(10);
    const transformed = wate.flatTransform(a, (val) => {
      return wate.value(val + 10);
    });

    transformed.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(20);
      done();
    });
  });

  it("works with arrays of futures", (done) => {
    const a = wate.value(10);
    const b = wate.value(20);
    const transformed = wate.flatTransform([ a, b, ], (aVal, bVal) => {
      return wate.value(aVal + bVal);
    });
    transformed.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(30);
      done();
    });
  });

  it("also flattens the input futures", (done) => {
    const a = wate.value(wate.value(10));
    const b = wate.value(wate.value(wate.value(50)));
    const transformed = wate.flatTransform([ a, b ], (aVal, bVal) => {
      return aVal + bVal;
    });
    transformed.done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(60);
      done();
    });
  });
});

describe("lastValue", () => {
  it("returns the last value to succeed, given a set of futures", (done) => {
    const a = wate.value(10);
    const b = wate.value(20);
    const c = wate.create((fulfill) => {
      process.nextTick(() => {
        fulfill(30);
      });
    });
    wate.lastValue([a, b, c]).done((err, val) => {
      expect(err).to.equal(null);
      expect(val).to.equal(30);
      done();
    });
  });

  it("returns all the errors, if no futures succeed", (done) => {
    const a = wate.error("ha");
    const b = wate.error("ha");
    const c = wate.error("ha");

    wate.lastValue([ a, b, c ]).done((err, val) => {
      expect(val).to.equal(undefined);
      expect(err).to.eql([ "ha", "ha", "ha" ]);
      done();
    });
  });
});
