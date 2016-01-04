var allPass = true;


allPass = allPass && require("./basicTests").runTests();
allPass = allPass && require("./algorithmTests").runTests();
allPass = allPass && require("./translationTests").runTests();
allPass = allPass && require("./verificationTests").runTests();

if (allPass) {
    console.log("\n\n" + "All tests passed!\n");
} else {
    console.error("\n\n" + "Test suites failed!\n");
}
