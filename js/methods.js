var normalised_height = 1000;
var normalised_area = 100000;
var polyDeg = 6;
var max_error = 1e6;

function convertVacuumFromAir(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        lambda[i] = lambda[i] * (1 + 2.735192e-4 + (131.4182/Math.pow(lambda[i], 2)) + (2.76249E8 /Math.pow(lambda[i], 4)));
    }
}
function convertVacuumFromAirWithLogLambda(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        var l = Math.pow(10, lambda[i]);
        lambda[i] = Math.log(l * (1 + 2.735192e-4 + (131.4182/Math.pow(l, 2)) + (2.76249E8 /Math.pow(l, 4))))/Math.LN10;
    }
}
/**
 * Converts the equispaced linear scale of the given lambda into an equispaced log scale.
 * Interpolates intensity and variance to this new scale.
 *
 * @param lambda
 * @param intensity
 * @param variance
 */
function convertLambdaToLogLambda(lambda, intensity, variance) {
    var logLambda = linearScale(Math.log(lambda[0])/Math.LN10, Math.log(lambda[lambda.length - 1])/Math.LN10, lambda.length);
    var rescale = logLambda.map(function(x) { return Math.pow(10, x);});
    var newIntensity = interpolate(rescale, lambda, intensity);
    if (variance != null) {
        var newVariance = interpolate(rescale, lambda, variance);
    }
    for (var i = 0; i < intensity.length; i++) {
        lambda[i] = logLambda[i];
        intensity[i] = newIntensity[i];
        if (variance != null) {
            variance[i] = newVariance[i];
            if (variance[i] == 0) {
                variance[i] = max_error;
            }
        }
    }
}
function normaliseViaArea(array, variance, val) {
    var a = val == null ? normalised_area : val;
    var area = getAreaInArray(array, 0, array.length - 1);
    if (area == 0) return;
    var r = a / area;
    for (var j = 0; j < array.length; j++) {
        array[j] = array[j] * r;
        if (variance != null) {
            variance[j] = variance[j] * r;
        }
    }
}
function normaliseViaShift(array, bottom, top, optional) {
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
    var r = (top-bottom)/(max-min);
    for (var j = 0; j < array.length; j++) {
        var newVal = bottom + r*(array[j]-min);
        if (optional != null) {
            optional[j] = bottom + r*(optional[j]- min);
        }
        array[j] = newVal;
    }
}
function removeNaNs(y) {
    for (var i = 0; i < y.length; i++) {
        if (isNaN(y[i])) {
            if (i == 0) {
                y[i] = 0;
            } else {
                y[i] = y[i - 1];
            }
        }
    }
}
function cropSky(array, maxValue) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] > maxValue) {
            array[i] = maxValue;
        }
    }
}
function getAverage(array) {
    var sum = 0;
    for (var i = 0; i < array.length; i++) {
        sum += array[i];
    }
    return sum / array.length;
}

/**
 * Returns the area in an array subsection
 *
 * @param array to read through
 * @param start start index
 * @param end INCLUSIVE end index
 */
function getAreaInArray(array, start, end) {
    var area = 0;
    if (start == null || start < 0) start = 0;
    if (end == null) {
        end = array.length - 1;
    } else if (end > array.length) {
        end = array.length - 1;
    }
    for (var i = start; i <= end; i++) {
        area += Math.abs(array[i]);
    }
    return area;
}

function linearScale(start, end, num) {
    var result = [];
    for (var i = 0; i < num; i++) {
        var w0 = 1 - (i/(num-1));
        var w1 = 1 - w0;
        result.push(start*w0 + end*w1);
    }
    return result;
}
function linearScaleFactor(start, end, redshift, num) {
    return linearScale(start*(1+redshift), end*(1+redshift), num);
}

