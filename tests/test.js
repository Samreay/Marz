var $q = require('q');

function TestSuite(name) {
    this.name = name;
    this.tests = [];
    this.partition = "==================================================";
}
TestSuite.prototype.addTest = function(test) {
    this.tests.push(test);
};
TestSuite.prototype.doNextTest = function(count, q) {
    var that = this;
    var test = this.tests.shift();
    test.test().then(function (result) {
        var pass = result[0], errorMessage = result[1], suffix = result[2];
        if (suffix) {
            suffix = ": " + suffix;
        }
        if (pass) {
            console.log("passed:\t" + test.name + suffix);
        } else {
            count++;
            console.warn("FAILED:\t" + test.name + suffix);
            console.warn(errorMessage);
        }
        if (that.tests.length > 0) {
            that.doNextTest(count, q);
        } else {
            that.finishTests(count, q);
        }
    });
};
TestSuite.prototype.finishTests = function(count, q) {
    console.log(this.partition);
    if (count) {
        console.warn("Test Suite " + this.name + " failed: " + count.toFixed(0) + " tests failed!");
        q.resolve(count);
    } else {
        console.log("Test Suite " + this.name + " passed");
        q.resolve(count);
    }
    console.log(this.partition + "\n");
    return count == 0;
};
TestSuite.prototype.runTests = function() {
    var q = $q.defer();
    console.log(this.partition);
    console.log("Running Test Suite ", this.name);
    console.log(this.partition);
    this.doNextTest(0, q);
    return q.promise;
};


function Test(name, fn, input) {
    this.name = name;
    this.fn = fn;
    this.input = input;
    this.expectedFn = null;
    this.value = null;
    this.suffix = "";
    this.result = null;
    this.replacer = function(key, val) {
        return val && val.toFixed ? Number(val.toFixed(6)) : val;
    };
}
Test.prototype.setExpectedEquals = function(value) {
    this.value = value;
    this.expectedFn = function(output) {
        var expected = JSON.stringify(this.value, this.replacer);
        var received = JSON.stringify(output, this.replacer);
        var pass = expected == received;
        var message = "\tExpected:\t" + expected + "\n\tReceived:\t" + received;
        return [pass, message];
    };
    return this;
};
Test.prototype.setAbsoluteDeviation = function(value) {
    this.value = value;
    this.expectedFn = function(output) {
        var expected = JSON.stringify(this.value, this.replacer);
        var received = JSON.stringify(output, this.replacer);
        var pass = Math.abs(output) < value;
        var message = "\tThreshold:\t" + expected + "\n\tReceived:\t" + received;
        return [pass, message];
    };
    return this;
};
Test.prototype.setAbsoluteDeviationFromValue = function(value, thresh) {
    this.expectedFn = function(output) {
        var expected = JSON.stringify(value, this.replacer);
        var received = JSON.stringify(output, this.replacer);
        var threshold = JSON.stringify(thresh, this.replacer);
        var pass = true;
        if (output instanceof Array) {
            for (var i = 0; i < output.length; i++) {
                pass &= Math.abs(output[i] - value[i]) < thresh;
            }
        } else {
            pass = Math.abs(output - value) < thresh;
        }
        var message = "\tExpected:\t" + expected + "\n\tReceived:\t" + received + "\n\tThreshold:\t" + threshold;
        return [pass, message];
    };
    return this;
};
Test.prototype.setSuffix = function(output) {
    this.suffix = output;
};
Test.prototype.getSuffix = function() {
    return this.suffix;
};
Test.prototype.test = function() {
    var q = $q.defer();
    var result = this.fn.bind(this)(this.input);
    if (result.constructor.name == "Promise") {
        var that = this;
        result.then(function(v) {
            var outcome = that.expectedFn(v);
            q.resolve([outcome[0], outcome[1], that.suffix]);
        });
    } else {
        var outcome = this.expectedFn(result);
        q.resolve([outcome[0], outcome[1], this.suffix]);
    }
    return q.promise;
};

module.exports = function() {
    this.TestSuite = TestSuite;
    this.Test = Test;
};