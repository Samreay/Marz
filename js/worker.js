importScripts('../lib/regression.js', 'tools.js', 'methods.js', 'templates.js')
var templateManager = new TemplateManager();
var self = this;




self.processData = function(lambda, intensity, variance) {
    removeBlanks(intensity, variance, 3);
    removeCosmicRay(intensity, variance, 4, 2, 2);
    rollingPointMean(intensity, variance, 4, 0.85);
    subtractPolyFit(lambda, intensity);
    normaliseViaArea(intensity, variance);
    convertLambdaToLogLambda(lambda, intensity, variance);

};

self.process = function(data) {
    self.processData(data.lambda, data.intensity, data.variance);
    return data;
};
self.match = function(data) {
    return false;
};
self.addEventListener('message', function(event) {

    var data = event.data;
    var result = null;
    if (data.processing) {
        self.process(data);
        result = data;
    } else {
        result = self.match(data);
    }
    self.postMessage(result);
});