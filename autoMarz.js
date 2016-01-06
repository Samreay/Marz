// iojs head script to run marz from a command line interface


var debug = function (output) {
    if (debugFlag) {
        if (typeof output == "string") {
            console.log(output);
        } else {
            console.dir(output);
        }
    }
};
var help = function () {
    console.error("Usage: autoMarz.js <FITSfilename>|<FITSfoldername> [--debug] [--outFile <filename>]|[--dir dirname]\n");
    console.error("For a full list of options, consult autoConfig.js");
    console.error("Examples:");
    console.error("Analyse file /tmp/fits.fits and output to stdout:\n\tautoMarz.js /tmp/fits.fits\n");
    console.error("Analyse file /tmp/fits.fits and output to /tmp/out.mz:\n\tautoMarz.js /tmp/fits.fits --ooutFile=/tmp/out.mz\n");
    console.error("Analyse file /tmp/fits.fits and output to directory /tmp/saves:\n\tautoMarz.js /tmp/fits.fits --dir=/tmp/saves\n");
    process.exit();
};
function getOutputFilename(fitsFile, argv) {
    var fname = argv["outFile"] || path.basename(fitsFile);
    var dname = argv['dir'] || path.dirname(fitsFile);
    if (!fname.endsWith(".mz")) {
        fname = fname.substring(0, fname.lastIndexOf('.')) + ".mz";
    }
    var outputFile = path.normalize(path.join(dname, fname));
    debug("Input file " + fitsFile + " output going to " + outputFile);
    return outputFile;
}


var path = require('path');
var cluster = require('cluster');
var fs = require('fs');
var $q = require('q');
var appPath = __dirname;

eval(fs.readFileSync(path.join(appPath, "./js/extension.js")) + '');
var args = require('minimist')(process.argv.slice(2));
var argv = require(path.join(appPath, './autoConfig.js'));

for (var att in args) {
    if (typeof argv[att] == "string" || att == "_") {
        argv[att] = args[att];
    } else {
        argv[att] = JSON.parse(args[att]);
    }
}

var debugFlag = Boolean(argv['debug']);
var log = {
    "debug": function (e) {
        debug(e);
    }
};


if (cluster.isMaster) {

    var filenames = argv['_'];

    debug("Input Parameters:");
    debug(argv);
    if (filenames == null || filenames.length == 0) {
        help();
    }

    var filename = filenames[0];


    n = argv['numCPUs'] || Math.max(1, require('os').cpus().length - 1);

    var workers = [];
    for (var i = 0; i < n; i++) {
        workers.push(cluster.fork());
    }

    var queue = [];
    var totalNum = 0;
    for (var i = 0; i < filenames.length; i++) {
        var stat = fs.lstatSync(filenames[i]);
        if (stat.isDirectory()) {
            var files = fs.readdirSync(filenames[i]);
            for (var j = 0; j < files.length; j++) {
                if (files[j].endsWith(".fits")) {
                    queue.push(path.normalize(path.resolve(filenames[i], files[j])));
                }
            }
        } else {
            queue.push(path.normalize(filenames[i]));
        }
    }
    queue = queue.unique();
    debug("Queue contains:");
    debug(queue);
    var globalStartTime = new Date();

    var struct = require(path.join(appPath, './js/nodeMethods'));
    struct.init(workers, log, argv);

    var handleReturn = function (num) {
        totalNum += num;
        if (queue.length > 0) {
            var filename = queue.shift();
            var outputName = getOutputFilename(filename, argv);
            struct.runFitsFile(filename, outputName, debug).then(handleReturn);
        } else {
            var globalEndTime = new Date();
            var elapsed = (globalEndTime - globalStartTime) / 1000;
            debug("All files processed in " + elapsed + " seconds, an average of " + (totalNum / elapsed).toFixed(2) + " spectra per second");
            cluster.disconnect();
        }
    };
    handleReturn(0);


} else {
    debug("Worker spawned");
    require('./js/worker2.js')
}
