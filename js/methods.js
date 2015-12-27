var normalised_height = 1000;
var normalised_area = 100000;


/**
 * Converts a single wavelength in Angstroms from air to vacuum
 * @param lambda the wavelength to convert
 * @returns {number} the vacuum wavelength
 */
function convertSingleAirFromVacuum(lambda) {
    return lambda / (1 + 2.735192e-4 + (131.4182/Math.pow(lambda, 2)) + (2.76249E8 /Math.pow(lambda, 4)));
}

/**
 * In place converts an array of wavelengths (in Angstroms) from air wavelength
 * to vacuum wavelength
 *
 * @param lambda an array of wavelengths
 */
function convertAirFromVacuum(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        lambda[i] = convertSingleAirFromVacuum(lambda[i]);
    }
}
/**
 * In place converts an array of log (base 10) wavelengths (log(Angstroms)) from air wavelength
 * to vacuum wavelength
 *
 * @param lambda an array of log wavelengths
 */
function convertAirFromVacuumWithLogLambda(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        var l = Math.pow(10, lambda[i]);
        lambda[i] = Math.log(convertSingleAirFromVacuum(l))/Math.LN10;
    }
}

var vacuum = range(500, 10000, 0.1);
var air = vacuum.slice();
convertAirFromVacuum(air);

function convertSingleVacuumFromAir(lambda) {
    var indexes = binarySearch(air, lambda);
    if (indexes[0] == indexes[1]) {
        return vacuum[indexes[0]];
    } else {
        return vacuum[indexes[0]] + (vacuum[indexes[1]] - vacuum[indexes[0]]) * (lambda - air[indexes[0]]) / (air[indexes[1]] - air[indexes[0]]);
    }
}
function convertVacuumFromAir(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        lambda[i] = convertSingleVacuumFromAir(lambda[i]);
    }
}
function convertVacuumFromAirWithLogLambda(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        var l = Math.pow(10, lambda[i]);
        lambda[i] = Math.log(convertSingleVacuumFromAir(l))/Math.LN10;
    }
}

/**
 * Redshifts a singular wavelength
 * @param lambda the wavelength to redshift
 * @param z the redshift to apply
 * @returns {number} the redshifted wavelength
 */
function shiftWavelength(lambda, z) {
    return (1+z)*lambda;
}
/**
 * Converts the equispaced linear scale of the given lambda into an equispaced log scale.
 * Interpolates intensity and variance to this new scale.
 *
 * @param lambda
 * @param intensity
 */
function convertLambdaToLogLambda(lambda, intensity, numel, quasar) {
    if (typeof numel === 'undefined') numel = arraySize;
    var s = quasar ? startPowerQ : startPower;
    var e = quasar ? endPowerQ : endPower;
    var logLambda = linearScale(s, e, numel);
    var rescale = logLambda.map(function(x) { return Math.pow(10, x);});
    var newIntensity = interpolate(rescale, lambda, intensity);
    return {lambda: logLambda, intensity: newIntensity};
}

/**
 * Performs a fast smooth on the data via means of a rolling sum
 * @param y the array of values which to smooth
 * @param num the number of pixels either side to smooth (not the window size)
 * @returns {Array} the smoothed values
 */
function fastSmooth(y, num) {
    //TODO: LOOK AT THIS AGAIN, RESULTS FOR HIGH NUM SEEM WEIRD
    if (num == 0) {
        return y;
    }
    num += 1;
    var frac = 2*num + 1;
    // Remove NaNs
    for (var i = 0; i < y.length; i++) {
        if (isNaN(y[i])) {
            if (i == 0) {
                y[i] = 0;
            } else {
                y[i] = y[i - 1];
            }
        }
    }
    // Get initial sum
    var rolling = 0;
    for (var i = 0; i < num; i++) {
        rolling += y[i];
    }
    // Average it
    var d = [];
    for (var i = 0; i < y.length; i++) {
        if (i >= num) {
            rolling -= y[i - num];
        }
        if (i <= y.length - num) {
            rolling += y[i + num]
        }
        d.push(rolling / frac);
    }
    return d;
}

