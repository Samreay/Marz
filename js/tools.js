var normalised_height = 1000;
var polyDeg = 10;

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
        } else if (index > original.length) {
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

//function mapArrays(xinterp, xvals, i) {
//    var xil = xinterp.length;
//    var xis = xinterp[0];
//    var xie = xinterp[xil - 1];
//    var xig = (xie - xis) / (xil - 1);
//    var xl = xvals.length;
//    var xs = xvals[0];
//    var xe = xvals[xl - 1];
//    var xg = (xe - xs) / (xl - 1);
//
//    var start = (xinterp[i] - xs)/(xe - xs)*(xl-1) - 0.5*(xig/xg);
//    var end = start + (xig/xg);
//    var startIndex = Math.floor(start);
//    var startWeight = 1 - (start - startIndex);
//    var endIndex = Math.ceil(end);
//    var endWeight = 1 - (endIndex - end);
//
//    return [startIndex, startWeight, endIndex, endWeight];
//
//
//}
/** Interpolates two linear progression x ranges */
//function interpolate(xinterp, xvals, yvals) {
//    var result = [];
//    for (var i = 0; i < xinterp.length; i++) {
//        var res = mapArrays(xinterp, xvals, i);
//        var c = 0;
//        var v = 0;
//        var weight = res[1];
//        for (var j = res[0]; j <= res[2]; j++) {
//            if (j == res[2]) {
//                weight = res[3];
//            } else if (j > 0) {
//                weight = 1;
//            }
//            if (j < 0) {
//                continue;
//            } else if (j >= xvals.length) {
//                break;
//            }
//            v += weight * yvals[j];
//            c += weight;
//        }
//        if (c != 0) {
//            result[i] = v / c;
//        } else {
//            //TODO: Make variance null
//            result[i] = 0;
//        }
//
//    }
//    return result;
//
//}

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
    canvas.width = Math.max(canvas.clientWidth, canvas.width);
    //TODO: Rewrap canvas, so 30 magic number goes away
    canvas.height = Math.max(canvas.clientHeight, canvas.height);
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
function normaliseViaAbsoluteDeviation(array, top, optional) {
    var max = -9e9;
    for (var j = 0; j < array.length; j++) {
        var v = Math.abs(array[j]);
        if (v > max) {
            max = v;
        }
    }
    for (var j = 0; j < array.length; j++) {
        var r = array[j] / max;
        array[j] = top * r;
        if (optional != null) {
            optional[j] = optional[j] * r;
        }

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
