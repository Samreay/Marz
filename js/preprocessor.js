/**
 * This file is responsible for data preprocessing. Extra preprocessing functions
 * should be added to this file, and the method calls added to the processData function.
 */
importScripts('tools.js', 'regression.js', 'templates.js')
var processed_temp = false;
var normalised_height = 100;

/** Subtracts a polydeg'th polynomial fitted to the data.
 * Used to remove continuum.
 *
 * @param lambda
 * @param intensity
 * @param polydeg
 */
function polyFit(lambda, intensity, polydeg) {
    var data = [];
    for (var i = 0; i < intensity.length; i++) {
        data.push([lambda[i], intensity[i]]);
    }
    var result = polynomial(data, polydeg).equation;
    for (var i = 0; i < intensity.length; i++) {
        var y = 0;
        for (var j = 0; j < result.length; j++) {
            y += result[j] * Math.pow(lambda[i], j);
        }
        intensity[i] -= y;
    }
}

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


//TODO: Make rolling point num config in settings
function rollingPointMean(intensity, variance, numPoints, falloff) {
    var rolling = 0;
    //var error = 0; //TODO: SCIENCE: Appropriate dealing with error. Max of 5, average, apply uncertainty calcs
    var d = [];
    var weights = [];
    var total = 0;
    for (var i = 0; i < 2*numPoints + 1; i++) {
        var w = Math.pow(falloff, Math.abs(numPoints - i));
        weights.push(w);
        total += w;
    }
    for (var i = 0; i < intensity.length; i++) {
        var c = 0;
        var r = 0;
        for (var j = i - numPoints; j <= i + numPoints; j++) {
            if (j> 0 && j < intensity.length) {
                r += intensity[j] * weights[c];
                c++;
            }
        }
        r = r / total;
        d.push(r);
    }
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = d[i];
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
    normalise(intensity, 0, normalised_height);
    convertVarianceToNumber(intensity, variance);
    polyFit(lambda, intensity, 5);

}
function normalise(array, bottom, top) {
    var min = 9e9;
    var max = -9e9;
    for (var j = 0; j < array.length; j++) {
        if (array[j] > max) {
            max = array[j];
        }
        if (array[j] < min) {
            min = array[j];
        }
    }
    for (var j = 0; j < array.length; j++) {
        array[j] = bottom + (top-bottom)*(array[j]-min)/(max-min);
    }
}
function normalise_templates() {
    for (var i = 0; i < templates.length; i++) {
        normalise(templates[i].spec, 0, normalised_height);
    }
    processed_temp = true;
}

//TODO: SCIENCE: ERROR WEIGHTING
function match(lambda, intensity, variance) {
    var index = -1;
    var zbest = null;
    var z = null;
    var chi2 = 9e19;
    var templateResults = [];
    for (var i = 0; i < templates.length; i++) {
        var chi2template = 9e19;
        var zbestTemplate = null;
        z = templates[i].z_start;
        var running = true;
        while (running) {
            var start = (1+z)*templates[i].start_lambda;
            var end = (1+z)*templates[i].end_lambda;
            var c = 0;
            var count = 0;
            for (var j = 0; j < intensity.length; j++) {
                var v1 = (lambda[j] - start)/(end - start);
                if (v1 <= 0 || v1 >= 1) {
                    continue;
                }
                count++;
                v1 = v1 * templates[i].spec.length;
                var w_bottom = 1 - (v1 - Math.floor(v1));
                var w_top = v1 - Math.floor(v1);
                var spec_n = w_bottom*templates[i].spec[Math.floor(v1)] + w_top*templates[i].spec[Math.ceil(v1)];
                var diff = Math.pow(Math.abs(spec_n - intensity[j]), 2);
                c += diff;
            }
            var dev = c / count;
            if (dev < chi2template) {
                chi2template = dev;
                zbestTemplate = z + templates[i].redshift;
            }
            //TODO: Make z inc actually one pixel
            z += 0.001;
            if (z > templates[i].z_end) {
                running = false;
            }
        }
        templateResults.push({index: i, chi2: chi2template, z: zbestTemplate});
    }
    for (var i = 0; i < templateResults.length; i++) {
        //console.log("Template " + templateResults[i].index + " (id " + templates[templateResults[i].index].id + ") best z of " + templateResults[i].z.toFixed(4) + " with chi2 of " + templateResults[i].chi2.toFixed(2));
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
    if (!processed_temp) {
        normalise_templates();
    }
    processData(d.intensity, d.variance, d.lambda)
    var results = match(d.lambda, d.intensity, d.variance);
    self.postMessage({'index': d.index, 'intensity': d.intensity, 'variance': d.variance, 'tIndex':results.index, 'z':results.z, 'chi2':results.chi2})
}, false);