/**
 * Normalises a set of arrays containing x and y coordinates respectively such that the
 * returned result only contains elements between the bounds, and the y bounds are normalised
 * to the input height relative to a minimum value.
 *
 * @param xs
 * @param ys
 * @param xMin
 * @param xMax
 * @param yMin
 * @param height
 * @returns {{xs: Array, ys: Array}}
 */
function normaliseSection(xs, ys, xMin, xMax, yMin, height) {
    var xBounds = getXBounds(xs, xMin, xMax);
    var bounds = findMinAndMaxSubset(ys, xBounds.start, xBounds.end);
    var r = height/(bounds.max - bounds.min);
    var xss = xs.slice(xBounds.start, xBounds.end);
    var yss = ys.slice(xBounds.start, xBounds.end);
    for (var i = 0; i < yss.length; i++) {
        yss[i] = yMin + r * (yss[i] - bounds.min);
    }
    return {xs: xss, ys: yss};

}

/**
 * Takes an input array of x values and returns indexes corresponding to the first and last index
 * that has the x value within the specific bounds
 *
 * @param xs
 * @param xMin
 * @param xMax
 * @returns {{start: {Number}, end: {Number}}}
 */
function getXBounds(xs, xMin, xMax) {
    //TODO: Log time complexity should be easy to do here if ordered
    var start = null;
    var end = null;
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] > xMin && start == null) {
            start = i - 1;
        }
        if (xs[i] > xMax && end == null) {
            end = i + 1;
        }
    }
    if (start == null) {
        start = xs.length - 1;
    } else if (start < 0) {
        start = 0;
    }
    if (end == null) {
        end = xs.length;
    } else if (end < 0) {
        end = 0;
    }
    return {start: start, end: end};
}
/**
 * In place normalises the input array (and variance) such that the array
 * is a specific area in size, and returns the calculated normalisation ratio.
 * @param array
 * @param variance
 * @param val
 * @returns {number}
 */
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
    return r;
}
/**
 * In place scales an array to the scale factor given.
 * @param array
 * @param r
 */
function scale(array, r) {
    for (var i = 0; i < array.length; i++) {
        array[i] *= r;
    }
}
/**
 * In place adds the second array argument onto the first, such that the result of
 * the addition is found in the first array passed in.
 * @param original
 * @param addition
 */
function add(original, addition) {
    for (var i = 0; i < original.length; i++) {
        original[i] += addition[i];
    }
}

/**
 * Normalises an input array to fit between the bottom and top limits via applying a linear ratio.
 * An optional array can be passed in to the end that will also undergo normalisation to the same
 * ratio as the first array if it is specified.
 *
 * @param array
 * @param bottom
 * @param top
 * @param optional
 */
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
/**
 * Loops through an array to find the minimum and maximum values in it
 * @param array
 * @returns {{min: number, max: number}}
 */
function findMinAndMax(array) {
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
    return {min: min, max: max};
}
/**
 * Finds the minimum and maximum of an array between two index bounds
 *
 * @param xs
 * @param ys
 * @param start
 * @param end
 * @returns {{min: number, max: number}}
 */
function findMinAndMaxSubset(ys, start, end) {
    var min = 9e9;
    var max = -9e9;
    for (var j = start; j < end; j++) {
        if (ys[j] > max) {
            max = ys[j];
        }
        if (ys[j] < min) {
            min = ys[j];
        }
    }
    return {min: min, max: max};
}

/**
 * Iterates through an array and replaces NaNs with the value immediately prior to the NaN,
 * setting the first element to zero if it is NaN
 * @param y
 */
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
/**
 * In place crops an array to the maximum value specified.
 * @param array
 * @param maxValue
 */
function cropSky(array, maxValue) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] > maxValue) {
            array[i] = maxValue;
        }
    }
}
/**
 * Returns the average value in an array. Requires the array not contain NaNs.
 * @param array
 * @returns {number}
 */
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
/**
 * Creates a linear scale of num points between and start and an end number
 * @param start
 * @param end
 * @param num
 * @returns {Array}
 */
function linearScale(start, end, num) {
    var result = [];
    for (var i = 0; i < num; i++) {
        var w0 = 1 - (i/(num-1));
        var w1 = 1 - w0;
        result.push(start*w0 + end*w1);
    }
    return result;
}
/**
 * Returns a linear scale of num points between redshifted start and end values
 * @param start
 * @param end
 * @param redshift
 * @param num
 * @returns {Array}
 */
