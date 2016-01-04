function TestSuite(name) {
    this.name = name;
    this.tests = [];
    this.partition = "==================================================";
}
TestSuite.prototype.addTest = function(test) {
    this.tests.push(test);
};
TestSuite.prototype.runTests = function() {
    console.log(this.partition);
    console.log("Running Test Suite ", this.name);
    console.log(this.partition);
    var count = 0;
    for (var i = 0; i < this.tests.length; i++) {
        var t = this.tests[i];
        var result = t.test();
        var pass = result[0], errorMessage = result[1], suffix = result[2];
        if (suffix) {
            suffix = ": " + suffix;
        }
        if (pass) {
            console.log("passed:\t" + t.name + suffix);
        } else {
            count++;
            console.warn("FAILED:\t" + t.name + suffix);
            console.warn(errorMessage);
        }
    }
    console.log(this.partition);
    if (count) {
        console.warn("Test Suite " + this.name + " failed: " + count.toFixed(0) + " tests failed!");
    } else {
        console.log("Test Suite " + this.name + " passed");
    }
    console.log(this.partition + "\n");
    return count == 0;
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
Test.prototype.setSuffix = function(output) {
    this.suffix = output;
};
Test.prototype.getSuffix = function() {
    return this.suffix;
};
Test.prototype.test = function() {
    var result = this.fn.bind(this)(this.input);
    var outcome = this.expectedFn(result);
    return [outcome[0], outcome[1], this.suffix];
};

module.exports = function() {
    this.TestSuite = TestSuite;
    this.Test = Test;
};