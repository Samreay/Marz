function FitsFile(filename, fits, scope) {
    this.filename = filename;
    this.rawfits = fits;
    this.scope = scope;


    var header0 = fits.getHDU(0).header;

    this.numSpectra = fits.getHDU(0).data.height;
    this.numPoints = fits.getHDU(0).data.width;
//        this.numSpectra = fits.getHDU(0).data.naxis[1];
//        this.numPoints = fits.getHDU(0).data.naxis[0];

    var tmpDate = MJDtoYMD(header0.get('UTMJD'));

    var CRVAL1 = header0.get('CRVAL1');
    var CRPIX1 = header0.get('CRPIX1');
    var CDELT1 = header0.get('CDELT1');
    console.log([CRVAL1, CRPIX1, CDELT1]);

    this.lambda = indexgenerate(this.numPoints).map(function (x) {
        return ((x + 1 - CRPIX1) * CDELT1) + CRVAL1;
    });

    this.properties = [
        {
            name: 'filename',
            label: 'Filename',
            value: this.filename,
            display: false
        },
        {
            name: 'MJD',
            label: 'MJD',
            value: header0.get('UTMJD'),
            displayValue: header0.get('UTMJD').toFixed(2),
            display: true
        },
        {
            name: 'Date',
            label: 'Date',
            value: MJDtoYMD(header0.get('UTMJD')),
            displayValue: tmpDate[0] + "-" + tmpDate[1] + "-" + tmpDate[2],
            display: true
        },
        {
            name: 'longitude',
            label: 'Longitude',
            value: header0.get('LONG_OBS'),
            displayValue: header0.get('LONG_OBS').toFixed(2),
            display: true
        },
        {
            name: 'latitude',
            label: 'Latitude',
            value: header0.get('LAT_OBS'),
            displayValue: header0.get('LAT_OBS').toFixed(2),
            display: true
        },
        {
            name: 'altitude',
            label: 'Altitude',
            value: header0.get('ALT_OBS'),
            displayValue: header0.get('ALT_OBS').toFixed(1),
            display: true
        },
        {
            name: 'startLambda',
            label: 'Start \u03BB',
            value: this.lambda[0],
            displayValue: this.lambda[0].toFixed(4),
            display: true
        },
        {
            name: 'endLambda',
            label: 'End \u03BB',
            value: this.lambda[this.lambda.length - 1],
            displayValue: this.lambda[this.lambda.length - 1].toFixed(4),
            display: true
        }
    ];

    this.spectra = [];
    this.getFibres(fits);

}
FitsFile.prototype.plot = function(data, canvas) {
    var c = canvas.getContext("2d");
    canvas.width = canvas.clientWidth;
    //TODO: Rewrap canvas, so 30 magic number goes away
    canvas.height = canvas.clientHeight;
    var h = canvas.height;
    var w = canvas.width;
    var min = 999999999;
    var max = -999999999;
    for (var i = 0; i < data.length; i++) {
        if (data[i] < min) { min = data[i] };
        if (data[i] > max) { max = data[i] };
    }
    c.beginPath();
    c.strokeStyle = "#B56310"
    var hh = h - (5 + (data[0]-min)*(h-10)/(max-min));
    var o = (w - data.length) / 2;
    c.moveTo(o,hh);
    for (var i = 1; i < data.length; i++) {
        hh = h - (5 + (data[i]-min)*(h-10)/(max-min));
        c.lineTo(o+i,hh);
    }
    c.stroke();
    console.log("canvas");
}
FitsFile.prototype.renderOverview = function(index) {
    var v = this.spectra[index];
    var canvas = document.getElementById("smallGraphCanvas"+v.id);
    var width = canvas.clientWidth;
    if (v.miniRendered != width && v.intensity.length > 0) {
        v.miniRendered = width;
        var res=Math.ceil(v.intensity.length / width);
        var d = [];
        var tmp = 0;
        for (var i=0; i<v.intensity.length; i+=1) {
            if (i % res == 0) {
                d.push(tmp);
                tmp = 0;
            } else {
                tmp += (v.intensity[i] / res)
            }

        }
          this.plot(d, canvas)
    }
}

FitsFile.prototype.getFibres = function(fits) {
    fits.getDataUnit(2).getColumn("TYPE", function(data, opt) {
        var ind = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i] == "P") {
                opt.spectra.push({index: ind++, id: i, intensity: [], variance: [], miniRendered: 0});
            }
        }
        opt.getSpectra(fits);
    }, this);
}

FitsFile.prototype.getSpectra = function(fits) {

    fits.getDataUnit(0).getFrame(0, function(data, opt) {
        var d = Array.prototype.slice.call(data);
        for (var i = 0; i < opt.spectra.length; i++) {
            opt.spectra[i].intensity = d.slice(opt.spectra[i].id * opt.numPoints, (opt.spectra[i].id + 1) * opt.numPoints);
        }
        opt.getVariances(fits);
    }, this)
}
FitsFile.prototype.getVariances = function(fits) {
    fits.getDataUnit(1).getFrame(0, function(data, opt) {
        var d = Array.prototype.slice.call(data);
        for (var i = 0; i < opt.spectra.length; i++) {
            opt.spectra[i].variance = d.slice(opt.spectra[i].id * opt.numPoints, (opt.spectra[i].id + 1) * opt.numPoints);
        }
        opt.digestScope();
    }, this);
}
FitsFile.prototype.digestScope = function() {
    this.scope.$apply(function(opt) {
        console.log(opt);
    });
}