function linearScaleFactor(start, end, redshift, num) {
    return linearScale(start*(1+redshift), end*(1+redshift), num);
}
/**
 * Linearly interpolates a data set of xvals and yvals into the new x range found in xinterp.
 * The interpolated y vals are returned, not modified in place.
 *
 * Assumes both xvals and xinterp are sorted.
 *
 * This function will NOT interpolate to zero the interpolation values do not overlap
 * @param xinterp
 * @param xvals
 * @param yvals
 * @returns {Array} Array of interpolated y values
 */
function interpolate(xinterp, xvals, yvals) {
    var index = 0;
    var result = [];
    var diff = 0;
    var bottom = 0;
    for (var i = 0; i < xinterp.length; i++) {
        index = findCorrespondingFloatIndex(xvals, xinterp[i], bottom);
        bottom = Math.floor(index);
        diff = index - bottom;
        if (diff == 0) {
            result.push(yvals[bottom])
        } else {
            result.push((yvals[bottom + 1] - yvals[bottom]) * diff + yvals[bottom])
        }
    }
    return result;
}
function interpolate2(xinterp, xvals, yvals) {
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
/**
 * Helper function for the interpolation method, which locates a linearly interpolated
 * floating point index that corresponds to the position of value x inside array xs.
 * @param xs
 * @param x
 * @param optionalStartIndex
 * @returns {Number} the floating point effective index
 */
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
    return xs.length - 1;
}

/**
 * Returns the average value between a start and end index
 * @param xvals
 * @param start
 * @param end
 * @returns {number}
 */
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
/**
 * In place subtracts a polynomial fit (polynomial degree set in config.js as polyDeg),
 * and returns the array of values that form the polynomial
 * @param lambda
 * @param intensity
 * @returns {Array}
 */
function subtractPolyFit(lambda, intensity) {
    var r = polyFit(lambda, intensity);
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = intensity[i] - r[i];
    }
    return r;
}
/**
 * Calculates a polynomial fit to the input x and y data sets. Polynomial degree
 * set in config.js as polyDeg.
 * @param lambda
 * @param intensity
 * @returns {Array}
 */
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
 * Checks to see if the index is bad
 * @param intensity
 * @param variance
 * @param index
 */
function badIndex(intensity, variance, index) {
    var i = intensity[index];
    var v = variance[index];
    return isNaN(i) || isNaN(v) || i == null || v == null || i > maxVal || i < minVal || v <= 0;
}

/**
 * Inline replaces NaNs with zero values at the start and end of the spectra
 * @param intensity
 */
function zeroPadStartAndEnd(intensity, variance) {

    for (var i = 0; i < intensity.length; i++) {
        if (isNaN(intensity[i]) || intensity[i] == null) {
            intensity[i] = 0;
            variance[i] = 9e19;
        } else {
            break;
        }
    }
    for (var i = intensity.length - 1; i >= 0; i--) {
        if (isNaN(intensity[i]) || intensity[i] == null) {
            intensity[i] = 0;
            variance[i] = 9e19;
        } else {
            break;
        }
    }
}

/**
 * Replaces NaNs with an average over numPoints to either side.
 * Sets the variance to null so the point isn't counted.
 * @param intensity
 * @param variance
 * @param numPoints
 */
function removeBadPixels(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        if (badIndex(intensity, variance, i)) {
            var r = 0;
            var e = 0;
            var c = 0;
            for (var j = i - numPoints; j < (i + 1 + numPoints); j++) {
                if (j >= 0 && j < intensity.length && !badIndex(intensity, variance, j)) {
                    c++;
                    r += intensity[j];
                    e += variance[j];
                }
            }
            if (c != 0) {
                r = r / c;
                e = e / c;
            }
            intensity[i] = r;
            if (e == 0) {
                variance[i] = 9e19;
            } else {
                variance[i] = e;
            }
        }
    }
}

/**
 *  Removes cosmic rays from the data by removing any points more than 5 rms dev apart
 *
 * @param intensity
 * @param variance
 */
