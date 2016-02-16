/******************************************************************
 * ANY CHANGES OF THIS FILE MUST BE CONVEYED IN A VERSION INCREMENT
 * OF marzVersion IN config.js!
 ******************************************************************/
var deps = ["./templates", "./helio", "./config"];
for (var i = 0; i < deps.length; i++) {
    require(deps[i])();
}
var node = false;
var templateManager = new TemplateManager(true, true);
var self = this;

/**
 * Handles all worker related events, including data processing and spectra matching.
 *
 * ANY CHANGES IN THIS FUNCTION OR CHILD FUNCTIONS MUST BE CONVEYED IN A VERSION INCREMENT
 * OF marzVersion IN config.js!
 *
 */
function handleEvent(data) {
    templateManager.setInactiveTemplates(data.inactiveTemplates);
    node = data.node;
    var result = null;
    // Whether the data gets processed or matched depends on if a processing property is set
    if (data.processing) {
        self.process(data);
        result = data;
    }
    if (result == null) {
        result = {}
    }
    if (data.matching) {
        result['matching'] = true;
        result['id'] = data.id;
        result['name'] = data.name;
        result['results'] = self.matchTemplates(data.lambda, data.intensity, data.variance, data.type, data.helio, data.cmb);
    }
    return result;
}



/**
 * This function takes a data structure that has lambda, intensity and variance arrays set. It will add
 * a continuum array (which is the intensity without subtraction) and modified intensity and variance arrays
 * such that the continuum has been subtracted out
 * @param data
 * @returns the input data data structure with a continuum property added
 */
self.process = function(data) {

    if (!node) {
        data.processedVariancePlot = data.variance.slice();
        removeNaNs(data.processedVariancePlot);
        for (var i = 0; i < 3; i++ ) {
            clipVariance(data.processedVariancePlot);
        }
        normaliseViaShift(data.processedVariancePlot, 0, globalConfig.varianceHeight, null);
    }
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

self.getTemplatesToMatch = function() {
    var ts = templateManager.templates;
    var result = [];
    var eigens = {}
    for (var i = 0; i < ts.length; i++) {
        var t = ts[i];
        if (t.eigentemplate == null) {
            result.push([t])
        } else {
            if (eigens[t.eigentemplate] == null) {
                eigens[t.eigentemplate] = [t]
            } else {
                eigens[t.eigentemplate].push(t)
            }
        }
    }
    for (var key in eigens) {
        if (eigens.hasOwnProperty(key)) {
            result.push(eigens[key]);
        }
    }
    return result;
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
self.matchTemplates = function(lambda, intensity, variance, type, helio, cmb) {

    var quasarFFT = null;
    if (templateManager.isQuasarActive()) {
        quasarFFT = getQuasarFFT(lambda, intensity, variance);
    }
    var res = getStandardFFT(lambda, intensity, variance, !node);
    var subtracted = null;
    var fft = null;
    if (node) {
        fft = res;
    } else {
        fft = res[0];
        subtracted = res[1];
    }

    // For each template, match the appropriate transform
    var ts = self.getTemplatesToMatch();
    var templateResults = ts.map(function(templates) {
        if (templateManager.isQuasar(templates[0].id)) {
            return matchTemplate(templates, quasarFFT);
        } else {
            return matchTemplate(templates, fft);
        }
    });
    var coalesced = self.coalesceResults(templateResults, type, subtracted, helio, cmb);

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
self.coalesceResults = function(templateResults, type, intensity, helio, cmb) {
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
            tr.peaks[j].z = adjustRedshift(tr.zs[tr.peaks[j].index], helio, cmb);
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
        var res = adjustRedshift(getRedshiftForNonIntegerIndex(templateManager.getTemplateFromId(topTen[k].templateId), index), helio, cmb);
        topTen[k] = {
            z:  Math.round(res * 1e5) / 1e5,
            index: index,
            templateId: topTen[k].templateId,
            value: topTen[k].value
        };
    }
    var templates = {};
    var returnedMax = globalConfig.returnedMax;
    for (var i = 0; i < templateResults.length; i++) {
        var tr = templateResults[i];
        var numCondense = Math.ceil(tr.zs.length / returnedMax);
        var zs = [];
        var xcor = [];
        var c1 = 0;
        var c2 = 0;
        if (tr.zs.length > 1) {
            for (var j = 0; j < tr.zs.length; j++) {
                c1 += adjustRedshift(tr.zs[j], helio, cmb);
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
        if (node) {
            templates[tr.id] = {
                zs: null,
                xcor: null,
                weight: w
            };
            zs = null;
            xcor = null;
        } else {
            templates[tr.id] = {
                zs: zs,
                xcor: xcor,
                weight: w
            };
        }

    }
    var autoQOP = self.getAutoQOP(topTen);
    return {
        coalesced: topTen,
        templates: templates,
        intensity2: intensity,
        autoQOP: autoQOP
    };
};

/**
 *  Returns an auto QOP from the coalesced matching results. Needs tuning.
 *
 * @returns {number} QOp integer, 1,2,3,4 or 6
 */
self.getAutoQOP = function(coalesced) {
    if (coalesced.length < 2) {
        return 0;
    }
    var mainV = coalesced[0].value;
    var secondV = coalesced[1].value;

    var isStar = templateManager.getTemplateFromId(coalesced[0].templateId).isStar == true;
    var pqop = 0;
    var fom = Math.pow(mainV - 2.5, 0.75) * (mainV / secondV);
    if (fom > 8.5) {
        pqop = 4;
    } else if (fom > 4.5) {
        pqop = 3;
    } else if (fom > 3) {
        pqop = 2;
    } else {
        pqop = 1;
    }
    return (pqop > 2 && isStar ? 6 : pqop);
};

module.exports = function() {
    this.handleEvent = handleEvent;
    this.workerTemplateManager = templateManager;
};
