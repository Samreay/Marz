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
//    this.rawfits = fits;
    this.scope = scope;


    var header0 = fits.getHDU(0).header;

    this.numPoints = fits.getHDU(0).data.width;

    var tmpDate = MJDtoYMD(header0.get('UTMJD'));

    var CRVAL1 = header0.get('CRVAL1');
    var CRPIX1 = header0.get('CRPIX1');
    var CDELT1 = header0.get('CDELT1');
    if (CDELT1 == null) {
        CDELT1 = header0.get('CD1_1');
    }

    this.lambda = indexgenerate(this.numPoints).map(function (x) {
        return ((x + 1 - CRPIX1) * CDELT1) + CRVAL1;
    });

    this.properties = [
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
    this.isCoadd = header0.get('COADDVER') != null;
    this.skyIndex = this.isCoadd ? 2 : 7;
    this.typeIndex = this.isCoadd ? 4 : 2;
    this.getFibres(fits);
}
FitsFile.prototype.getFibres = function(fits) {
    fits.getDataUnit(this.typeIndex).getColumn("TYPE", function(data, opt) {
        var ind = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i] == "P") {
                opt.spectra.push({index: ind++, fitsIndex: i, id: i+1, lambda: opt.lambda.slice(0), intensity: [], variance: [], miniRendered: 0});
            }
        }
        opt.getNames(fits);
    }, this);
};
FitsFile.prototype.getNames = function(fits) {
    fits.getDataUnit(this.typeIndex).getColumn("NAME", function(data, opt) {
        for (var i = 0; i < opt.spectra.length; i++) {
            var j = opt.spectra[i].fitsIndex;
            opt.spectra[i].name = data[j].replace(/\W/g, '');
        }
        opt.getRA(fits);
    }, this);
};
FitsFile.prototype.getRA = function(fits) {
    fits.getDataUnit(this.typeIndex).getColumn("RA", function(data, opt) {
        for (var i = 0; i < opt.spectra.length; i++) {
            var j = opt.spectra[i].fitsIndex;
            opt.spectra[i].ra = data[j];
        }
        opt.getDec(fits);
    }, this);
};
FitsFile.prototype.getDec = function(fits) {
    fits.getDataUnit(this.typeIndex).getColumn("DEC", function(data, opt) {
        for (var i = 0; i < opt.spectra.length; i++) {
            var j = opt.spectra[i].fitsIndex;
            opt.spectra[i].dec = data[j];
        }
        opt.getMagntidues(fits);
    }, this);
};
FitsFile.prototype.getMagntidues = function(fits) {
    fits.getDataUnit(this.typeIndex).getColumn("MAGNITUDE", function(data, opt) {
        for (var i = 0; i < opt.spectra.length; i++) {
            var j = opt.spectra[i].fitsIndex;
            opt.spectra[i].magnitude = data[j];
        }
        opt.getComments(fits);
    }, this);
};
FitsFile.prototype.getComments = function(fits) {
    fits.getDataUnit(this.typeIndex).getColumn("COMMENT", function(data, opt) {
        for (var i = 0; i < opt.spectra.length; i++) {
            var j = opt.spectra[i].fitsIndex;
            opt.spectra[i].type = data[j].split(' ')[0];
            if (opt.spectra[i].type == 'Parked') {
                opt.spectra.splice(i,1);
                for (var k = i; k < opt.spectra.length; k++) {
                    opt.spectra[k].index--;
                }
            }
        }
        opt.getSky(fits);
    }, this);
};
FitsFile.prototype.getSky = function(fits) {
    fits.getDataUnit(this.skyIndex).getFrame(0, function(data, opt) {
        var d = Array.prototype.slice.call(data);
        if (opt.isCoadd) {
            for (var i = 0; i < opt.spectra.length; i++) {
                opt.spectra[i].sky = d.slice((opt.spectra[i].id-1) * opt.numPoints, (opt.spectra[i].id ) * opt.numPoints);
                removeNaNs(opt.spectra[i].sky);
                normaliseViaArea(opt.spectra[i].sky, null, 30000);
                cropSky(opt.spectra[i].sky, 80);
                opt.spectra[i].skyAverage = getAverage(opt.spectra[i].sky);
            }
        } else {
            opt.sky = d;
            removeNaNs(opt.sky);
            normaliseViaArea(opt.sky, null, 30000);
            cropSky(opt.sky, 80);
            opt.skyAverage = getAverage(opt.sky);
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
        for (var j = 0; j < opt.spectra.length; j++) {
            spec.push(new Spectra(opt.spectra[j].index, opt.spectra[j].id, opt.lambda.slice(0), opt.spectra[j].intensity, opt.spectra[j].variance,
                opt.isCoadd ? opt.spectra[j].sky : opt.sky, opt.isCoadd ? opt.spectra[j].skyAverage : opt.skyAverage, opt.spectra[j].name, opt.spectra[j].ra, opt.spectra[j].dec,
                opt.spectra[j].magnitude, opt.spectra[j].type, opt.properties[0].value, opt.scope));
        }
        opt.scope.spectraManager.setSpectra(spec);
        opt.scope.$digest();
    }, this);
};




function Spectra(index, id, lambda, intensity, variance, sky, skyAverage, name, ra, dec, magnitude, type, filename, scope) {
    //TODO: Remove index, use $index instead
    this.index = index;
    this.id = id;
    this.name = name;
    this.ra = ra;
    this.dec = dec;
    this.magnitude = magnitude;
    this.type = type;
    this.filename = filename;

    this.storageManager = scope.storageManager;
    this.templateManager = scope.templateManager;
    this.interfaceManager = scope.interfaceManager;
    this.spectraManager = scope.spectraManager;

    this.sky = sky;
    this.skyAverage = skyAverage;

    this.lambda = lambda;
    this.intensity = intensity;
    this.variance = variance;
    normaliseViaAreaSlow(this.intensity, this.variance);

    this.processedLambda = null;
    this.processedIntensity = null;
    this.processedVariance = null;

    this.automaticTemplate = null;
    this.automaticZ = null;
    this.automaticChi2 = null;

    this.manualTemplate = null;
    this.manualZ = null;
    this.finalQOP = 0;

    this.storageManager.loadSpectra(this);
}
Spectra.prototype.getFinalTemplate = function() {
    if (this.manualTemplate != null) {
        return this.manualTemplate;
    } else {
        return this.automaticTemplate;
    }
};
Spectra.prototype.getFinalTemplateName = function() {
    if (this.manualTemplate != null) {
        return this.manualTemplate.name;
    } else if (this.automaticTemplate != null) {
        return this.automaticTemplate.name;
    } else {
        return null;
    }
};
Spectra.prototype.getFinalTemplateID = function() {
    if (this.manualTemplate != null) {
        return this.manualTemplate.id;
    } else if (this.automaticTemplate != null) {
        return this.automaticTemplate.id;
    } else {
        return null;
    }
};
Spectra.prototype.getFinalRedshift = function() {
    if (this.manualZ != null) {
        return this.manualZ;
    } else {
        return this.automaticZ;
    }
};
Spectra.prototype.setManual = function(redshift, templateIndex, qop, save) {
    this.manualZ = redshift;
    this.manualTemplate = this.templateManager.get(templateIndex);
    this.finalQOP = qop;
    if (save == null || save) {
        this.storageManager.saveSpectra(this);
        this.interfaceManager.rerenderOverview(this.index);
    }
};
Spectra.prototype.setProcessedValues = function(pl, pi, pv) {
    if (pl != null) {
        this.processedLambdaRaw = pl;
        this.processedLambda = pl.map(function(x) {return Math.pow(10, x);});
        this.processedIntensity = pi;
        this.processedVariance = pv;
        this.spectraManager.addToProcessed(this.index);
        this.interfaceManager.rerenderOverview(this.index);
    }
};
Spectra.prototype.setMatched = function(tr) {
    if (tr != null) {
        this.automaticTemplate = this.templateManager.get(tr[0].index);
        this.automaticZ = tr[0].top[0].z;
        this.automaticChi2 = tr[0].top[0].chi2;
        this.templateResults = tr;
        this.storageManager.saveSpectra(this);
        this.spectraManager.addToUpdated(this.index);
        this.interfaceManager.rerenderOverview(this.index);
    }
};
Spectra.prototype.getMatchedIndex = function(templateID, index) {
    if (this.templateResults == null) {
        return 0;
    }
    for (var i = 0; i < this.templateResults.length; i++) {
        if (this.templateResults[i].id == templateID) {
            return this.templateResults[i].top[index].z;
        }
    }
    return 0;
};
Spectra.prototype.setResults = function(automaticTemplateID, automaticRedshift, automaticChi2, finalTemplateID, finalZ, qop, pushToLocal) {
    var t = this.templateManager.getIndexFromID(automaticTemplateID);
    if (t != null) {
        this.automaticTemplate = this.templateManager.getViaID(automaticTemplateID);
        this.automaticZ = automaticRedshift;
        this.automaticChi2 = automaticChi2;
        this.spectraManager.addToUpdated(this.index);
    } else {
        console.warn('No template found for id ' + automaticTemplateID);
    }
    if (qop != null && qop != 0 && !isNaN(qop)) {
        this.setManual(finalZ, this.templateManager.getIndexFromID(finalTemplateID), qop, false);
    }
    if (pushToLocal) {
        this.storageManager.saveSpectra(this);
    }
    this.interfaceManager.rerenderOverview(this.index);
};
Spectra.prototype.getAsJson = function(getOriginal) {
    if (getOriginal || this.processedIntensity == null) {
        return {'hasAutomaticMatch': this.automaticZ != null, 'index':this.index, type:this.type, 'start_lambda':this.lambda[0], 'end_lambda':this.lambda[this.lambda.length - 1], 'intensity':this.intensity, 'variance':this.variance};
    } else {
        return {'hasAutomaticMatch': this.automaticZ != null, 'index':this.index, type:this.type, 'lambda':this.processedLambdaRaw, 'intensity':this.processedIntensity, 'variance':this.processedVariance};
    }
};
Spectra.prototype.hasFullResults = function() {
    return this.templateResults != null && this.templateResults.length > 0;
};
Spectra.prototype.getOutputValues = function() {
    var result = {};
    result.finalQOP = this.finalQOP;
    if (this.automaticTemplate == null) {
        result.automaticZ = null;
        result.automaticTemplateID = null;
        result.automaticTemplateName = null;
        result.automaticChi2 = null;
    } else {
        result.automaticTemplateID = this.automaticTemplate.id;
        result.automaticZ = this.automaticZ.toFixed(5);
        result.automaticTemplateName = this.automaticTemplate.name;
        result.automaticChi2 = this.automaticChi2;
    }

    if (this.manualZ == null) {
        result.manualZ = null;
        result.finalZ = result.automaticZ;
    } else {
        result.manualZ = this.manualZ.toFixed(5);
        result.finalZ = result.manualZ;
    }
    if (this.manualTemplate == null) {
        result.manualTemplateID = null;
        result.manualTemplateName = null;
        result.finalTemplateID = result.automaticTemplateID;
        result.finalTemplateName = result.automaticTemplateName;
    } else {
        result.manualTemplateID = this.manualTemplate.id;
        result.manualTemplateName = this.manualTemplate.name;
        result.finalTemplateID = result.manualTemplateID;
        result.finalTemplateName = result.manualTemplateName;
    }
    return result;
};
Spectra.prototype.isProcessed = function() {
    return this.processedIntensity != null;
};
Spectra.prototype.isMatched = function() {
    return this.automaticZ != null;
};
Spectra.prototype.getQOP = function() {
    return this.finalQOP;
};
Spectra.prototype.setQOP = function(qop) {
    this.finalQOP = qop;
};

function SpectraManager(scope, processorManager, templateManager) {
    this.spectraList = [];
    this.scope = scope;
    this.analysed = [];
    this.processed = [];
    this.processorManager = processorManager;
    this.templateManager = templateManager;
}
SpectraManager.prototype.setSpectra = function(spectraList) {
    this.spectraList = spectraList;
    if (this.scope.results != null && this.scope.results.hasResults()) {
        this.scope.results.setResults();
    }
    this.processorManager.setSpectra(this);
};
SpectraManager.prototype.getAll = function() {
    return this.spectraList;
};
SpectraManager.prototype.getUnprocessed = function() {
    var results = [];
    for (var i = 0; i < this.spectraList.length; i++) {
        if (!this.spectraList[i].isProcessed()) {
            results.push(this.spectraList[i])
        }
    }
    return results;
};
SpectraManager.prototype.getUnmatched = function() {
    var results = [];
    for (var i = 0; i < this.spectraList.length; i++) {
        if (!this.spectraList[i].isMatched()) {
            results.push(this.spectraList[i])
        }
    }
    return results;
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
};
SpectraManager.prototype.addToProcessed = function(i) {
    if (this.processed.indexOf(i) == -1) {
        this.processed.push(i);
    }

};
SpectraManager.prototype.addToUpdated = function(i) {
    if (this.analysed.indexOf(i) == -1) {
        this.analysed.push(i);
    }
    if (this.analysed.length == this.spectraList.length) {
        this.scope.finishedAnalysis();
    }
};
SpectraManager.prototype.getAnalysed = function() {
    return this.analysed;
};
SpectraManager.prototype.getProcessed = function() {
    return this.processed;
};
SpectraManager.prototype.getOutputResults = function() {
    var results = "SpectraID,SpectraName,SpectraRA,SpectraDec,SpectraMagnitude,AutomaticTemplateID,AutomaticTemplateName,AutomaticRedshift,AutomaticChi2,FinalTemplateID,FinalTemplateName,FinalRedshift,QOP\n"; //TODO: Replace with actual template information.
    var tmp = [];
    for (var i = 0; i < this.spectraList.length; i++) {
        var s = this.spectraList[i];
        if (s.getFinalRedshift() == null) continue;
        var output = s.getOutputValues();
        if (output.automaticTemplateID == null) output.automaticTemplateID = '0';
        if (output.automaticTemplateName == null) output.automaticTemplateName = 'None';
        if (output.finalTemplateID == null) output.finalTemplateID = '0';
        if (output.finalTemplateName == null) output.finalTemplateName = 'None';
        if (output.automaticChi2 == null) output.automaticChi2 = '0';
        if (output.automaticZ == null) output.automaticZ = '0.00000';
        if (output.finalZ == null) continue;
        tmp.push({i: s.id, txt: s.id + "," + s.name + "," + s.ra.toFixed(6) + "," + s.dec.toFixed(6) + ","
            + s.magnitude.toFixed(2) +"," + output.automaticTemplateID + "," + output.automaticTemplateName + "," + output.automaticZ + "," + output.automaticChi2
            + "," + output.finalTemplateID + "," + output.finalTemplateName + "," + output.finalZ + "," + output.finalQOP +  "\n"});
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
    for (var j = 0; j < tmp.length; j++) {
        results += tmp[j].txt;
    }
    return results;
}

function ProcessorManager(numProcessors, scope) {
    this.scope = scope;
    this.processors = [];
    this.automatic = true;
    this.activeProcessing = true;
    this.spectraManager = null;
    this.quickProcess = 0;
    this.processQueue = [];
    for (var i = 0; i < numProcessors; i++) {
        this.processors.push(new Processor(this));
    }
    return this;
}
ProcessorManager.prototype.changeNumberOfCores = function(num) {
    if (num  < this.processors.length) {
        while (this.processors.length > num) {
            this.processors[0].flagForDeletion();
            this.processors.splice(0, 1);
        }
    } else if (num > this.processors.length) {
        while (this.processors.length < num) {
            this.processors.push(new Processor(this));
        }
    }
};
ProcessorManager.prototype.setInterface = function(interfaceManager) {
    this.interfaceManager = interfaceManager;
}
ProcessorManager.prototype.toggleActiveProcessing = function() {
    this.quickProcess = 0;
    this.activeProcessing = !this.activeProcessing;
    this.processSpectra();
};
ProcessorManager.prototype.isPaused = function() {
    return !this.activeProcessing;
};
ProcessorManager.prototype.addToFrontOfAnalysis = function(spectra) {
    var index = spectra.index;
    var i;
    this.quickProcess = 0;

    for (i = 0; i < this.processQueue.length; i++) {
        var item = this.processQueue[i];
        if (item.index == index && item.match == true) {
            this.processQueue.splice(i,1);
        }
    }
    this.processQueue.unshift({process: false, match: true, index: index, spectra: spectra});
    if (!this.activeProcessing) {
        this.quickProcess++;
    }
    if (!spectra.isProcessed()) {
        for (i = 0; i < this.processQueue.length; i++) {
            var item = this.processQueue[i];
            if (item.index == index && item.process == true) {
                this.processQueue.splice(i,1);
            }
        }
        this.processQueue.unshift({process: true, match: false, index: index, spectra: spectra});
        if (!this.activeProcessing) {
            this.quickProcess++;
        }
    }

    if (!this.activeProcessing) {
        this.activeProcessing = true;
        this.processSpectra();
    }
}
ProcessorManager.prototype.setSpectra = function(spectraManager) {
    this.spectraManager = spectraManager;
    if (this.automatic) {
        var unprocessed = spectraManager.getUnprocessed();
        for (var i = 0; i < unprocessed.length; i++) {
            this.processQueue.push({process: true, match: false, index: unprocessed[i].index, spectra: unprocessed[i]});
        }
        var unmatched = spectraManager.getUnmatched()
        for (var j = 0; j < unmatched.length; j++) {
            this.processQueue.push({process: false, match: true, index: unmatched[j].index, spectra: unmatched[j]});
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
};
ProcessorManager.prototype.processSpectra = function() {
    if (this.processQueue.length > 0 && this.activeProcessing) {
        if (this.quickProcess > 0) {
            var processor = this.getFreeProcessor();
            if (processor) {
                processor.processSpectra(this.processQueue.splice(0, 1)[0]);
                this.quickProcess--;
                if (this.quickProcess == 0) {
                    this.activeProcessing = false;
                }
            }
        } else {
            var processor = this.getFreeProcessor();
            while (processor) {
                var foundAnything = false;
                for (var i = 0; i < this.processQueue.length; i++) {
                    var item = this.processQueue[i];
                    if (item.match == true && item.process == false && item.spectra.isProcessed() == false) {
                        continue;
                    } else {
                        processor.processSpectra(this.processQueue.splice(i, 1)[0]);
                        foundAnything = true;
                        break;
                    }
                }
                if (!foundAnything) {
                    processor = null;
                } else {
                    processor = this.getFreeProcessor();
                }
            }
        }

    }
    this.scope.$apply();
};
ProcessorManager.prototype.signalFinishedMatched = function(index) {
    if (this.interfaceManager != null) {
        this.interfaceManager.updateTemplateForSpectra(index);
    }
}
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
    this.flaggedForDeletion = false;
    this.manager = manager;
    this.workingSpectra = null;
    this.worker = new Worker('js/preprocessor.js');
    this.worker.addEventListener('message', function(e) {
        if (e.data.processedLambda != null) {
            this.workingSpectra.setProcessedValues(e.data.processedLambda, e.data.processedIntensity, e.data.processedVariance);
        } else {
            this.workingSpectra.setMatched(e.data.templateResults);
            this.manager.signalFinishedMatched(this.workingSpectra.index);
        }
        this.workingSpectra = null;
        this.manager.processSpectra();
        if (this.flaggedForDeletion) {
            this.worker = null;
            this.manager = null;
            this.workingSpectra = null;
        }
    }.bind(this), false);
}
Processor.prototype.flagForDeletion = function() {
    this.flaggedForDeletion = true;
}
Processor.prototype.isIdle = function() {
    return this.workingSpectra == null;
};
Processor.prototype.processSpectra = function(data) {
    this.workingSpectra = data.spectra;
    var r = data.spectra.getAsJson(data.process);
    r.process = data.process;
    r.match = data.match;
    this.worker.postMessage(r);
};


function FileManager() {
    this.filename = "results.txt";
}
FileManager.prototype.setFitsFileName = function(filename) {
    this.filename = filename.substr(0, filename.lastIndexOf('.')) + "_Results.txt";
};
FileManager.prototype.saveResults = function(results) {
    var blob = new Blob([results], {type: 'text/html'});
    saveAs(blob, this.filename);
};


function CookieProperties(id, label, value, validation, changecallback) {
    this.id = id;
    this.label = label;
    this.default = value;
    this.value = value;
    this.temp = value;
    this.validation = validation;
    this.changecallback = changecallback;
    this.getFromCookie();
    this.temp = this.value;
}
CookieProperties.prototype.getFromCookie = function() {
    var value = getCookie(this.id);
    if (value != null) {
        this.temp = JSON.parse(value);
        this.updateFromTemp();
    }
};
CookieProperties.prototype.setToCookie = function() {
    setCookie(this.id, JSON.stringify(this.value));
};
CookieProperties.prototype.setValue = function(v) {
    if (this.validation(v)) {
        var changed = this.value != v;
        this.value = v;
        this.setToCookie();
        return changed;
    }
    return false;
};
CookieProperties.prototype.getLabel = function() {
    return this.label;
};
CookieProperties.prototype.getValue = function() {
    return this.value;
};
CookieProperties.prototype.updateFromTemp = function() {
    if (this.setValue(this.temp)) {
        if (this.changecallback != null) {
            this.changecallback(this.value);
        }
    }
};
CookieProperties.prototype.resetToDefault = function() {
    this.temp = this.default;
    this.updateFromTemp();
};