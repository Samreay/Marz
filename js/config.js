// Forgive me for manual versioning, but I didn't want to introduce
// and proper build tools (grunt/bower/mvn) as that would complicate contributions
// from non-technical persons. Please see http://semver.org/ for explanations.

// Version only needs to be incremented when matching algorithm changes, not UI.
// Any change in the version will mean prior redshifts stored in the program
// will not be loaded (as they may be different with the update).
var globalConfig = {};
globalConfig.marzVersion = "1.3.8";

globalConfig.waveExt = 'wavelength';
globalConfig.dataExt = 'intensity';
globalConfig.varExt = 'variance';
globalConfig.ivarExt = 'ivar';
globalConfig.skyExt = 'sky';
globalConfig.detailsExt = 'fibres';

// CONFIG FOR PIXEL MASKING
globalConfig.minVal = -1e4;          // Intensity less than this is bad
globalConfig.maxVal = 1e6;           // Intensity greater than this is bad
globalConfig.numPoints = 4;          // When bad, averages over this many pixels to either side.
globalConfig.max_error = 1e10;

// CONFIG FOR COSMIC RAY DETECTION
globalConfig.cosmicIterations = 2;   // How many iterations to do
globalConfig.deviationFactor = 30;   // How many std devs from the mean before clipping

// CONFIG FOR POLY FIT REJECT
globalConfig.polyFitInteractions = 15;
globalConfig.polyFitRejectDeviation = 3.5;

// CONFIG FOR CONTINUUM SUBTRACTION
globalConfig.polyDeg = 6;
globalConfig.medianWidth = 51;
globalConfig.smoothWidth = 121;

// QUASAR SPECIFIC CONFIG
globalConfig.rollingPointWindow = 3;
globalConfig.rollingPointDecay = 0.9;
globalConfig.quasarVarianceMedian = 81;
globalConfig.quasarVarianceBoxcar = 25;
globalConfig.quasarMinMultiple = 5;

// CONFIG FOR APODIZATION
globalConfig.zeroPixelWidth = 5;
globalConfig.taperWidth = 60;

// CONFIG FOR ERROR ADJUSTMENT
globalConfig.errorMedianWindow = 13;
globalConfig.errorMedianWeight = 0.7;

// CONFIG FOR NORMALISATION
globalConfig.clipValue = 25;


// CONFIG FOR REBINNING
globalConfig.startPowerQ = 2.8;
globalConfig.endPowerQ = 4.6;
globalConfig.startPower = 3.3;
globalConfig.endPower = 4.2;
//global.arraySize = 65536; // Must be a power of two
globalConfig.arraySize = 32768; // Must be a power of two
globalConfig.returnedMax = 1024;

// CONFIG FOR XCORR NORMALISATION
globalConfig.trimAmount = 0.04;
globalConfig.trimStd = 2;

// CONFIG FOR QUASAR WEIGHTING
// CURRENTLY NOT UTILISED
globalConfig.baseWeight = 0.01;
globalConfig.gaussianWidth = 0.0003; // ANGSTROM


// FIT WINDOW FOR MANUAL FITTING
globalConfig.fitWindow = 100;


// USER INTERFACE
globalConfig.varianceHeight = 50;

globalConfig.mergeZThreshold = 2e-4; // Redshift threshold above which flag a mismatch
globalConfig.mergeZThresholdQuasar = 1.5e-3; // Redshift threshold above which flag a mismatch

module.exports = function () {
    this.globalConfig = globalConfig;
};
