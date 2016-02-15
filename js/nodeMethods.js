var dependencies = [ './templates.js', './classes.js'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
var $q = require('q');
var path = require('path');
var fs = require('fs');
var appPath = __dirname;
eval(fs.readFileSync(path.join(appPath, "./extension.js")) + '');
var ProgressBar = require('progress');
var green = '\u001b[42m \u001b[0m';
var red = '\u001b[41m \u001b[0m';
var p = null, s = null, t = null, r = null, fl = null, data = null, global = null;

function init(workers, log, argv) {
    data = {
        fits: [],
        types: [],
        fitsFileName: null,
        spectra: [],
        spectraHash: {},
        history: []
    };
    global = {data: data};
    p = new ProcessorManager(true);
    s = new SpectraManager(data, log);
    t = new TemplateManager(false);
    r = new ResultsGenerator(data, t, false);
    fl = new FitsFileLoader($q, global, log, p, r, true);
    fl.subscribeToInput(s.setSpectra, s);
    fl.subscribeToInput(p.addSpectraListToQueue, p);
    p.setNode();
    p.setWorkers(workers, $q);
    s.setAssignAutoQOPs(argv["assignAutoQOPs"]);
    r.setNumAutomatic(argv["numAutomatic"]);
    p.setProcessTogether(argv["processTogether"]);
    p.setInactiveTemplateCallback(function () {
        return argv['disabledTemplates']
    });
    p.setProcessedCallback(s.setProcessedResults, s);
    p.setMatchedCallback(s.setMatchedResultsNode, s);
}
function runFitsFile(filename, outputFile, debug, consoleOutput) {
    consoleOutput = defaultFor(consoleOutput, true);
    var fileData = fs.readFileSync(filename);
    var qq = $q.defer();
    var startTime = new Date();
    debug("Processing file " + filename);
    s.setPacer(new ProgressBar('        Analysing spectra  [:bar] :percent (:current/:total) :elapseds :etas', {
        complete: green,
        incomplete: red,
        total: 30
    }));
    s.setFinishedCallback(function () {
        debug("Getting results");
        var values = r.getResultsCSV();
        var num = s.data.spectra.length;
        if (consoleOutput) {
            console.log(values);
        }
        if (outputFile) {
            fs.writeFile(outputFile, values, function (err) {
                if (err) {
                    return console.error(err);
                }
                debug("File saved to " + outputFile);
                qq.resolve(num);
            });
        } else {
            qq.resolve(r.getSpectraWithResults());
        }
        var endTime = new Date();
        var elapsed = (endTime - startTime) / 1000;
        debug("File processing took " + elapsed + " seconds, " + (num / elapsed).toFixed(2) + " spectra per second");
    });
    fl.loadInFitsFile({'actualName': path.basename(filename), 'file': fileData});

    debug("File loaded");
    return qq.promise;
}

var struct = {
    init: init,
    runFitsFile: runFitsFile
};
module.exports = struct;