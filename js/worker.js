importScripts('../lib/regression.js', 'tools.js', 'methods.js', 'templates.js', 'classes.js', '../lib/dsp.js', 'config.js', '../lib/dspUtils-11.js')
var templateManager = new TemplateManager();
var shifted_temp = false;
var self = this;
/**
 * This function listens to messages from the main client process. If the processing flag is set
 * in the message data, it processes the data. If the flag is not set, it will match the data and
 * return the results of the matching.
 */
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
    var continuum = polyFitReject(lambda, intensity);
    add(continuum, intensity);
    return continuum;
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
    smoothAndSubtract(intensity);
    taperSpectra(intensity);
    adjustError(variance);
    divideByError(intensity, variance);
    normalise(intensity);

    var result = convertLambdaToLogLambda(lambda, intensity, arraySize);
    lambda = result.lambda;
    intensity = result.intensity;

    var templateResults = templateManager.templates.map(function(template) {
        return self.matchTemplate(template, lambda, intensity);
    });
    return self.coalesceResults(templateResults, type);
};


self.matchTemplate = function(template, lambda, intensity) {
    var result = {'id': template.id, res: []};

    if (!shifted_temp) {
        templateManager.shiftToMatchSpectra();
        shifted_temp = true;
    }

    if (template.id == '6') {
        var fft = new FFT(intensity.length, intensity.length);
        fft.forward(intensity);
        fft.multiply(template.fft);
        var final = fft.inverse();
        final = Array.prototype.slice.call(final);
        circShift(final, final.length/2);



        console.log("myres2 = " + JSON.stringify(Array.prototype.slice.call(final)) + ";");

    }/*
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
    for (var i = 0; i < zs.length; i+=2) {
        r = self.matchTemplateAtRedshift(intensity, variance, weights, template.interpolatedSpec, offsets[i], intensityAreaFinder, templateAreaFinder, zs[i]);
        result.res.push({chi2: r[0]/Math.pow(r[1],2.5), z: parseFloat(zs[i].toFixed(5)), scale: r[2], weight: r[1]});
    }*/
    return result;
};
self.matchTemplateAtRedshift = function(intensity, variance, weights, spec, offset, intensityAreaFinder, templateAreaFinder, z) {
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
    for (var i = start; i < end; i++) {
        chi2 += weights[i] * Math.pow((intensity[i] - s * spec[i + offset])/variance[i], 2);
        w += weights[i];
    }
    return [chi2, w, s];
};
self.coalesceResults = function(templateResults, type) {
    // Adjust for optional weighting
    var coalesced = [];
    for (var i = 0; i < templateResults.length; i++) {
        var tr = templateResults[i];
        var index = tr.index;
        var w =  templateManager.templates[index].weights[''+type];
        if (w == 0 || w == null) {
            w = templateManager.templates[index].weights['blank'];
            if (w == 0 || w == null) {
                w = 1;
            }
        }

        tr.res.sort(function(a,b) { return a.chi2 - b.chi2});
        var tempRes = {index: tr.index, id: tr.id, top: []};
        for (var j = 0; j < 10; j++) {
            tr.res[j].chi2 = tr.res[j].chi2 * w;
            tempRes.top.push(tr.res[j]);
        }
        coalesced.push(tempRes);
    }
    coalesced.sort(function(a,b) { return a.top[0].chi2 - b.top[0].chi2});

    var templates = [];
    for (var i = 0; i < templateResults.length; i++) {
        var chi2 = [];
        var zs = [];
        for (var j = 0; j < templateResults[i].res.length; j++) {
            chi2.push(templateResults[i].res[j].chi2);
            zs.push(templateResults[i].res[j].z);
        }
        templates.push({id: templateResults[i].id, z: chi2, chi2: zs});

    }
    return {coalesced: coalesced, templates: templates};
};