function removeCosmicRay(intensity, variance) {
    for (var n = 0; n < cosmicIterations; n++) {
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
            if (Math.abs(intensity[i] - mean) < deviationFactor * rms) {
                continue;
            }
            var maxNeighbour = 0;
            if (i > 1) {
                maxNeighbour = Math.abs(intensity[i - 2] - intensity[i]);
            }
            if (i < intensity.length - 2) {
                maxNeighbour = Math.max(maxNeighbour, Math.abs(intensity[i + 2] - intensity[i]));
            }
            if (maxNeighbour > deviationFactor * rms) {
                var r = 0;
                var c = 0;
                for (var j = i - 2*numPoints; j < (i + 1 + 2*numPoints); j++) {
                    if (j >= 0 && j < intensity.length && Math.abs(intensity[j]-mean) < rms) {
                        c++;
                        r += intensity[j];
                    }
                }
                if (c != 0) {
                    r = r / c;
                }
                for (var k = i-numPoints; k < i+numPoints + 1; k++) {
                    if (k > 0 && k < (intensity.length - 1)) {
                        intensity[k] = r;
                        variance[k] = max_error;
                    }

                }
            }
        }
    }
}

/**
 * Convolves the intensity array with an exponential falloff window
 * to produce a rolling mean which mostly preserves peak location.
 *
 * Does not modify arrays in place.
 *
 * @param intensity
 * @param numPoints
 * @param falloff
 * @returns {Array}
 */
function rollingPointMean(intensity, numPoints, falloff) {
    var d = new Array(intensity.length);
    var weights = [];
    var total = 0;
    var i = 0;
    for (i = 0; i < 2*numPoints + 1; i++) {
        var w = Math.pow(falloff, Math.abs(numPoints - i));
        weights.push(w);
        total += w;
    }
    for (i = 0; i < weights.length; i++) {
        weights[i|0] /= total;
    }
    var intLength = intensity.length, r = 0, c = 0;
    for (i = 0; i < intLength; i++) {
        c = 0;
        r = 0;
        for (var j = i - numPoints; j <= i + numPoints; j++) {
            if (j > 0 && j < intLength) {
                r += intensity[j|0] * weights[c|0];
                c++;
            }
        }
        d[i] = r;
    }
    return d;
}
function getMean(data, mask) {
    var r = 0, i = 0;
    for (i = 0; i < data.length; i++) {
        r += data[i|0];
    }
    return r / data.length;
}
function getMeanMask(data, mask) {
    var c = 0, r = 0, i = 0, dataLength = data.length;
    for (i = 0; i < dataLength; i++) {
        if (mask[i|0]) {
            r += data[i|0];
            c++;
        }
    }
    return r / c;
}
/**
 * Returns the RMS of {{data - subtract}}, without modifying either
 * data or subtract
 *
 * @param data
 * @param subtract
 * @returns {number}
 */
function stdDevSubtract(data, subtract) {
    var subtracted = new Array(data.length), dataLength = data.length;
    for (var i = 0; i < dataLength; i++) {
        subtracted[i|0] = data[i|0] - subtract[i|0];
    }
    return getStdDev(subtracted);
}
function getNewSubtract(data, subtract) {
    var subtracted = new Array(data.length), dataLength = data.length;
    for (var i = 0; i < dataLength; i++) {
        subtracted[i|0] = data[i|0] - subtract[i|0];
    }
    return subtracted;
}
/**
 * Perform a rejected polynomial fit to the data. In place modified intensity to subtract the
 * polyfit, and returns the polyfit itself.
 * @param lambda
 * @param intensity
 */
