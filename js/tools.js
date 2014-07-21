String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};


String.prototype.pad = function(size) {
    return ('000000000' + this).substr(-size)
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

    // Really the next calendar day?
    if (jdf >= 1.0) {
//        jdf = jdf - 1.0;
        jdi = jdi + 1;
    }


//    hour = jdf * 24.0;
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

    return year + "-" + month + "-" + day;
}