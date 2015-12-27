var debug = function(output) {
    if (typeof output == "string") {
        console.log(output);
    } else {
        console.dir(output);
    }
};

var getTime = function() {
    var hrTime = process.hrtime();
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
};
debug("Loading dependancies");
var fs = require('fs');
var dependencies = ['./js/config.js', './lib/fits.js', './js/tools.js', './js/methods.js', './lib/dsp.js', './lib/regression.js', './js/templates.js', './js/classes.js'];
//dependencies.push('./js/workerMethods.js');
for (var i = 0; i < dependencies.length; i++) {
    eval(fs.readFileSync("../" + dependencies[i]) + '');
}
debug("Dependencies loaded\n");
var node = true;
var replacer = function(key, val) {
    return val && val.toFixed ? Number(val.toFixed(5)) : val;
};


var tests = [];


tests.push({
    name: "Linked List - addAllToSorted test",
    fn: function() {
        var head = [null, null];
        addAllToSorted(head, [5,6,2,4,0,8,7,7,1]);
        return getList(head);
    },
    expected: [ 0, 1, 2, 4, 5, 6, 7, 7, 8 ]});
tests.push({
    name: "Linked List - removeAddAndFindMedian test (1)",
    fn: function() {
        var head = [null, null];
        addAllToSorted(head, [5,6,2,4,0,8,7,7,1]);
        var median = removeAddAndFindMedian(head, 5, 10, 4);
        return [median, getList(head)];
    },
    expected: [6, [0, 1, 2, 4, 6, 7, 7, 8, 10 ]]});
tests.push({
    name: "Linked List - removeAddAndFindMedian test (2)",
    fn: function() {
        var head = [null, null];
        addAllToSorted(head, [5,6,2,4,0,8,7,7,1]);
        var median = removeAddAndFindMedian(head, 5, -5, 4);
        return [median, getList(head)];
    },
    expected: [4, [-5, 0, 1, 2, 4, 6, 7, 7, 8 ]]});
tests.push({
    name: "Linked List - medianFilter test (1)",
    fn: function() {
        return medianFilter2([3,5,4,2,5,3,6,3,9,5,3,2,4,3,5,3,8,7,7,2,4], 3);
    },
    expected: [3, 4, 4, 4, 3, 5, 3, 6, 5, 5, 3, 3, 3, 4, 3, 5, 7, 7, 7, 4, 4]});
tests.push({
    name: "Linked List - medianFilter test (2)",
    fn: function() {
        return medianFilter2([3,5,4,2,5,3,6,3,9,5,3,2,4,3,5,3,8,7,7,2,4], 5);
    },
    expected: [3, 3, 4, 4, 4, 3, 5, 5, 5, 3, 4, 3, 3, 3, 4, 5, 7, 7, 7, 4, 4]});
tests.push({
    name: "Linked List - medianFilter test (3)",
    fn: function() {
        return medianFilter2([3,5,4,2,5,3,6,3,9,5,3,2,4,3,5,3,8,7,7,2,4], 7);
    },
    expected: [3, 3, 3, 4, 4, 4, 5, 5, 3, 4, 3, 4, 3, 3, 4, 5, 5, 5, 4, 4, 4]});
tests.push({
    name: "Linked List - medianFilter test (4)",
    fn: function() {
        return medianFilter2([3,5,4,2,5,3,6,3,9,5,3,2,4,3,5,3,8,7,7,2,4], 9);
    },
    expected: [3, 3, 3, 3, 4, 5, 4, 3, 4, 3, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4]});


debug("\nStarting single tests");
for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var failed = 0;
    var actual = t.fn();
    var expected = t.expected;
    var actualString = JSON.stringify(actual, replacer);
    var expectedString = JSON.stringify(expected, replacer);
    if (actualString != expectedString) {
        failed++;
        console.warn(t.name + " failed. Expected:\n\t" + expectedString + "\nReceived:\n\t" + actualString);
    } else {
        console.log(t.name + " passed");
    }
}
if (failed) {
    throw "Error. " + failed " tests failed";
}

