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
