
console.log("Loading dependencies for algorithms");
var fs = require('fs');
var dependencies = ['./js/config.js', './js/tools.js', './js/methods.js', './lib/regression.js', './js/classes.js'];
//dependencies.push('./js/workerMethods.js');
for (var i = 0; i < dependencies.length; i++) {
    eval(fs.readFileSync("../" + dependencies[i]) + '');
}
console.log("Dependencies loaded\n");

var testArray = [3,5,4,2,5,-3,6,3,9,5,3,2,4,3,-10,5,3,8,7,7,2,4];
var testArray2 = [3,5,4,2,5,-3,6,3,9,5,9e19,2,4,3,-10,5,3,8,7,7,2,4];
var testArray3 = [3, 5, 4, 2, 5, 3, 6, 3, 9, 5, 3, 2, 4, 3, 5, 3, 8, 7, 7, 2, 4];
var tests = [];

/**
 * Tests for basic algorithms
 */
tests.push({
    name: "broadenError test",
    fn: function() {
        var arr = testArray2.slice();
        broadenError(arr);
        return arr;
    },
    expected: [5,5,5,5,5,6,6,9,9,9e19,9e19,9e19,4,4,5,5,8,8,8,7,7,4]});
tests.push({
    name: "maxMedianAdjust2 test (1)",
    fn: function() {
        var arr = testArray3.slice();
        maxMedianAdjust2(arr, 3, 1.0);
        return arr;
    },
    expected: [3, 5, 4, 4, 5, 5, 6, 6, 9, 5, 3, 3, 4, 4, 5, 5, 8, 7, 7, 4, 4]});
tests.push({
    name: "maxMedianAdjust2 test (2)",
    fn: function() {
        var arr = testArray3.slice();
        maxMedianAdjust2(arr, 5, 1.1);
        return arr;
    },
    expected: [3.3, 5, 4.4, 4.4, 5, 3.3, 6, 5.5, 9, 5, 4.4, 3.3, 4, 3.3, 5, 5.5, 8, 7.7, 7.7, 4.4, 4.4]});


module.exports = tests;