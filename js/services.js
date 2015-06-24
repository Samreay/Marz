angular.module('servicesZ', ['dialogs.main'])
    .config(['$logProvider', function($logProvider) {
        $logProvider.debugEnabled(window.location.hostname === "localhost");
    }])
    .provider('global', function() {
        var dataStore = {
            ui: {
                active: null,
                graphicalLayout: true,
                sidebarSmall: false,
                dataSelection: {
                    processed: true,
                    matched: true,
                    variance: false
                },
                quality: {
                    max: 0,
                    bars: [],
                    barHash: {}
                },
                detailed: {
                    bounds: {
                        redshiftMin: 0,
                        redshiftMax: 5,
                        maxMatches: 5,
                        maxSmooth: 7
                    },
                    templateOffset: 0,
                    onlyQOP0: true,
                    templateId: '0',
                    continuum: true,
                    redshift: "0",
                    oldRedshift: "0",
                    matchedActive: true,
                    matchedIndex: null,
                    smooth: "3",
                    width: 300,
                    spectraFocus: null,
                    spectralLines: true,
                    waitingForSpectra: false,
                    lockedBounds: false,
                    lockedBoundsCounter: 1,
                    skyHeight: 125

                },
                colours: {
                    unselected: '#E8E8E8',
                    raw: "#111111",
                    processed: "#067800",
                    matched: "#AA0000",
                    sky: "#009DFF",
                    template: '#8C0623',
                    variance: '#E3A700' //B731E8
                }
            },
            data: {
                fits: [],
                types: [],
                fitsFileName: null,
                spectra: [],
                spectraHash: {},
                history: []
            },
            filters: {
                typeFilter: '*',
                templateFilter: '*',
                redshiftFilter: '*',
                qopFilter: '*'
            },
            personal: {
                initials: ""
            }
        };
        this.$get = [function() {
            return dataStore;
        }]
    })

    .service('personalService', ['global', 'cookieService', 'dialogs', '$q', function(global, cookieService, dialogs, $q) {
        var self = this;
        var initialsCookie = "initials";

        self.getInitials = function() {
            return global.personal.initials;
        };
        self.getInitialsInitial = function() {
            global.personal.initials = cookieService.getCookie(initialsCookie);
        };
        self.updateInitials = function() {
            if (global.personal.initials == null) global.personal.initials = "";
            global.personal.initials = global.personal.initials.replace(/\W/g, '').replace("_", '').substr(0, 10);
            cookieService.saveCookie(initialsCookie, global.personal.initials);
            return global.personal.initials;
        };
        self.ensureInitials = function() {
            var q = $q.defer();
            if (global.personal.initials == null || global.personal.initials == "") {
                var dlg = dialogs.input('Initials required', 'Enter your initials:');
                dlg.result.then(function(value) {
                    global.personal.initials = value.value;
                    self.updateInitials();
                    if (global.personal.initials != null && global.personal.initials != "") {
                        q.resolve(true);
                    } else {
                        q.reject(false);
                    }
                }, function() {
                    console.warn("Initials not entered");
                    q.reject(false);
                });
            } else {
                q.resolve(true);
            }
            return q.promise;
        };
        self.getInitialsInitial();
    }])
    .service('browserService', ['$window', function($window) {
        var self = this;
        var getBrowser = function() {
            var userAgent = $window.navigator.userAgent;
            var browsers = {chrome: /chrome/i, safari: /safari/i, firefox: /firefox/i, ie: /internet explorer/i};
            for(var key in browsers) {
                if (browsers[key].test(userAgent)) {
                    return key;
                }
            }
            return 'unknown';
        };
        self.isSupported = function() {
            var browser = getBrowser();
            return browser == "chrome" || browser == "firefox";
        };
    }])
    .service('spectraLineAnalysisService', [function() {
        var self = this;
        var window = 7;
        self.getStrengthOfLine = function(xs, ys, line, redshift, quasar) {

            window = quasar ? 21 : 11;
            var x = line.wavelength * (1 + redshift);
            var bounds = binarySearch(xs, x);
            var floatIndex = findCorrespondingFloatIndex(xs, x, bounds[0]);
            var index = Math.round(floatIndex);

            var strength = 2 * window; //TEMP TO MAKE USELESS UNTIL BETTER ALGORITHM


            return 0.3 + 0.7 * Math.min(1.0, Math.abs(1.0 * strength / (2 * window )));
        };
    }])
    .service('qualityService', ['global', function(global) {
        var self = this;
        var quality = global.ui.quality;
        var steps = 10000;
        var numSpectra = 1;
        var getType = function(qop) {
            switch (qop) {
                case 4: return "success";
                case 3: return "info";
                case 2: return "warning";
                case 1: return "danger";
                default: return "default";
            }
        };
        self.setMax = function(max) {
            quality.max = 1 + 10000;
            numSpectra = max;
        };
        self.clear = function() {
            quality.bars = [];
            quality.barHash = {};
        };
        self.changeSpectra = function(oldQop, newQop) {
            if (oldQop == newQop) {
                return;
            }
            if (oldQop != 0) {
                self.addResult(oldQop, -1);
            }
            self.addResult(newQop);
        };
        self.addResult = function(qop, increment) {
            if (qop == 0) { return; }
            if (typeof increment === 'undefined') increment = 1;
            if (quality.barHash["" + qop] == null) {
                if (increment > 0) {
                    var res = {qop: qop, type: getType(qop), value: 1.0 * steps / numSpectra, label: increment};
                    quality.barHash["" + qop] = res;
                    quality.bars.push(res);
                    quality.bars.sort(function(a,b) {
                        return (a.qop % 6) < (b.qop % 6);
                    });
                }
            } else {
                quality.barHash["" + qop].value += 1.0 * steps * increment / numSpectra;
                quality.barHash["" + qop].label += increment;
            }
        }
    }])
    .service('spectraService', ['global', 'resultsGeneratorService', 'cookieService', 'localStorageService', 'qualityService', function(global, resultsGeneratorService, cookieService, localStorageService, qualityService) {
        var self = this;
        var data = global.data;
        var quality = global.ui.quality;
        var downloadAutomatically = null;
        var downloadAutomaticallyCookie = "downloadAutomatically";
        var saveAutomatically = null;
        var saveAutomaticallyCookie = "saveInBackground";
        var assignAutoQOPs = null;
        var assignAutoQOPsCookie = "assignAutoQOPs";
        self.setDownloadAutomaticallyDefault = function() {
            self.setDownloadAutomatically(false);
        };
        self.setSaveAutomaticallyDefault = function() {
            self.setSaveAutomatically(true);
        };
        self.setDefaultAssignAutoQOPs = function() {
            self.setAssignAutoQOPs(false);
        };
        self.setDownloadAutomaticallyInitial = function() {
            var cookie = cookieService.getCookie(downloadAutomaticallyCookie);
            if (cookie == null) {
                self.setDownloadAutomaticallyDefault()
            } else {
                downloadAutomatically = cookie;
            }
        };
        self.setAssignAutoQOPsInitial = function() {
            var cookie = cookieService.getCookie(assignAutoQOPsCookie);
            if (cookie == null) {
                self.setDefaultAssignAutoQOPs()
            } else {
                assignAutoQOPs = cookie;
            }
        };
        self.setSaveAutomaticallyInitial = function() {
            var cookie = cookieService.getCookie(saveAutomaticallyCookie);
            if (cookie == null) {
                self.setSaveAutomaticallyDefault()
            } else {
                saveAutomatically = cookie;
            }
        };
        self.setDownloadAutomatically = function(value) {
            downloadAutomatically = value;
            cookieService.saveCookie(downloadAutomaticallyCookie, downloadAutomatically);
        };
        self.setAssignAutoQOPs = function(value) {
            assignAutoQOPs = value;
            cookieService.saveCookie(assignAutoQOPsCookie, assignAutoQOPs);
        };
        self.getAssignAutoQOPs = function() {
            return assignAutoQOPs;
        };
        self.getDownloadAutomatically = function() {
            return downloadAutomatically;
        };
        self.setSaveAutomatically = function(value) {
            saveAutomatically = value;
            cookieService.saveCookie(saveAutomaticallyCookie, saveAutomatically);
        };
        self.getSaveAutomatically = function() {
            return saveAutomatically;
        };
        self.setDownloadAutomaticallyInitial();
        self.setAssignAutoQOPsInitial();
        self.setSaveAutomaticallyInitial();
        self.hasSpectra = function() {
            return data.spectra.length > 0;
        };
        self.getNumberMatched = function() {
            var num = 0;
            for (var i = 0; i < data.spectra.length; i++) {
                if (data.spectra[i].isMatched) {
                    num++;
                }
            }
            return num;
        };
        self.getNumberProcessed = function() {
            var num = 0;
            for (var i = 0; i < data.spectra.length; i++) {
                if (data.spectra[i].isProcessed) {
                    num++;
                }
            }
            return num;
        };
        self.isFinishedMatching = function() {
            return self.getNumberMatched() == self.getNumberTotal();
        };
        self.isMatching = function() {
            return !self.isProcessing() && (self.getNumberMatched() < self.getNumberTotal());
        };
        self.isProcessing = function() {
            return self.getNumberProcessed() < self.getNumberTotal();
        };
        self.getNumberTotal = function() {
            return data.spectra.length;
        };
        self.setNextSpectra = function() {
            if (global.ui.detailed.onlyQOP0) {
                var original = global.ui.active;
                var notBackToStart = true;
                var s = original;
                while (notBackToStart) {
                    s = self.getNextSpectra(s, true);
                    if (s.qop == 0) {
                        self.setActive(s);
                        return true;
                    } else if (s == original) {
                        notBackToStart = false;
                    }
                }
                return false;
            } else {
                self.setActive(self.getNextSpectra(global.ui.active));
                return true;
            }
        };
        self.setActive = function(spectra, addToHistory) {
            if (typeof addToHistory === 'undefined') addToHistory = true;
            if (spectra == null) {
                return;
            }
            if (addToHistory) {
                global.data.history.push(spectra);
                if (global.data.history.length > 1000) {
                    global.data.history.shift();
                }
            } else {
                global.data.history.pop();
            }
            global.ui.active = spectra;
            var id = spectra.getFinalTemplateID();
            var z = spectra.getFinalRedshift();
            if (id != null && z != null) {
                global.ui.detailed.templateId = id;
                global.ui.detailed.redshift = z;
            } else {
                global.ui.detailed.templateId = "0";
                global.ui.detailed.redshift = "0";
            }
        };
        self.setSpectra = function(spectraList) {
            data.spectra.length = 0;
            data.spectraHash = {};
            qualityService.setMax(spectraList.length);
            qualityService.clear();
            for (var i = 0; i < spectraList.length; i++) {
                data.spectra.push(spectraList[i]);
                data.spectraHash[spectraList[i].id] = spectraList[i];
                var result = localStorageService.loadSpectra(spectraList[i]);
                if (result != null) {
                    self.loadLocalStorage(spectraList[i], result);
                }
            }
            if (data.spectra.length > 0) {
                if (global.ui.detailed.onlyQOP0) {
                    self.setActive(data.spectra[data.spectra.length - 1]);
                    if (!self.setNextSpectra()) {
                        self.setActive(data.spectra[0]);
                    }
                } else {
                    self.setActive(data.spectra[0]);
                }
            }
        };
        self.loadLocalStorage = function(spectra, vals) {
            spectra.isMatched = true;

            spectra.automaticResults = [{}];
            for (var i = 1; i < vals.length; i++) {
                if (vals[i].name == "QOP") {
                    spectra.setQOP(parseInt(vals[i].value));
                    qualityService.addResult(spectra.qop);
                }
            }
            for (var i = 1; i < vals.length; i++) {
                if (vals[i].name == "AutoTID") {
                    spectra.automaticResults[0].templateId = "" + vals[i].value;
                } else if (vals[i].name == "AutoZ") {
                    spectra.automaticResults[0].z = parseFloat(vals[i].value);
                } else if (vals[i].name == "AutoXCor") {
                    spectra.automaticResults[0].value = parseFloat(vals[i].value);
                } else if (vals[i].name == "FinTID" && spectra.qop > 0) {
                    spectra.manualTemplateID = "" + vals[i].value;
                } else if (vals[i].name == "FinZ" && spectra.qop > 0) {
                    spectra.manualRedshift = parseFloat(vals[i].value);
                } else if (vals[i].name == "Comment") {
                    spectra.setComment(vals[i].value);
                }
            }

            spectra.automaticBestResults = spectra.automaticResults;

        };
        self.getSpectra = function(id) {
            if (id == null) return data.spectra;
            return data.spectraHash[id];
        };
        self.getNextSpectra = function(spectra, loop) {
            if (typeof loop === 'undefined') loop = false;
            if (spectra == null) return null;
            for (var i = 0; i < data.spectra.length; i++) {
                if (data.spectra[i] == spectra) {
                    if (loop == false && i + 1 == data.spectra.length) {
                        return null;
                    } else {
                        return data.spectra[(i + 1) % data.spectra.length];
                    }
                }
            }
            return null;
        };
        self.getPreviousSpectra = function(spectra) {
            if (spectra == null) return;
            for (var i = 1; i < data.spectra.length; i++) {
                if (data.spectra[i] == spectra) {
                    return data.spectra[i - 1];
                }
            }
            return null;
        };
        self.setProcessedResults = function(results) {
            var spectra = data.spectraHash[results.id];
            if (spectra.name != results.name) return;
            spectra.processedLambda = results.lambda;
            spectra.processedIntensity = results.intensity;
            spectra.processedContinuum = results.continuum;
            spectra.processedLambdaPlot = results.lambda; //.map(function(x) { return Math.pow(10, x); });
            spectra.processedVariance = results.variance;
            spectra.processedVariancePlot = results.variance.slice();
            removeNaNs(spectra.processedVariancePlot);
            normaliseViaShift(spectra.processedVariancePlot, 0, 50, null);
            spectra.isProcessing = false;
            spectra.isProcessed = true;

            if (!self.isProcessing() && self.isFinishedMatching()) {
                if (downloadAutomatically) {
                    resultsGeneratorService.downloadResults();
                }
                if (global.data.fits.length > 0) {
                    global.data.fits.shift();
                }
            }
        };
        self.setMatchedResults = function(results) {
            var spectra = data.spectraHash[results.id];
            if (spectra == null || spectra.name != results.name) return;
            spectra.automaticResults = results.results.coalesced;
//            console.log(JSON.stringify(results.results.coalesced).replace(/},{/g,"}\n{"));
            spectra.templateResults = results.results.templates;
            spectra.autoQOP = results.results.autoQOP;
            if (assignAutoQOPs == true) {
                qualityService.changeSpectra(spectra.qop, spectra.autoQOP);
                spectra.setQOP(results.results.autoQOP);

            }
            spectra.automaticBestResults = results.results.coalesced; // TODO: REMOVE BEST RESULTS, ONLY HAVE AUTOMATIC RESULTS
            spectra.isMatching = false;
            spectra.isMatched = true;
            spectra.fft = new FFT(results.results.fft.real.length, results.results.fft.imag);
            spectra.fft.real = results.results.fft.real;
            spectra.fft.imag = results.results.fft.imag;
            spectra.quasarFFT = new FFT(results.results.quasarFFT.real.length, results.results.quasarFFT.imag);
            spectra.quasarFFT.real = results.results.quasarFFT.real;
            spectra.quasarFFT.imag = results.results.quasarFFT.imag;
            spectra.processedIntensity = results.results.intensity;
            if (saveAutomatically) {
                localStorageService.saveSpectra(spectra);
            }
            if (downloadAutomatically && self.isFinishedMatching()) {
                resultsGeneratorService.downloadResults();
            }
            if (global.ui.active == spectra) {
                global.ui.detailed.templateId = spectra.getFinalTemplateID();
                global.ui.detailed.redshift = spectra.getFinalRedshift();
            }
            if (self.isFinishedMatching()) {
                if (global.data.fits.length > 0) {
                    global.data.fits.shift();
                }
            }
        };
        self.setManualResults = function(spectra, templateId, redshift, qop) {
            spectra.manualTemplateID = templateId;
            spectra.manualRedshift = parseFloat(redshift);
            var oldQop = spectra.qop;
            spectra.setQOP(qop);
            qualityService.changeSpectra(oldQop, qop);
            if (saveAutomatically) {
                localStorageService.saveSpectra(spectra);
            }
        };
        self.getBestResults = function(resultsList) {
            var best = [{
                templateId: resultsList[0].id,
                z: resultsList[0].top[0].z,
                value: resultsList[0].top[0].value
            }];
            var threshold = 0.05;
            var i;
            var merged = [];
            for (i = 0; i < resultsList.length; i++) {
                var tr = resultsList[i];
                for (var j = 0; j < tr.top.length; j++) {
                    var trr = tr.top[j];
                    merged.push({id: tr.id, z: trr.z, value: trr.value});
                }
            }
            merged.sort(function(a,b) {
                return a.value - b.value;
            });

            i = 0;
            while (best.length < 10) {
                var valid = true;
                for (var k = 0; k < best.length; k++) {
                    if (best[k].templateId == merged[i].id && Math.abs(merged[i].z - best[k].z) < threshold) {
                        valid = false;
                    }
                }
                if (valid) {
                    best.push({templateId: merged[i].id, z: merged[i].z, value: merged[i].value});
                }
                i++;
            }
            return best;
        }
    }])
    .service('spectraLineService', [function() {
        var self = this;
        var spectralLines = new SpectralLines();
        self.getNext = function(id) {
            return spectralLines.getNext(id);
        };
        self.getPrevious = function(id) {
            return spectralLines.getPrevious(id);
        };
        self.getAll = function() {
            return spectralLines.getAll();
        };
        self.getFromID = function(id) {
            return spectralLines.getFromID(id);
        };
    }])
    .service('resultsLoaderService', ['$q', 'localStorageService', 'resultsGeneratorService',
        function($q, localStorageService, resultsGeneratorService) {
        var self = this;
        var dropped = false;

        self.loadResults = function(file) {
            dropped = true;
            var filename = file.name.substring(0, file.name.lastIndexOf("_"));
            var reader = new FileReader();
            reader.onload = function(e) {
                var text = reader.result;
                var lines = text.split('\n');
                var newFilename = lines[0].substring(lines[0].indexOf("[[") + 2, lines[0].indexOf("]]"));
                if (newFilename.length > 1) {
                    filename = newFilename;
                }
                var headers = lines[1].replace('#','').split(',');
                for (var w = 0; w < headers.length; w++) {
                    headers[w] = headers[w].trim();
                }
                for (var i = 0; i < lines.length - 1; i++) {
                    if (lines[i].indexOf("#") == 0) continue;
                    var columns = lines[i].split(',');
                    var res = {filename: filename};
                    for (var j = 0; j < columns.length; j++) {
                        if (isFloatString(columns[j])) {
                            res[headers[j]] = parseFloat(columns[j].trim());
                        } else {
                            res[headers[j]] = columns[j].trim();
                        }
                    }
                    localStorageService.saveSpectra(resultsGeneratorService.convertResultToMimicSpectra(res));
                }
            };
            reader.readAsText(file);
        };

        self.hasAnyResults = function() {
            return dropped;
        };
    }])
    .service('resultsGeneratorService', ['global', 'templatesService', 'personalService', function(global, templatesService, personalService) {
        var self = this;
        self.downloadResults = function() {
            personalService.ensureInitials().then(function() {
                var results = self.getResultsCSV();
                console.log(results);
                if (results.length > 0) {
                    var blob = new window.Blob([results], {type: 'text/plain'});
                    saveAs(blob, self.getFilename());
                }
            });
        };
        self.getFilename = function() {
            return global.data.fitsFileName + "_" + personalService.getInitials() + ".mz";
        };
        self.getResultsCSV = function() {
            var results = self.getResultsArray();
            var string = "# Results generated by " + personalService.getInitials()
                + " for file [[" + global.data.fitsFileName + "]] at " + new Date().toLocaleString() + " (JSON: " + JSON.stringify(new Date()) + ")\n#";
            if (results.length > 0) {
                var spaces = results[0].map(function(x) { return x.name.length; });
                for (var i = 0; i < results.length; i++) {
                    var lengths = results[i];
                    for (var j = 0; j < lengths.length; j++) {
                        if (lengths[j].value.length > spaces[j]) {
                            spaces[j] = lengths[j].value.length;
                        }
                    }
                }
                for (var i = 0; i < results.length; i++) {
                    var res = results[i];
                    var first = 0;
                    if (i == 0) {
                        for (var k = 0; k < res.length; k++) {
                            string += ((first++ == 0) ? "" : ",  ") + res[k].name.spacePad(spaces[k]);
                        }
                        string += "\n";
                        first = 0;
                    }
                    for (var j = 0; j < res.length; j++) {
                        string += ((first++ == 0) ? " " : ",  ") + res[j].value.replace(",","").spacePad(spaces[j]);
                    }
                    string += "\n";
                }
            }
            return string;
        };
        self.getResultsArray = function() {
            var result = [];
            for (var i = 0; i < global.data.spectra.length; i++) {
                var spectra = global.data.spectra[i];
                if (spectra.hasRedshiftToBeSaved()) {
                    result.push(self.getResultFromSpectra(spectra));
                }
            }
            return result;
        };
        self.getResultFromSpectra = function(spectra) {
            return [
                {name: "ID", value: ("" + spectra.id).pad(4)},
                {name: "Name", value: spectra.name},
                {name: "RA", value: spectra.ra.toFixed(6)},
                {name: "DEC", value: spectra.dec.toFixed(6)},
                {name: "Mag", value: spectra.magnitude.toFixed(2)},
                {name: "Type", value: spectra.type},
                {name: "AutoTID", value: spectra.getBestAutomaticResult()? spectra.getBestAutomaticResult().templateId : "0"},
                {name: "AutoTN", value:  templatesService.getNameForTemplate(spectra.getBestAutomaticResult() ? spectra.getBestAutomaticResult().templateId : "0")},
                {name: "AutoZ", value: spectra.getBestAutomaticResult() ? spectra.getBestAutomaticResult().z.toFixed(5) : "0"},
                {name: "AutoXCor", value: spectra.getBestAutomaticResult() ? spectra.getBestAutomaticResult().value.toFixed(4) : "0"},
                {name: "FinTID", value: spectra.getFinalTemplateID() ? spectra.getFinalTemplateID() : "0"},
                {name: "FinTN", value: templatesService.getNameForTemplate(spectra.getFinalTemplateID())},
                {name: "FinZ", value: spectra.getFinalRedshift().toFixed(5)},
                {name: "QOP", value: "" + spectra.qop},
                {name: "Comment", value: spectra.getComment()}
            ]
        };
        self.convertResultToMimicSpectra = function(result) {
            var spectra = new Spectra(result["ID"], null, null, null, null, null, result["Name"],
                result["RA"], result["DEC"],result["Mag"], result["Type"], result.filename);
            spectra.automaticBestResults = [{templateId: result["AutoTID"], z: result["AutoZ"], value: result["AutoXCor"]}];
            spectra.setComment(result["Comment"]);
            spectra.setQOP(parseInt(result["QOP"]));
            if (spectra.qop > 0) {
                spectra.manualTemplateID = result["FinTID"];
                spectra.manualRedshift = result["FinZ"];
            }
            return spectra;
        };
    }])
    .service('localStorageService', ['resultsGeneratorService', 'global',
        function(resultsGeneratorService, global) {
        var self = this;
        var active = null;


        self.purgeOldStorage = function() {
            var ratio = decodeURIComponent(JSON.stringify(localStorage)).length / (5 * 1024 * 1024);
            if (ratio > 0.85) {
                console.log('Pruning local storage. Currently at ' + Math.ceil(ratio*100) + '%');
                var dates = [];
                for (var i = 0; i < localStorage.length; i++) {
                    dates.push(JSON.parse(localStorage[localStorage.key(i)])[0]);
                }
                dates.sort();
                var mid = dates[Math.floor(dates.length / 2)];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (JSON.parse(localStorage[key])[0] <= mid) {
                        localStorage.removeItem(key);
                    }
                }
                ratio = decodeURIComponent(JSON.stringify(localStorage)).length / (5 * 1024 * 1024);
                console.log('Pruned local storage. Currently at ' + Math.ceil(ratio*100) + '%');
            }
        };
        self.supportsLocalStorage = function() {
            try {
                return 'localStorage' in window && window['localStorage'] !== null;
            } catch (e) {
                console.warn('Local storage is not available.');
                return false;
            }
        };

        if (self.supportsLocalStorage()) {
            active = true;
            self.purgeOldStorage();
        } else {
            active = false;
            alert('Your browser does not support local storage. Please use another browser.')
        }


        self.getKeyFromSpectra = function(spectra) {
            return spectra.filename + spectra.name;
        };
        self.clearFile = function() {
            var filename = global.data.fitsFileName;
            console.log("Clearing", filename);
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key.indexOf(filename, 0) == 0) {
                    localStorage.removeItem(key);
                    i--;
                }
            }
        };
        self.clearAll = function() {
            console.log("All storage cleared");
            localStorage.clear();
        };
        self.saveSpectra = function(spectra) {
            if (!active) return;
            var key = self.getKeyFromSpectra(spectra);
            var val = resultsGeneratorService.getResultFromSpectra(spectra);
            if (val != null) {
                val.unshift(Date.now());
                localStorage[key] = JSON.stringify(val);
            }
        };
        self.loadSpectra = function(spectra) {
            if (!active) return null;
            var key = self.getKeyFromSpectra(spectra);
            var val = localStorage[key];
            if (val != null) {
                val = JSON.parse(val);
            }
            return val;
        };

    }])
    .service('cookieService', [function() {
        var self = this;

        self.getCookie = function(property) {
            return getCookie(property)
        };

        self.saveCookie = function(property, value, exdays) {
            saveCookie(property, value, exdays);
        };
    }])
    .service('processorService', ['$q', 'spectraService', 'cookieService', 'templatesService', function($q, spectraService, cookieService, templatesService) {
        var self = this;

        var processors = [];
        var priorityJobs = [];
        var processing = true;
        var jobs = [];

        self.setDefaultNumberOfCores = function() {
            var initialNumberProcessors = navigator.hardwareConcurrency;
            if (typeof(initialNumberProcessors) === "undefined") {
                initialNumberProcessors = 4;
            }
            self.setNumberProcessors(initialNumberProcessors - 1);
        };
        self.setDefaultNumberOfCoresInitial = function() {
            var initialNumberProcessors = cookieService.getCookie('numCores');
            if (initialNumberProcessors == null) {
                self.setDefaultNumberOfCores();
            } else {
                self.setNumberProcessors(initialNumberProcessors);
            }
        };
        self.getNumberProcessors = function() {
            return processors.length;
        };
        self.setNumberProcessors = function(num) {
            if (num < 1) {
                num = 1;
            } else if (num > 32) {
                num = 32;
            }
            cookieService.saveCookie('numCores', num);
            if (num < processors.length) {
                while (processors.length > num) {
                    processors[0].flagForDeletion();
                    processors.splice(0, 1);
                }
            } else if (num > processors.length) {
                while (processors.length < num) {
                    processors.push(new Processor($q));
                }
            }
        };
        self.toggleProcessing = function() {
            processing = !processing;
        };
        self.processSpectra = function(spectra) {
            spectra.inactiveTemplates = templatesService.getInactiveTemplates();
            var processor = self.getIdleProcessor();
            processor.workOnSpectra(spectra).then(function(result) {
                if (result.data.processing) {
                    spectraService.setProcessedResults(result.data);
                } else {
                    spectraService.setMatchedResults(result.data);
                }
                self.processJobs();
            }, function(reason) {
                console.warn(reason);
            });
        };
        self.getIdleProcessor = function() {
            for (i = 0; i < processors.length; i++) {
                if (processors[i].isIdle()) {
                    return processors[i];
                }
            }
            return null;
        };
        self.addSpectraListToQueue = function(spectraList) {
            jobs.length = 0;
            for (var i = 0; i < spectraList.length; i++) {
                jobs.push(spectraList[i]);
            }
            self.setRunning();
        };
        self.addToPriorityQueue = function(spectra, start) {
            spectra.isMatched = false;
            priorityJobs.push(spectra);
            if (start) {
                self.processJobs();
            }
        };
        self.hasIdleProcessor = function() {
            return self.getIdleProcessor() != null;
        };
        self.shouldProcess = function(spectra) {
            return !spectra.isProcessing && !spectra.isProcessed;
        };
        self.shouldMatch = function(spectra) {
            return spectra.isProcessed && !spectra.isMatching && (!spectra.isMatched || spectra.templateResults == null);
        };
        self.processJobs = function() {
            var findingJobs = true;
            while (findingJobs && self.hasIdleProcessor()) {
                findingJobs = self.processAJob();
            }
        };
        self.isPaused = function() {
            return !processing;
        };
        self.setPause = function() {
            processing = false;
        };
        self.setRunning = function() {
            processing = true;
            self.processJobs();
        };
        self.togglePause = function() {
            processing = !processing;
            if (processing) {
                self.processJobs();
            }
        };

        /**
         * Processes priority jobs processing then matching, and then normal
         * jobs processing and matching if processing is enabled.
         */
        self.processAJob = function() {
            for (var i = 0; i < priorityJobs.length; i++) {
                if (self.shouldProcess(priorityJobs[i])) {
                    priorityJobs[i].isProcessing = true;
                    self.processSpectra(priorityJobs[i].getProcessMessage());
                    return true;
                }
            }
            for (i = 0; i < priorityJobs.length; i++) {
                if (self.shouldMatch(priorityJobs[i])) {
                    priorityJobs[i].isMatching = true;
                    self.processSpectra(priorityJobs[i].getMatchMessage());
                    return true;
                }
            }
            if (processing) {
                for (i = 0; i < jobs.length; i++) {
                    if (self.shouldProcess(jobs[i])) {
                        jobs[i].isProcessing = true;
                        self.processSpectra(jobs[i].getProcessMessage());
                        return true;
                    }
                }
                for (i = 0; i < jobs.length; i++) {
                    if (self.shouldMatch(jobs[i])) {
                        jobs[i].isMatching = true;
                        self.processSpectra(jobs[i].getMatchMessage());
                        return true;
                    }
                }
            }
            return false;
        };

        self.setDefaultNumberOfCoresInitial();

    }])
    .service('templatesService', [function() {
        var self = this;

        var templates = new TemplateManager();

        self.getTemplateAtRedshift = function(templateId, redshift, withContinuum) {
            return templates.getTemplate(templateId, redshift, withContinuum);
        };
        self.getOriginalTemplates = function() {
            return templates.getOriginalTemplates();
        };
        self.getInactiveTemplates = function() {
            return templates.getInactiveTemplates();
        };
        self.updateActiveTemplates = function() {
            templates.updateActiveTemplates();
        };
        self.getNameForTemplate = function(templateId) {
            if (templates.templatesHash[templateId]) {
                return templates.templatesHash[templateId].name;
            } else {
                return "Unspecified";
            }

        };
        self.getTemplates = function() {
            return templates.templates;
        };

        self.getFFTReadyTemplate = function(templateId) {
            var t = templates.templatesHash[templateId];
            if (t.fft == null) {
                templates.shiftTemplate(t);
            }
            return t;
        };

    }])
    .service('fitsFile', ['$q', 'global', 'spectraService', 'processorService', 'drawingService', '$log', function($q, global, spectraService, processorService, drawingService, $log) {
        var self = this;

        var hasFitsFile = false;
        var isLoading = false;
        var originalFilename = null;
        var filename = null;
        var MJD = null;
        var date = null;
        var lambdaStart = null;
        var lambdaEnd = null;

        var isCoadd = null;
        var spectra = null;
        var sky = null;
        var skyAverage = null;
        var lambda = null;
        var skyIndex = null;
        var varianceIndex = 1;
        var primaryIndex = 0;
        var typeIndex = null;
        var numPoints = null;
        var dataReducedFile = true

        self.getFilename = function() {
            return filename;
        };
        self.getOriginalFilename = function() {
            return originalFilename;
        };
        self.isLoading = function() {
            return isLoading;
        };
        self.loadInFitsFile = function(file) {
            var q = $q.defer();
            isLoading = true;
            hasFitsFile = true;
            originalFilename = file.name.replace(/\.[^/.]+$/, "");
            global.data.fitsFileName = originalFilename;
            filename = originalFilename.replace(/_/g, " ");
            $log.debug("Loading FITs file");
            self.fits = new astro.FITS(file, function() {
                $log.debug("Loaded FITs file");
                parseFitsFile(q);
                processorService.setPause();
            });
            return q.promise;

        };
        var parseFitsFile = function(q) {
            $log.debug("Getting headers");
            var header0 = self.fits.getHDU(0).header;

            MJD = header0.get('UTMJD');
            date = MJDtoYMD(MJD);

            numPoints = self.fits.getHDU(0).data.width;

            var CRVAL1 = header0.get('CRVAL1');
            var CRPIX1 = header0.get('CRPIX1');
            var CDELT1 = header0.get('CDELT1');
            if (CDELT1 == null) {
                CDELT1 = header0.get('CD1_1');
            }

            lambda = [];
            for (var i = 0; i < numPoints; i++) {
                lambda.push(((i + 1 - CRPIX1) * CDELT1) + CRVAL1);
            }
            convertVacuumFromAir(lambda);
            lambdaStart = lambda[0];
            lambdaEnd = lambda[lambda.length - 1];

            spectra = [];
            sky = [];
            isCoadd = header0.get('COADDVER') != null;
            skyIndex = isCoadd ? 2 : 7;
            typeIndex = isCoadd ? 4 : 2;
            dataReducedFile = self.fits.hdus.length > 1;
            for (i = 0; i < self.fits.hdus.length; i++) {
                var h = self.fits.getHeader(i).cards["EXTNAME"];
                if (h != null && h.value.toUpperCase() == "SKY") {
                    skyIndex = i;
                    $log.debug("Sky index found at " + i);
                    break;
                }
            }
            for (i = 0; i < self.fits.hdus.length; i++) {
                var h = self.fits.getHeader(i).cards["EXTNAME"];
                if (h != null && h.value.toUpperCase() == "VARIANCE") {
                    varianceIndex = i;
                    $log.debug("Variance index found at " + i);
                    break;
                }
            }
            for (i = 0; i < self.fits.hdus.length; i++) {
                var h = self.fits.getHeader(i).cards["EXTNAME"];
                if (h != null && h.value.toUpperCase() == "PRIMARY") {
                    primaryIndex = i;
                    $log.debug("Primary index found at " + i);
                    break;
                }
            }
            for (i = 0; i < self.fits.hdus.length; i++) {
                var h = self.fits.getHeader(i).cards["EXTNAME"];
                if (h != null && h.value.toUpperCase() == "FIBRES") {
                    typeIndex = i;
                    $log.debug("Type index found at " + i);
                    break;
                }
            }
            if (dataReducedFile) {
                getFibres(q);
            } else {
                getSpectraOnly(q)
            }
        };
        var getFibres = function(q) {
            $log.debug("Getting fibres");
            self.fits.getDataUnit(typeIndex).getColumn("TYPE", function(data) {
                var ind = 0;
                for (var i = 0; i < data.length; i++) {
                    if (data[i] == "P") {
                        spectra.push({index: ind++, fitsIndex: i, id: i+1, lambda: lambda.slice(0), intensity: [], variance: [], miniRendered: 0, compute: true});
                    }
                }
                getNames(q);
            });
        };
        var getNames = function(q) {
            $log.debug("Getting names");
            self.fits.getDataUnit(typeIndex).getColumn("NAME", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].name = data[j].replace(/\s+/g, '').replace(/\u0000/g, "");
                }
                getRA(q);
            });
        };
        var getRA = function(q) {
            $log.debug("Getting RA");
            self.fits.getDataUnit(typeIndex).getColumn("RA", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].ra = data[j];
                }
                getDec(q);
            });
        };
        var getDec = function(q) {
            $log.debug("Getting DEC");
            self.fits.getDataUnit(typeIndex).getColumn("DEC", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].dec = data[j];
                }
                getMagnitudes(q);
            });
        };

        var getMagnitudes = function(q) {
            $log.debug("Getting magnitude");
            self.fits.getDataUnit(typeIndex).getColumn("MAGNITUDE", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].magnitude = data[j];
                }
                getComments(q);
            });
        };
        var getComments = function(q) {
            $log.debug("Getting comment");
            self.fits.getDataUnit(typeIndex).getColumn("COMMENT", function(data) {
                global.data.types.length = 0;
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].type = data[j].split(' ')[0];
                    spectra[i].type = spectra[i].type.trim().replace(/\W/g, '');
                    if (spectra[i].type == 'Parked') {
                        spectra.splice(i,1);
                        for (var k = i; k < spectra.length; k++) {
                            spectra[k].index--;
                        }
                    } else if (global.data.types.indexOf(spectra[i].type) == -1) {
                        global.data.types.push(spectra[i].type);
                    }
                }
                getSky(q);
            });
        };
        var getSky = function(q) {
            $log.debug("Getting Sky");
            self.fits.getDataUnit(skyIndex).getFrame(0, function(data) {
                var d = Array.prototype.slice.call(data);
                if (isCoadd) {
                    for (var i = 0; i < spectra.length; i++) {
                        spectra[i].sky = d.slice((spectra[i].id-1) * numPoints, (spectra[i].id ) * numPoints);
                        removeNaNs(spectra[i].sky);
                        normaliseViaShift(spectra[i].sky, 0, global.ui.detailed.skyHeight, null);
                        spectra[i].skyAverage = null;
                    }
                } else {
                    sky = d;
                    removeNaNs(sky);
                    normaliseViaShift(sky, 0, global.ui.detailed.skyHeight, null);
                    skyAverage = null;
                }
                getSpectra(q);
            });
        };
        var getSpectra = function(q) {
            $log.debug("Getting spectra intensity");
            self.fits.getDataUnit(primaryIndex).getFrame(0, function(data) {
                var d = Array.prototype.slice.call(data);
                for (var i = 0; i < spectra.length; i++) {
                    spectra[i].intensity = d.slice((spectra[i].id-1) * numPoints, (spectra[i].id ) * numPoints);
                }
                getVariances(q);
            })
        };
        var getSpectraOnly = function(q) {
            $log.debug("Only getting spectra");
            self.fits.getDataUnit(primaryIndex).getFrame(0, function(data) {
                var numData = 1;
                if (self.fits.getHeader(0).get('NAXIS') > 1) {
                    numData = self.fits.getHeader(0).get('NAXIS2')
                }
                var name = numData == 1 ? self.fits.getHeader(0).get('IRAFNAME') : null
                if (name == null) {
                    name == "Unknown";
                }
                var d = Array.prototype.slice.call(data);
                for (var i = 0; i < numData; i++) {
                    spectra.push({index: i, fitsIndex: i, id: i+1, lambda: lambda.slice(0), intensity: d.slice(i * numPoints, (i + 1) * numPoints),
                        variance: [], miniRendered: 0, sky: [], skyAverage: null, name: name, ra: -1.0, dec: -1.0, magnitude: -1.0, type: 'NA', compute: false});
                }
                convertToUsableObjects(q);
            });
        };
        var getVariances = function(q) {
            $log.debug("Getting spectra variance");
            self.fits.getDataUnit(varianceIndex).getFrame(0, function(data) {
                var d = Array.prototype.slice.call(data);
                for (var i = 0; i < spectra.length; i++) {
                    spectra[i].variance = d.slice((spectra[i].id-1) * numPoints, (spectra[i].id ) * numPoints);
                }
                convertToUsableObjects(q);
            });
        };
        var useSpectra = function(spectra) {
            var c = 0;
            for (var i = 0; i < spectra.intensity.length; i++) {
                if (isNaN(spectra.intensity[i])) {
                    c += 1;
                }
            }
            if (c > 0.9 * spectra.intensity.length) {
                return false;
            }
            return true;
        };
        var convertToUsableObjects = function(q) {
            $log.debug("Creating javascript classes");
            var spectraList = [];
            for (var j = 0; j < spectra.length; j++) {
                if (useSpectra(spectra[j])) {
                    var s = new Spectra(spectra[j].id, lambda.slice(0), spectra[j].intensity, spectra[j].variance,
                        isCoadd ? spectra[j].sky : sky, isCoadd ? spectra[j].skyAverage : skyAverage, spectra[j].name, spectra[j].ra, spectra[j].dec,
                        spectra[j].magnitude, spectra[j].type, originalFilename, drawingService);
                    s.setCompute(spectra[j].compute)
                    spectraList.push(s);
                }
            }
            isLoading = false;
            spectraService.setSpectra(spectraList);
            processorService.addSpectraListToQueue(spectraList);
            $log.debug("Returning FITs object");
            q.resolve();
        }

    }])
    .service('drawingService', ['global', 'templatesService', function(global, templatesService) {
        var self = this;
        var ui = global.ui;
        self.drawTemplateOnCanvas = function(template, canvas) {
            var r = templatesService.getTemplateAtRedshift(template.id, 0, true);
            var bounds = self.getMaxes([
                [r[0], r[1]]
            ]);
            self.clearPlot(canvas);
            self.plot(r[0], r[1], ui.colours.template, canvas, bounds);
        };
        self.drawOverviewOnCanvas = function(spectra, canvas) {
            var width = canvas.width;
            if (spectra.intensity.length > 0) {
                var hasProcessed = !(spectra.processedLambdaPlot == null || typeof spectra.processedLambdaPlot === 'undefined');

                var lambda = self.condenseToXPixels(!hasProcessed ? spectra.lambda : spectra.processedLambdaPlot, width);
                var intensity = self.condenseToXPixels(!hasProcessed ? spectra.intensityPlot : spectra.processedContinuum, width);
                var r = null;
                if (spectra.getFinalTemplateID() != null && spectra.getFinalTemplateID() != "0") {
                    r = templatesService.getTemplateAtRedshift(spectra.getFinalTemplateID(), spectra.getFinalRedshift(), true);
                }
                if (r == null || r[0] == null || r[1] == null) {
                    var tempIntensity = null;
                } else {
                    var tempIntensity = self.condenseToXPixels(interpolate(spectra.lambda, r[0], r[1]), width);
                }
                //self.clearPlot(canvas);
                var toBound = [];
                var toBound2 = [];
                toBound.push([lambda, intensity]);
                var bounds = self.getMaxes(toBound);
                self.plotZeroLine(canvas, "#C4C4C4", bounds);
                self.plot(lambda, intensity, ui.colours.raw, canvas, bounds);
                if (tempIntensity != null) {
                    toBound2.push([lambda, tempIntensity]);
                    var bounds2 = self.getMaxes(toBound2);
                    self.plot(lambda, tempIntensity, ui.colours.matched, canvas, [bounds[0], bounds[1], bounds2[2], bounds2[2] + (2*(bounds2[3] - bounds2[2]))]);
                }
            }
        };
        self.plot = function(xs, data, colour, canvas, bounds) {
            if (data == null || data.length == 0) {
                return;
            }
            var c = canvas.getContext("2d");
            var h = canvas.height;
            var w = canvas.width;
            c.beginPath();
            c.strokeStyle = colour;
            var xmin = bounds[0];
            var xmax = bounds[1];
            var ymin = bounds[2];
            var ymax = bounds[3];

            for (var i = 1; i < data.length; i++) {
                var x = 5 + (xs[i]-xmin)/(xmax-xmin) * (w - 10);
                var y = h - (5 + (data[i]-ymin)*(h-10)/(ymax-ymin));
                if (i == 0) {
                    c.moveTo(x,y);
                } else {
                    c.lineTo(x,y);
                }
            }
            c.stroke();
        };
        self.plotZeroLine = function (canvas, colour, bounds) {
            var c = canvas.getContext("2d");
            var h = canvas.height;
            var w = canvas.width;
            var ymin = bounds[2];
            var ymax = bounds[3];
            var hh = h - (5 + (0 - ymin) * (h - 10) / (ymax - ymin)) + 0.5;
            c.strokeStyle = colour;
            c.moveTo(0, hh);
            c.lineTo(w, hh);
            c.stroke();
        };
        self.condenseToXPixels = function(data, numPix) {
            if (data == null) {
                return null;
            }
            var res=Math.ceil(data.length / numPix);
            var d = [];
            var tmp = 0;
            for (var i=0; i < data.length; i++) {
                if (i % res == 0 && i!=0) {
                    d.push(tmp);
                    tmp = 0;
                } else {
                    tmp += (data[i] / res)
                }
            }
            return d;
        };
        self.getMaxes = function(vals) {
            var xmin = 9e9;
            var xmax = -9e9;
            var ymin = 9e9;
            var ymax = -9e9;
            for (var i = 0; i < vals.length; i++) {
                var xs = vals[i][0];
                var ys = vals[i][1];
                if (xs != null) {
                    for (var j = 0; j < xs.length; j++) {
                        if (xs[j] < xmin) {
                            xmin = xs[j];
                        }
                        if (xs[j] > xmax) {
                            xmax = xs[j];
                        }
                    }
                }
                if (ys != null) {
                    for (var k = 0; k < ys.length; k++) {
                        if (ys[k] < ymin) {
                            ymin = ys[k];
                        }
                        if (ys[k] > ymax) {
                            ymax = ys[k];
                        }
                    }
                }
            }
            return [xmin, xmax, ymin, ymax];
        };
        self.clearPlot = function(canvas) {
            canvas.width = canvas.clientWidth;
            canvas.height =canvas.clientHeight;
            var c = canvas.getContext("2d");
            c.save();
            // Use the identity matrix while clearing the canvas
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.clearRect(0, 0, canvas.width, canvas.height);
            // Restore the transform
            c.restore();
        };
    }]);