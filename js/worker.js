importScripts('../lib/regression.js', 'tools.js', 'methods.js', 'templates.js', 'classes.js', '../lib/dsp.js', 'config.js')
var templateManager = new TemplateManager();
var shifted_temp = false;
var self = this;
/**
 * This function listens to messages from the main client process. If the processing flag is set
 * in the message data, it processes the data. If the flag is not set, it will match the data and
 * return the results of the matching.
 */
if (!shifted_temp) {
    templateManager.shiftToMatchSpectra();
    shifted_temp = true;
}

self.addEventListener('message', function(event) {

    var data = event.data;
    var result = null;
    if (data.processing) {
        self.process(data);
        result = data;
    } else {
        result = {
            id: data.id,
            name: data.name,
            results: self.matchTemplates(data.lambda, data.intensity, data.variance, data.type)
        };
    }
    self.postMessage(result);
});
self.process = function(data) {
    data.continuum = self.processData(data.lambda, data.intensity, data.variance);
    return data;
};
/**
 * Preprocesses the data to make it easier for a user to find a manual redshift.
 *
 * Returns the continuum, so that users can toggle it on or off.
 */
self.processData = function(lambda, intensity, variance) {
    removeBadPixels(intensity, variance);
    removeCosmicRay(intensity, variance);
    var res = intensity.slice();
    polyFitReject(lambda, intensity);
    return res;
};

/**
 * This is the real part of the program. The matching algorithm.
 *
 * This function will get the matching results for every available template, and then coalesce them
 * into a singular data structure which is then returned to the user.
 *
 * @param lambda
 * @param intensity
 * @param variance
 * @param type (eg AGN_reverberation)
 * @returns a data structure of results, containing both the fit at each redshift for each template, and an
 * ordered list of best results.
 */
self.matchTemplates = function(lambda, intensity, variance, type) {

    //TODO: By this section need to ensure the templates are shifted and interpolated,
    //TODO: and that the variance has been factored into the intensity as per autoz.
    var quasarIntensity = intensity.slice();

    smoothAndSubtract(intensity);
    taperSpectra(intensity);
    adjustError(variance);
    divideByError(intensity, variance);
    normalise(intensity);



    rollingPointMean(quasarIntensity, 3, 0.9);
    taperSpectra(quasarIntensity);
    normalise(quasarIntensity);


//    console.log("intensity=" + JSON.stringify(intensity) + ";quasarIntensity="+JSON.stringify(quasarIntensity)+";");
//    console.log("quasarIntensity="+JSON.stringify(quasarIntensity)+";");

    var result = convertLambdaToLogLambda(lambda, intensity, arraySize);
    var quasarResult = convertLambdaToLogLambda(lambda, quasarIntensity, arraySize);
    var quasarIntensity = quasarResult.intensity;
    lambda = result.lambda;
    intensity = result.intensity;

    var fft = new FFT(intensity.length, intensity.length);
    fft.forward(intensity);
    var quasarFFT = new FFT(quasarIntensity.length, quasarIntensity.length);
    quasarFFT.forward(quasarIntensity);

    var templateResults = templateManager.templates.map(function(template) {
        if (template.id == '12') {
            return self.matchTemplate(template, quasarFFT);
        } else {
            return self.matchTemplate(template, fft);
        }
    });
    return self.coalesceResults(templateResults, type);
};


self.matchTemplate = function(template, fft) {
    var fftNew = fft.multiply(template.fft);
    var final = fftNew.inverse();
    final = Array.prototype.slice.call(final);
    circShift(final, final.length/2);
    final = pruneResults(final, template);
    var finalPeaks = normaliseXCorr(final);
    return {
        id: template.id,
        zs: template.zs,
        xcor: final,
        peaks: finalPeaks
    };
};

self.coalesceResults = function(templateResults, type) {
    // Adjust for optional weighting
    var coalesced = [];
    for (var i = 0; i < templateResults.length; i++) {
        var tr = templateResults[i];
        var t = templateManager.getTemplateFromId(tr.id);

        // Find the weight to apply
        var w =  t.weights[''+type];
        if (w == 0 || w == null) {
            w = t.weights['blank'];
            if (w == 0 || w == null) {
                w = 1;
            }
        }

        for (var j = 0; j < tr.peaks.length; j++) {
            tr.peaks[j].value = tr.peaks[j].value / w;
            tr.peaks[j].z = tr.zs[tr.peaks[j].index];
            tr.peaks[j].templateId = tr.id;
            coalesced.push(tr.peaks[j]);
        }
    }
    coalesced.sort(function(a,b) { return b.value - a.value});

    // Return only the ten best results
    coalesced.splice(10, coalesced.length - 1);

    for (var k = 0; k < coalesced.length; k++) {
        // Javascript only rounds to integer, so this should get four decimal places
        coalesced[k].z =  Math.round(coalesced[k].z * 1e4) / 1e4;
    }

    //TODO: Instead of just splicing, make sure the best results are a threshold value in redshift different

    //TODO: For each of those results we actually want to do a quadratic fit.

    //TODO: Add all info back in after shrinking down the zs array to < 5000 elements

//    var templates = [];
//    for (var i = 0; i < templateResults.length; i++) {
//        var chi2 = [];
//        var zs = [];
//        for (var j = 0; j < templateResults[i].res.length; j++) {
//            chi2.push(templateResults[i].res[j].chi2);
//            zs.push(templateResults[i].res[j].z);
//        }
//        templates.push({id: templateResults[i].id, z: chi2, chi2: zs});
//
//    }
    return {coalesced: coalesced, templates: null};
};