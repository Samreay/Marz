/**
 * Created by Samuel on 26/12/2015.
 */

console.log("Loading dependancies");
var fs = require('fs');
var dependencies = ['./js/config.js', './js/tools.js', './js/methods.js', './lib/regression.js', './js/classes.js'];
//dependencies.push('./js/workerMethods.js');
for (var i = 0; i < dependencies.length; i++) {
    eval(fs.readFileSync("../" + dependencies[i]) + '');
}
console.log("Dependencies loaded\n");

var testArray = [3,5,4,2,5,3,6,3,9,5,3,2,4,3,5,3,8,7,7,2,4];
var tests = [];

/**
 * Tests for basic functions like mean and stdDev
 */
tests.push({
    name: "getMean test",
    fn: function() {
        return getMean(testArray)
    },
    expected: 4.4285714285714288});
tests.push({
    name: "getMeanMask test",
    fn: function() {
        var mask = [];
        for (var i = 0; i < testArray.length; i++) {
            mask.push(testArray[i] > 4)
        }
        return getMeanMask(testArray, mask)
    },
    expected: 6.333333333333333});
tests.push({
    name: "getStdDev test",
    fn: function() {
        return getStdDev(testArray)
    },
    expected: 1.965692137195266});
tests.push({
    name: "getStdDevMask test",
    fn: function() {
        var mask = [];
        for (var i = 0; i < testArray.length; i++) {
            mask.push(testArray[i] > 4)
        }
        return getStdDevMask(testArray, mask)
    },
    expected: 1.4142135623730951});
/**
 *  Tests for the linked lists and median filter
 */
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
        return medianFilter(testArray, 3);
    },
    expected: [3, 4, 4, 4, 3, 5, 3, 6, 5, 5, 3, 3, 3, 4, 3, 5, 7, 7, 7, 4, 4]});
tests.push({
    name: "Linked List - medianFilter test (2)",
    fn: function() {
        return medianFilter(testArray, 5);
    },
    expected: [3, 3, 4, 4, 4, 3, 5, 5, 5, 3, 4, 3, 3, 3, 4, 5, 7, 7, 7, 4, 4]});
tests.push({
    name: "Linked List - medianFilter test (3)",
    fn: function() {
        return medianFilter(testArray, 7);
    },
    expected: [3, 3, 3, 4, 4, 4, 5, 5, 3, 4, 3, 4, 3, 3, 4, 5, 5, 5, 4, 4, 4]});
tests.push({
    name: "Linked List - medianFilter test (4)",
    fn: function() {
        return medianFilter(testArray, 9);
    },
    expected: [3, 3, 3, 3, 4, 5, 4, 3, 4, 3, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4]});

module.exports = tests;