function interpolate(xinterp, xvals, yvals) {
    if (xinterp == null || xinterp.length < 2) {
        console.log("Don't use interpolate on a null, empty or single element array");
        return null;
    }
    var start_x = null;
    var end_x = null;
    var xval_start_index = null;
    var xval_end_index = null;
    var result = [];
    for (var i = 0; i < xinterp.length; i++) {
        start_x = i == 0 ? null : (xinterp[i] + xinterp[i - 1]) / 2;
        end_x = i == xinterp.length - 1 ? null : (xinterp[i + 1] + xinterp[i]) / 2;
        if (start_x == null) {
            start_x = 2 * xinterp[i] - end_x;
        }
        if (end_x == null) {
            end_x = 2 * xinterp[i] - start_x;
        }
        // If we have done the previous step, just move to next (touching) block to avg
        if (xval_end_index != null) {
            xval_start_index = xval_end_index;
        } else {
            xval_start_index = findCorrespondingFloatIndex(xvals, start_x);
        }
        xval_end_index = findCorrespondingFloatIndex(xvals, end_x, Math.floor(xval_start_index));
        result.push(getAvgBetween(yvals, xval_start_index, xval_end_index));
    }
    return result;
}

function findCorrespondingFloatIndex(xs, x, optionalStartIndex) {
    var s = optionalStartIndex;
    if (s == null) s = 0;
    for (var i = s; i < xs.length; i++) {
        if (xs[i] < x) {
            continue;
        } else {
            if (i == 0) return i;
            return (i - 1) + (x - xs[i - 1])/(xs[i] - xs[i - 1]);
        }
    }
}

function getAvgBetween(xvals, start, end) {
    var c = 0;
    var r = 0;
    for (var i = Math.floor(start); i <= Math.ceil(end); i++) {
        var weight = 1;
        if (i == Math.floor(start)) {
            weight = 1 - (start - Math.floor(i));
        } else if (i == Math.ceil(end)) {
            weight = 1 - (Math.ceil(end) - end)
        }
        r += weight * xvals[i];
        c += weight;
    }
    if (c == 0) {
        return 0;
    } else {
        return r / c;
    }
}

function subtractPolyFit(lambda, intensity) {
    var r = polyFit(lambda, intensity);
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = intensity[i] - r[i];
    }
}

function polyFit(lambda, intensity) {
    var data = [];
    var r = [];
    for (var i = 0; i < intensity.length; i++) {
        data.push([lambda[i], intensity[i]]);
    }
    var result = polynomial(data, polyDeg).equation;
    for (var i = 0; i < intensity.length; i++) {
        var y = 0;
        for (var j = 0; j < result.length; j++) {
            y += result[j] * Math.pow(lambda[i], j);
        }
        r.push(y);
    }
    return r;
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
            variance[i] = max_error;
        }
        if (isNaN(variance[i]) || Math.abs(variance[i]) > max_error || variance[i] <= 0) {
            variance[i] = max_error;
        }
    }
}

/**
 *  Removes cosmic rays from the data by removing any points more than 5 rms dev apart
 *
 * @param intensity
 * @param variance
 */
function removeCosmicRay(intensity, variance, factor, numPoints, numTimes) {
    for (var n = 0; n < numTimes; n++) {
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
            if (Math.abs(intensity[i] - mean) < factor * rms) {
                continue;
            }
            var maxNeighbour = 0;
            if (i > 0) {
                maxNeighbour = Math.abs(intensity[i - 1] - intensity[i]);
            }
            if (i < intensity.length - 1) {
                maxNeighbour = Math.max(maxNeighbour, Math.abs(intensity[i + 1] - intensity[i]));
            }
            if (maxNeighbour > factor * rms) {
                var r = 0;
                var c = 0;
                for (var j = i - numPoints; j < (i + 1 + numPoints); j++) {
                    if (j >= 0 && j < intensity.length && !isNaN(intensity[j]) && Math.abs(intensity[j]-mean) < rms) {
                        c++;
                        r += intensity[j];
                    }
                }
                if (c != 0) {
                    r = r / c;
                }
                intensity[i] = r;
                variance[i] = max_error;
            }
        }
    }
}

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