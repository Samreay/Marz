// CONFIG FOR PIXEL MASKING
var minVal = -1e4;          // Intensity less than this is bad
var maxVal = 1e6;           // Intensity greater than this is bad
var numPoints = 4;          // When bad, averages over this many pixels to either side.
var max_error = 1e10;

// CONFIG FOR COSMIC RAY DETECTION
var cosmicIterations = 2;   // How many iterations to do
var deviationFactor = 30;   // How many std devs from the mean before clipping
var pointCheck = 2;         // Checks deviation not from mean, but from a certain number of pixels away

// CONFIG FOR POLY FIT REJECT
var polyFitInteractions = 15;
var polyFitRejectDeviation = 3.5;

// CONFIG FOR CONTINUUM SUBTRACTION
var polyDeg = 6;
var medianWidth = 51;
var smoothWidth = 121;

// CONFIG FOR APODIZATION
var zeroPixelWidth = 5; // Figure out why this isn't zero.
var taperWidth = 60;

// CONFIG FOR ERROR ADJUSTMENT
var broadenWindow = 3;
var errorMedianWindow = 13;
var errorMedianWeight = 0.7;

// CONFIG FOR NORMALISATION
var clipValue = 25;


// CONFIG FOR REBINNING
var startPowerQ = 2.8;
var endPowerQ = 4.6;
var startPower = 3.3;
var endPower = 4.1;
//var arraySize = 65536; // Must be a power of two
var arraySize = 32768; // Must be a power of two

// CONFIG FOR XCORR NORMALISATION
var trimAmount = 0.04;

// CONFIG FOR QUASAR WEIGHTING
// CURRENTLY NOT UTILISED
var baseWeight = 0.01;
var gaussianWidth = 0.0003; // ANGSTROM


// FIT WINDOW FOR MANUAL FITTING
var fitWindow = 100;