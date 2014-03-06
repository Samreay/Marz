function indexgenerate(num) {
    var result = [];
    for (var i = 0; i < num; i++) {
        result.push(i);
    }
    return result;
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
    //TODO: Rewrap canvas, so 30 magic number goes away
    canvas.height = canvas.clientHeight;
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