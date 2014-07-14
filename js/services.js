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
                spectra: [],
                spectraHash: {}
            }
        };
        this.$get = [function() {
            return dataStore;
        }]
    })
    .service('spectraManager', ['global', function(global) {
        var self = this;
        var data = global.data;

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
        self.getNumberTotal = function() {
            return data.spectra.length;
        };
        self.isProcessing = function() {
            return self.getNumberMatched() < self.getNumberTotal();
        };
        self.loadInSpectra = function(file) {
            console.log("loading in ", file);
        };
        self.loadInResults = function(file) {
            console.log("loading in results from ", file);
        };

        self.setSpectra = function(spectraList) {
            data.spectra.length = 0;
            data.spectraHash = {};
            for (var i = 0; i < spectraList.length; i++) {
                data.spectra.push(spectraList[i]);
                data.spectraHash[spectraList[i].id] = spectraList[i];
            }
        };
        self.getSpectra = function(id) {
            if (id == null) return data.spectra;
            return data.spectraHash[id];
        };
    }])

    .service('resultsLoader', [function() {

    }])

    .service('processorService', ['$q', function($q) {
        var self = this;

        var numProcessors = 3;
        var processors = [];
        var priorityJobs = [];
        var processing = true;
        var jobs = [];
        console.log("Adding", numProcessors, "workers");
        for (var i = 0; i < numProcessors; i++) {
            processors.push(new Processor($q));
        }

        self.toggleProcessing = function() {
            processing = !processing;
        };
        self.processSpectra = function(spectra) {
            console.log('Process spectra', spectra);
            var processor = self.getIdleProcessor();
            processor.workOnSpectra(spectra).then(function(result) {
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
            console.log('Adding to queue');
            for (i = 0; i < spectraList.length; i++) {
                jobs.push(spectraList[i]);
            }
            self.processJobs();
        };

        self.addToPriorityQueue = function(spectra) {
            priorityJobs.push(spectra);
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

        /**
         * Processes priority jobs processing then matching, and then normal
         * jobs processing and matching if processing is enabled.
         */
        self.processJobs = function() {
            console.log('Processing jobs');
            var findingJobs = true;
            while (findingJobs && self.hasIdleProcessor()) {
                findingJobs = self.processAJob();
            }
        };
        self.processAJob = function() {
            for (i = 0; i < priorityJobs.length; i++) {
                if (self.shouldProcess(priorityJobs[i])) {
                    self.processSpectra(priorityJobs[i].getProcessMessage());
                    return true;
                }
            }
            for (i = 0; i < priorityJobs.length; i++) {
                if (self.shouldMatch(priorityJobs[i])) {
                    self.processSpectra(priorityJobs[i].getMatchMessage());
                    return true;
                }
            }
            if (processing) {
                for (i = 0; i < jobs.length; i++) {
                    if (self.shouldProcess(jobs[i])) {
                        self.processSpectra(jobs[i].getProcessMessage());
                        return true;
                    }
                }
                for (i = 0; i < jobs.length; i++) {
                    if (self.shouldMatch(jobs[i])) {
                        self.processSpectra(jobs[i].getMatchMessage());
                        return true;
                    }
                }
            }
            return false;
        };

        //TODO: Add and remove number processors


    }])

    .service('templatesService', [function() {
        var self = this;

        var templates = new TemplateManager();

        self.getTemplateAtRedshift = function(templateId, redshift, withContinuum) {
            return templates.getTemplate(templateId, redshift, withContinuum);
        };
        self.getTemplates = function() {
            return templates.templates;
        };

    }])
    .service('fitsFile', ['$q', 'spectraManager', 'processorService', function($q, spectraManager, processorService) {
        var self = this;

        var hasFitsFile = false;
        var isLoading = false;
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
        self.isLoading = function() {
            return isLoading;
        };
        self.loadInFitsFile = function(file) {
            var q = $q.defer();
            isLoading = true;
            hasFitsFile = true;
            filename = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
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
                    spectra[j].magnitude, spectra[j].type, self.filename);
                spectraList.push(s);
            }
            isLoading = false;
            spectraManager.setSpectra(spectraList);
            processorService.addSpectraListToQueue(spectraList);
            q.resolve();
        }

    }])

    .service('drawingService', ['global', function(global) {
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
                var intensity = self.condenseToXPixels(spectra.intensity, width);
                var processedLambda = self.condenseToXPixels(spectra.processedLambda, width);
                var processed = self.condenseToXPixels(spectra.processedIntensity, width);
                var tempIntensity = null; //TODO: REMOVE THIS LINE. DO THIS WHOLE SECTION BETTER
//                var template = v.getFinalTemplate();
//                var index = template == null ? null : template.index;
//                var r = this.templateManager.getShiftedLinearTemplate(index, v.getFinalRedshift())
//                if (r[0] == null || r[1] == null) {
//                    var tempIntensity = null;
//                } else {
//                    var tempIntensity = condenseToXPixels(interpolate(v.lambda, r[0], r[1]), width);
//                }
                self.clearPlot(canvas);
                var toBound = [];
                if (ui.dataSelection.raw) {
                    toBound.push([lambda, intensity]);
                }
                if (ui.dataSelection.processed) {
                    toBound.push([processedLambda, processed]);
                }
                if (ui.dataSelection.matched && tempIntensity != null) {
                    toBound.push([lambda, tempIntensity]);
                }

                var bounds = self.getMaxes(toBound);
                this.plotZeroLine(canvas, "#C4C4C4", bounds);
                if (ui.dataSelection.raw) {
                    self.plot(lambda, intensity, ui.colours.raw, canvas, bounds);
                }
                if (ui.dataSelection.processed) {
                    self.plot(processedLambda,processed, ui.colours.processed, canvas, bounds);
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