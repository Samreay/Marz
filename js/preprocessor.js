/**
 * This file is responsible for data preprocessing. Extra preprocessing functions
 * should be added to this file, and the method calls added to the processData function.
 */
importScripts('regression.js', 'tools.js', 'templates.js')
var templateManager = new TemplateManager();
//var processed_temp = false;

/**
 *  Removes cosmic rays from the data by removing any points more than 5 rms dev apart
 *
 * @param intensity
 * @param variance
 */
function removeCosmicRay(intensity, variance, factor, numPoints) {
    //TODO: SCIENCE: Actually do rms removal correctly. This is just wrong.
    var rms = 0;
    var mean = 0;
    for (var i = 0; i < intensity.length; i++) {
        mean += intensity[i];
    }
    mean = mean / intensity.length;
    for (var i = 0; i < intensity.length; i++) {
        rms += Math.pow(intensity[i] - mean, 2);
    }
    rms = rms / intensity.length;
    rms = Math.pow(rms, 0.5);
    for (var i = 0; i < intensity.length; i++) {
        if (Math.abs(intensity[i] - mean) > factor * rms) {
            var r = 0;
            var c = 0;
            for (var j = i - numPoints; j < (i + 1 + numPoints); j++) {
                if (j >= 0 && j < intensity.length && !isNaN(intensity[j])) {
                    c++;
                    r += intensity[j];
                }
            }
            if (c != 0) {
                r = r / c;
            }
            intensity[i] = 0;
            variance[i] = null;
        }
    }
}

/**
 * Replaces NaNs with an average over numPoints to either side.
 * Sets the variance to null so the point isnt counted.
 * @param intensity
 * @param variance
 * @param numPoints
 */
function removeBlanks(intensity, variance, numPoints) {
    for (var i = 0; i < intensity.length; i++) {
        if (isNaN(intensity[i])) {
            var r = 0;
            var c = 0;
            for (var j = i - numPoints; j < (i + 1 + numPoints); j++) {
                if (j >= 0 && j < intensity.length && !isNaN(intensity[j])) {
                    c++;
                    r += intensity[j];
                }
            }
            if (c != 0) {
                r = r / c;
            }
            intensity[i] = r;
            variance[i] = null;
        }
    }
}



function convertVarianceToPercent(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        variance[i] = variance[i] / intensity[i];
    }
}
function convertVarianceToNumber(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        variance[i] = variance[i] * intensity[i];
    }
}

/**
 * Exploit javascripts passing by array references so return statements are not needed.
 */
function processData(intensity, variance, lambda) {
    removeBlanks(intensity, variance, 3);
    //TODO: This is a horrible way to remove outliers
    removeCosmicRay(intensity, variance, 20, 2);
    rollingPointMean(intensity, variance, 2, 0.8)
    convertVarianceToPercent(intensity, variance);
    polyFitNormalise(lambda, intensity);
    convertVarianceToNumber(intensity, variance);

}

function getWeight(lambda, intensity) {
    var r = polyFit(lambda, intensity, polyDeg);
    var weights = [];
    for (var i = 0; i < intensity.length; i++) {
        weights.push(Math.abs((intensity[i] - r[i])));
    }
    return weights;
}

//TODO: SCIENCE: ERROR WEIGHTING
function match(lambda, intensity, variance, weights) {
    var index = -1;
    var zbest = null;
    var z = null;
    var chi2 = 9e19;
    var templateResults = [];
    for (var i = 0; i < templateManager.getAll().length; i++) {
        var chi2template = 9e19;
        var zbestTemplate = null;
        var template = templateManager.get(i);
        z = template.z_start;
        var running = true;
        while (running) {
            var start = (1+z)*template.start_lambda;
            var end = (1+z)*template.end_lambda;
            var c = 0;
            var count = 0;
            for (var j = 0; j < intensity.length; j++) {
                var v1 = (lambda[j] - start)/(end - start);
                if (v1 <= 0 || v1 >= 1) {
                    c += 50*Math.pow(Math.max(100,100-intensity[j]),2);
                    continue;
                }
                count++;
                v1 = v1 * (template.spec.length - 1);
                var w_bottom = 1 - (v1 - Math.floor(v1));
                var w_top = v1 - Math.floor(v1);
                var spec_n = w_bottom*template.spec[Math.floor(v1)] + w_top*template.spec[Math.ceil(v1)];
                var diff = Math.pow(Math.abs(spec_n - intensity[j]), 2) * weights[j];
                c += diff;
                if (c > chi2template) {
                    break;
                }
            }
//            var dev = c / count;
            var dev = c;
            if (dev < chi2template) {
                chi2template = dev;
                zbestTemplate = z + template.redshift;
            }
            //TODO: Make z inc actually one pixel
            z += 0.0002;
            if (z > template.z_end) {
                running = false;
            }
        }
        templateResults.push({index: i, chi2: chi2template, z: zbestTemplate});
    }
    for (var i = 0; i < templateResults.length; i++) {
        console.log("Template " + templateResults[i].index + " (id " + templateManager.get(templateResults[i].index).id + ") best z of " + templateResults[i].z.toFixed(4) + " with chi2 of " + templateResults[i].chi2.toFixed(2));
        if (templateResults[i].chi2 < chi2) {
            chi2 = templateResults[i].chi2;
            zbest = templateResults[i].z;
            index = templateResults[i].index;
        }
    }
    return {'index': index, 'z': zbest, 'chi2':chi2};
}

self.addEventListener('message', function(e) {
    var d = e.data;
    processData(d.intensity, d.variance, d.lambda)
    var results = match(d.lambda, d.intensity, d.variance, getWeight(d.lambda, d.intensity));
    self.postMessage({'index': d.index, 'processedIntensity': d.intensity, 'processedVariance': d.variance, 'templateIndex':results.index, 'templateZ':results.z, 'templateChi2':results.chi2})
}, false);

