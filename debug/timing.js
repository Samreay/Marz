var debug = function(output) {
    if (typeof output == "string") {
        console.log(output);
    } else {
        console.dir(output);
    }
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

var inputMessage = require('./input.js');
var size = 5000000;
var randomArray = new Array(size);
var randomFloat = new Float64Array(size);
for (var i = 0; i < size; i++) {
    randomArray[i] = 100 * Math.random();
    randomFloat[i] = randomArray[i];
}

inputMessage.matching = false;
var timeFunction = function(name, func, num) {
    num = defaultFor(num, 200);
    var times = [];
    for (var i = 0; i < num; i++) {
        var t = new Date();
        func();
        var e = new Date() - t;
        times.push(e);
    }
    var mean = getMean(times);
    var std = getRMS(times);
    debug(name + " took " + mean.toFixed(0) + " pm " + std.toFixed(0));
};
var compareFunc = function(name, funcs, num) {
    num = defaultFor(num, 200);
    var times = new Array(funcs.length);
    for (var i = 0; i < times.length; i++) {
        times[i] = [];
    }
    for (var i = 0; i < num; i++) {
        for (var j = 0; j < funcs.length; j++) {
            var t = new Date();
            funcs[j]();
            var e = new Date() - t;
            times[j].push(e);
        }
    }
    for (var j = 0; j < funcs.length; j++) {
        var mean = getMean(times[j]);
        var std = getRMS(times[j]);
        debug(name + " " + j + " took " + mean.toFixed(1) + " pm " + std.toFixed(1));
    }
};

var singleTests = {};
var doubleTests = {};

singleTests.getMean = function() { getMean(randomArray); };

doubleTests.compareMeans = [function() { getMean(randomArray); }, function() { getMean(randomArray); }];

debug("Starting single tests");
for (var key in singleTests) {
    timeFunction(key, singleTests[key]);
}

debug("\nStarting comparison tests");
for (var key in doubleTests) {
    debug("--------------------");
    debug(key);
    compareFunc(key, doubleTests[key]);
}