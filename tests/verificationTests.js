var node = true;

//console.log("Loading dependencies for verification");
var dependencies = ['../js/methods', '../js/workerMethods', '../js/templates', '../js/spectralLines', '../js/config', './test'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
var numberTestsPerSpectraPermutation = 100;
var numberTestsPerSpectraPermutationQuasar = 500;
var edgeThresh = 0.002;
var threshold = 1e-5;
var quasarThreshold = 2e-5;
var scale = 1e5;
var tests = new TestSuite("verification");

function getFakeDataScaffold(start, end, res) {
    start = defaultFor(start, 3000);
    end = defaultFor(end, 9000);
    res = defaultFor(res, 1.0);
    var data = {};
    data.processing = true;
    data.matching = true;
    data.node = true;
    data.lambda = range(start, end + 1e-7, res);
    data.intensity = null;
    data.variance = null;
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
        result.push(1);// + Math.sqrt(Math.abs(intensity[i]));
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


var templateManager = new TemplateManager();
templateManager.shiftToMatchSpectra();
var templates = templateManager.originalTemplates;



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
            var isQuasar = templateManager.isQuasar(t.id);
            var numm = isQuasar ? numberTestsPerSpectraPermutationQuasar : numberTestsPerSpectraPermutation;
            var zsPot = linearScale(t.z_start + edgeThresh, zend - edgeThresh, numm);
            for (var j = 0; j < zsPot.length; j++) {
                var z = zsPot[j];
                z = round(z, 5);
                zsPot[j] = z;
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
            this.setSuffix("    Mean deviation of (" +  (mean*scale).toFixed(3) + " ± " + (std*scale/Math.sqrt(numm)).toFixed(3) + ") x 10^5");
            return mean;
        }, i).setAbsoluteDeviation(thresh));
}




module.exports = tests;
