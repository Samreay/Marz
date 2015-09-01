args = process.argv.slice(2);
if (args.length > 2 || args.length == 0) {
  console.error("Usage: autoMarz.js [-debug] <FITSfilename> ");
  return;
}

var filename = args[0];
var debugFlag = false;
if (args.length == 2) {
  var filename = args[1];
  if (args[0] == "-debug") {
    debugFlag = true;
  }
}

var debug = function(output) {
  if (debugFlag) {
    console.log(output);
  }
};

var jsdom = require('jsdom');
var cluster = require('cluster');
var fs = require('fs');

if (cluster.isMaster) {
  n = require('os').cpus().length;
  workers = [];
  for (var i = 0; i < n; i++) {
    workers.push(cluster.fork());
  }
  var FileAPI = require('file-api'), File = FileAPI.File, FileList = FileAPI.FileList, FileReader = FileAPI.FileReader;


  var f = new File(filename);
  var data = fs.readFileSync(filename);


  var toArrayBuffer = function(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
  };


  debug("Processing file " + filename);
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

      window.nodeDebug = function(output) {
        debug(output);
      };

      window.convertBuffer = function(buffer) {
        return toArrayBuffer(buffer);
      };

      window.onFileMatched = function(values) {
        console.log(values);
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
        scope.commandLineFile({'actualName': filename, 'file': data})
        scope.$apply();
      };

    }
  });
} else {
  debug("Worker spawned");
  require('./js/worker2.js')
}
