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

var im = require('./input.js');
var size = 100000;
var mediumInit = new Array(size);
var medium2Init = new Array(size);
var mediumMask = new Array(size);
var largeMask = new Array(size * 50);
var largeInit = new Array(size * 50);
var medium = null;
var medium2 = null;
var large = null;
for (var i = 0; i < size; i++) {
    mediumInit[i] = 100 * Math.random() + (i / 1e5);
    medium2Init[i] = 70 * Math.random() - (i / 5e4);
    mediumMask[i] = Math.random > 0.1 ? 1 : 0;
}
for (var i = 0; i < (50 * size); i++) {
    largeInit[i] = 100 * Math.random() + (i / 1e5);
    largeMask[i] = Math.random > 0.1 ? 1 : 0;
}
var initData = function() {
    medium = mediumInit.slice();
    medium2 = medium2Init.slice();
    large = largeInit.slice();
};
initData();

im.matching = false;
var timeFunction = function(name, func, num) {
    num = defaultFor(num, 200);
    var times = [];
    for (var i = 0; i < num; i++) {
        var t = getTime();
        func();
        var e = getTime() - t;
        times.push(e);
    }
    var mean = getMean(times);
    var std = getStdDev(times);
    debug(name + " took " + mean.toFixed(1) + " pm " + std.toFixed(1));
};
var replacer = function(key, val) {
    return val.toFixed ? Number(val.toFixed(5)) : val;
};
var compareFunc = function(name, funcs, num) {
    num = defaultFor(num, 50);
    var times = new Array(funcs.length);
    var results = new Array(funcs.length);
    for (var i = 0; i < times.length; i++) {
        times[i] = [];
    }
    for (var i = 0; i < num; i++) {
        for (var j = 0; j < funcs.length; j++) {
            var t = getTime();
            var r = funcs[j]();
            var e = getTime() - t;
            times[j].push(e);
            results[j] = r;
        }

        var first = results[0];
        for (var j = 1; j < funcs.length; j++) {
            if (JSON.stringify(results[j], replacer) != JSON.stringify(first, replacer)) {
                console.warn("ERROR: DIFFERENT RESULTS BETWEEN 0 AND " + j);
                console.dir(first);
                console.dir(results[j]);
                throw ("ERR")
            }
        }

    }

    for (var j = 0; j < funcs.length; j++) {
        var mean = getMean(times[j]);
        var std = getStdDev(times[j]);
        debug(name + " " + j + " took " + mean.toFixed(1) + " pm " + std.toFixed(1));
    }
};

var singleTests = {};
var doubleTests = {};






/* TEST CASES BELOW */

/*
singleTests.getMean = function() { return getMean(large); };
singleTests.getMeanMask = function() { return getMeanMask(large, largeMask); };
singleTests.getStdDev = function() { return getStdDev(medium); };
singleTests.getStdDevMask = function() { return getStdDev(medium, mediumMask); };
 singleTests.stdDevSubtract = function() { return stdDevSubtract(medium, medium2); };
 singleTests.absMean = function() { return absMean(medium); };
 singleTests.absMax = function() { return absMax(medium); };
*/

//medium = [3,5,4,2,5,3,6,3,9,5,3,2,4,3,5,3,8,7,7,2,4];

/*
doubleTests.absMean = [
    function() { return absMean(medium); },
    function() { return absMean2(medium); }
];
*/






debug("\nStarting comparison tests");
for (var key in doubleTests) {
    debug("--------------------");
    debug(key);
    compareFunc(key, doubleTests[key]);
}


debug("\nStarting single tests");
for (var key in singleTests) {
    timeFunction(key, singleTests[key]);
}

