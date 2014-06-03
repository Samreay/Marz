var normalised_height = 1000;
var normalised_area = 100000;
var polyDeg = 6;

function setCookie(cname, cvalue, exdays) {
    if (exdays == null) {
        exdays = 1000;
    }
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return null;
}
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

function clearPlot(canvas) {
    canvas.width = canvas.clientWidth;
    canvas.height =canvas.clientHeight;
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
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
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
function normaliseViaAreaSlow(array, variance, val) {
    var a = val == null ? normalised_area : val;
    var area = getAreaInArraySlow(array, 0, array.length - 1);
    if (area == 0) return;
    var r = a / area;
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
 * Returns the area in an array subsection. Caters to NaNs
 *
 * @param array to read through
 * @param start start index
 * @param end INCLUSIVE end index
 */
function getAreaInArraySlow(array, start, end) {
    var area = 0;
    for (var i = start; i <= end; i++) {
        if (!isNaN(array[i])) {
            area += Math.abs(array[i]);
        }
    }
    return area;
}

function distance(x1, y1, x2, y2) {
    return Math.pow((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2), 0.5);
}

/**
 * Interpolates a line from (x1,y1) to (x2,y2) at point x3
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @param x3
 */
function interpx(x1, y1, x2, y2, x3) {
    var r2 = (x3-x1)/(x2-x1);
    return r2*y2 + (1-r2)*y1;
}

/**
 * Interpolates a line from (x1,y1) to (x2,y2) at point y3
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @param x3
 */
function interpy(x1, y1, x2, y2, y3) {
    var r2 = (y3-y1)/(y2-y1);
    return r2*x2 + (1-r2)*x1;
}


/**
 * Function transposed from AutoZ code written by Ivan Baldry.
 * Equation from SDSS web page: http://www.sdss.org/dr7/products/spectra/vacwavelength.html
 * Reference to Morton (1991, ApJS, 77, 119).
 * @param lambda
 */
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
function convertSingleVacuumFromAir(lambda) {
    return lambda * (1 + 2.735192e-4 + (131.4182/Math.pow(lambda, 2)) + (2.76249E8 /Math.pow(lambda, 4)));
}

function shiftWavelength(lambda, z) {
    return (1+z)*lambda;
}



function FastAreaFinder(array) {
    this.array = array;
    this.start = null;
    this.end = null;
    this.area = 0;
}
FastAreaFinder.prototype.getArea = function(start, end) {
    if (start < 0) start = 0;
    if (end > this.array.length) end = this.array.length;
    if (this.start == null || this.end == null) {
        this.area = 0;
        for (var i = start; i < end; i++) {
            this.area += Math.abs(this.array[i]);
        }
    } else {

        if (start < this.start) {
            for (var i = start; i < this.start; i++) {
                this.area += Math.abs(this.array[i]);
            }
        } else if (start > this.start) {
            for (var i = this.start; i < start; i++) {
                this.area -= Math.abs(this.array[i]);
            }
        }
        if (end > this.end) {
            for (var i = this.end; i < end; i++) {
                this.area += Math.abs(this.array[i]);
            }
        } else if (end < this.end) {
            for (var i = end; i < this.end; i++) {
                this.area -= Math.abs(this.array[i]);
            }
        }
    }
    this.start = start;
    this.end = end;
    return this.area;
}
