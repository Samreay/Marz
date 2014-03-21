/**
 * This file is responsible for data preprocessing. Extra preprocessing functions
 * should be added to this file, and the method calls added to the processData function.
 */
importScripts('regression.js', 'tools.js', 'templates.js')
var templateManager = new TemplateManager();
var shifted_temp = false;
var max_error = 1e6;

/**
 *  Removes cosmic rays from the data by removing any points more than 5 rms dev apart
 *
 * @param intensity
 * @param variance
 */
function removeCosmicRay(intensity, variance, factor, numPoints) {
    //TODO: SCIENCE: Actually do rms removal correctly. This is just wrong.
    var rms = 0;
    var mean = 0;
    for (var i = 0; i < intensity.length; i++) {
        mean += intensity[i];
    }
    mean = mean / intensity.length;
    for (var i = 0; i < intensity.length; i++) {
        rms += Math.pow(intensity[i] - mean, 2);
    }
    rms = rms / intensity.length;
    rms = Math.pow(rms, 0.5);
    for (var i = 0; i < intensity.length; i++) {
        if (Math.abs(intensity[i] - mean) < factor * rms) {
            continue;
        }
        var maxNeighbour = 0;
        if (i > 0) {
            maxNeighbour = Math.abs(intensity[i - 1] - intensity[i]);
        }
        if (i < intensity.length - 1) {
            maxNeighbour = Math.max(maxNeighbour, Math.abs(intensity[i + 1] - intensity[i]));
        }
        if (maxNeighbour > factor * rms) {
            var r = 0;
            var c = 0;
            for (var j = i - numPoints; j < (i + 1 + numPoints); j++) {
                if (j >= 0 && j < intensity.length && !isNaN2(intensity[j]) && Math.abs(intensity[j]-mean) < rms) {
                    c++;
                    r += intensity[j];
                }
            }
            if (c != 0) {
                r = r / c;
            }
            intensity[i] = r;
            variance[i] = max_error;
        }
    }
}

function isNaN2(a) {
    return a !== a;
}
/**
 * Replaces NaNs with an average over numPoints to either side.
 * Sets the variance to null so the point isnt counted.
 * @param intensity
 * @param variance
 * @param numPoints
 */
function removeBlanks(intensity, variance, numPoints) {
    for (var i = 0; i < intensity.length; i++) {
        if (isNaN(intensity[i])) {
            var r = 0;
            var c = 0;
            for (var j = i - numPoints; j < (i + 1 + numPoints); j++) {
                if (j >= 0 && j < intensity.length && !isNaN(intensity[j])) {
                    c++;
                    r += intensity[j];
                }
            }
            if (c != 0) {
                r = r / c;
            }
            intensity[i] = r;
            variance[i] = max_error;
        }
        if (isNaN(variance[i]) || Math.abs(variance[i]) > max_error || variance[i] <= 0) {
            variance[i] = max_error;
        }
    }
}



function convertVarianceToPercent(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        variance[i] = variance[i] / intensity[i];
    }
}
function convertVarianceToNumber(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        if (intensity[i] == 0) {
            variance[i] = max_error;
        } else {
            variance[i] = variance[i] * intensity[i];
        }
    }
}

/**
 * Converts the equispaced linear scale of the given lambda into an equispaced log scale.
 * Interpolates intensity and variance to this new scale.
 *
 * @param lambda
 * @param intensity
 * @param variance
 */
function convertLambdaToLogLambda(lambda, intensity, variance) {
    var logLambda = linearScale(Math.log(lambda[0])/Math.LN10, Math.log(lambda[lambda.length - 1])/Math.LN10, lambda.length);
    var rescale = logLambda.map(function(x) { return Math.pow(10, x);});
    var newIntensity = interpolate(rescale, lambda, intensity);
    var newVariance = interpolate(rescale, lambda, variance);

    for (var i = 0; i < intensity.length; i++) {
        lambda[i] = logLambda[i];
        intensity[i] = newIntensity[i];
        variance[i] = newVariance[i];
        if (variance[i] == 0) {
            variance[i] = max_error;
        }
    }
}

