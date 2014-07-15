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

    this.intensityPlot = this.intensity.slice();
    this.processedLambdaPlot = null;
    normaliseViaShift(this.intensityPlot, 0, 500, null);


    this.processedLambda = null;
    this.processedIntensity = null;
    this.processedVariance = null

    this.automaticRedshift = null;
    this.manualRedshift = null;
    this.automaticTemplateID = null;
    this.manualTemplateID = null;
    this.automaticTemplateName = null;
    this.manualTemplateName = null;

    this.qop = 0;

    this.getHash = function() {
        return "" + this.id + this.automaticRedshift + this.manualRedshift + this.isProcessed + this.isMatched;
    }
}
Spectra.prototype.hasRedshift = function() {
    return this.automaticRedshift || this.manualRedshift;
};
Spectra.prototype.getFinalRedshift = function() {
    if (this.manualRedshift) {
        return this.manualRedshift;
    } else if (this.automaticRedshift) {
        return this.automaticRedshift;
    } else {
        return null;
    }
};
Spectra.prototype.getFinalTemplateID = function() {
  if (this.manualRedshift) {
      return this.manualTemplateID;
  }  else {
      return this.automaticTemplateID;
  }
};
Spectra.prototype.getFinalTemplateName = function() {
    if (this.manualRedshift) {
        return this.manualTemplateName;
    }  else {
        return this.automaticTemplateName;
    }
};
Spectra.prototype.getProcessMessage = function() {
    return {
        processing: true,
        id: this.id,
        lambda: this.lambda,
        intensity: this.intensity,
        variance: this.variance
    };
};
Spectra.prototype.getMatchMessage = function() {
    return {
        processing: false,
        id: this.id,
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
//    this.workingData = null;
    this.$q = $q;
    this.worker = new Worker('js/worker.js');
    this.worker.addEventListener('message', function(e) {
//        this.workingData = null;
        this.promise.resolve(e);
        this.promise = null;
        if (this.flaggedForDeletion) {
            this.worker = null;
        }
    }.bind(this), false);
}
Processor.prototype.flagForDeletion = function() {
    this.flaggedForDeletion = true;
}
Processor.prototype.isIdle = function() {
    return this.promise == null;
};
Processor.prototype.workOnSpectra = function(data) {
//    this.workingData = data;
    this.promise = this.$q.defer();
    this.worker.postMessage(data);
    return this.promise.promise;
};