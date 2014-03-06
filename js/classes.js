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
FitsFile.prototype.plotZeroLine = function(canvas, colour, bounds) {
    var c = canvas.getContext("2d");
    var h = canvas.height;
    var w = canvas.width;
    var ymin = bounds[2];
    var ymax = bounds[3];
    var hh = h - (5 + (0-ymin)*(h-10)/(ymax-ymin));
    c.strokeStyle = colour;
    c.moveTo(0, hh);
    c.lineTo(w, hh);
    c.stroke();
}
FitsFile.prototype.rerender = function(index) {
    this.spectra[index].miniRendered = -1;
    this.renderOverview(index);
}
FitsFile.prototype.renderOverview = function(index) {
    var v = this.spectra[index];
    var canvas = document.getElementById("smallGraphCanvas"+v.id);
    var width = canvas.clientWidth;
    if (v.miniRendered != width && v.intensity.length > 0) {
        v.miniRendered = width;
        var lambda = condenseToXPixels(v.lambda, width);
        var intensity = condenseToXPixels(v.intensity, width);
        var preprocessed = condenseToXPixels(v.processedIntensity, width);
        var tempLambda = condenseToXPixels(v.templateLambda, width);
        var tempIntensity = condenseToXPixels(v.templateIntensity, width);

        clearPlot(canvas);
        var toBound = [];
        if (this.scope.dispRaw) { toBound.push([lambda, intensity]); }
        if (this.scope.dispPre) { toBound.push([lambda, preprocessed]); }
        if (this.scope.dispMatched) { toBound.push([tempLambda, tempIntensity]); }

        var bounds = getMaxes(toBound);
        this.plotZeroLine(canvas, "#C4C4C4", bounds);
        if (this.scope.dispRaw) { plot(lambda, intensity, this.scope.interface.rawColour, canvas, bounds); }
        if (this.scope.dispPre) { plot(lambda, preprocessed, this.scope.interface.processedColour, canvas, bounds); }
        if (this.scope.dispMatched) { plot(tempLambda, tempIntensity, this.scope.interface.matchedColour, canvas, bounds); }
    }
}

FitsFile.prototype.getFibres = function(fits) {
    fits.getDataUnit(2).getColumn("TYPE", function(data, opt) {
        var ind = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i] == "P") {
                opt.spectra.push({index: ind++, id: i, lambda: opt.lambda.slice(0), intensity: [], variance: [], miniRendered: 0});
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
FitsFile.prototype.analysisAvailableIndex = function() {
    for (var k = 0; k < this.scope.workers.length; k++) {
        if (this.scope.workers[k].index == -1) {
            return k;
        }
    }
    return -1;
}
FitsFile.prototype.analyse = function() {
        var ind = this.analysisAvailableIndex();
        if (ind != -1) {
            for (var i = 0; i < this.spectra.length; i++) {
                if (this.spectra[i].processedIntensity == null) {
                    var working = false;
                    for (var j = 0; j < this.scope.workers.length; j++) {
                        if (this.scope.workers[j].index == i) {
                            working = true;
                            break;
                        }
                    }
                    if (!working) {
                        this.scope.workers[ind].index = i;
                        this.scope.workers[ind].worker.postMessage({
                            'index': i,
                            'lambda': this.lambda,
                            'intensity':this.spectra[i].intensity,
                            'variance': this.spectra[i].variance});
                        ind = this.analysisAvailableIndex();
                        if (ind == -1) {
                            return;
                        }
                    }
                }
            }
        }
}
FitsFile.prototype.digestScope = function() {
    if (this.scope.immediateAnalysis) {
        this.analyse();
    }
    this.scope.$apply(function(opt) {});
}