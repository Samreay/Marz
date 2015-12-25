var debug = function(output) {
    if (typeof output == "string") {
        console.log(output);
    } else {
        console.dir(output);
    }
};

debug("Loading dependancies\n");
var fs = require('fs');
var dependencies = ['./js/config.js', './lib/fits.js', './js/tools.js', './js/methods.js', './lib/regression.js', './js/templates.js', './js/classes.js'];
for (var i = 0; i < dependencies.length; i++) {
    eval(fs.readFileSync("../" + dependencies[i]) + '');
}

var inputMessage = require('./input.js');


var timeFunction = function(name, func) {
    var times = [];
    var i = 0;
    for (i = 0; i < 100; i++) {
        var t = new Date();
        func();
        times.push(new Date() - t);
    }
    var mean = getMean(times);
    var std = getRMS(times);
    debug(name + " took " + mean.toFixed(1) + " pm " + std.toFixed(1));
};

var tests = {};

tests.medianSmall = function() { medianFilter(inputMessage.intensity, 10); };
tests.medianLarge = function() { medianFilter(inputMessage.intensity, 100); };

for (var key in tests) {
    timeFunction(key, tests[key]);
}