function polyFitReject(lambda, intensity, interactions, threshold, polyDegree) {
    interactions = defaultFor(interactions, polyFitInteractions);
    threshold = defaultFor(threshold, polyFitRejectDeviation);
    polyDegree = defaultFor(polyDegree, polyDeg);

    var intLength = intensity.length, mask = new Array(intLength), i = 0, j = 0, cutoff = 0, stdDev = 0;
    for (i = 0; i < intLength; i++) {
        mask[i|0] = 1;
    }
    for (i = 0; i < interactions; i++) {
        var fit = polynomial3(lambda, intensity, polyDegree, mask);
        var subtracted = getNewSubtract(intensity, fit.points);
        stdDev = getStdDevMask(subtracted, mask);
        cutoff = stdDev * threshold;
        var c = true;
        for (j = 0; j < intLength; j++) {
            if (mask[j|0] && Math.abs(subtracted[j|0]) > cutoff) {
                mask[j|0] = 0;
                c = false;
            }
        }
        if (c) {
            break;
        }
    }
    for (i = 0; i < intLength; i++) {
        intensity[i] = subtracted[i];
    }
    return fit.points;
}
function subtract(data, subtract) {
    for (var i = 0; i < data.length; i++) {
        data[i] -= subtract[i];
    }
}
function add(data, add) {
    for (var i = 0; i < data.length; i++) {
        data[i] += add[i];
    }
}
function addConstant(data, add) {
    for (var i = 0; i < data.length; i++) {
        data[i] += add;
    }
}

function addMinMultiple(data, multiple) {
    var min = getMin(data);
    addConstant(data, min * multiple);
}
function medianAndBoxcarSmooth(array, medianFilterWidth, boxCarWidth) {
    var medians = medianFilter(array, medianFilterWidth);
    var smoothed = boxCarSmooth(medians, boxCarWidth);
    return smoothed;
}
function smoothAndSubtract(intensity) {
    var medians = medianFilter(intensity, medianWidth);
    var smoothed = boxCarSmooth(medians, smoothWidth);
    subtract(intensity, smoothed);
}

function applySpectralLineWeighting(lambda, spec) {
    var spectralLines = new SpectralLines();
    var lines = spectralLines.getAll();
    var weights = [];
    for (var i = 0; i < lambda.length; i++) {
        weights.push(baseWeight);
    }
    for (var j = 0; j < lines.length; j++) {
        for (var k = 0; k < weights.length; k++) {
            weights[k] += Math.exp(-1*Math.pow(lambda[k] - lines[j].logWavelength, 2) / gaussianWidth);
        }
    }

    for (var m = 0; m < spec.length; m++) {
        spec[m] *= Math.min(1, weights[m]);
    }

}
function getList(linkedList) {
    var r = [];
    linkedList = linkedList[0];
    do {
        r.push(linkedList[1]);
        linkedList = linkedList[0];
    } while (linkedList != null);
    return r;
}
function addToSorted(head, value) {
    var current = head;
    while(current[0] != null && current[0][1] < value) {
        current = current[0];
    }
    current[0] = [current[0], value];

}
function addAllToSorted(head, values) {
    for (var i = 0; i < values.length; i++) {
        addToSorted(head, values[i]);
    }
}
function removeAddAndFindMedian(head, remove, add, median) {
    var c = 0;
    var previous = head;
    var current = head[0];
    var r = false, m = false, a = false, result = null;
    while (true) {
        if (!r && current[1] == remove) {
            previous[0] = current[0];
            current = current[0];
            r = true;
        }
        if (!a && current == null) {
            current = [null, add];
            previous[0] = current;
            a = true;

        }
        if (!a && (current[1] > add)) {
            var temp = [previous[0], add];
            previous[0] = temp;
            current = temp;
            a = true;
        }
        if (!m && c == median) {
            result = current[1];
            m = true;
        }
        if (a && r && m) {
            return result;
        }
        c++;
        previous = current;
        current = current[0];
    }
}

function medianFilter(data, window) {
    var result = [], i = 0;
    var head = [null, null];
    var n = (window - 1) / 2;

    for (i = 0; i < n + 1; i++) {
        addToSorted(head, data[0]);
    }
    for (i = 0; i < n; i++ ) {
        addToSorted(head, data[i|0]);
    }
    var add = 0;
    var remove = 0;
    var dataLength = data.length;
    for (i = 0; i < dataLength; i++) {
        remove = i < (n + 1) ? data[0] : data[(i - n - 1)|0];
        add = i + n >= dataLength ? data[dataLength - 1] : data[(i + n)|0];
        result.push(removeAddAndFindMedian(head, remove, add, n));
    }
    return result;
}
function boxCarSmooth(data, window) {
    var result = [];
    var num = (window - 1)/2;
    var r = 1 / window;
    var tot = 0, i = 0, i1 = 0, i2 = 0, dataLength = data.length, dlmo = dataLength - 1;;
    for (i = 0; i < num + 1; i++) {
        tot += data[0] * r;
    }
    for (i = 0; i < num; i++) {
        tot += data[i] * r;
    }
    for (i = 0; i < dataLength; i++) {
        i1 = i - num - 1;
        i2 = i + num;
        if (i1 < 0) {
            i1 = 0;
        }
        if (i2 > dlmo) {
            i2 = dlmo;
        }
        tot += (data[i2|0] - data[i1|0]) * r;
        result.push(tot);
    }
    return result;
}
/**
 * Applies a cosine taper onto both ends of the given data array.
 *
 * Modifies the array in place.
 *
 * @param intensity
 * @param zeroPixelWidth
 * @param taperWidth
 */
