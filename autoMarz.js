args = process.argv.slice(2);
if (args.length > 1 || args.length == 0) {
  console.error("Usage: autoMarz.js <FITSfilename>");
  return;
}
filename = args[0];

var jsdom = require('jsdom');
var cluster = require('cluster');
var fs = require('fs');
//var fs = require('fs')

if (cluster.isMaster) {
  n = require('os').cpus().length;
  workers = [];
  for (var i = 0; i < n; i++) {
    workers.push(cluster.fork());
  }
  var FileAPI = require('file-api'), File = FileAPI.File, FileList = FileAPI.FileList, FileReader = FileAPI.FileReader;


  var f = new File(filename);
  var data = fs.readFileSync(filename);
  var aa = data.slice(0, 100)
  console.log(data.byteLength);

  // fileReader = new FileReader()
  //fileReader.setNodeChunkedEncoding(true || false);
  // fileReader.readAsDataURL(f);

  // fileReader.on('data', function (data) {
  //   console.log("chunkSize:", data.length);
  // });
  //
  // // `onload` as listener
  // fileReader.addEventListener('load', function (ev) {
  //   console.log("dataUrlSize:", ev.target.result.length);
  // });
  //
  // // `onloadend` as property
  // fileReader.onloadend = function () {
  //   console.log("Success");
  // };
  //var html = fs.readFileSync('index.html', 'utf8');
  //var fitsFile = fs.readFileSync(filename);
  //console.log(fitsFile);
  var toArrayBuffer = function(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
  }


  console.log("Processing file " + filename);
  jsdom.env({
    file: 'index.html',
    features : {
          FetchExternalResources : ["script", "frame", "iframe", "link"],
          ProcessExternalResources : ['script']
    },
    created: function(err, window) {
      //window.XMLHttpRequest = XMLHttpRequest;
      window.require = require;
      window.File = File;
      window.FileReader = FileReader;
      window.convertBuffer = function(buffer) {
        console.log("Got buffer of length: " + buffer.length);
        var b = toArrayBuffer(buffer);
        console.log(b)
        return b;
      };
      window.onFileMatched = function(values) {
        console.log(values);
      };
      window.getWorkers = function(i) {
        return workers;
      };
    },
    done: function (err, window) {
      if (err != null) {
        console.log("ERROR: " + err);
      }

      window.onModulesLoaded = function() {
        console.log("Modules loaded");
        // console.log(scope.addFiles)
        //console.log(window.angular)
        //var scope = window.angular.element('[ng-contoller=SidebarController]').scope();
        // console.log(window.document.documentElement.innerHTML);
        var scope = window.angular.element('#sidebarDrop').scope();
        //console.log(scope);
        //console.log(JSON.stringify(f))
        console.log(scope.commandLineFile({'actualName': filename, 'file': data}));

        scope.$apply();

        //scope.addFiles([{name: filename}]);
        //scope.$apply();

        //console.log("Sent in fits file");
      };

    }
  });
} else {
  //eval(fs.readFileSync('./js/worker2.js') + '');
  require('./js/worker2.js')
}
