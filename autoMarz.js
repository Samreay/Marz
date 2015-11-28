// iojs head script to run marz from a command line interface

var argv = require('minimist')(process.argv.slice(2));

var debug = function(output) {
  if (debugFlag) {
    if (typeof output == "string") {
      console.log(output);
    } else {
      console.dir(output);
    }
  }
};
var help = function() {
  console.error("Usage: autoMarz.js <FITSfilename> [--debug] [-o|--outFile <filename>]|[-d|--dir dirname]\n");
  console.error("Examples:");
  console.error("Analyse file /tmp/fits.fits and output to stdout:\n\tautoMarz.js /tmp/fits.fits\n");
  console.error("Analyse file /tmp/fits.fits and output to /tmp/out.mz:\n\tautoMarz.js /tmp/fits.fits -o /tmp/out.mz\n");
  console.error("Analyse file /tmp/fits.fits and output to directory /tmp/saves:\n\tautoMarz.js /tmp/fits.fits -d /tmp/saves\n");
  process.exit();
};
var _ = require('lodash-node');
var path = require('path');
var cluster = require('cluster');
var fs = require('fs');
var $q = require('q');
var FileAPI = require('file-api'), File = FileAPI.File, FileList = FileAPI.FileList, FileReader = FileAPI.FileReader;
debug("Loading dependancies");
var dependencies = ['./js/config.js', './lib/fits.js', './js/tools.js', './js/methods.js', './lib/regression.js', './js/templates.js', './js/classes.js'];
for (var i = 0; i < dependencies.length; i++) {
  eval(fs.readFileSync(dependencies[i]) + '');
}
var astro = this.astro;

var debugFlag = argv['debug'] == true;


var log = {"debug": function(e) { debug(e); }};


if (cluster.isMaster) {
  var filenames = argv['_'];

  debug("Input Parameters:");
  debug(argv);
  if (filenames == null || filenames.length > 1 || filenames.length == 0) {
    help();
  }
  var filename = filenames[0];
  var fname = path.basename(filename);
  var dir = argv['d'] || argv['dir'];
  var outputFile = null;
  if (dir != null) {
    outputFile = path.join(dir, fname.substring(0, fname.lastIndexOf('.')) + '.mz');
  }
  outputFile = argv['o'] || argv['outFile'] || outputFile;

  debug("Parsed Parameters:");
  debug({'outputFile': outputFile, 'filename': filename, 'fname': fname, 'debug': debugFlag, 'dir': dir});
  //var jsdom = require('jsdom');

  n = require('os').cpus().length - 1;  // There is some slow down, either in JsDOM emulation or process messaging
                                        // that means CPUs are utilised < 15%. Want to track down why. 
  workers = [];
  for (var i = 0; i < n; i++) {
    workers.push(cluster.fork());
  }


  var f = new File(filename);
  var filedata = fs.readFileSync(filename);


  var toArrayBuffer = function(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
  };

  var defaults = {
    "assignAutoQOPs": true,       // Whether or not assign autoQops
    "tenabled": [],               // List of template IDs to disable in matching, eg to disable only quasars set to ['12']
    "processTogether": true
  };
  var startTime = new Date();
  debug("Processing file " + filename);
  var data = {
    fits: [],
    types: [],
    fitsFileName: null,
    spectra: [],
    spectraHash: {},
    history: []
  };
  var global = {data: data};

  var p = new ProcessorManager();
  var s = new SpectraManager(data);
  var t = new TemplateManager();
  var r = new ResultsGenerator(data, t);
  var fl = new FitsFileLoader($q, global, log, p);
  fl.subscribeToInput(s.setSpectra, s);
  fl.subscribeToInput(p.addSpectraListToQueue, p);
  p.setNode();
  p.setWorkers(workers);

  fl.loadInFitsFile({'actualName': fname, 'file': filedata});
  debug("File loaded");
  p.setInactiveTemplateCallback(function() { return defaults['tenabled']});
  p.setProcessedCallback(s.setProcessedResults);
  p.setMatchedCallback(s.setMatchedResults);
  s.setFinishedCallback(function() {
    console.log("Getting results");
    console.log(r.getResultsCSV());
    var endTime = new Date();
    debug("File processing took " + (endTime - startTime)/1000 + " seconds");
    cluster.disconnect();
  });










/*


  jsdom.env({
    file: 'index.html',
    features : {
          FetchExternalResources : ["script", "frame", "iframe", "link"],
          ProcessExternalResources : ['script']
    },
    created: function(err, window) {
      debug("Window created");
      window.require = require;
      window.File = File;
      window.FileReader = FileReader;
      var c = 0;

      window.nodeDebugServer = function(output) {
        c += 1;
        if (c % 10 == 0) {
          global.gc();
        }
        debug(output);
      };

      window.convertBuffer = function(buffer) {
        return toArrayBuffer(buffer);
      };

      window.getNodeDefault = function(property) {
        var val = defaults[property];
        debug("Asking for property " + property + ", returning " + val);
        return val;
      };

      window.onFileMatched = function(values) {
        console.log(values);
        if (outputFile) {
          fs.writeFile(outputFile, values, function(err) {
            if(err) {
                return console.error(err);
            }
            console.log("File saved to " + outputFile);
          });
        }
        var endTime = new Date();
        debug("File processing took " + (endTime - startTime)/1000 + " seconds");
        cluster.disconnect();
        window.close();
      };

      window.getWorkers = function(i) {
        return workers;
      };

    },
    done: function (err, window) {
      if (err != null) {
        console.log("ERROR: " + err);
      }
      debug("Window done");
      window.onModulesLoaded = function() {
        debug("Modules loaded");
        var scope = window.angular.element('#sidebarDrop').scope();
        scope.commandLineFile({'actualName': fname, 'file': data})
        scope.$apply();
      };

    }
  });*/
} else {
  debug("Worker spawned");
  require('./js/worker2.js')
}
