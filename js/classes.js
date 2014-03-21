

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

    this.properties = /**/[
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
FitsFile.prototype.getFibres = function(fits) {
    fits.getDataUnit(2).getColumn("TYPE", function(data, opt) {
        var ind = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i] == "P" && i < 6) {
                opt.spectra.push({index: ind++, id: i+1, lambda: opt.lambda.slice(0), intensity: [], variance: [], miniRendered: 0});
            }
        }
        opt.getSpectra(fits);
    }, this);
};
FitsFile.prototype.getSpectra = function(fits) {

    fits.getDataUnit(0).getFrame(0, function(data, opt) {
        var d = Array.prototype.slice.call(data);
        for (var i = 0; i < opt.spectra.length; i++) {
            opt.spectra[i].intensity = d.slice((opt.spectra[i].id-1) * opt.numPoints, (opt.spectra[i].id ) * opt.numPoints);
        }
        opt.getVariances(fits);
    }, this)
};
FitsFile.prototype.getVariances = function(fits) {
    fits.getDataUnit(1).getFrame(0, function(data, opt) {
        var d = Array.prototype.slice.call(data);
        for (var i = 0; i < opt.spectra.length; i++) {
            opt.spectra[i].variance = d.slice((opt.spectra[i].id-1) * opt.numPoints, (opt.spectra[i].id ) * opt.numPoints);
        }
        var spec = [];
        for (var i = 0; i < opt.spectra.length; i++) {
            spec.push(new Spectra(opt.spectra[i].index, opt.spectra[i].id, opt.lambda.slice(0), opt.spectra[i].intensity, opt.spectra[i].variance));
        }
        opt.scope.spectraManager.setSpectra(spec);
        opt.scope.$digest();
    }, this);
};



function Spectra(index, id, lambda, intensity, variance) {
    //TODO: Remove index, use $index instead
    this.index = index;
    this.id = id;

    this.lambda = lambda;
    this.intensity = intensity;
    this.variance = variance;

    // All these plotting variables are used to make interpolation faster
    // when generating the data for the detailed view
    this.gap = 1;
    this.plotData = [];
    this.plotLambda = linearSep(Math.floor(lambda[0]), Math.ceil(lambda[lambda.length - 1]), this.gap);
    this.plotIntensity = interpolate(this.plotLambda, lambda, intensity);
    this.plotVariance = interpolate(this.plotLambda, lambda, variance);
    for (var i = 0; i < this.plotLambda.length; i++) {
        this.plotData.push({lambda: this.plotLambda[i], raw: this.plotIntensity[i]});
    }


    this.processedLambda = null;
    this.processedIntensity = null;
    this.processedVariance = null;
    this.plotProcessedLambda = null;
    this.plotProcessedIntensity = null
    this.plotProcessedVariance = null;


    this.templateIndex = null;
    this.templateZ = null;
    this.templateChi2 = null;
    this.plotTemplateLambda = null
    this.plotTemplateIntensity = null;
}
Spectra.prototype.setTemplateManager = function(templateManager) {
    this.templateManager = templateManager;
};
Spectra.prototype.getTemplateId = function() {
    if (this.templateIndex == null || this.templateManager == null) return null;
    return this.templateManager.get(this.templateIndex).id;
}
Spectra.prototype.setProcessedValues = function(pl, pi, pv, ti, tz, tc) {
    this.processedLambda = pl.map(function(x) {return Math.pow(10, x);});
    this.processedIntensity = pi;
    this.processedVariance = pv;

    this.plotProcessedLambda = linearSep(Math.floor(this.processedLambda[0]), Math.ceil(this.processedLambda[this.processedLambda.length - 1]), this.gap);
    this.plotProcessedIntensity = interpolate(this.plotProcessedLambda, this.processedLambda, pi);
    this.plotProcessedVariance = interpolate(this.plotProcessedLambda, this.processedLambda, pv);

    addValuesToDataDictionary(this.plotData, this.plotProcessedLambda, this.plotProcessedIntensity, 'pre', this.gap);


    this.templateIndex = ti;
    this.templateZ = tz;
    this.templateChi2 = tc;

//    var result = this.templateManager.getShiftedLinearTemplate(ti, tz);
//    this.templateLambda = result[0];
//    this.templateIntensity = result[1];
//    this.plotTemplateIntensity = this.templateManager.getPlottingShiftedLinearLambda(ti, tz, this.plotProcessedLambda);
    this.templateLambda = this.plotProcessedLambda;
    this.templateIntensity = this.templateManager.getPlottingShiftedLinearLambda(ti, tz, this.plotProcessedLambda);

};
Spectra.prototype.getAsJson = function() {
    return {'index':this.index, 'start_lambda':this.lambda[0], 'end_lambda':this.lambda[this.lambda.length - 1], 'intensity':this.intensity, 'variance':this.variance};
};
Spectra.prototype.isProcessed = function() {
    return this.processedIntensity != null;
};
Spectra.prototype.isMatched = function() {
    return this.templateIndex != null;
};



function SpectraManager(processorManager, templateManager) {
    this.spectraList = [];
    this.processorManager = processorManager;
    this.templateManager = templateManager;
};
SpectraManager.prototype.setSpectra = function(spectraList) {
    this.spectraList = spectraList;
    for (var i = 0; i < spectraList.length; i++) {
        this.spectraList[i].setTemplateManager(this.templateManager);
    }
    this.processorManager.setSpectra(this);
};
SpectraManager.prototype.getAll = function() {
    return this.spectraList;
};
SpectraManager.prototype.getSpectra = function(i) {
    return this.spectraList[i];
};


function ProcessorManager(numProcessors, scope) {
    this.scope = scope;
    this.processors = [];
    this.automatic = true;
    this.spectraManager = null;
    this.processQueue = [];
    for (var i = 0; i < numProcessors; i++) {
        this.processors.push(new Processor(this));
    }
    return this;
}
ProcessorManager.prototype.setSpectra = function(spectraManager) {
    this.spectraManager = spectraManager;
    if (this.automatic) {
        for (var i = 0; i < spectraManager.getAll().length; i++) {
            this.processQueue.push(i)
        }
        this.processSpectra();
    }
};
ProcessorManager.prototype.processSpectra = function() {
    if (this.processQueue.length > 0) {
        var processor = this.getFreeProcessor();
        while (processor) {
            processor.processSpectra(this.spectraManager.getSpectra(this.processQueue.shift()));
            processor = this.getFreeProcessor();
        }
    }
};
ProcessorManager.prototype.getFreeProcessor = function () {
    for (var i = 0; i < this.processors.length; i++) {
        if (this.processors[i].isIdle()) {
            return this.processors[i];
        }
    }
    return null;
};

/**
 * The processor is responsible for hosting the worker and communicating with it.
 * @param manager - the processor manager, used in the worker callback
 */
function Processor(manager) {
    this.manager = manager;
    this.workingSpectra = null;
    this.worker = new Worker('js/preprocessor.js');
    this.worker.addEventListener('message', function(e) {
        this.workingSpectra.setProcessedValues(e.data.processedLambda, e.data.processedIntensity,
            e.data.processedVariance, e.data.templateIndex, e.data.templateZ,
            e.data.templateChi2);
        this.manager.scope.updatedSpectra(this.workingSpectra.index);
        this.workingSpectra = null;
        this.manager.processSpectra();
    }.bind(this), false);
}
Processor.prototype.isIdle = function() {
    return this.workingSpectra == null;
};
Processor.prototype.processSpectra = function(spectra) {
    this.workingSpectra = spectra;
    this.worker.postMessage(spectra.getAsJson());
};