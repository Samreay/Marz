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
                    processed: "#005201",
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
    .service('log', ['$log', function($log) {
        var self = this;
        self.debug = function(message) {
            $log.debug(message);
        };
        self.warn = function(message) {
            $log.warn(message);
        };
        self.error = function(message) {
            $log.error(message);
        }
    }])
    .service('personalService', ['global', 'cookieService', 'dialogs', '$q', function(global, cookieService, dialogs, $q) {
        var self = this;
        var initialsCookie = "initials";
        global.personal.initials = cookieService.registerCookieValue(initialsCookie, null);

        self.getInitials = function() {
            return global.personal.initials;
        };

        self.updateInitials = function() {
            if (global.personal.initials == null) global.personal.initials = "";
            global.personal.initials = global.personal.initials.replace(/\W/g, '').replace("_", '').substr(0, 10);
            cookieService.setCookie(initialsCookie, global.personal.initials);
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
            //console.log("Changing from " + oldQop + " to " + newQop);
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
    .service('spectraService', ['global', 'resultsGeneratorService', 'cookieService', 'localStorageService', 'qualityService', 'log', function(global, resultsGeneratorService, cookieService, localStorageService, qualityService, log) {
        var self = this;
        var data = global.data;
        var quality = global.ui.quality;
        var downloadAutomaticallyCookie = "downloadAutomatically";
        var downloadAutomatically = cookieService.registerCookieValue(downloadAutomaticallyCookie, false);
        var saveAutomaticallyCookie = "saveInBackground";
        var saveAutomatically = cookieService.registerCookieValue(saveAutomaticallyCookie, true);
        var assignAutoQOPsCookie = "assignAutoQOPs";

        self.spectraManager = new SpectraManager(data, log);

        var assignAutoQOPs = cookieService.registerCookieValue(assignAutoQOPsCookie, false);
        self.spectraManager.setAssignAutoQOPs(assignAutoQOPs);

        self.setDownloadAutomaticallyDefault = function() {
            self.setDownloadAutomatically(cookieService.setToDefault(downloadAutomaticallyCookie));
        };
        self.setSaveAutomaticallyDefault = function() {
            self.setSaveAutomatically(cookieService.setToDefault(saveAutomaticallyCookie));
        };
        self.setDefaultAssignAutoQOPs = function() {
            self.setAssignAutoQOPs(cookieService.setToDefault(assignAutoQOPsCookie));
        };
        self.setDownloadAutomatically = function(value) {
            downloadAutomatically = value;
            cookieService.setCookie(downloadAutomaticallyCookie, downloadAutomatically);
        };
        self.setAssignAutoQOPs = function(value) {
            self.spectraManager.setAssignAutoQOPs(value);
            cookieService.setCookie(assignAutoQOPsCookie, assignAutoQOPs);
        };
        self.getAssignAutoQOPs = function() {
            return self.spectraManager.autoQOPs;
        };
        self.getDownloadAutomatically = function() {
            return downloadAutomatically;
        };
        self.setSaveAutomatically = function(value) {
            saveAutomatically = value;
            cookieService.setCookie(saveAutomaticallyCookie, saveAutomatically);
        };
        self.getSaveAutomatically = function() {
            return saveAutomatically;
        };

        self.hasSpectra = function() {
            return data.spectra.length > 0;
        };
        self.getNumberMatched = function() {
            return self.spectraManager.getNumberMatched();
        };
        self.getNumberProcessed = function() {
            return self.spectraManager.getNumberProcessed();
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
            return self.spectraManager.getNumberTotal();
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
            self.spectraManager.setSpectra(spectraList);

            qualityService.setMax(spectraList.length);
            qualityService.clear();
            for (var i = 0; i < spectraList.length; i++) {
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
            log.debug("Processed " + results.id);
            if (spectra.name != results.name) return;
            self.spectraManager.setProcessedResults(results);
            spectra.processedLambdaPlot = results.lambda;
            spectra.processedVariance = results.variance;
            spectra.processedVariancePlot = results.processedVariancePlot;

            if (!self.isProcessing() && self.isFinishedMatching()) {
                if (global.data.fits.length > 0) {
                    global.data.fits.shift();
                }
            }
        };
        self.setMatchedResults = function(results) {
            var spectra = data.spectraHash[results.id];
            var oldqop = spectra.qop;
            var prior = spectra.automaticResults;
            self.spectraManager.setMatchedResults(results);
            if (self.spectraManager.autoQOPs && oldqop == 0) {
                qualityService.changeSpectra(oldqop, spectra.autoQOP);
            }
            if (results.results.fft == null) {
                spectra.fft = null;
            } else {
                spectra.fft = new FFT(results.results.fft.real.length, results.results.fft.imag);
                spectra.fft.real = results.results.fft.real;
                spectra.fft.imag = results.results.fft.imag;
            }
            if (results.results.quasarFFT == null) {
                spectra.quasarFFT = null;
            } else {
                spectra.quasarFFT = new FFT(results.results.quasarFFT.real.length, results.results.quasarFFT.imag);
                spectra.quasarFFT.real = results.results.quasarFFT.real;
                spectra.quasarFFT.imag = results.results.quasarFFT.imag;
            }
            spectra.processedIntensity = results.results.intensity;
            if (saveAutomatically) {
                localStorageService.saveSpectra(spectra);
            }
            if (self.isFinishedMatching() && !self.isProcessing() && prior == null) {
                if (downloadAutomatically) {
                    console.log("Downloading from matching");
                    resultsGeneratorService.downloadResults();
                }
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
                var version = "1.0.0";
                if (lines[0].indexOf("{{") > 0) {
                    version = lines[0].substring(lines[0].indexOf("{{") + 2, lines[0].indexOf("}}"));
                }
                if (newFilename.length > 1) {
                    filename = newFilename;
                }
                for (var n = 0; n < lines.length; n++) {
                    if (lines[n].indexOf("#") != 0) {
                        break;
                    }
                }
                n--;
                var headers = lines[n].replace('#','').split(',');
                for (var w = 0; w < headers.length; w++) {
                    headers[w] = headers[w].trim();
                }
                for (var i = 0; i < lines.length - 1; i++) {
                    if (lines[i].indexOf("#") == 0) continue;
                    var columns = lines[i].split(',');
                    var res = {filename: filename, v: version};
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
    .service('resultsGeneratorService', ['global', 'templatesService', 'personalService', 'log', 'cookieService', function(global, templatesService, personalService, log, cookieService) {
        var self = this;
        self.resultsGenerator = new ResultsGenerator(global.data, templatesService);
        self.downloading = false;

        var numAutomaticCookie = "numAutomatic";
        self.setNumAutomatic = function(num) {
            if (num <= 5) {
                self.resultsGenerator.setNumAutomatic(num);
                cookieService.setCookie(numAutomaticCookie, num);
            }
        };
        self.getNumAutomatic = function() {
            return self.resultsGenerator.numAutomatic;
        };
        self.setNumAutomatic(cookieService.registerCookieValue(numAutomaticCookie, 1));

        self.downloadResults = function() {
            if (self.downloading) {
                return;
            }
            log.debug("Downloading results");
            self.downloading = true;
            personalService.ensureInitials().then(function() {
                var results = self.resultsGenerator.getResultsCSV();
                console.log(results);
                if (results.length > 0) {
                    var blob = new window.Blob([results], {type: 'text/plain'});
                    saveAs(blob, self.getFilename());
                }
                self.downloading = false;
            }, function() {
                self.downloading = false;
            });
        };
        self.getFilename = function() {
            return global.data.fitsFileName + "_" + personalService.getInitials() + ".mz";
        };
        self.getResultFromSpectra = function(spectra) {
            return self.resultsGenerator.getResultFromSpectra(spectra);
        };
        self.getResultsCSV = function() {
            log.debug("Getting result CSV");
            return self.resultsGenerator.getResultsCSV(personalService.getInitials());
        };
        self.convertResultToMimicSpectra = function(result) {
            var spectra = new Spectra(result["ID"], null, null, null, null, result["Name"],
                result["RA"], result["DEC"],result["Mag"], result["Type"], result.filename);
            spectra.automaticBestResults = [{templateId: result["AutoTID"], z: result["AutoZ"], value: result["AutoXCor"]}];
            spectra.setComment(result["Comment"]);
            spectra.setQOP(parseInt(result["QOP"]));
            spectra.setVersion(result['v']);
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
                var value = 'localStorage' in window && window['localStorage'] !== null;
                if (value) {
                    try {
                        localStorage.setItem('localStorage', 1);
                        localStorage.removeItem('localStorage');
                        return true;
                    } catch (e) {
                        Storage.prototype._setItem = Storage.prototype.setItem;
                        Storage.prototype.setItem = function() {};
                        Storage.prototype._getItem = Storage.prototype.getItem;
                        Storage.prototype.getItem = function() {};
                        console.warn('Your web browser does not support storing settings locally. In Safari, the most common cause of this is using "Private Browsing Mode". Some settings may not save or some features may not work properly for you.');
                        return false;
                    }
                }
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
            var v = "";
            if (spectra.version != "1.0.0") {
                v = spectra.version;
            }
            return v + spectra.filename + spectra.name;
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
        self.vals = {};
        self.defaults = {};

        self.getCookie = function(property) {
            return self.vals[property];
        };

        self.saveCookie = function(property, value, exdays) {
            saveCookie(property, value, exdays);
        };

        self.getCookieCookie = function(property) {
            return getCookie(property);
        };


        self.setCookie = function(property, value) {
            self.vals[property] = value;
            try {
                self.saveCookie(property, value);
            } catch (err) {
                console.log("Error saving cookie " + property + ": " + err.message);
            }
        };
        self.registerCookieValue = function(property, defaultValue) {
            self.defaults[property] = defaultValue;
            var value = null;
            try {
                value = self.getCookieCookie(property);
            } catch (err) {
                console.log("Error getting cookie " + property)
            }
            self.vals[property] = value == null ? defaultValue : value;
            return self.vals[property];
        };
        self.setToDefault = function(property) {
            self.setCookie(property, self.defaults[property]);
            return self.defaults[property];
        };

    }])
    .service('processorService', ['$q', 'spectraService', 'cookieService', 'templatesService', 'log', function($q, spectraService, cookieService, templatesService, log) {
        var self = this;

        self.processorManager = new ProcessorManager();
        self.processorManager.setInactiveTemplateCallback(templatesService.getInactiveTemplates);
        self.processorManager.setProcessedCallback(spectraService.setProcessedResults);
        self.processorManager.setMatchedCallback(spectraService.setMatchedResults);


        var coreCookie = "numCores";
        var processTogetherCookie = "processTogether";

        self.getDefaultProcessType = function() {
            return false;
        };
        self.getProcessTogether = function() {
            return processTogether;
        };
        self.setDefaultProcessTogether = function() {
            processTogether = cookieService.setToDefault(processTogetherCookie);
        };
        self.setProcessTogether = function(value) {
            processTogether = value;
            cookieService.setCookie(processTogetherCookie, processTogether);
        };
        var processTogether = cookieService.registerCookieValue(processTogetherCookie, self.getDefaultProcessType());
        self.processorManager.setProcessTogether(processTogether);

        self.setDefaultNumberOfCores = function() {
            var defaultValue = 3;
            try {
                if (navigator != null && navigator.hardwareConcurrency != null) {
                    defaultValue = navigator.hardwareConcurrency;
                }
            } catch (err) {
                log.warn("Could not fetch navigator.hardwareConcurrency");
            }
            var c = cookieService.registerCookieValue(coreCookie, defaultValue);
            self.setNumberProcessors(c);
        };

        self.getNumberProcessors = function() {
            return self.processorManager.getNumberProcessors();
        };
        self.setNumberProcessors = function(num) {
            if (num < 1) {
                num = 1;
            } else if (num > 32) {
                num = 32;
            }
            cookieService.setCookie(coreCookie, num);
            self.processorManager.setNumberProcessors(num, $q);
        };
        self.toggleProcessing = function() {
            self.processorManager.toggleProcessing();
        };
        self.processSpectra = function(spectra) {
            self.processorManager.processSpectra(spectra);
        };
        self.addSpectraListToQueue = function(spectraList) {
            self.processorManager.addSpectraListToQueue(spectraList);
        };
        self.addToPriorityQueue = function(spectra, start) {
            self.processorManager.addToPriorityQueue(spectra, start);
        };
        self.shouldProcess = function(spectra) {
            return self.processorManager.shouldProcess(spectra);
        };
        self.shouldMatch = function(spectra) {
            return self.processorManager.shouldMatch(spectra);
        };
        self.shouldProcessAndMatch = function(spectra) {
            return self.processorManager.shouldProcessAndMatch(spectra);
        };
        self.isPaused = function() {
            return self.processorManager.isPaused();
        };
        self.setPause = function() {
            self.processorManager.setPause();
        };
        self.setRunning = function() {
            self.processorManager.setRunning();
        };
        self.togglePause = function() {
            self.processorManager.togglePause();
        };

        self.setDefaultNumberOfCores();

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
            return templates.getNameForTemplate(templateId);
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
    .service('fitsFile', ['$q', 'global', 'spectraService', 'processorService', 'log', function($q, global, spectraService, processorService, log) {
        var self = this;
        self.fitsFileLoader = new FitsFileLoader($q, global, log, processorService);
        self.fitsFileLoader.subscribeToInput(spectraService.setSpectra);
        self.fitsFileLoader.subscribeToInput(processorService.addSpectraListToQueue);

        self.getFilename = function() {
            return self.fitsFileLoader.filename;
        };
        self.getOriginalFilename = function() {
            return self.fitsFileLoader.originalFilename;
        };
        self.isLoading = function() {
            return self.fitsFileLoader.isLoading;
        };
        self.loadInFitsFile = function(file) {
            return self.fitsFileLoader.loadInFitsFile(file);
        };
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
            var ratio = window.devicePixelRatio || 1.0;
            var width = canvas.width / ratio;
            var height = canvas.height / ratio;
            self.plot(r[0], r[1], ui.colours.template, canvas, bounds, width, height);
        };
        self.drawOverviewOnCanvas = function(spectra, canvas, width, height) {
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
                self.plotZeroLine(canvas, "#C4C4C4", bounds, width, height);
                self.plot(lambda, intensity, ui.colours.raw, canvas, bounds, width, height);
                if (tempIntensity != null) {
                    toBound2.push([lambda, tempIntensity]);
                    var bounds2 = self.getMaxes(toBound2);
                    self.plot(lambda, tempIntensity, ui.colours.matched, canvas, [bounds[0], bounds[1], bounds2[2], bounds2[2] + (2*(bounds2[3] - bounds2[2]))], width, height);
                }
            }
        };
        self.plot = function(xs, data, colour, canvas, bounds, w, h) {
            if (data == null || data.length == 0) {
                return;
            }
            var c = canvas.getContext("2d");
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
        self.plotZeroLine = function (canvas, colour, bounds, w, h) {
            var c = canvas.getContext("2d");
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
            var ratio = window.devicePixelRatio || 1.0;
            canvas.style.width = canvas.clientWidth;
            canvas.style.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth * ratio;
            canvas.height = canvas.clientHeight * ratio;
            var c = canvas.getContext("2d");
            c.scale(ratio, ratio);
            c.save();
            // Use the identity matrix while clearing the canvas
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.clearRect(0, 0, canvas.width, canvas.height);
            // Restore the transform
            c.restore();
        };
    }]);