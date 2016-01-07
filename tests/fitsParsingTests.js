//console.log("Loading dependencies for fitsParsing");
var dependencies = ['./test'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
var argv = require("../autoConfig");

//console.log("Dependencies loaded\n");

var tests = new TestSuite("fits Parsing");
var ckps = 299792.458;


var path = require('path');
var cluster = require('cluster');
var fs = require('fs');
var $q = require('q');
var appPath = __dirname;
eval(fs.readFileSync(path.join(appPath, "../js/extension.js")) + '');

var debug = function(output) {
    return;
};
var redshiftThreshold = 1.5e-5;
var log = {"debug": debug};

if (cluster.isMaster) {
    var workers = [cluster.fork()];
    //var workers = [this];
    var struct = require(path.join(appPath,'../js/nodeMethods'));
    struct.init(workers, log, argv);

    tests.addTest(new Test("Quasar\tlinear header air wavelength, with sky, no helio, no cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/quasarLinearSkyAirNoHelio.fits", null, debug, false).then(function(res) {
            var spectra = res[0];
            q.resolve(spectra.getFinalRedshift());
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue(2.00303, redshiftThreshold));

    tests.addTest(new Test("ELG\tlinear header air wavelength, with sky, no helio, no cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/emlLinearSkyAirNoHelio.fits", null, debug, false).then(function(res) {
            var spectra = res[0];
            q.resolve(spectra.getFinalRedshift());
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue(0.11245, redshiftThreshold));

    tests.addTest(new Test("ELG\tlinear header air wavelength, with sky, helio, no cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/emlLinearSkyAirHelio.fits", null, debug, false).then(function(res) {
            var spectra = res[0];
            q.resolve(((1 + spectra.getFinalRedshift()) * (1 - spectra.helio/ckps)) - 1);
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue(0.11245, redshiftThreshold));

    tests.addTest(new Test("ELG\tlinear header air wavelength, with sky, helio, cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/emlLinearSkyAirHelioCMB.fits", null, debug, false).then(function(res) {
            var spectra = res[0];
            q.resolve(((1 + spectra.getFinalRedshift()) * (1 - spectra.helio/ckps) * (1 - spectra.cmb/ckps)) - 1);
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue(0.11245, redshiftThreshold));

    tests.addTest(new Test("ELG\tlinear header vacuum wavelength, no sky, no helio, no cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/emlLinearVacuumNoHelio.fits", null, debug, false).then(function(res) {
            var spectra = res[0];
            q.resolve(spectra.getFinalRedshift());
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue(0.11245, redshiftThreshold));

    tests.addTest(new Test("ELG\tlog array vacuum wavelength, no sky, no helio, no cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/emlLogVacuumNoHelio.fits", null, debug, false).then(function(res) {
            var spectra = res[0];
            q.resolve(spectra.getFinalRedshift());
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue(0.11245, redshiftThreshold));

    tests.addTest(new Test("ELG\tlog array vacuum wavelength, no sky, helio, cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/emlLogVacuumHelioCMB.fits", null, debug, false).then(function(res) {
            var spectra = res[0];
            q.resolve(((1 + spectra.getFinalRedshift()) * (1 - spectra.helio/ckps) * (1 - spectra.cmb/ckps)) - 1);
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue(0.11245, redshiftThreshold));

    tests.addTest(new Test("ELG\tlog multiarray vacuum wavelength, no sky, no helio, no cmb", function() {
        var q = $q.defer();
        struct.runFitsFile("./testFits/emlLogVacuumHelioMultiple.fits", null, debug, false).then(function(res) {
            var spectra0 = res[0];
            var spectra1 = res[1];
            var spectra2 = res[2];
            q.resolve([spectra0.getFinalRedshift(), spectra1.getFinalRedshift(), spectra2.getFinalRedshift()]);
        });
        return q.promise;
    }).setAbsoluteDeviationFromValue([0.11101, 0.20406, 0.44859], redshiftThreshold));

    module.exports = tests;



} else {
    require('../js/worker2.js')
}

