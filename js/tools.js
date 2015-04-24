String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.pad = function(width) {
    return this.length >= width ? this : new Array(width - this.length + 1).join('0') + this;
};
String.prototype.spacePad = function(width) {
    return this.length >= width ? this : this + new Array(width - this.length + 1).join(' ');
};
function range(start, stop, step) {
    var result = [];
    for (var i = start; i < stop; i += step) {
        result.push(i);
    }
    return result;
}

function getMax(array, lower, upper) {
    if (typeof lower === "undefined") lower = 0;
    if (typeof upper === "undefined") upper = array.length;
    var max = -9e19;
    for (var i = lower; i < upper; i++) {
        if (array[i] > max) {
            max = array[i];
        }
    }
    return max;
}
function getMin(array, lower, upper) {
    if (typeof lower === "undefined") lower = 0;
    if (typeof upper === "undefined") upper = array.length;
    var min = 9e19;
    for (var i = lower; i < upper; i++) {
        if (array[i] < min) {
            min = array[i];
        }
    }
    return min;
}
function binarySearch(data, val) {
    var highIndex = data.length - 1;
    var lowIndex = 0;
    while (highIndex > lowIndex) {
        var index = Math.floor((highIndex + lowIndex) / 2);
        var sub = data[index];
        if (data[lowIndex] == val) {
            return [lowIndex, lowIndex];
        } else if (sub == val) {
            return [index, index];
        } else if (data[highIndex] == val) {
            return [highIndex, highIndex];
        } else if (sub > val) {
            if (highIndex == index) {
                return [lowIndex, highIndex];
            }
            highIndex = index
        } else {
            if (lowIndex == index) {
                return [lowIndex, highIndex];
            }
            lowIndex = index
        }
    }
    return [lowIndex, highIndex];
}

function isInt(n) {
    return parseInt(n) === n
}
function isIntString(n) {
    return !isNaN(parseInt(n))
}
function isFloatString(n) {
    return !isNaN(parseFloat(n))
}


function distance(x1, y1, x2, y2) {
    return Math.pow((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2), 0.5);
}

// SOURCED FROM http://www.csgnetwork.com/julianmodifdateconv.html
/**
 *
 * @param mjd_in the MJD date in
 * @returns {string} the 'YYYY-MM-dd' date format
 */
function MJDtoYMD(mjd_in) {
    var year;
    var month;
    var day;
    var hour;
    var jd;
    var jdi;
    var jdf;
    var l;
    var n;


    // Julian day
    jd = Math.floor(mjd_in) + 2400000.5;

    // Integer Julian day
    jdi = Math.floor(jd);

    // Fractional part of day
    jdf = jd - jdi + 0.5;

    if (jdf >= 1.0) {
        jdi = jdi + 1;
    }
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
    return year + "-" + month + "-" + day;
}