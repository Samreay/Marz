/** The classes file is used to declare some standard javascript classes which will be used in
 * the angular js services */

/** The spectra class is used to store information about each spectra loaded into marz
 * @param id - the fibre id
 * @param lambda - an array of wavelengths in Angstroms
 * @param intensity - an array of flux intensities
 * @param variance - an array of flux intensity variance
 * @param sky - an array of sky flux intensity, if it exists
 * @param name - the object's name
 * @param ra - the object's right ascension
 * @param dec - the object's declination
 * @param magnitude - the object's magnitude (extracted from fits file, not band explicit)
 * @param type - the object's type. Used to generate the prior for OzDES matching
 * @param filename - the filename this spectra belonged to. Used for storing data behind the scenes
 * @param drawingService - bad code style, but the angularjs drawing service is passed in to simplify logic in other locations
 * @constructor
 */
function Spectra(id, lambda, intensity, variance, sky, name, ra, dec, magnitude, type, filename) {
    this.id = id;
    this.name = name;
    this.ra = ra;
    this.dec = dec;
    this.magnitude = magnitude;
    this.type = type;
    this.filename = filename;
    this.lambda = lambda;
    this.intensity = intensity;
    this.variance = variance;
    this.variancePlot = variance;
    this.comment = "";
    this.compute = true;
    if (variance != null) {
        this.variancePlot = variance.slice();
        removeNaNs(this.variancePlot);
        normaliseViaShift(this.variancePlot, 0, 50, null);
    }
    this.autoQOP = null;
    this.sky = sky;
    this.intensitySubtractPlot = null;

    this.isProcessed = false;
    this.isProcessing = false;
    this.isMatched = false;
    this.isMatching = false;

    if (this.intensity != null) {
        this.intensityPlot = this.intensity.slice();
        this.processedLambdaPlot = null;
    }

    this.processedLambda = null;
    this.processedContinuum = null;
    this.processedIntensity = null;
    this.processedVariance = null

    this.templateResults = null;
    this.automaticResults = null;
    this.automaticBestResults = null;
    this.manualRedshift = null;
    this.manualTemplateID = null;

    this.qopLabel = "";
    this.setQOP(0);
    this.imageZ = null;
    this.imageTID = null;
    this.image = null;
    this.getHash = function() {
        return "" + this.id + this.name + this.getFinalRedshift() + this.getFinalTemplateID() + this.isProcessed + this.isMatched;
    }
}
Spectra.prototype.setCompute = function(compute) {
    this.compute = compute;
    if (!compute) {
        this.isProcessed = true;
        this.isMatched = true;
    }
};
Spectra.prototype.setQOP = function(qop) {
    if (isNaN(qop)) {
        return;
    }
    this.qop = qop;
    // Best coding practise would have this UI logic outside of this class
    if (qop >= 6) {
        this.qopLabel = "label-primary";
    } else if (qop >= 4) {
        this.qopLabel = "label-success";
    } else if (qop >= 3) {
        this.qopLabel = "label-info";
    } else if (qop >= 2) {
        this.qopLabel = "label-warning";
    } else if (qop >= 1) {
        this.qopLabel = "label-danger";
    } else {
        this.qopLabel = "label-default";
    }
};
Spectra.prototype.getRA = function() {
    return this.ra * 180 / Math.PI;
};
Spectra.prototype.getDEC = function() {
    return this.dec * 180 / Math.PI;
};
Spectra.prototype.getImage = function(drawingService) {
    if (this.getFinalRedshift() != this.imageZ || this.imageTID != this.getFinalTemplateID() || this.image == null) {
        this.imageTID = this.getFinalTemplateID();
        this.imageZ = this.getFinalRedshift();
        this.image = this.getImageUrl(drawingService);
    }
    return this.image;

};
Spectra.prototype.getComment = function() {
    return this.comment;
};
Spectra.prototype.setComment = function(comment) {
    this.comment = comment;
};
Spectra.prototype.getImageUrl = function(drawingService) {
    var canvas = document.createElement('canvas');
    var ratio = window.devicePixelRatio || 1.0;
    var width = 318;
    var height = 118;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    var ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    drawingService.drawOverviewOnCanvas(this, canvas, width, height);
    return canvas.toDataURL();
};
Spectra.prototype.getTemplateResults = function() {
    return this.templateResults;
};
Spectra.prototype.getIntensitySubtracted = function() {
    if (this.intensitySubtractPlot == null) {
        if (this.intensityPlot == null) {
            return null;
        } else {
            this.intensitySubtractPlot = this.intensity.slice();
            subtractPolyFit(this.lambda, this.intensitySubtractPlot);
            return this.intensitySubtractPlot;
        }
    } else {
        return this.intensitySubtractPlot;
    }
};
Spectra.prototype.hasRedshift = function() {
    return this.automaticBestResults != null || this.manualRedshift != null;
};
Spectra.prototype.getBestAutomaticResult = function() {
    if (this.automaticBestResults != null) {
        return this.automaticBestResults[0];
    }
    return null;
};
Spectra.prototype.getMatches = function(number) {
    if (number == null) return this.automaticBestResults;
    if (this.automaticBestResults == null) return [];
    return this.automaticBestResults.slice(0, number);
};
Spectra.prototype.getManual = function() {
    if (this.manualRedshift == null) return null;
    return {templateId: this.manualTemplateID, z: this.manualRedshift};
};
Spectra.prototype.getNumBestResults = function() {
    if (this.automaticBestResults == null) return 0;
    return this.automaticBestResults.length;
};
Spectra.prototype.hasMatches = function() {
    return (this.automaticBestResults != null && this.automaticBestResults.length > 1);
};
Spectra.prototype.getFinalRedshift = function() {
    if (this.manualRedshift != null) {
        return this.manualRedshift;
    } else if (this.automaticBestResults != null) {
        return this.automaticBestResults[0].z;
    } else {
        return null;
    }
};
Spectra.prototype.hasRedshiftToBeSaved = function() {
    return this.getFinalRedshift() != null;
};
Spectra.prototype.getFinalTemplateID = function() {
  if (this.manualRedshift) {
      return this.manualTemplateID;
  } else if (this.automaticBestResults) {
      return this.automaticBestResults[0].templateId;
  } else {
      return null;
  }
};
Spectra.prototype.getProcessingAndMatchingMessage = function() {
    return {
        processing: true,
        matching: true,
        id: this.id,
        name: this.name,
        lambda: this.lambda,
        type: this.type,
        intensity: this.intensity,
        variance: this.variance
    }
};
Spectra.prototype.getProcessMessage = function() {
    return {
        processing: true,
        id: this.id,
        name: this.name,
        lambda: this.lambda,
        intensity: this.intensity,
        variance: this.variance
    };
};
Spectra.prototype.getMatchMessage = function() {
    return {
        matching: true,
        id: this.id,
        name: this.name,
        type: this.type,
        lambda: this.processedLambda,
        intensity: this.processedIntensity,
        variance: this.processedVariance
    };
};






