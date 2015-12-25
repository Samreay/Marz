var debug = function(output) {
    if (typeof output == "string") {
        console.log(output);
    } else {
        console.dir(output);
    }
};

debug("Loading dependancies");
var fs = require('fs');
var dependencies = ['./js/config.js', './lib/fits.js', './js/tools.js', './js/methods.js', './lib/dsp.js', './lib/regression.js', './js/templates.js', './js/classes.js', './js/workerMethods.js'];
for (var i = 0; i < dependencies.length; i++) {
    eval(fs.readFileSync("../" + dependencies[i]) + '');
}
debug("Dependencies loaded\n");
var node = true;

var inputMessage = require('./input.js');
var size = 20000;
var randomArray = new Array(size);
var randomFloat = new Float64Array(size);
for (var i = 0; i < size; i++) {
    randomArray[i] = 100 * Math.random();
    randomFloat[i] = randomArray[i];
}

inputMessage.matching = false;
var timeFunction = function(name, func, num) {
    num = defaultFor(num, 100);
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


var tests = {};
tests.handleEvent = function() { handleEvent(inputMessage); };

debug("Starting tests");
for (var key in tests) {
    timeFunction(key, tests[key]);
}