function cosineTaper(intensity, zeroPixelWidth, taperWidth) {
    for (var i = 0; i < zeroPixelWidth; i++) {
        var inverse = intensity.length - 1 - i;
        intensity[i] = 0;
        intensity[inverse] = 0;
    }
    var frac = 0.5 * Math.PI / taperWidth;
    for (var i = 0; i < taperWidth; i++) {
        var inverse = intensity.length - 1 - i;
        var rad = i * frac;
        intensity[i + zeroPixelWidth] *= Math.sin(rad);
        intensity[inverse - zeroPixelWidth] *= Math.sin(rad);
    }
}

function taperSpectra(intensity) {
    cosineTaper(intensity, zeroPixelWidth, taperWidth);
}
function broadenError(data) {
    var result = [];
    var prior = data[0];
    var current = data[0];
    var next = data[1];
    var i = 0, dataLength = data.length;
    for (i = 0; i < dataLength; i++) {
        if (i < dataLength - 1) {
            next = data[(i+1)|0];
        } else {
            next = data[(dataLength - 1)|0];
        }
        current = data[i|0];
        if (current < prior) {
            current = prior;
        }
        if (current < next) {
            current = next;
        }
        result.push(current);
        prior = data[i];
    }
    for (i = 0; i < dataLength; i++) {
        data[i|0] = result[i|0];
    }
}
function maxMedianAdjust(data, window, errorMedianWeight) {
    var result = [];
    var win = [];
    var num = (window - 1)/2;
    for (var i = 0; i < data.length; i++) {
        if (data[i] < max_error) {
            while (win.length < num + 2) {
                win.push(data[i]);
            }
            break;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (win.length < window) {
            if (data[i] < max_error) {
                win.push(data[i]);
            }
        } else {
            break;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i] < max_error) {
            var index = i + num;
            while (index < data.length && data[index] >= max_error) {
                index++;
            }
            if (index >= data.length) {
                win.push(win[win.length - 1]);
            } else {
                win.push(data[index]);
            }
            win.splice(0, 1);
            result.push(errorMedianWeight * win.slice().sort(function(a,b){return a-b;})[num]);
        } else {
            result.push(data[i]);
        }
    }
    for (var i = 0; i < result.length; i++) {
        data[i] = result[i];
    }
    for (var i = 0; i < data.length; i++) {
        if (result[i] > data[i]) {
            data[i] = result[i];
        }
    }
}
function maxMedianAdjust2(data, window, errorMedianWeight) {
    var medians = medianFilter(data, window);
    var dataLength = data.length, i = 0, val = 0.0;
    for (i = 0; i < dataLength; i++) {
        val = errorMedianWeight * medians[i|0];
        if (data[i|0] < val) {
            data[i|0] = val;
        }
    }
}



function adjustError(variance) {
    for (var i = 0; i < variance.length; i++) {
        variance[i] = Math.sqrt(variance[i]);
    }
    broadenError(variance);
    maxMedianAdjust(variance, errorMedianWindow, errorMedianWeight);
    for (i = 0; i < variance.length; i++) {
        variance[i] = variance[i] * variance[i];
    }
}

function divideByError(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = intensity[i] / variance[i];
    }
}
function findMean(data) {
    var result = 0;
    for (var i = 0; i < data.length; i++) {
        result += data[i];
    }
    return result / data.length;
}
/**
 * Returns the mean of the absolute of the input
 * @param data
 * @returns {number}
 */