/**
 * The processor is responsible for hosting the worker and communicating with it.
 * @param $q - the angular promise creation object
 */
function Processor($q, node, worker) {
    this.flaggedForDeletion = false;
    this.node = node;
    this.$q = $q;
    if (worker == null) {
        this.worker = new Worker('js/worker.js');
    } else {
        this.worker = worker;
    }
    if (node) {
        try {
            this.worker.on('message', this.respond.bind(this));
        } catch (err) {}

    } else {
        try {
            this.worker.addEventListener('message', this.respond.bind(this), false);
        } catch (err) {}
    }
}
Processor.prototype.respond = function(e) {
    //window.onFileMatched("Got response");
    this.promise.resolve(e);
    this.promise = null;
    if (this.flaggedForDeletion) {
        this.worker = null;
    }
};
Processor.prototype.flagForDeletion = function() {
    this.flaggedForDeletion = true;
};
Processor.prototype.isIdle = function() {
    return this.promise == null;
};
Processor.prototype.workOnSpectra = function(data) {
    this.promise = this.$q.defer();
    if (this.node) {
        this.worker.send(data);
    } else {
        this.worker.postMessage(data);
    }
    return this.promise.promise;
};

function getProcessors($q, numberProcessors, node) {
    var processors = [];
    if (node) {
        //window.onFileMatched("IN 1");
        var workers = getNodeWorkers(numberProcessors);
        //window.onFileMatched("IN 2");
        //window.onFileMatched(workers.length);
        for (var i = 0; i < workers.length; i++) {
            processors.push(new Processor($q, true, workers[i]))
        }
    } else {
        for (var i = 0; i < numberProcessors; i++) {
            processors.push(new Processor($q, false))
        }
    }
    //window.onFileMatched("IN 3");
    return processors;
}

function getNodeWorkers(numberProcessors) {
    return window.getWorkers();
}


/**
 * This represents a stateful cumulative absolute area finder (super basic integral).
 *
 * Class kept in in case I need it again, I've done it a different way for now.
 * @param array
 * @constructor
 */
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
};