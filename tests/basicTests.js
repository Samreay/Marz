//console.log("Loading dependencies for basic");
var dependencies = ['../js/methods.js', './test'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
//console.log("Dependencies loaded\n");

var testArray = [3,5,4,2,5,3,6,3,9,5,3,2,4,3,5,3,8,7,7,2,4];
var testArray2 = [3,5,4,2,5,-3,6,3,9,5,3,2,4,3,-10,5,3,8,7,7,2,4];
var tests = new TestSuite("basics");

/**
 * Tests for basic functions like mean and stdDev
 */
tests.addTest(new Test("getMean test",
    function() {
        return getMean(testArray)
    }).setExpectedEquals(4.4285714285714288));


tests.addTest(new Test("getMeanMask test",
    function() {
        var mask = [];
        for (var i = 0; i < testArray.length; i++) {
            mask.push(testArray[i] > 4)
        }
        return getMeanMask(testArray, mask)
    }).setExpectedEquals(6.333333333333333));


tests.addTest(new Test("getStdDev test",
    function() {
        return getStdDev(testArray)
    }).setExpectedEquals(1.965692137195266));


tests.addTest(new Test("getStdDevMask test",
    function() {
        var mask = [];
        for (var i = 0; i < testArray.length; i++) {
            mask.push(testArray[i] > 4)
        }
        return getStdDevMask(testArray, mask)
    }).setExpectedEquals(1.4142135623730951));


tests.addTest(new Test("absMax test",
    function() {
        return absMax(testArray2)
    }).setExpectedEquals(10));


tests.addTest(new Test("absMean test",
    function() {
        return absMean(testArray2)
    }).setExpectedEquals(4.6818181818181817));


/**
 * Linear tests
 */
tests.addTest(new Test("linearScale test",
    function() {
        return linearScale(0, 10, 11)
    }).setExpectedEquals([0,1,2,3,4,5,6,7,8,9,10]));


tests.addTest(new Test("interpolate test",
    function() {
        var x = [0,1,2,3,4,5,6,7,8,9,10,11];
        var y = [5,2,3,4,7,2,9,4,2,5,5,6];
        var x2 = [0.1, 1.5, 3.2, 3.3, 4, 5, 7.7, 8.5, 9.5, 10,11];
        return interpolate(x2, x, y);
    }).setExpectedEquals([ 4.7,  2.5,  4.6,  4.9,  7. ,  2. ,  2.6,  3.5,  5. ,  5., 6.0 ]));



/**
 * Basic boxcar smoothing
 */
tests.addTest(new Test("boxCarSmooth test (1)",
    function() {
        return boxCarSmooth(testArray, 3)
    }).setExpectedEquals([3.66666667,  4.        ,  3.66666667,  3.66666667,  3.33333333,
    4.66666667,  4.        ,  6.        ,  5.66666667,  5.66666667,
    3.33333333,  3.        ,  3.        ,  4.        ,  3.66666667,
    5.33333333,  6.        ,  7.33333333,  5.33333333,  4.33333333,
    3.33333333]));


tests.addTest(new Test("boxCarSmooth test (2)",
    function() {
        return boxCarSmooth(testArray, 5)
    }).setExpectedEquals([ 3.6,  3.4,  3.8,  3.8,  4. ,  3.8,  5.2,  5.2,  5.2,  4.4,  4.6,  3.4,  3.4,
        3.4,  4.6,  5.2,  6. ,  5.4,  5.6,  4.8,  4.2]));







/**
 *  Tests for the linked lists and median filter
 */
tests.addTest(new Test("Linked List - addAllToSorted test",
    function() {
        var head = [null, null];
        addAllToSorted(head, [5,6,2,4,0,8,7,7,1]);
        return getList(head);
    }).setExpectedEquals([ 0, 1, 2, 4, 5, 6, 7, 7, 8 ]));


tests.addTest(new Test("Linked List - removeAddAndFindMedian test (1)",
    function() {
        var head = [null, null];
        addAllToSorted(head, [5,6,2,4,0,8,7,7,1]);
        var median = removeAddAndFindMedian(head, 5, 10, 4);
        return [median, getList(head)];
    }).setExpectedEquals([6, [0, 1, 2, 4, 6, 7, 7, 8, 10 ]]));


tests.addTest(new Test("Linked List - removeAddAndFindMedian test (2)",
    function() {
        var head = [null, null];
        addAllToSorted(head, [5,6,2,4,0,8,7,7,1]);
        var median = removeAddAndFindMedian(head, 5, -5, 4);
        return [median, getList(head)];
    }).setExpectedEquals([4, [-5, 0, 1, 2, 4, 6, 7, 7, 8 ]]));


tests.addTest(new Test("Linked List - medianFilter test (1)",
    function() {
        return medianFilter(testArray, 3);
    }).setExpectedEquals([3, 4, 4, 4, 3, 5, 3, 6, 5, 5, 3, 3, 3, 4, 3, 5, 7, 7, 7, 4, 4]));


tests.addTest(new Test("Linked List - medianFilter test (2)",
    function() {
        return medianFilter(testArray, 5);
    }).setExpectedEquals([3, 3, 4, 4, 4, 3, 5, 5, 5, 3, 4, 3, 3, 3, 4, 5, 7, 7, 7, 4, 4]));


tests.addTest(new Test("Linked List - medianFilter test (3)",
    function() {
        return medianFilter(testArray, 7);
    }).setExpectedEquals([3, 3, 3, 4, 4, 4, 5, 5, 3, 4, 3, 4, 3, 3, 4, 5, 5, 5, 4, 4, 4]));


tests.addTest(new Test("Linked List - medianFilter test (4)",
    function() {
        return medianFilter(testArray, 9);
    }).setExpectedEquals([3, 3, 3, 3, 4, 5, 4, 3, 4, 3, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4]));




module.exports = tests;