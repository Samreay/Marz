/**
 * This file is responsible for data preprocessing. Extra preprocessing functions
 * should be added to this file, and the method calls added to the processData function.
 */
importScripts('tools.js', 'regression.js')

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
    console.log("rms is " + rms);
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

/**
 * Exploit javascripts passing by array references so return statements are not needed.
 */
function processData(intensity, variance, lambda) {
    removeBlanks(intensity, variance, 3);
    //TODO: This is a horrible way to remove outliers
    removeCosmicRay(intensity, variance, 20, 2);
    rollingPointMean(intensity, variance, 5, 0.8)
    polyFit(lambda, intensity, 5);

}

self.addEventListener('message', function(e) {
    var d = e.data;
    processData(d.intensity, d.variance, d.lambda)
    self.postMessage({'index': d.index, 'intensity': d.intensity, 'variance': d.variance})
}, false);

