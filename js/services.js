angular.module('servicesZ', [])
    .provider('global', function() {
        var dataStore = {
            ui: {
                active: null,
                graphicalLayout: true,
                dataSelection: {
                    raw: true,
                    processed: true,
                    matched: true,
                    sky: true
                },
                detailed: {
                    bounds: {
                        redshiftMin: 0,
                        redshiftMax: 4,
                        maxMatches: 8,
                        maxSmooth: 11
                    },
                    templateId: '0',
                    continuum: false,
                    redshift: "0",
                    matchedActive: true,
                    matchedIndex: null,
                    processedSmooth: "1",
                    rawSmooth: "2",
                    width: 300,
                    spectraFocus: null,
                    spectralLines: true,
                    waitingForSpectra: false,
                    lockedBounds: false

                },
                colours: {
                    unselected: '#E8E8E8',
                    raw: "#111111",
                    processed: "#058518",
                    matched: "#AA0000",
                    sky: "#009DFF",
                    template: '#8C0623'
                }
            },
            data: {
                fitsFileName: null,
                spectra: [],
                spectraHash: {}
            }
        };
        this.$get = [function() {
            return dataStore;
        }]
    })
    .service('spectraService', ['global', 'resultsGeneratorService', 'cookieService', 'localStorageService', 'resultsLoaderService',
        function(global, resultsGeneratorService, cookieService, localStorageService, resultsLoaderService) {
        var self = this;
        var data = global.data;

        var downloadAutomatically = null;
        var downloadAutomaticallyCookie = "downloadAutomatically";
        var saveAutomatically = null;
        var saveAutomaticallyCookie = "saveInBackground";

        self.setDownloadAutomaticallyDefault = function() {
            self.setDownloadAutomatically(false);
        };
        self.setSaveAutomaticallyDefault = function() {
            self.setSaveAutomatically(true);
        };
        self.setDownloadAutomaticallyInitial = function() {
            var cookie = cookieService.getCookie(downloadAutomaticallyCookie);
            if (cookie == null) {
                self.setDownloadAutomaticallyDefault()
            } else {
                downloadAutomatically = cookie;
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
        self.setDownloadAutomaticallyInitial();
        self.setSaveAutomaticallyInitial();
        self.setDownloadAutomatically = function(value) {
            downloadAutomatically = value;
            cookieService.saveCookie(downloadAutomaticallyCookie, downloadAutomatically);
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
        self.setSpectra = function(spectraList) {
            data.spectra.length = 0;
            data.spectraHash = {};
            for (var i = 0; i < spectraList.length; i++) {
                data.spectra.push(spectraList[i]);
                data.spectraHash[spectraList[i].id] = spectraList[i];
                var result = localStorageService.loadSpectra(spectraList[i]);
                if (result != null) {
                    self.loadLocalStorage(spectraList[i], result);
                }
            }
        };
        self.loadLocalStorage = function(spectra, vals) {
            spectra.isMatched = true;

            spectra.automaticResults = [{}];
            for (var i = 1; i < vals.length; i++) {
                if (vals[i].name == "QOP") {
                    spectra.qop = vals[i].value;
                }
            }
            for (var i = 1; i < vals.length; i++) {
                if (vals[i].name == "AutomaticTemplateID") {
                    spectra.automaticResults[0].templateId = vals[i].value;
                } else if (vals[i].name == "AutomaticRedshift") {
                    spectra.automaticResults[0].z = parseFloat(vals[i].value);
                } else if (vals[i].name == "AutomaticChi2") {
                    spectra.automaticResults[0].chi2 = parseFloat(vals[i].value);
                } else if (vals[i].name == "FinalTemplateID" && spectra.qop > 0) {
                    spectra.manualTemplateID = vals[i].value;
                } else if (vals[i].name == "FinalRedshift" && spectra.qop > 0) {
                    spectra.manualRedshift = parseFloat(vals[i].value);
                }
            }

            spectra.automaticBestResults = spectra.automaticResults;

            if (downloadAutomatically && self.isFinishedMatching()) {
                resultsGeneratorService.downloadResults();
            }
        };
        self.getSpectra = function(id) {
            if (id == null) return data.spectra;
            return data.spectraHash[id];
        };
        self.getNextSpectra = function(spectra) {
            if (spectra == null) return;
            for (var i = 0; i < data.spectra.length - 1; i++) {
                if (data.spectra[i] == spectra) {
                    return data.spectra[i + 1];
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
            spectra.processedLambda = results.lambda;
            spectra.processedIntensity = results.intensity;
            spectra.processedLambdaPlot = results.lambda.map(function(x) { return Math.pow(10, x); });
            spectra.processedVariance = results.variance;
            spectra.isProcessing = false;
            spectra.isProcessed = true;
        };
        self.setMatchedResults = function(results) {
            var spectra = data.spectraHash[results.id];
            spectra.automaticResults = results.results;
            spectra.automaticBestResults = self.getBestResults(results.results);
            spectra.isMatching = false;
            spectra.isMatched = true;
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
        };
        self.setManualResults = function(spectra, templateId, redshift, qop) {
            spectra.manualTemplateID = templateId;
            spectra.manualRedshift = parseFloat(redshift);
            spectra.qop = qop;
            if (saveAutomatically) {
                localStorageService.saveSpectra(spectra);
            }
        };
        self.getBestResults = function(resultsList) {
            var best = [{
                templateId: resultsList[0].id,
                z: resultsList[0].top[0].z,
                chi2: resultsList[0].top[0].chi2
            }];
            var threshold = 0.05;
            var i;
            var merged = [];
            for (i = 0; i < resultsList.length; i++) {
                var tr = resultsList[i];
                for (var j = 0; j < tr.top.length; j++) {
                    var trr = tr.top[j];
                    merged.push({id: tr.id, z: trr.z, chi2: trr.chi2});
                }
            }
            merged.sort(function(a,b) {
                return a.chi2 - b.chi2;
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
                    best.push({templateId: merged[i].id, z: merged[i].z, chi2: merged[i].chi2});
                }
                i++;
            }
            return best;
        }
    }])
    .service('spectraLineService', [function() {
        var self = this;
        var spectralLines = new SpectralLines();
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
            var filename = file.name.replace('.txt', '').replace('.csv', '').replace('_Results', '');
            var reader = new FileReader();
            reader.onload = function(e) {
                var text = reader.result;
                var lines = text.split('\n');
                var headers = lines[0].split(',');
                for (var i = 1; i < lines.length - 1; i++) {
                    var columns = lines[i].split(',');
                    var res = {filename: filename};
                    for (var j = 0; j < columns.length; j++) {
                        if (isFloatString(columns[j])) {
                            res[headers[j]] = parseFloat(columns[j]);
                        } else {
                            res[headers[j]] = columns[j];
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
    .service('resultsGeneratorService', ['global', 'templatesService', function(global, templatesService) {
        var self = this;
        self.downloadResults = function() {
            var results = self.getResultsCSV();
            if (results.length > 0) {
                var blob = new Blob([results], {type: 'text/html'});
                saveAs(blob, self.getFilename());
            }
        };
        self.getFilename = function() {
            return global.data.fitsFileName + ".csv";
        };
        self.getResultsCSV = function() {
            var results = self.getResultsArray();
            var string = "";
            for (var i = 0; i < results.length; i++) {
                var res = results[i];
                var first = 0;
                if (i == 0) {
                    for (var k = 0; k < res.length; k++) {
                        string += ((first++ == 0) ? "" : ",") + res[k].name;
                    }
                    string += "\n";
                    first = 0;
                }
                for (var j = 0; j < res.length; j++) {
                    string += ((first++ == 0) ? "" : ",") + res[j].value;
                }
                string += "\n";
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
                {name: "SpectraID", value: spectra.id},
                {name: "SpectraName", value: spectra.name},
                {name: "SpectraRA", value: spectra.ra.toFixed(6)},
                {name: "SpectraDec", value: spectra.dec.toFixed(6)},
                {name: "SpectraMagnitude", value: spectra.magnitude.toFixed(2)},
                {name: "SpectraType", value: spectra.type},
                {name: "AutomaticTemplateID", value: spectra.getBestAutomaticResult().templateId},
                {name: "AutomaticTemplateName", value:  templatesService.getNameForTemplate(spectra.getBestAutomaticResult().templateId)},
                {name: "AutomaticRedshift", value: spectra.getBestAutomaticResult().z.toFixed(5)},
                {name: "AutomaticChi2", value: spectra.getBestAutomaticResult().chi2},
                {name: "FinalTemplateID", value: spectra.getFinalTemplateID()},
                {name: "FinalTemplateName", value: templatesService.getNameForTemplate(spectra.getFinalTemplateID())},
                {name: "FinalRedshift", value: spectra.getFinalRedshift().toFixed(5)},
                {name: "QOP", value: spectra.qop}
            ]
        };
        self.convertResultToMimicSpectra = function(result) {
            var spectra = new Spectra(result["SpectraID"], null, null, null, null, null, result["SpectraName"],
                result["SpectraRA"], result["SpectraDec"],result["SpectraMagnitude"], result["SpectraType"], result.filename);
            spectra.automaticBestResults = [{templateId: result["AutomaticTemplateID"], z: result["AutomaticRedshift"], chi2: result["AutomaticChi2"]}];
            spectra.qop = result["QOP"];
            if (spectra.qop > 0) {
                spectra.manualTemplateID = result["FinalTemplateID"];
                spectra.manualRedshift = result["FinalRedshift"];
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
            var name = property + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i].trim();
                if (c.indexOf(name) == 0) {
                    return JSON.parse(c.substring(name.length, c.length));
                }
            }
            return null;
        };

        self.saveCookie = function(property, value, exdays) {
            if (exdays == null) {
                exdays = 1000;
            }
            var d = new Date();
            d.setTime(d.getTime() + (exdays*24*60*60*1000));
            var expires = "expires=" + d.toGMTString();
            document.cookie = property + "=" + JSON.stringify(value) + "; " + expires;
        };
    }])
    .service('processorService', ['$q', 'spectraService', 'cookieService', function($q, spectraService, cookieService) {
        var self = this;

        var processors = [];
        var priorityJobs = [];
        var processing = true;
        var jobs = [];

        self.setDefaultNumberOfCores = function() {
            var initialNumberProcessors = navigator.hardwareConcurrency;
            if (typeof(initialNumberProcessors) === "undefined") {
                initialNumberProcessors = 3;
            }
            self.setNumberProcessors(initialNumberProcessors);
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
            for (i = 0; i < spectraList.length; i++) {
                jobs.push(spectraList[i]);
            }
            self.processJobs();
        };
        self.addToPriorityQueue = function(spectra) {
            spectra.isMatched = false;
            priorityJobs.push(spectra);
            self.processJobs();
        };
        self.hasIdleProcessor = function() {
            return self.getIdleProcessor() != null;
        };
        self.shouldProcess = function(spectra) {
            return !spectra.isProcessing && !spectra.isProcessed;
        };
        self.shouldMatch = function(spectra) {
            return spectra.isProcessed && !spectra.isMatching && !spectra.isMatched;
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
            for (i = 0; i < priorityJobs.length; i++) {
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

        self.getNameForTemplate = function(templateId) {
            return templates.templatesHash[templateId].name;
        };
        self.getTemplates = function() {
            return templates.templates;
        };

    }])
    .service('fitsFile', ['$q', 'global', 'spectraService', 'processorService', function($q, global, spectraService, processorService) {
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
        var typeIndex = null;
        var numPoints = null;

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
            self.fits = new astro.FITS(file, function() {
                parseFitsFile(q);
            });
            return q.promise;

        };
        var parseFitsFile = function(q) {
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
            getFibres(q);
        };
        var getFibres = function(q) {
            self.fits.getDataUnit(typeIndex).getColumn("TYPE", function(data) {
                var ind = 0;
                for (var i = 0; i < data.length; i++) {
                    if (data[i] == "P") {
                        spectra.push({index: ind++, fitsIndex: i, id: i+1, lambda: lambda.slice(0), intensity: [], variance: [], miniRendered: 0});
                    }
                }
                getNames(q);
            });
        };
        var getNames = function(q) {
            self.fits.getDataUnit(typeIndex).getColumn("NAME", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].name = data[j].replace(/\W/g, '');
                }
                getRA(q);
            });
        };
        var getRA = function(q) {
            self.fits.getDataUnit(typeIndex).getColumn("RA", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].ra = data[j];
                }
                getDec(q);
            });
        };
        var getDec = function(q) {
            self.fits.getDataUnit(typeIndex).getColumn("DEC", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].dec = data[j];
                }
                getMagnitudes(q);
            });
        };

        var getMagnitudes = function(q) {
            self.fits.getDataUnit(typeIndex).getColumn("MAGNITUDE", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].magnitude = data[j];
                }
                getComments(q);
            });
        };
        var getComments = function(q) {
            self.fits.getDataUnit(typeIndex).getColumn("COMMENT", function(data) {
                for (var i = 0; i < spectra.length; i++) {
                    var j = spectra[i].fitsIndex;
                    spectra[i].type = data[j].split(' ')[0];
                    if (spectra[i].type == 'Parked') {
                        spectra.splice(i,1);
                        for (var k = i; k < spectra.length; k++) {
                            spectra[k].index--;
                        }
                    }
                }
                getSky(q);
            });
        };
        var getSky = function(q) {
            self.fits.getDataUnit(skyIndex).getFrame(0, function(data) {
                var d = Array.prototype.slice.call(data);
                if (isCoadd) {
                    for (var i = 0; i < spectra.length; i++) {
                        spectra[i].sky = d.slice((spectra[i].id-1) * numPoints, (spectra[i].id ) * numPoints);
                        removeNaNs(spectra[i].sky);
                        normaliseViaArea(spectra[i].sky, null, 30000);
                        cropSky(spectra[i].sky, 80);
                        spectra[i].skyAverage = getAverage(spectra[i].sky);
                    }
                } else {
                    sky = d;
                    removeNaNs(sky);
                    normaliseViaArea(sky, null, 30000);
                    cropSky(sky, 80);
                    skyAverage = getAverage(sky);
                }
                getSpectra(q);
            });
        };
        var getSpectra = function(q) {
            self.fits.getDataUnit(0).getFrame(0, function(data) {
                var d = Array.prototype.slice.call(data);
                for (var i = 0; i < spectra.length; i++) {
                    spectra[i].intensity = d.slice((spectra[i].id-1) * numPoints, (spectra[i].id ) * numPoints);
                }
                getVariances(q);
            })
        };
        var getVariances = function(q) {
            self.fits.getDataUnit(1).getFrame(0, function(data) {
                var d = Array.prototype.slice.call(data);
                for (var i = 0; i < spectra.length; i++) {
                    spectra[i].variance = d.slice((spectra[i].id-1) * numPoints, (spectra[i].id ) * numPoints);
                }
                convertToUsableObjects(q);
            });
        };
        var convertToUsableObjects = function(q) {
            var spectraList = [];
            for (var j = 0; j < spectra.length; j++) {
                var s = new Spectra(spectra[j].id, lambda.slice(0), spectra[j].intensity, spectra[j].variance,
                    isCoadd ? spectra[j].sky : sky, isCoadd ? spectra[j].skyAverage : skyAverage, spectra[j].name, spectra[j].ra, spectra[j].dec,
                    spectra[j].magnitude, spectra[j].type, originalFilename);
                spectraList.push(s);
            }
            isLoading = false;
            spectraService.setSpectra(spectraList);
            processorService.addSpectraListToQueue(spectraList);
            q.resolve();
        }

    }])
    .service('drawingService', ['global', 'templatesService', function(global, templatesService) {
    var self = this;
    var ui = global.ui;
    self.drawTemplateOnCanvas = function(template, canvas) {
        var arr = template.lambda;
        var bounds = self.getMaxes([
            [arr, template.spec]
        ]);
        self.clearPlot(canvas);
        self.plot(arr, template.spec, ui.colours.template, canvas, bounds);
    };
    self.drawOverviewOnCanvas = function(spectra, canvas) {
        var width = canvas.clientWidth;
        if (spectra.intensity.length > 0) {
            var lambda = self.condenseToXPixels(spectra.lambda, width);
            var intensity = self.condenseToXPixels(spectra.intensityPlot, width);
            var processedLambda = self.condenseToXPixels(spectra.processedLambdaPlot, width);
            var processedIntensity = self.condenseToXPixels(spectra.processedIntensity, width);
            var r = null;
            if (spectra.getFinalTemplateID() != null) {
                r = templatesService.getTemplateAtRedshift(spectra.getFinalTemplateID(), spectra.getFinalRedshift(), false);
            }
            if (r == null || r[0] == null || r[1] == null) {
                var tempIntensity = null;
            } else {
                var tempIntensity = self.condenseToXPixels(interpolate(spectra.lambda, r[0], r[1]), width);
            }
            self.clearPlot(canvas);
            var toBound = [];
            if (ui.dataSelection.raw) {
                toBound.push([lambda, intensity]);
            }
            if (ui.dataSelection.processed) {
                toBound.push([processedLambda, processedIntensity]);
            }
            if (ui.dataSelection.matched && tempIntensity != null) {
                toBound.push([lambda, tempIntensity]);
            }
            var bounds = self.getMaxes(toBound);
            this.plotZeroLine(canvas, "#C4C4C4", bounds);
            if (ui.dataSelection.raw) {
                self.plot(lambda, intensity, ui.colours.raw, canvas, bounds);
            }
            if (ui.dataSelection.processed && processedIntensity != null) {
                self.plot(processedLambda, processedIntensity, ui.colours.processed, canvas, bounds);
            }
            if (ui.dataSelection.matched && tempIntensity != null) {
                self.plot(lambda, tempIntensity, ui.colours.matched, canvas, bounds);
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