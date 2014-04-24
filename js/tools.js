var normalised_height = 1000;
var normalised_area = 100000;
var polyDeg = 6;

function indexgenerate(num) {
    var result = [];
    for (var i = 0; i < num; i++) {
        result.push(i);
    }
    return result;
}
function indexgenerateWithOffset(num, offset) {
    var result = [];
    for (var i = 0; i < num; i++) {
        result.push(i + offset);
    }
    return result;
}
function linearSep(start, end, gap) {
    var result = [];
    for (var i = start; i <= end; i+= gap) {
        result.push(i);
    }
    return result;
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
function printProfile(start, functionname) {
    console.log("Operation " + functionname + " took " + (new Date() - start) + " milliseoncds");
}
function linearScaleFactor(start, end, redshift, num) {
    return linearScale(start*(1+redshift), end*(1+redshift), num);
}
function addValuesToDataDictionary(original, lambda, val, key, gap) {
    var startData = original[0].lambda;
    var startProcessed = lambda[0];
    var offset = (startProcessed - startData) / gap;
    var beginning = [];
    for (var i = 0; i < lambda.length; i++) {
        var index =  offset + i;
        if (index < 0) {
            var o = {lambda: lambda[i]};
            o[key] = val[i];
            beginning.push(o);
        } else if (index >= original.length) {
            var o = {lambda: lambda[i]};
            o[key] = val[i];
            original.push(o);
        } else {
            original[index][key] = val[i];
        }
    }
    for (var i = beginning.length - 1; i >= 0; i--) {
        original.unshift(beginning[i]);
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

// SOURCED FROM http://www.csgnetwork.com/julianmodifdateconv.html
function MJDtoYMD(mjd_in) {
    var year;
    var month;
    var day;
    var hour;
    var jd;
    var jdi;
    var jdf
    var l;
    var n;


    // Julian day
    jd = Math.floor(mjd_in) + 2400000.5;

    // Integer Julian day
    jdi = Math.floor(jd);

    // Fractional part of day
    jdf = jd - jdi + 0.5;

    // Really the next calendar day?
    if (jdf >= 1.0) {
        jdf = jdf - 1.0;
        jdi = jdi + 1;
    }


    hour = jdf * 24.0;
    l = jdi + 68569;
    n = Math.floor(4 * l / 146097);

    l = Math.floor(l) - Math.floor((146097 * n + 3) / 4);
    year = Math.floor(4000 * (l + 1) / 1461001);

    l = l - (Math.floor(1461 * year / 4)) + 31;
    month = Math.floor(80 * l / 2447);

    day = l - Math.floor(2447 * month / 80);

    l = Math.floor(month / 11);

    month = Math.floor(month + 2 - 12 * l);
    year = Math.floor(100 * (n - 49) + year + l);

    if (month < 10)
        month = "0" + month;

    if (day < 10)
        day = "0" + day;

    //year = year - 1900;

    return (new Array(year, month, day));
}

function condenseToXPixels(data, numPix) {
    if (data == null) {
        return null;
    }
    //TODO: Make floating point counting
    var res=Math.ceil(data.length / numPix);
    var d = [];
    var tmp = 0;
    for (var i=0; i < data.length; i++) {
        if (i % res == 0 && i!=0) {
            d.push(tmp);
            tmp = 0;
        } else {
            tmp += (data[i] / res)
        }
    }
    return d;
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

 function getMaxes(vals) {
    var xmin = 9e9;
    var xmax = -9e9;
    var ymin = 9e9;
    var ymax = -9e9;
    for (var i = 0; i < vals.length; i++) {
        var xs = vals[i][0];
        var ys = vals[i][1];
        if (xs != null) {
            for (var j = 0; j < xs.length; j++) {
                if (xs[j] < xmin) {
                    xmin = xs[j];
                }
                if (xs[j] > xmax) {
                    xmax = xs[j];
                }
            }
        }
        if (ys != null) {
            for (var j = 0; j < ys.length; j++) {
                if (ys[j] < ymin) {
                    ymin = ys[j];
                }
                if (ys[j] > ymax) {
                    ymax = ys[j];
                }
            }
        }
    }
    return [xmin, xmax, ymin, ymax];
}

function getBounds(vals) {
    var xmin = 9e9;
    var xmax = -9e9;
    var ymin = 9e9;
    var ymax = -9e9;
    for (var i = 0; i < vals.length; i++) {
        var xs = vals[i].x;
        var ys = vals[i].y;
        if (xs != null) {
            for (var j = 0; j < xs.length; j++) {
                if (xs[j] < xmin) {
                    xmin = xs[j];
                }
                if (xs[j] > xmax) {
                    xmax = xs[j];
                }
            }
        }
        if (ys != null) {
            for (var j = 0; j < ys.length; j++) {
                if (ys[j] < ymin) {
                    ymin = ys[j];
                }
                if (ys[j] > ymax) {
                    ymax = ys[j];
                }
            }
        }
    }
    console.log('Got bounds');
    return [xmin, xmax, ymin, ymax];
}

function clearPlot(canvas) {
    canvas.width = Math.max(canvas.clientWidth, canvas.width);
    canvas.height = Math.max(canvas.clientHeight, canvas.height);
    var c = canvas.getContext("2d");
    c.save();
    // Use the identity matrix while clearing the canvas
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    // Restore the transform
    c.restore();
}

function clear(canvas) {
    console.log('Clearing canvas');
    var c = canvas.getContext("2d");
    c.save();
    // Use the identity matrix while clearing the canvas
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    // Restore the transform
    c.restore();
}

function plot(xs, data, colour, canvas, bounds) {
    if (data == null || data.length == 0) {
        return;
    }
    var c = canvas.getContext("2d");
    var h = canvas.height;
    var w = canvas.width;
    c.beginPath();
    c.strokeStyle = colour;
    var xmin = bounds[0];
    var xmax = bounds[1];
    var ymin = bounds[2];
    var ymax = bounds[3];

    for (var i = 1; i < data.length; i++) {
        var x = 5 + (xs[i]-xmin)/(xmax-xmin) * (w - 10);
        var y = h - (5 + (data[i]-ymin)*(h-10)/(ymax-ymin));
        if (i == 0) {
            c.moveTo(x,y);
        } else {
            c.lineTo(x,y);
        }
    }
    c.stroke();
}

function plotDetailed(canvas, data, bounds, detailedPlotSettings) {
    var c = canvas.getContext("2d");
    var h = canvas.height - detailedPlotSettings.top - detailedPlotSettings.bottom;
    var w = canvas.width - detailedPlotSettings.left - detailedPlotSettings.right;

    if (data == null || data.length == 0) {
        return;
    }

    var xmin = bounds[0];
    var xmax = bounds[1];
    var ymin = bounds[2];
    var ymax = bounds[3];

    for (var j = 0; j < data.length; j++) {
        console.log('Plotting ' + data[j].id);
        c.beginPath();
        c.strokeStyle = data[j].colour;
        xs = data[j].x;
        ys = data[j].y;

        for (var i = 1; i < xs.length; i++) {
            var x = detailedPlotSettings.left + ((xs[i]-xmin)/(xmax-xmin)) * w;
            var y = detailedPlotSettings.top  + (1-((ys[i]-ymin)/(ymax-ymin))) * h;
            if (i == 0) {
                c.moveTo(x,y);
            } else {
                c.lineTo(x,y);
            }
        }
        c.stroke();
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

/** Creates a polyDeg'th polynomial fitted to the data.
 * Used to remove continuum.
 *
 * @param lambda
 * @param intensity
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
function normaliseViaAbsoluteDeviation(array, variance) {
    var max = -9e9;
    for (var j = 0; j < array.length; j++) {
        var v = Math.abs(array[j]);
        if (v > max) {
            max = v;
        }
    }
    for (var j = 0; j < array.length; j++) {
        var r = array[j] / max;
        array[j] = normalised_height * r;
        if (variance != null) {
            variance[j] = variance[j] * r;
        }
    }
}

function normaliseViaArea(array, variance) {
    var area = getAreaInArray(array, 0, array.length - 1);
    var r = normalised_area / area;
    for (var j = 0; j < array.length; j++) {
        array[j] = array[j] * r;
        if (variance != null) {
            variance[j] = variance[j] * r;
        }
    }
}

function subtractPolyFit(lambda, intensity) {
    var r = polyFit(lambda, intensity);
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = intensity[i] - r[i];
    }
}

function getInterpolatedAndShifted(template, z, lambda) {
    var xvals = linearScaleFactor(template.start_lambda, template.end_lambda, z, template.spec.length);
    var interp = interpolate(lambda, xvals, template.spec);
    return [lambda, interp];
}

function polyFitNormalise(lambda, intensity, variance) {
    var r = polyFit(lambda, intensity);
    // Comment below for loop out to compare continuum
    normaliseViaShift(r, 0, normalised_height, intensity);

    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = intensity[i] - r[i];
    }
    //normaliseViaAbsoluteDeviation(intensity, normalised_height, variance);
}


function normaliseArray(array, max) {
    for (var i = 0; i < array.length; i++) {
        array[i] = array[i] * normalised_height / max;
    }
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
    for (var i = start; i <= end; i++) {
        area += Math.abs(array[i]);
    }
    return area;
}

