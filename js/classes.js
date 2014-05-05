function TemplateExtractor(filename, fits, scope) {
    this.scope = scope;
    var header0 = fits.getHDU(0).header;
    var lstart = header0.get('CRVAL1');
    var li = header0.get('CRPIX1');
    var trans = header0.get('CD1_1');
    if (trans == null) {
        trans = header0.get('CDELT1');
    }
    this.logLinear = header0.get('DC-FLAG') == 1;
    var length = header0.get('NAXIS1');
    this.name = filename.substr(0, filename.indexOf("."));
    this.redshift = 0;
    this.transform = 0;
    this.start_lambda = lstart - li*trans;
    this.end_lambda = lstart + (length-li-1)*trans;

    fits.getDataUnit(0).getFrame(0, function(data, opt) {
        opt.spec = Array.prototype.slice.call(data);
        var obj = {name: opt.name, redshift: opt.redshift, start_lambda: opt.start_lambda, end_lambda: opt.end_lambda,
            z_start: 0, z_end: 2.0, log_linear: this.logLinear,  spec: opt.spec};
        opt.scope.fileManager.saveResults("this.templates.push(" + JSON.stringify(obj).replace(/"/g, "'") + ");");
    }, this)


}

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
            value: this.filename.replace(/\.[^/.]+$/, ""),
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
    this.sky = [];
    this.getSky(fits);

}
FitsFile.prototype.getSky = function(fits) {
    fits.getDataUnit(7).getFrame(0, function(data, opt) {
        opt.sky = Array.prototype.slice.call(data);
        removeNaNs(opt.sky);
        normaliseViaArea(opt.sky, null, 30000);
        cropSky(opt.sky, 80);
        opt.skyAverage = getAverage(opt.sky);
        opt.getFibres(fits);
    }, this);
}
FitsFile.prototype.getFibres = function(fits) {
    fits.getDataUnit(2).getColumn("TYPE", function(data, opt) {
        var ind = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i] == "P") {
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
            spec.push(new Spectra(opt.spectra[i].index, opt.spectra[i].id, opt.lambda.slice(0), opt.spectra[i].intensity, opt.spectra[i].variance, opt.sky, opt.skyAverage));
        }
        opt.scope.spectraManager.setSpectra(spec);
        opt.scope.$digest();
    }, this);
};




