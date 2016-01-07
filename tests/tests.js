var $q = require('q');
var cluster = require('cluster');

var tests = ["./basicTests", "./algorithmTests", "./translationTests", "./fitsParsingTests", "./verificationTests"];
var deps = [];
for (var i = 0; i < tests.length; i++) {
    deps.push(require(tests[i]));
}
var allCount = 0;

function finishTestSuite() {
    if (allCount == 0) {
        console.log("\n\n" + "All tests passed!\n");
    } else {
        console.error("\n\n" + "Test suites failed!\n");
    }
    cluster.disconnect();

}

function doTestSuite() {
    var testSuite = deps.shift();

    if (typeof testSuite !== "undefined" && testSuite.runTests != null) {
        testSuite.runTests().then(function (count) {
            allCount += count;
            if (deps.length > 0) {
                doTestSuite();
            } else {
                finishTestSuite();
            }
        })
    } else {
        if (deps.length > 0) {
            doTestSuite();
        } else {
            finishTestSuite();
        }
    }

}

if (cluster.isMaster) {

    doTestSuite();
}