function absMean(data) {
    var running = 0, dataLength = data.length, i = 0;
    for (i = 0; i < dataLength; i++) {
        if (data[i|0] < 0) {
            running -= data[i|0];
        } else {
            running += data[i|0];
        }
    }
    return running / dataLength;
}
/**
 * Returns the maximum value of the absolute of the input.
 * @param data
 * @returns {number}
 */
function absMax(data) {
    var max = 0, dataLength = data.length;
    for (var i = 0; i < dataLength; i++) {
        if (data[i|0] < 0 && -data[i|0] > max) {
            max = -data[i|0];
        } else if (data[i|0] > 0 && data[i|0] > max) {
            max = data[i|0];
        }
    }
    return max;
}
function normaliseMeanDev(intensity, clipValue) {
    var running = true, intLength = intensity.length, i = 0;
    while (running) {
        var meanDeviation = absMean(intensity);
        var clipVal = (clipValue + 0.01) * meanDeviation;
        if (absMax(intensity) > clipVal) {
            for (i = 0; i < intLength; i++) {
                if (intensity[i|0] > clipVal) {
                    intensity[i|0] = clipVal;
                } else if (intensity[i|0] < -clipVal) {
                    intensity[i|0] = -clipVal;
                }
            }
        } else {
            running = false;
        }
    }
    for (i = 0; i < intLength; i++) {
        intensity[i|0] /= meanDeviation;
    }
}

function normalise(intensity) {
    normaliseMeanDev(intensity, clipValue);
}
function circShift(data, num) {
    var temp = data.slice();
    var l = data.length;
    for (var i = 0; i < l; i++) {
        data[i] = temp[(i + num) % l];
    }
}

function pruneResults(final, template) {
    return final.slice(template.startZIndex, template.endZIndex);
}
function pruneResults2(final, template) {
    return final.slice(0, final.length - (template.endZIndex - template.endZIndex2));
}
function subtractMeanReject(final, trimAmount) {
    var num = Math.floor((trimAmount * final.length)/2);
    var sorted = final.slice().sort(function(a,b) { return a-b });
    sorted = sorted.splice(num, sorted.length - (2*num));
    var mean = findMean(sorted);
    for (var i = 0; i < final.length; i++) {
        final[i] -= mean;
    }
}
function getPeaks(final, both) {
    if (typeof both === 'undefined') both = true;
    var is = [];
    var vals = [];
    for (var i = 2; i < final.length - 2; i++) {
        if (final[i] >= final[i + 1] && final[i] >= final[i+2] && final[i] > final[i - 1] && final[i] > final[i - 2]) {
            vals.push(final[i]);
            is.push(i);
        } else if (both && (final[i] <= final[i + 1] && final[i] <= final[i+2] && final[i] < final[i - 1] && final[i] < final[i - 2])) {
            vals.push(final[i]);
            is.push(i);
        }
    }
    return {index: is, value: vals};
}
/**
 * In place caps all values in data to within 30 standard deviations of the mean
 *
 * @param data
 */
function cullLines(data) {
    var std = getStdDev(data);
    var mean = getMean(data);
    var maxV = mean + 30 * std;
    var minV = mean - 30 * std;
    var dataLength = data.length;
    for (var i = 0; i < dataLength; i++) {
        if (data[i|0] > maxV) {
            data[i|0] = maxV;
        } else if (data[i|0] < minV) {
            data[i|0] = minV;
        }
    }
}
/**
 * Returns the standard deviation
 * @param data
 * @returns {number}
 */
function getStdDev(data) {
    var mean = getMean(data);
    var dataLength = data.length, squared = 0, temp = 0.0, i = 0;
    for (i = 0; i < dataLength; i++) {
        temp = (data[i|0] - mean);
        squared += temp * temp;
    }
    return Math.sqrt(squared / dataLength);
}
/**
 * Returns the standard deviation with an input mask
 * @param data
 * @returns {number}
 */
