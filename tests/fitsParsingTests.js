console.log("Loading dependencies for fitsParsing");
var dependencies = ['./test'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
var argv = require("../autoConfig");

console.log("Dependencies loaded\n");

var tests = new TestSuite("fits Parsing");


var path = require('path');
var cluster = require('cluster');
var fs = require('fs');
var $q = require('q');
var appPath = __dirname;
eval(fs.readFileSync(path.join(appPath, "../js/extension.js")) + '');

var debug = function(output) {
    return;
};

var log = {"debug": debug};

if (cluster.isMaster) {
    var workers = [cluster.fork()];
    //var workers = [this];
    var struct = require(path.join(appPath,'../js/nodeMethods'));
    struct.init(workers, log, argv);

    tests.addTest(new Test("Load in file", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/quasarLinearSkyAirNoHelio.fits", null, debug, false).then(function(res) {
            var specRes = res[0];
            var resolved = false;
            for (var i = 0; i < specRes.length; i++) {
                if (specRes[i]['name'] == 'AutoZ') {
                    q.resolve(parseFloat(specRes[i]['value']));
                    resolved = true;
                    break;
                }
            }
            if (!resolved) {
                q.reject("Z not found");
            }
        });
        return q.promise;
    }).setExpectedEquals(2.00303));

    module.exports = tests;



} else {
    require('../js/worker2.js')
}

