function Spectra(id, lambda, intensity, variance, sky, skyAverage, name, ra, dec, magnitude, type, filename) {
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
    this.sky = sky;
    this.skyAverage = skyAverage;

    this.isProcessed = false;
    this.isProcessing = false;
    this.isMatched = false;
    this.isMatching = false;

    if (this.intensity != null) {
        this.intensityPlot = this.intensity.slice();
        this.processedLambdaPlot = null;
        normaliseViaShift(this.intensityPlot, 0, 600, null);
        this.intensitySubtractPlot = this.intensityPlot.slice();
        //subtractPolyFit(this.lambda, this.intensitySubtractPlot);
    }

    if (this.sky != null) {
        this.skyMax
    }

    this.processedLambda = null;
    this.processedContinuum = null;
    this.processedIntensity = null;
    this.processedVariance = null

    this.automaticResults = null;
    this.automaticBestResults = null;
    this.manualRedshift = null;
    this.manualTemplateID = null;

    this.qop = 0;

    this.getHash = function() {
        return "" + this.id + this.name + this.getFinalRedshift() + this.getFinalTemplateID() + this.isProcessed + this.isMatched;
    }
}
Spectra.prototype.hasRedshift = function() {
    return this.automaticBestResults || this.manualRedshift;
};
Spectra.prototype.getBestAutomaticResult = function() {
    if (this.automaticBestResults != null) {
        return this.automaticBestResults[0];
    }
    return null;
};
Spectra.prototype.getMatches = function(number) {
    if (number == null) return this.automaticBestResults;
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
    if (this.manualRedshift) {
        return this.manualRedshift;
    } else if (this.automaticBestResults) {
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
        processing: false,
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
function Processor($q) {
    this.flaggedForDeletion = false;
    this.$q = $q;
    this.worker = new Worker('js/worker.js');
    this.worker.addEventListener('message', function(e) {
        this.promise.resolve(e);
        this.promise = null;
        if (this.flaggedForDeletion) {
            this.worker = null;
        }
    }.bind(this), false);
}
Processor.prototype.flagForDeletion = function() {
    this.flaggedForDeletion = true;
};
Processor.prototype.isIdle = function() {
    return this.promise == null;
};
Processor.prototype.workOnSpectra = function(data) {
    this.promise = this.$q.defer();
    this.worker.postMessage(data);
    return this.promise.promise;
};








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