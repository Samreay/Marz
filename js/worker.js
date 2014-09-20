importScripts('../lib/regression.js', 'tools.js',  'spectralLines.js', 'methods.js', 'templates.js', 'classes.js', '../lib/dsp.js', 'config.js')
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

/**
 * We need to add an event listener that listens for processing requests from the ProcessorService
 */
self.addEventListener('message', function(event) {
    var data = event.data;
    var result = null;
    // Whether the data gets processed or matched depends on if a processing property is set
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

/**
 * This function takes a data structure that has lambda, intensity and variance arrays set. It will add
 * a continuum array (which is the intensity without subtraction) and modified intensity and variance arrays
 * such that the continuum has been subtracted out
 * @param data
 * @returns the input data data structure with a continuum property added
 */
self.process = function(data) {
    data.continuum = self.processData(data.lambda, data.intensity, data.variance);
    return data;
};

/**
 * Preprocesses the data to make it easier for a user to find a manual redshift.
 *
 * Involves flagging and removing bad pixels, along with flagging and removing bad pixels.
 *
 * Continuum subtraction is done via rejected polynomial fitting.
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
 * It first continues processing the spectra, before Fourier transforming them, and passing the transforms
 * to a template matching function (which is found below), before calling the coalesce function and returning
 * its results
 *
 * @param lambda
 * @param intensity
 * @param variance
 * @param type (eg 'AGN_reverberation')
 * @returns a data structure of results, containing both the fit at each redshift for each template, and an
 * ordered list of best results.
 */
self.matchTemplates = function(lambda, intensity, variance, type) {
//    console.log("lambda=" + JSON.stringify(lambda) + ";\nintensity=" + JSON.stringify(intensity) + ";\nvariance=" + JSON.stringify(variance) + ";");

    // As the quasar spectra is matched differently, Ill create a duplicate for the quasar
    var quasarIntensity = intensity.slice();
//    console.log("quasar = " + JSON.stringify(quasarIntensity) + ";");
    rollingPointMean(quasarIntensity, 3, 0.9);
//    console.log("quasar2 = " + JSON.stringify(quasarIntensity) + ";");

    taperSpectra(quasarIntensity);
    normalise(quasarIntensity);

    // The intensity variable is what will match every other template
//    console.log("lambda = " + JSON.stringify(lambda) + ";");
    smoothAndSubtract(intensity);
    var subtracted = intensity.slice();
    taperSpectra(intensity);
    adjustError(variance);
    divideByError(intensity, variance);
    normalise(intensity);

//    console.log("intensity2=" + JSON.stringify(intensity) + ";");
    // Uncomment the below lines if you want to inspect the intensity and quasarIntensity variables
    // You can copy and paste the output straight into MATLAB
//    console.log("intensity=" + JSON.stringify(intensity) + ";quasarIntensity="+JSON.stringify(quasarIntensity)+";");

    // This rebins (oversampling massively) into an equispaced log array. To change the size and range of
    // this array, have a look at the config.js file.
    var result = convertLambdaToLogLambda(lambda, intensity, arraySize, false);
    var quasarResult = convertLambdaToLogLambda(lambda, quasarIntensity, arraySize, true);
    quasarIntensity = quasarResult.intensity;
    intensity = result.intensity;

    // Fourier transform both the intensity and quasarIntensity variables
    var fft = new FFT(intensity.length, intensity.length);
    fft.forward(intensity);
    var quasarFFT = new FFT(quasarIntensity.length, quasarIntensity.length);
    quasarFFT.forward(quasarIntensity);

    // For each template, match the appropriate transform
    var templateResults = templateManager.templates.map(function(template) {
        if (template.id == '12') {
            return self.matchTemplate(template, quasarFFT);
        } else {
            return self.matchTemplate(template, fft);
        }
    });
    return self.coalesceResults(templateResults, type, subtracted);
};

/**
 * Determines the cross correlation (and peaks in it) between a spectra and a template
 *
 * @param template A template data structure from the template manager. Will contain a pre-transformed
 * template spectrum (this is why initialising TemplateManager is so slow).
 * @param fft the Fourier transformed spectra
 * @returns {{id: String, zs: Array, xcor: Array, peaks: Array}} a data structure containing the id of the template, the redshifts of the template, the xcor
 * results of the template and a list of peaks in the xcor array.
 */
self.matchTemplate = function(template, fft) {
    var fftNew = fft.multiply(template.fft);
    var final = fftNew.inverse();
    final = Array.prototype.slice.call(final);
    circShift(final, final.length/2);
    final = pruneResults(final, template);
    // UNCOMMENT SECTION BELOW TO GET XCOR RESULTS FOR QUASAR
/*    if (template.id == '3') {
        debugger;
    }*/
    var finalPeaks = normaliseXCorr(final);
   /* if (template.id == '9') {
        console.log("xcor3 = " + JSON.stringify(final) + ";\nzs=" + JSON.stringify(template.zs) + ";");
    }*/
//    if (template.id == '6') {
//        console.log("xcor2 = " + JSON.stringify(final) + ";");
//    }
    return {
        id: template.id,
        zs: template.zs,
        xcor: final,
        peaks: finalPeaks
    };
};

/**
 * Coalesces the results from all templates into a singular list by adding in the
 * weighting that comes from the prior spectra type. This function is NOT finished
 * (see the null value of the templates variable in the return), because I have not
 * yet had the chance to add in the cross correlation function above the detailed
 * graph as Chris Lidman requested.
 *
 * @param templateResults an array of results from the {matchTemplate} function
 * @param type
 * @returns {{coalesced: Array, templates: null, intensity: Array}}
 */
self.coalesceResults = function(templateResults, type, intensity) {
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
    //TODO: Instead of just splicing, make sure the best results are a threshold value in redshift different

    //TODO: For each of those results we actually want to do a quadratic fit.


    for (var k = 0; k < coalesced.length; k++) {
        // Javascript only rounds to integer, so this should get four decimal places
        coalesced[k].z =  Math.round(coalesced[k].z * 1e4) / 1e4;
    }

    //TODO: Add all info back in after shrinking down the zs array to < 5000 elements so we can get the xcor function

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
    return {coalesced: coalesced, templates: null, intensity: intensity};
};