function getStdDevMask(data, mask) {
    var mean = getMeanMask(data, mask);
    var dataLength = data.length, squared = 0, temp = 0.0, i = 0;
    var c = 0;
    for (i = 0; i < dataLength; i++) {
        if (mask[i|0]) {
            temp = (data[i|0] - mean);
            squared += temp * temp;
            c++;
        }
    }
    return Math.sqrt(squared / c);
}
function rmsNormalisePeaks(final) {
    var peaks = getPeaks(final).value;
    var rms = getStdDev(peaks);
    for (var i = 0; i < final.length; i++) {
        final[i] /= rms;
    }
}
function normaliseXCorr(final) {
    subtractMeanReject(final, trimAmount);
    rmsNormalisePeaks(final);
    return final;
}
function getPeaksFromNormalised(final) {
    var peaks = getPeaks(final, false);
    var result = [];
    for (var i = 0; i < peaks.index.length; i++) {
        result.push({index: peaks.index[i], value: peaks.value[i]});
    }
    return result;
}


function getFit(template, xcor, val) {
    var startIndex = binarySearch(template.zs, val)[0] - Math.floor(fitWindow/2);
    var bestPeak = -9e9;
    var bestIndex = -1;
    for (var i = 0; i < fitWindow; i++) {
        var index = startIndex + i;
        if (index >=0 && index < xcor.length) {
            if (Math.abs(xcor[index]) > bestPeak) {
                bestPeak = Math.abs(xcor[index]);
                bestIndex = index;
            }
        }
    }
    return getRedshiftForNonIntegerIndex(template, fitAroundIndex(xcor, bestIndex));
}


/**
 * Determines the cross correlation (and peaks in it) between a spectra and a template
 *
 * @param template A template data structure from the template manager. Will contain a pre-transformed
 * template spectrum (this is why initialising TemplateManager is so slow).
 * @param fft the Fourier transformed spectra
 * @returns {{id: String, zs: Array, xcor: Array, peaks: Array}} a data structure containing the id of the template, the redshifts of the template, the xcor
 * results of the template and a list of peaks in the xcor array.
 */
function matchTemplate(template, fft) {
    var fftNew = fft.multiply(template.fft);
    var final = fftNew.inverse();
    final = Array.prototype.slice.call(final);
    circShift(final, final.length/2);
    final = pruneResults(final, template);
    normaliseXCorr(final);


    if (template.endZIndex2 != null) {
        final = pruneResults2(final, template);
    }
    var finalPeaks = getPeaksFromNormalised(final, template);

    return {
        id: template.id,
        zs: template.zs,
        xcor: final,
        peaks: finalPeaks
    };
}

/**
 * Performs a quadratic fit around a given index, and returns the
 * non-integer index of the quadratic maximum. Pixel window size starts at 3,
 * and increases if the quadratic does not give a maximum.
 *
 * @param data - the data to fit around (y values)
 * @param index - the index to place the pixel window
 * @returns {number} a double representing the non-integer maximal index
 */
function fitAroundIndex(data, index) {
    var window = 3;
    var e = null;
    while (window < 10) {
        if (index - window < 0 || index + window >= data.length) {
            return index; // On boundary failure, return index
        }
        var d = data.slice(index - window, index + window + 1).map(function(v,i) { return [i - window,v]; });
        e = polynomial(d).equation;
        if (e[2] < 0) {
            break;
        } else {
            window++;
        }
    }
    return index + (-e[1]/(2*e[2]));
}
/**
 * Calculates a redshift based from a given index
 *
 * @param t - the template to use
 * @param index - the index to calculate the redshift for
 * @returns {number} the redshift of the index
 */
function getRedshiftForNonIntegerIndex(t, index) {
    //TODO: When implementing heliocentric corrections, unify this function with line309 in templates.js: code duplication
    var gap =  (t.lambda[t.lambda.length - 1] - t.lambda[0]) / (t.lambda.length - 1);
    var num = t.lambda.length / 2;
    var z = (Math.pow(10, (index + t.startZIndex - num) * gap) * (1 + t.redshift)) - 1;
    return z;
}

/**
 * Clips the input array at the specific std range. Modifies array in place.
 * @param variance - the array to clip
 * @param clip - how many std to allow before clipping. Defaults to 3
 */
function clipVariance(variance, clip) {
    clip = defaultFor(clip, 3);
    var mean = getMean(variance);
    var std = getStdDev(variance);
    for (var i = 0; i < variance.length; i++) {
        if (variance[i] - mean > clip * std) {
            variance[i] = mean + clip * std;
        }
    }
}