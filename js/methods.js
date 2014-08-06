var normalised_height = 1000;
var normalised_area = 100000;


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
function shiftWavelength(lambda, z) {
    return (1+z)*lambda;
}
function convertSingleVacuumFromAir(lambda) {
    return lambda * (1 + 2.735192e-4 + (131.4182/Math.pow(lambda, 2)) + (2.76249E8 /Math.pow(lambda, 4)));
}
/**
 * Converts the equispaced linear scale of the given lambda into an equispaced log scale.
 * Interpolates intensity and variance to this new scale.
 *
 * @param lambda
 * @param intensity
 */
function convertLambdaToLogLambda(lambda, intensity, numel) {
    if (typeof numel === 'undefined') numel = arraySize;
    var logLambda = linearScale(startPower, endPower, numel);
    var rescale = logLambda.map(function(x) { return Math.pow(10, x);});
    var newIntensity = interpolate(rescale, lambda, intensity);
    return {lambda: logLambda, intensity: newIntensity};
}
function fastSmooth(y, num) {
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
function normaliseSection(xs, ys, xMin, xMax, yMin, height) {
    var xBounds = getXBounds(xs, xMin, xMax);
    var bounds = findMinAndMaxSubset(xs, ys, xBounds.start, xBounds.end);
    var r = height/(bounds.max - bounds.min);
    var xss = xs.slice(xBounds.start, xBounds.end);
    var yss = ys.slice(xBounds.start, xBounds.end);
    for (var i = 0; i < yss.length; i++) {
        yss[i] = yMin + r * (yss[i] - bounds.min);
    }
    return {xs: xss, ys: yss};

}
//TODO: Log time complexity should be easy to do here
function getXBounds(xs, xMin, xMax) {
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
function scale(array, r) {
    for (var i = 0; i < array.length; i++) {
        array[i] *= r;
    }
}
function add(original, addition) {
    for (var i = 0; i < original.length; i++) {
        original[i] += addition[i];
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
function findMinAndMaxSubset(xs, ys, start, end) {
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
function getAverage(array) {
    var c = 0;
    for (var i = 0; i < array.length; i++) {

    }
}
function normaliseAtMeanWithSpread(array, mean, spread) {
    maxes = findMinAndMax(array);

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
    return r;
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
 * Checks to see
 * @param intensity
 * @param variance
 * @param index
 */
function badIndex(intensity, variance, index) {
    var i = intensity[index];
    var v = variance[index];
    return isNaN(i) || isNaN(v) || i == null || v == null || i > maxVal || i < minVal || v < 0;
}

/**
 * Replaces NaNs with an average over numPoints to either side.
 * Sets the variance to null so the point isnt counted.
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
            variance[i] = e;
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
            if (i > 0) {
                maxNeighbour = Math.abs(intensity[i - 1] - intensity[i]);
            }
            if (i < intensity.length - 1) {
                maxNeighbour = Math.max(maxNeighbour, Math.abs(intensity[i + 1] - intensity[i]));
            }
            if (maxNeighbour > deviationFactor * rms) {
                var r = 0;
                var c = 0;
                for (var j = i - pointCheck; j < (i + 1 + pointCheck); j++) {
                    if (j >= 0 && j < intensity.length && Math.abs(intensity[j]-mean) < rms) {
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

function rollingPointMean(intensity, numPoints, falloff) {
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
function getMean(data) {
    var r = 0;
    for (var i = 0; i < data.length; i++) {
        r += data[i];
    }
    return r / data.length;
}
function stdDevSubtract(data, subtract) {
    var subtracted = data.map(function(x, ind) { return x - subtract[ind]; });
    var mean = getMean(subtracted);
    var r = 0;
    for (var i = 0; i < subtracted.length; i++) {
        r += (subtracted[i] - mean)*(subtracted[i] - mean);
    }
    return Math.sqrt(r / subtracted.length);
}
/**
 * //TODO: ADD DOC
 * @param lambda
 * @param intensity
 */
function polyFitReject(lambda, intensity) {
    var l = lambda.slice();
    var int = intensity.slice();
    for (var i = 0; i < polyFitInteractions; i++) {
        var fit = polynomial2(l, int, polyDeg);
        var stdDev = stdDevSubtract(int, fit.points);
        var c = 0;
        for (var j = 0; j < int.length; j++) {
            if (Math.abs((int[j] - fit.points[j]) / stdDev) > polyFitRejectDeviation) {
                int.splice(j, 1);
                l.splice(j, 1);
                fit.points.splice(j, 1);
                j--;
                c++;
            }
        }
        if (c == 0) {
            break;
        }
    }
    var final = lambda.map(function(val) {
        var r = 0;
        for (var j = 0; j < fit.equation.length; j++) {
            r += fit.equation[j] * Math.pow(val, j);
        }
        return r;
    });

    for (var i = 0; i < intensity.length; i++) {
        intensity[i] -= final[i];
    }

    return final;
}
function subtract(data, subtract) {
    for (var i = 0; i < data.length; i++) {
        data[i] -= subtract[i];
    }
}
function smoothAndSubtract(intensity) {
    var medians = medianFilter(intensity, medianWidth);
    var smoothed = boxCarSmooth(medians, smoothWidth);
    subtract(intensity, smoothed);

}

function medianFilter(data, window) {
    var result = [];
    var win = [];
    var num = (window - 1)/2;
    for (var i = 0; i < num + 2; i++) {
        win.push(data[0]);
    }
    for (var i = 0; i < num - 1; i++) {
        win.push(data[i]);
    }
    for (var i = 0; i < data.length; i++) {
        var index = i + num;
        if (index >= data.length) {
            win.push(data[data.length - 1]);
        } else {
            win.push(data[index]);
        }
        win.splice(0, 1);
        result.push(win.slice().sort(function(a,b){return a-b;})[num]);
    }
    return result;
}

function boxCarSmooth(data, window) {
    var result = [];
    var win = [];
    var running = 0;
    var num = (window - 1)/2;
    for (var i = 0; i < num + 2; i++) {
        win.push(data[0]);
        running += win[win.length - 1];
    }
    for (var i = 0; i < num - 1; i++) {
        win.push(data[i]);
        running += win[win.length - 1];
    }
    for (var i = 0; i < data.length; i++) {
        var index = i + num;
        if (index >= data.length) {
            win.push(data[data.length - 1]);
        } else {
            win.push(data[index]);
        }
        running += win[win.length - 1];
        running -= win.splice(0,1)[0];
        result.push(running / window);
    }
    return result;
}

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
function broadenError(data, window) {
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
            result.push(win.slice().sort(function(a,b){return b-a;})[0]);
        } else {
            result.push(data[i]);
        }
    }
    for (var i = 0; i < result.length; i++) {
        data[i] = result[i];
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
function adjustError(variance) {
    broadenError(variance, broadenWindow);
    maxMedianAdjust(variance, errorMedianWindow, errorMedianWeight);
}

function divideByError(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = intensity[i] / (variance[i] * variance[i]);
    }
}
function findMean(data) {
    var result = 0;
    for (var i = 0; i < data.length; i++) {
        result += data[i];
    }
    return result / data.length;
}
function absMean(data) {
    var running = 0;
    for (var i = 0; i < data.length; i++) {
        running += Math.abs(data[i]);
    }
    return running / data.length;
}
function absMax(data) {
    return data.map(function(x) { return Math.abs(x); }).sort(function(a,b){return b-a;})[0];
}
function normaliseMeanDev(intensity, clipValue) {
    var running = true;
    while (running) {
        var meanDeviation = absMean(intensity);
        var clipVal = (clipValue + 0.01) * meanDeviation;
        if (absMax(intensity) > clipVal) {
            for (var i = 0; i < intensity.length; i++) {
                if (intensity[i] > clipVal) {
                    intensity[i] = clipVal;
                } else if (intensity[i] < -clipVal) {
                    intensity[i] = -clipVal;
                }
            }
        } else {
            running = false;
        }
    }
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] /= meanDeviation;
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
function subtractMeanReject(final, trimAmount) {
    var num = Math.floor(trimAmount * final.length);
    var sorted = final.slice().sort(function(a,b) { return a-b });
    sorted.splice(num, sorted.length - num);
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
function getRMS(data) {
    var mean = 0;
    for (var i = 0; i < data.length; i++) {
        mean += data[i];
    }
    mean = mean / data.length;
    var squared = 0;
    for (var i = 0; i < data.length; i++) {
        squared += Math.pow((data[i] - mean), 2);
    }
    squared /= data.length;
    return Math.sqrt(squared);
}
function rmsNormalisePeaks(final) {
    var peaks = getPeaks(final).value;
    var rms = getRMS(peaks);
    for (var i = 0; i < final.length; i++) {
        final[i] /= rms;
    }
}
function normaliseXCorr(final) {
    subtractMeanReject(final, trimAmount);
    rmsNormalisePeaks(final);
    var peaks = getPeaks(final, false);
    var result = [];
    for (var i = 0; i < peaks.index.length; i++) {
        result.push({index: peaks.index[i], value: peaks.value[i]});
    }
    return result;
}
