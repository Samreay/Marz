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
    this.isMatched = false;

    this.processedIntensity = null;
    this.processedLambda = null; //TODO: Should not have a processed lambda. Vacuum shift already being done.

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