function Spectra(index, id, lambda, intensity, variance, sky, skyAverage) {
    //TODO: Remove index, use $index instead
    this.index = index;
    this.id = id;

    this.sky = sky;
    this.skyAverage = skyAverage;

    this.lambda = lambda;
    this.intensity = intensity;
    this.variance = variance;

    this.processedLambda = null;
    this.processedIntensity = null;
    this.processedVariance = null;

    this.templateIndex = null;
    this.templateZ = null;
    this.templateChi2 = null;

    this.finalZ = null;
    this.finalTemplateIndex = null;
    this.finalTemplateName = null;
    this.finalTemplateID = null;
    this.finalQOP = null;
}
Spectra.prototype.getFinalTemplate = function() {
    return this.finalTemplateIndex;
}
Spectra.prototype.getFinalTemplateID = function() {
    return this.finalTemplateID;
}
Spectra.prototype.setTemplateManager = function(templateManager) {
    this.templateManager = templateManager;
}
Spectra.prototype.getFinalRedshift = function() {
    return this.finalZ;
}
Spectra.prototype.setManual = function(redshift, templateIndex, qop) {
    this.finalZ = redshift;
    if (templateIndex != null) {
        this.finalTemplateIndex = templateIndex;
        this.finalTemplateName = this.templateManager.getName(templateIndex);
        this.finalTemplateID = this.templateManager.getID(templateIndex);
    }
    this.finalQOP = qop;
}
Spectra.prototype.setProcessedValues = function(pl, pi, pv, ti, tr) {
    if (pl != null) {
        this.processedLambdaRaw = pl;
        this.processedLambda = pl.map(function(x) {return Math.pow(10, x);});
        this.processedIntensity = pi;
        this.processedVariance = pv;
    }
    if (ti != null) {
        this.templateIndex = tr[ti].index;
        this.templateZ = tr[ti].z;
        if (this.finalQOP == null || this.finalQOP == 0) {
            this.finalTemplateIndex = this.templateIndex;
            this.finalTemplateName = this.templateManager.getName(this.templateIndex);
            this.finalTemplateID = this.templateManager.getID(this.templateIndex);
            this.finalZ = this.templateZ;
            this.finalQOP = 0;
        }
        this.templateChi2 = tr[ti].chi2;
        this.templateResults = tr;
    }
};
Spectra.prototype.setResults = function(automaticTemplateID, automaticRedshift, automaticChi2, finalTemplateID, finalZ, qop) {
    var t = this.templateManager.getIndexFromID(automaticTemplateID);
    if (t != null) {
        this.templateIndex = t;
        this.templateZ = automaticRedshift;
        this.templateChi2 = automaticChi2;
    } else {
        console.warn('no template found for id ' + automaticTemplateID);
    }
    this.setManual(finalZ, this.templateManager.getIndexFromID(finalTemplateID), qop);
}
Spectra.prototype.getAsJson = function(getOriginal) {
    if (getOriginal || this.processedIntensity == null) {
        return {'hasAutomaticMatch': this.templateZ != null, 'index':this.index, 'start_lambda':this.lambda[0], 'end_lambda':this.lambda[this.lambda.length - 1], 'intensity':this.intensity, 'variance':this.variance};
    } else {
        return {'hasAutomaticMatch': this.templateZ != null, 'index':this.index, 'lambda':this.processedLambdaRaw, 'intensity':this.processedIntensity, 'variance':this.processedVariance};
    }
};
Spectra.prototype.isProcessed = function() {
    return this.processedIntensity != null;
};
Spectra.prototype.isMatched = function() {
    return this.templateIndex != null;
};
Spectra.prototype.getQOP = function() {
    return this.finalQOP;
}
Spectra.prototype.setQOP = function(qop) {
    this.finalQOP = qop;
}


function SpectraManager(scope, processorManager, templateManager) {
    this.spectraList = [];
    this.scope = scope;
    this.analysed = [];
    this.processed = [];
    this.processorManager = processorManager;
    this.templateManager = templateManager;
};
SpectraManager.prototype.setSpectra = function(spectraList) {
    this.spectraList = spectraList;
    for (var i = 0; i < this.spectraList.length; i++) {
        this.spectraList[i].setTemplateManager(this.templateManager);
    }
    if (this.scope.results != null && this.scope.results.hasResults()) {
        this.scope.results.setResults();
    }
    this.processorManager.setSpectra(this);
};
SpectraManager.prototype.getAll = function() {
    return this.spectraList;
};
SpectraManager.prototype.getSpectra = function(i) {
    return this.spectraList[i];
};
SpectraManager.prototype.getIndexViaID = function(id) {
    for (var i = 0; i < this.spectraList.length; i++) {
        if (this.spectraList[i].id == id) {
            return i;
        }
    }
    return null;
}
SpectraManager.prototype.addToProcessed = function(i) {
    if (this.processed.indexOf(i) == -1) {
        this.processed.push(i);
    }

}
SpectraManager.prototype.addToUpdated = function(i) {
    if (this.analysed.indexOf(i) == -1) {
        this.analysed.push(i);
    }
    if (this.analysed.length == this.spectraList.length) {
        this.scope.finishedAnalysis();
    }
}
SpectraManager.prototype.getAnalysed = function() {
    return this.analysed;
}
SpectraManager.prototype.getProcessed = function() {
    return this.processed;
}
SpectraManager.prototype.getOutputResults = function() {
    var results = "SpectraID,AutomaticTemplateID,AutomaticRedshift,AutomaticChi2,FinalTemplateID,FinalRedshift,QOP\n"; //TODO: Replace with actual template information.
    var tmp = [];
    for (var i = 0; i < this.spectraList.length; i++) {
        var s = this.spectraList[i];
        if (s.finalZ == null) continue;
        var templateID = s.templateIndex == null ? 0 : this.templateManager.getID(s.templateIndex);
        var templateZ = s.templateZ == null ? 0.00000 : s.templateZ.toFixed(5);
        var templateChi2 = s.templateChi2 == null ? 0 : s.templateChi2.toFixed(0);
        tmp.push({i: s.id, txt: s.id + "," + templateID + "," + templateZ + "," + templateChi2
            + "," + s.getFinalTemplateID() + "," + s.getFinalRedshift().toFixed(5) + "," + s.getQOP() +  "\n"});
    }
    tmp.sort(function(a, b) {
        if (a.i < b.i) {
            return -1;
        } else if (a.i > b.i) {
            return 1;
        } else {
            return 0;
        }
    });
    for (var i = 0; i < tmp.length; i++) {
        results += tmp[i].txt;
    }
    return results;
}

