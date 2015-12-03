importScripts('../lib/regression.js', '../lib/math.js', 'tools.js', 'spectralLines.js', 'methods.js', 'helio.js', 'templates.js', 'classes.js', '../lib/dsp.js', 'config.js', 'workerMethods.js');

node = false;

/**
 * We need to add an event listener that listens for processing requests from the ProcessorService
 */
self.addEventListener('message', function(event) {
    var data = event.data;
    var result = handleEvent(data);
    self.postMessage(result);
});
