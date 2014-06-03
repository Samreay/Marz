/**
 * This file is responsible for data preprocessing. Extra preprocessing functions
 * should be added to this file, and the method calls added to the processData function.
 */
importScripts('../lib/regression.js', 'tools.js', 'templates.js')
var templateManager = new TemplateManager();
var shifted_temp = false;
var max_error = 1e6;

/**
 *  Removes cosmic rays from the data by removing any points more than 5 rms dev apart
 *
 * @param intensity
 * @param variance
 */
function removeCosmicRay(intensity, variance, factor, numPoints, numTimes) {
    for (var n = 0; n < numTimes; n++) {
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
 * Exploit javascripts passing by array references so return statements are not needed.
 *
 * Note that the linear lambda will be converted to a log scale.
 */
function processData(lambda, intensity, variance) {
    removeBlanks(intensity, variance, 3);
    convertVacuumFromAir(lambda);
    removeCosmicRay(intensity, variance, 4, 2, 2);
    rollingPointMean(intensity, variance, 4, 0.85);
    subtractPolyFit(lambda, intensity);
    normaliseViaArea(intensity, variance);
    convertLambdaToLogLambda(lambda, intensity, variance);
}
function calculateWeights(intensity) {
    var weights = [];
    var totalWeight = 0;
    for (var i = 0; i < intensity.length; i++) {
        weights.push(Math.pow(Math.abs(intensity[i]), 0.5));
        totalWeight += weights[i];
    }
    return weights;
}
function matchTemplates(lambda, intensity, variance, type) {
//    var startMatch = new Date();

//    Variables used for independent of template
    var weights = calculateWeights(intensity);

    var templateResults = [];
    for (var i = 0; i < templateManager.getAll().length; i++) {
//        var startTemplate = new Date();
        templateResults.push(matchTemplate(i, templateManager.get(i), lambda, intensity, variance, weights, new FastAreaFinder(intensity)))
//        printProfile(startTemplate, 'Matching ' + templateManager.get(i).name);
    }

    var results = coalesceResults(templateResults, type);

//    printProfile(startMatch, 'match2');
    return results;
}
function coalesceResults(templateResults, type) {
    // Adjust for optional weighting
    var coalesced = [];
    for (var i = 0; i < templateResults.length; i++) {
        var tr = templateResults[i];
        var index = tr.index;
        var w =  templateManager.weights[index][''+type];
        if (w == 0 || w == null) {
            w = templateManager.weights[index]['blank'];
            if (w == 0 || w == null) {
                w = 1;
            }
        }

        tr.res.sort(function(a,b) { return a.gof - b.gof});
        var tempRes = {index: tr.index, id: tr.id, top: []};
        for (var j = 0; j < 100; j++) {
            tr.res[j].gof = tr.res[j].gof * w;
            tempRes.top.push(tr.res[j]);
        }
        coalesced.push(tempRes);
    }
    coalesced.sort(function(a,b) { return a.top[0].gof - b.top[0].gof});

    return coalesced;

}
function matchTemplate(index, template, lambda, intensity, variance, weights, intensityAreaFinder) {
    var result = {'index': index, 'id': template.id, res: []};
    var templateAreaFinder = new FastAreaFinder(template.interpolatedSpec);

    var spacing = (lambda[1] - lambda[0]);
    var initialTemplateOffset = (lambda[0] - template.interpolatedStart) / spacing;

    var offsets = [];
    var zs = [];

    // Generate all viable redshifts to check
    var z = template.z_start;
    var offsetFromZ = Math.floor((Math.log(1 + z)/Math.LN10) / spacing);
    var lambda_start = Math.pow(10, template.interpolatedLambda[0]) / (1 + template.redshift);
    while(z < template.z_end) {
        zs.push(z);
        offsets.push(initialTemplateOffset-offsetFromZ);
        offsetFromZ++;
        z = (Math.pow(10, template.interpolatedLambda[0] + (offsetFromZ * spacing))/lambda_start) - 1;
    }

    // Get chi2 for all redshifts
    var r = null;
    for (var i = 0; i < zs.length; i++) {
        r = matchTemplateAtRedshift(intensity, variance, weights, template.interpolatedSpec, offsets[i], intensityAreaFinder, templateAreaFinder, zs[i]);
        result.res.push({gof: r[0]/Math.pow(r[1],2.5), chi2: r[0], z: zs[i], scale: r[2], weight: r[1]});
    }
    return result;
}


function matchTemplateAtRedshift(intensity, variance, weights, spec, offset, intensityAreaFinder, templateAreaFinder, z) {
    var start = Math.max(0, -offset);
    var end = Math.min(intensity.length, spec.length-offset);
    if ((end-start)/intensity.length < 0.4) {
        return [19e9, 1, 1];
    }
    var w = 0;
    var chi2 = 0;
    var a = intensityAreaFinder.getArea(start,end);
    var b = (1.3*templateAreaFinder.getArea(start + offset, end + offset));
    var s = Math.max(0.5, a / b); // Factors to stop zero lines and to reflect less noise in templates
    /*if (Math.abs(z-0.262287) < 0.0001  || Math.abs(z-0.743107) < 0.0001) {
        console.log("Z: " + z + " A: " + a + " B: " + b + " START: " + start + " END: " + end + " OFFSET: " + offset + " L1: " + intensity.length + " L2: " + spec.length);
    }*/
    for (var i = start; i < end; i++) {
        chi2 += weights[i] * Math.pow((intensity[i] - s * spec[i + offset])/variance[i], 2);
        w += weights[i];
    }
    return [chi2, w, s];
}

self.addEventListener('message', function(e) {
    var d = e.data;
    var match = d.match && !d.hasAutomaticMatch;
    var lambda = d.lambda;
    if (d.process) {
        lambda = linearScale(d.start_lambda, d.end_lambda, d.intensity.length);
        processData(lambda, d.intensity, d.variance);
    }

    if (match) {
        if (!shifted_temp) {
            templateManager.shiftToMatchSpectra(lambda);
            shifted_temp = true;
        }
        var results = matchTemplates(lambda, d.intensity, d.variance, d.type);
    }

    if (d.process && match) {
        self.postMessage({'index': d.index,
            'processedLambda': lambda,
            'processedIntensity': d.intensity,
            'processedVariance': d.variance,
            'templateResults':results})
    } else if (d.process && !match) {
        self.postMessage({'index': d.index,
            'processedLambda': lambda,
            'processedIntensity': d.intensity,
            'processedVariance': d.variance});
    } else if (match && !d.process) {
        self.postMessage({'index': d.index,
            'templateResults':results});
    } else {
        self.postMessage({e: 'nothing to do'});
    }

}, false);

