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
    templateManager.setInactiveTemplates(data.inactiveTemplates);
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
    cullLines(intensity);
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

    var quasarIntensity = intensity.slice();
    var quasarVariance = variance.slice();
    rollingPointMean(quasarIntensity, 3, 0.9);
    taperSpectra(quasarIntensity);
    quasarVariance = medianAndBoxcarSmooth(quasarVariance, 81, 25);
    addMinMultiple(quasarVariance, 20);
    divideByError(quasarIntensity, quasarVariance);
    taperSpectra(quasarIntensity);
    normalise(quasarIntensity);

    // The intensity variable is what will match every other template
    taperSpectra(intensity);
    smoothAndSubtract(intensity);
    var subtracted = intensity.slice();
    adjustError(variance);
    divideByError(intensity, variance);

    taperSpectra(intensity);
    normalise(intensity);


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
            return matchTemplate(template, quasarFFT);
        } else {
            return matchTemplate(template, fft);
        }
    });
    var coalesced = self.coalesceResults(templateResults, type, subtracted, fft, quasarFFT);

    return coalesced;
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
self.coalesceResults = function(templateResults, type, intensity, fft, quasarFFT) {
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
        tr.weight = w;

        for (var j = 0; j < tr.peaks.length; j++) {
            tr.peaks[j].value = tr.peaks[j].value / w;
            tr.peaks[j].z = tr.zs[tr.peaks[j].index];
            tr.peaks[j].templateId = tr.id;
            tr.peaks[j].xcor = tr.xcor;
            coalesced.push(tr.peaks[j]);
        }
    }
    coalesced.sort(function(a,b) { return b.value - a.value});

    // Return only the ten best results
    //coalesced.splice(10, coalesced.length - 1);
    var topTen = [coalesced[0]];
    var thresh = 0.01;
    for (var ii = 1; ii < coalesced.length; ii++) {
        var add = true;
        for (var jj = 0; jj < topTen.length; jj++) {
            if (Math.abs(topTen[jj].z - coalesced[ii].z) < thresh) {
                add = false;
                break;
            }
        }
        if (add) {
            topTen.push(coalesced[ii]);
        }
        if (topTen.length == 10) {
            break;
        }
    }

    for (var k = 0; k < topTen.length; k++) {
        // Javascript only rounds to integer, so this should get four decimal places
        var index = fitAroundIndex(topTen[k].xcor, topTen[k].index);
        var res = getRedshiftForNonIntegerIndex(templateManager.getTemplateFromId(topTen[k].templateId), index);
        topTen[k] = {
            z:  Math.round(res * 1e5) / 1e5,
            index: index,
            templateId: topTen[k].templateId,
            value: topTen[k].value
        };
    }
    var templates = {};
    for (var i = 0; i < templateResults.length; i++) {
        var tr = templateResults[i];
        var numCondense = Math.ceil(tr.zs.length / returnedMax);
        var zs = [];
        var xcor = [];
        var c1 = 0;
        var c2 = 0;
        if (tr.zs.length > 1) {
            for (var j = 0; j < tr.zs.length; j++) {
                c1 += tr.zs[j];
                c2 += tr.xcor[j];
                if ((j + 1) % numCondense == 0) {
                    zs.push(c1 / numCondense);
                    xcor.push(c2 / numCondense);
                    c1 = 0;
                    c2 = 0;
                }
            }
        } else {
            zs = tr.zs;
            xcor = tr.xcor;
        }
        templates[tr.id] = {
            zs: zs,
            xcor: xcor,
            weight: w
        };
    }
    var autoQOP = self.getAutoQOP(topTen);
    return {
        coalesced: topTen,
        templates: templates,
        intensity: intensity,
        autoQOP: autoQOP,
        fft: {real: fft.real, imag: fft.imag},
        quasarFFT: {real: quasarFFT.real, imag: quasarFFT.imag}
    };
};

/**
 *  Returns an auto QOP from the coalesced matching results. Needs tuning.
 *
 * @returns {number} QOp integer, 1,2,3,4 or 6
 */
self.getAutoQOP = function(coalesced) {
    var mainV = coalesced[0].value;
    var secondV = coalesced[1].value;

    var isStar = templateManager.getTemplateFromId(coalesced[0].templateId).isStar == true;
    var pqop = 0;
    var fom = (mainV - 2.5) * (mainV / secondV);
    if (fom > 8.5) {
        pqop = 4;
    } else if (fom > 4) {
        pqop = 3;
    } else if (fom > 2) {
        pqop = 2;
    } else {
        pqop = 1;
    }
    return (pqop > 2 && isStar ? 6 : pqop);
};