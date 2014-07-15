importScripts('../lib/regression.js', 'tools.js', 'methods.js', 'templates.js', 'classes.js')
var templateManager = new TemplateManager();
var shifted_temp = false;
var self = this;




self.processData = function(lambda, intensity, variance) {
    removeBlanks(intensity, variance, 3);
    removeCosmicRay(intensity, variance, 4, 2, 2);
    rollingPointMean(intensity, variance, 4, 0.85);
    subtractPolyFit(lambda, intensity);
    normaliseViaArea(intensity, variance);
    convertLambdaToLogLambda(lambda, intensity, variance);

};

self.process = function(data) {
    self.processData(data.lambda, data.intensity, data.variance);
    return data;
};
self.calculateWeights = function(intensity) {
    var weights = [];
    var totalWeight = 0;
    for (var i = 0; i < intensity.length; i++) {
        weights.push(Math.pow(Math.abs(intensity[i]), 0.5));
        totalWeight += weights[i];
    }
    return weights;
};
self.addEventListener('message', function(event) {

    var data = event.data;
    var result = null;
    if (data.processing) {
        self.process(data);
        result = data;
    } else {
        if (!shifted_temp) {
            templateManager.shiftToMatchSpectra(data.lambda);
            shifted_temp = true;
        }
        result = {
            id: data.id,
            results: self.matchTemplates(data.lambda, data.intensity, data.variance, data.type)
        };
    }
    self.postMessage(result);
});

self.matchTemplates = function(lambda, intensity, variance, type) {
    var weights = self.calculateWeights(intensity);
    var templateResults = [];
    for (var i = 0; i < templateManager.templates.length; i++) {
        templateResults.push(self.matchTemplate(i, templateManager.templates[i], lambda, intensity, variance, weights, new FastAreaFinder(intensity)))
    }
    var results = self.coalesceResults(templateResults, type);
    return results;
};
self.matchTemplate = function(index, template, lambda, intensity, variance, weights, intensityAreaFinder) {
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
        r = self.matchTemplateAtRedshift(intensity, variance, weights, template.interpolatedSpec, offsets[i], intensityAreaFinder, templateAreaFinder, zs[i]);
        result.res.push({gof: r[0]/Math.pow(r[1],2.5), chi2: r[0], z: parseFloat(zs[i].toFixed(5)), scale: r[2], weight: r[1]});
    }
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
};