function ProcessorManager(numProcessors, scope, matchTogether) {
    this.scope = scope;
    this.processors = [];
    this.automatic = true;
    this.activeProcessing = true;
    this.spectraManager = null;
    this.processQueue = [];
    this.processAndMatchTogether = matchTogether;
    for (var i = 0; i < numProcessors; i++) {
        this.processors.push(new Processor(this));
    }
    return this;
}
ProcessorManager.prototype.toggleActiveProcessing = function() {
    this.activeProcessing = !this.activeProcessing;
    this.processSpectra();
}
ProcessorManager.prototype.isPaused = function() {
    return !this.activeProcessing;
}
ProcessorManager.prototype.setSpectra = function(spectraManager) {
    this.spectraManager = spectraManager;
    if (this.automatic) {
        if (this.processAndMatchTogether) {
            for (var i = 0; i < spectraManager.getAll().length; i++) {
                this.processQueue.push({process: true, match: true, index: i});
            }
        } else {
            for (var i = 0; i < spectraManager.getAll().length; i++) {
                this.processQueue.push({process: true, match: false, index: i});
            }
            for (var i = 0; i < spectraManager.getAll().length; i++) {
                this.processQueue.push({process: false, match: true, index: i});
            }
        }
        this.processSpectra();
    }
};
ProcessorManager.prototype.isProcessing = function() {
    if (this.processQueue.length > 0) {
        return true;
    }
    for (var i = 0; i < this.processors.length; i++) {
        if (!this.processors[i].isIdle()) {
            return true;
        }
    }
    return false;
}
ProcessorManager.prototype.processSpectra = function() {
    if (this.processQueue.length > 0 && this.activeProcessing) {
        var processor = this.getFreeProcessor();
        while (processor) {
            var d = this.processQueue.shift();
            processor.processSpectra(d, this.spectraManager.getSpectra(d.index));
            processor = this.getFreeProcessor();
        }
    }
    this.scope.$apply();
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
            e.data.processedVariance, e.data.bestIndex, e.data.templateResults);
        this.manager.scope.updatedSpectra(this.workingSpectra.index);
        if (e.data.bestIndex != null) {
            this.manager.spectraManager.addToUpdated(this.workingSpectra.index);
        } else {
            this.manager.spectraManager.addToProcessed(this.workingSpectra.index);
        }
        this.workingSpectra = null;
        this.manager.processSpectra();
    }.bind(this), false);
}
Processor.prototype.isIdle = function() {
    return this.workingSpectra == null;
};
Processor.prototype.processSpectra = function(data, spectra) {
    this.workingSpectra = spectra;
    var r = spectra.getAsJson(data.process);
    r.process = data.process;
    r.match = data.match;
    this.worker.postMessage(r);
};


function FileManager() {
    this.filename = "results.txt";
}
FileManager.prototype.setFitsFileName = function(filename) {
    this.filename = filename.substr(0, filename.lastIndexOf('.')) + "_Results.txt";
}
FileManager.prototype.saveResults = function(results) {
    var blob = new Blob([results], {type: 'text/html'});
    saveAs(blob, this.filename);
}