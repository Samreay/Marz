var node = true;

//console.log("Loading dependencies for verification");
var dependencies = ['../js/methods', '../js/workerMethods', '../js/templates', '../js/spectralLines', '../js/config', './test'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
//console.log("Dependencies loaded\n");
var templateManager = new TemplateManager();
templateManager.shiftToMatchSpectra();
var templates = templateManager.originalTemplates;
var spectralLines = new SpectralLines();
var numberTestsPerSpectraPermutation = 100;
var numberTestsPerSpectra = 100;
var edgeThresh = 0.002;
var threshold = 1e-5;
var quasarThreshold = 2e-5;
var scale = 1e5;
var tests = new TestSuite("verification");

function getFakeDataScaffold() {
    var data = {};
    data.processing = true;
    data.matching = true;
    data.node = true;
    data.lambda = range(3000, 9000.1, 1);
    data.intensity = null;
    data.variance = null;
    return data;
}

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
    width = defaultFor(width, 3.0);
    // Vary width randomly to add variance in results
    width *= (Math.random() * 0.2) + 0.9;
    width *= (1 + z);
    var data = getFakeDataScaffold();
    data.intensity = [];
    for (var i = 0; i < data.lambda.length; i++) {
        data.intensity.push(0.0);
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
    addUniformNoise(data.intensity);
    data.variance = getVarianceBasedOffIntensity(data.intensity);
    return data;
}

/**
 * Returns a mock variance array calculated as 1 + sqrt(intensity)
 *
 * @param intensity
 * @returns {number[]}
 */
function getVarianceBasedOffIntensity(intensity) {
    var result = [];
    for (var i = 0; i < intensity.length; i++) {
        result.push(1) + Math.sqrt(Math.abs(intensity[i]));
    }
    return result;
}

/**
 * Adds uniform noise of height {{weight}}, centered around zero, onto data (in place).
 *
 * @param data
 * @param weight [defaults to 1]
 */
function addUniformNoise(data, weight) {
    weight = defaultFor(weight, 1);
    for (var i = 0; i < data.length; i++) {
        data[i] += (weight / 2) + Math.random() * weight;
    }
}


/**
 * Want to test that matches against template redshift permutations do not show signs of
 * any systematic issues from the data processing and matching algorithm
 */

for (var i = 0; i < templates.length; i++) {
    var t = templates[i];
    var name = "Template (" + t.id + ") " + t.name + " systematic permutation test";
    var thresh = templateManager.isQuasar(t.id) ? quasarThreshold : threshold;
    tests.addTest(new Test(name,
        function (i) {
            var t = templates[i];
            var received = [];
            var zs = [];
            var zend = t.z_end2 || t.z_end;

            var inact = templateManager.getInactivesForSingleTemplateActive(t.id);
            var zsPot = linearScale(t.z_start + edgeThresh, zend - edgeThresh, numberTestsPerSpectraPermutation);
            for (var j = 0; j < zsPot.length; j++) {
                var z = zsPot[j];
                var data = getFakeDataScaffold();
                data.inactiveTemplates = inact;
                var temp = templateManager.getTemplate(t.id, z, true);

                data.intensity = interpolate(data.lambda, temp[0], temp[1]);
                data.variance = getVarianceBasedOffIntensity(data.intensity);

                var res = handleEvent(data);

                var resZ = res.results.coalesced[0].z;

                if (Math.abs(resZ - z) < 2e-3) {
                    zs.push(z);
                    received.push(resZ);
                }
            }
            var diff = [];
            for (var i = 0; i < zs.length; i++) {
                diff.push(zs[i] - received[i]);
            }
            var mean = getMean(diff);
            var std = getStdDev(diff);
            if (false) {
                console.log("\n\n\nc = numpy.array(" + JSON.stringify(zs, function (key, val) {
                        return val && val.toFixed ? Number(val.toFixed(7)) : val;
                    }) + ")");
                console.log("d = np.array(" + JSON.stringify(diff, function (key, val) {
                        return val && val.toFixed ? Number(val.toFixed(7)) : val;
                    }) + ")");
                console.log("plt.hist(d)\nplt.figure()");
                console.log("plt.plot(c,d,'b.')");
            }
            this.setSuffix("Mean deviation of (" +  (mean*scale).toFixed(3) + " ± " + (std*scale/Math.sqrt(numberTestsPerSpectraPermutation)).toFixed(3) + ") x 10^5");
            return mean;
        }, i).setAbsoluteDeviation(thresh));
}



/**
 * Want to test each template over a range of redshift values to ensure there is no systematic redshift bias,
 * this time by generating the features themselves.
 *
 * Disabled because it is not working.
 */
/*
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
            var width;
            if (t.quasar) {
                width = 100;
            }
            var data = generateFakeSpectrum(z, features, weights);
            data.inactiveTemplates = inact;

            var res = handleEvent(data);
            var resZ = res.results.coalesced[0].z;
            if (Math.abs(resZ - z) < 2e-3) {
                zs.push(z);
                received.push(resZ);
            }
        }
        var diff = [];
        for (var i = 0; i < zs.length; i++) {
            diff.push(zs[i] - received[i]);
        }
        var mean = getMean(diff);
        var std = getStdDev(diff);
        var ress = Math.abs(mean) < threshold;
        if (!ress) {
            console.log("\n\n\nf = numpy.array(" + JSON.stringify(zs, function(key, val) {
                    return val && val.toFixed ? Number(val.toFixed(6)) : val;
                }) + ")");
            console.log("g = np.array(" + JSON.stringify(diff, function(key, val) {
                    return val && val.toFixed ? Number(val.toFixed(6)) : val;
                }) + ")");
            console.log("plt.hist(g)\nplt.figure()");
            console.log("plt.plot(f,g,'b.')")
            console.log("\t Difference in input vs determined redshift is " + mean.toFixed(5) + " pm " + std.toFixed(5));

        }
        return ress;
    }});
}
*/

module.exports = tests;
