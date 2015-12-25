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
var size = 100000;
var medium = new Array(size);
var large = new Array(size * 50);
for (var i = 0; i < size; i++) {
    medium[i] = 100 * Math.random() + (1.0 * i / 1e5);
}
for (var i = 0; i < (50 * size); i++) {
    large[i] = 100 * Math.random() + (1.0 * i / 1e5);
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
    debug(name + " took " + mean.toFixed(1) + " pm " + std.toFixed(1));
};
var compareFunc = function(name, funcs, num) {
    num = defaultFor(num, 100);
    var times = new Array(funcs.length);
    var results = new Array(funcs.length);
    for (var i = 0; i < times.length; i++) {
        times[i] = [];
    }
    for (var i = 0; i < num; i++) {
        for (var j = 0; j < funcs.length; j++) {
            var t = new Date();
            var r = funcs[j]();
            var e = new Date() - t;
            times[j].push(e);
            results[j] = r;
        }
        var first = results[0];
        for (var j = 1; j < funcs.length; j++) {
            if (results[j] != first) {
                throw ("Results are different: " + first + " vs (" + j + ") " + results[j])
            }
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

singleTests.getMean = function() { return getMean(large); };
singleTests.getRMS = function() { return getRMS(medium); };

doubleTests.compareMeans = [function() { return getMean(large); }, function() { return getMean2(large); }];


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