/**
 * Function transposed from AutoZ code written by Ivan Baldry.
 * Equation from SDSS web page: http://www.sdss.org/dr7/products/spectra/vacwavelength.html
 * Reference to Morton (1991, ApJS, 77, 119).
 * @param lambda
 */
function convertVacuumFromAir(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        lambda[i] = lambda[i] * (1 + 2.735192e-4 + (131.4182/Math.pow(lambda[i], 2)) + (2.76249E8 /Math.pow(lambda[i], 4)));
    }
}

/**
 * Exploit javascripts passing by array references so return statements are not needed.
 *
 * Note that the linear lambda will be converted to a log scale.
 */
function processData(lambda, intensity, variance) {
    removeBlanks(intensity, variance, 3);
    convertVacuumFromAir(lambda);
    removeCosmicRay(intensity, variance, 4, 2);
    rollingPointMean(intensity, variance, 2, 0.8);
    polyFitNormalise(lambda, intensity, variance);
    convertLambdaToLogLambda(lambda, intensity, variance);
}
function matchTemplates(lambda, intensity, variance) {
    var spacing = lambda[1] - lambda[0];
    var templateResults = [];


    for (var j = 0; j < templateManager.getAll().length; j++) {
        var t = templateManager.get(j);

        templateResults.push({'index':j, 'id': t.id, 'gof': 9e9, 'chi2': 9e9, 'z':0});
        var tr = templateResults[j];

        var initialTemplateOffset = (lambda[0] - t.interpolatedStart) / spacing;
        var z = t.z_start;
        var offsetFromZ = Math.floor((Math.log(1 + z)/Math.LN10) / spacing);
        var running = true;
        var totalWeight = 0;
        for (var i = 0; i < intensity.length; i++) {
            totalWeight += Math.abs(intensity[i]);
        }
        while(running) {
            var localChi2 = 0;
            var int = 0;
            var templateIndex = 0;
            var noMatchError = 200 * t.totalWeight/ t.interpolatedSpec.length;
            for (var i = 0; i < lambda.length; i++) {
                int = Math.abs(intensity[i]);
                templateIndex = i + initialTemplateOffset - offsetFromZ;
                if (templateIndex < 0 || templateIndex >= t.interpolatedSpec.length) {
                    localChi2 += 150 + Math.pow(intensity[i]/variance[i], 2);
                } else {
                    localChi2 += Math.pow((intensity[i] - t.interpolatedSpec[templateIndex])/variance[i], 2)
                }
                if (localChi2 > tr.chi2) {
                    break;
                }
            }
//            if (t.id == '44' && z < 1.2) {
//                console.log("z: " + z.toFixed(4) + " chi2: " + localChi2.toFixed(1))
//            }
            // Add in weighting for the amount matched
            var gof = localChi2;
            if (gof < tr.gof) {
                tr.chi2 = localChi2;
                tr.gof = gof;
                tr.z = z;
                //tr.weightRatio = (weight / totalWeight);
            }
            offsetFromZ++;
            z = Math.pow(10, (offsetFromZ * spacing)) - 1;
            if (z > t.z_end || offsetFromZ > lambda.length) {
                running = false;
            }
        }
    }
    var bestIndex = 0;
    for (var i = 1; i < templateResults.length; i++) {
        if (templateResults[i].chi2 < templateResults[bestIndex].chi2) {
            bestIndex = i;
        }
    }
    return [bestIndex, templateResults];
}

self.addEventListener('message', function(e) {
    var d = e.data;
    var lambda = linearScale(d.start_lambda, d.end_lambda, d.intensity.length);
    processData(lambda, d.intensity, d.variance);
    if (!shifted_temp) {
        templateManager.shiftToMatchSpectra(lambda);
        shifted_temp = true;
    }

    var results = matchTemplates(lambda, d.intensity, d.variance);

    self.postMessage({'index': d.index,
        'processedLambda': lambda,
        'processedIntensity': d.intensity,
        'processedVariance': d.variance,
        'bestIndex':results[0],
        'templateResults':results[1]})
}, false);

