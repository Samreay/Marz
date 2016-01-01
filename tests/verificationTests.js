var node = true;

console.log("Loading dependencies for verification");
var dependencies = ['../js/methods', '../js/workerMethods', '../js/templates', '../js/spectralLines'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
console.log("Dependencies loaded\n");

/**
 * Generates a fake spectrum over the given wavelength range using exponential peaks
 * @param lambda
 * @param intensity
 * @param variance
 * @param features - array of wavelengths to produce features
 * @param weights - an array feature weights. Negative for absorption
 * @param width - characteristic width of feature. Set to large for quasar. Defaults to 5.0
 */
function generateFakeSpectrum(z, features, weights, width) {
    width = defaultFor(width, 5.0);
    // Vary width randomly to add variance in results
    width *= (Math.random() * 0.2) + 0.9;
    width *= (1 + z);
    var data = {};
    data.processing = true;
    data.matching = true;
    data.node = true;
    data.lambda = range(3500, 9000.1, 1);
    data.intensity = new Array(data.lambda.length);
    data.variance = new Array(data.lambda.length);
    for (var i = 0; i < data.intensity.length; i++) {
        data.intensity[i] = 0.0;
    }
    for (var i = 0; i < features.length; i++) {
        var f = features[i], w = weights[i];
        if (typeof f != "number") {
            f = spectralLines.getFromID(features[i]).wavelength
        }
        f *= (1 + z);
        var wa = w * (Math.random() * 0.5 + 0.75);
        for (var j = 0; j < data.lambda.length; j++) {
            data.intensity[j] += Math.exp(-Math.abs(data.lambda[j] - f) / width) * wa;
        }
    }
    for (var i = 0; i < data.intensity.length; i++) {
        data.intensity[i] += Math.random() - 0.5;
        data.variance[i] = Math.sqrt(Math.abs(data.intensity[i])) + 1;
    }
    return data;
}
/**
 * Want to test each template over a range of redshift values to ensure there is no systematic redshift bias.
 */
var numberTestsPerSpectra = 200;
var edgeThresh = 0.002;
var tests = [];



var templateManager = new TemplateManager(true);
var templates = templateManager.originalTemplates;
var spectralLines = new SpectralLines();

for (var i = 0; i < templates.length; i++) {
    var t = templates[i];
    var name = "Template (" + t.id + ") " + t.name + " systematic test. ";
    tests.push({name: name, expected: true, args: i, fn: function(i) {
        var t = templates[i];
        var received = [];
        var zs = [];
        var zend = t.z_end2 || t.z_end;

        var features = t.features;
        var weights = t.featureWeights;
        var inact = templateManager.getInactivesForSingleTemplateActive(t.id);
        for (var j = 0; j < numberTestsPerSpectra; j++) {
            var z = Math.random() * (zend - t.z_start - 2 * edgeThresh) + t.z_start + edgeThresh;
            zs.push(z);
            var width;
            if (t.id == '12') {
                width = 50;
            }
            var data = generateFakeSpectrum(z, features, weights);
            data.inactiveTemplates = inact;

            var res = handleEvent(data);
            received.push(res.results.coalesced[0].z);
        }
        var diff = [];
        for (var i = 0; i < zs.length; i++) {
            diff.push(zs[i] - received[i]);
        }
        var mean = getMean(diff);
        var std = getStdDev(diff);
        var ress = Math.abs(mean) < 2 * std && Math.abs(mean) < 1e-4;
        if (!ress) {
            console.log("\n\n\nc = numpy.array(" + JSON.stringify(zs, function(key, val) {
                    return val && val.toFixed ? Number(val.toFixed(6)) : val;
                }) + ")");
            console.log("d = np.array(" + JSON.stringify(diff, function(key, val) {
                    return val && val.toFixed ? Number(val.toFixed(6)) : val;
                }) + ")");
            console.log("plt.hist(d)");
            console.log("\t Difference in input vs determined redshift is " + mean.toFixed(5) + " pm " + std.toFixed(5));

        }
        return ress;
    }});
}

module.exports = tests;
