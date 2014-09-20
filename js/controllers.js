angular.module('controllersZ', ['ui.router', 'ui.bootstrap', 'servicesZ'])
    .controller('NavbarController', ['$scope', '$state', 'personalService', 'global', function($scope, $state, personalService, global) {
        $scope.states = [
            {name: 'overview', icon: "th"},
            {name: 'detailed', icon: "signal"},
            {name: 'templates', icon: "tasks"},
            {name: 'settings', icon: "cog"},
            {name: 'usage', icon: "question-sign"}
        ];
        $scope.isActive = function(state) {
            return $state.current.name == state;
        };
        $scope.personal = global.personal;
        $scope.changeInitials = function() {
            $scope.initials = personalService.updateInitials();
        };
    }])
    .controller('MainController', ['$scope', 'spectraService', 'global', '$state', '$timeout', function($scope, spectraService, global, $state, $timeout) {
        window.onbeforeunload = function(){
            return 'Please ensure changes are all saved before leaving.';
        };
        $scope.isDetailedView = function() {
            return $state.current.name == 'detailed';
        };
        $scope.isWaitingDrop = function() {
            return !spectraService.hasSpectra();
        };
        $scope.isActive = function(spectra) {
            if (spectra.id != null) {
                return global.ui.active == spectra;
            } else {
                return global.ui.active == spectra.id;
            }
        };
        $scope.getActive = function() {
            if (global.ui.active == null) return null;
            return global.ui.active;
        };
        $scope.setActive = function(spectra) {
            if (spectra == null) {
                return;
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
        $scope.setPreviousSpectra = function() {
            $scope.setActive(spectraService.getPreviousSpectra($scope.getActive()));
        };
        $scope.setNextSpectra = function() {
            $scope.setActive(spectraService.getNextSpectra($scope.getActive()));
        };
        $scope.hasActive = function() {
            return $scope.getActive() != null;
        };
        $scope.goToDetailed = function() {
            $state.go('detailed');
        };
        $scope.toggleRaw = function() {
            global.ui.dataSelection.raw = !global.ui.dataSelection.raw;
            global.ui.dataSelection.processed = !global.ui.dataSelection.raw
        };
        $scope.toggleProcessed = function() {
            global.ui.dataSelection.processed = !global.ui.dataSelection.processed;
            global.ui.dataSelection.raw = !global.ui.dataSelection.processed
        };
        $scope.toggleMatched = function() {
            global.ui.dataSelection.matched = !global.ui.dataSelection.matched;
        };
        $scope.toggleSky = function() {
            global.ui.dataSelection.sky = !global.ui.dataSelection.sky;
        };
        $scope.saveManual = function(qop) {
            if ($scope.hasActive()) {
                spectraService.setManualResults(global.ui.active, global.ui.detailed.templateId, global.ui.detailed.redshift, qop);
                $scope.setNextSpectra();
            }
        };
        $scope.keybinds = [
            {key: 'shift+?', label: '?', description: 'Go to the Usage tab', fn: function() {
                $state.go('usage');
            }},
            {key: 'n', label: 'n', description: 'Selects to the next spectra', fn: function() {
                $scope.setNextSpectra();
                $scope.$apply();
            }},
            {key: 'b', label: 'b', description: 'Selects to the previous spectra', fn: function() {
                $scope.setPreviousSpectra();
                $scope.$apply();
            }},
            {key: 't', label: 't', description: 'Toggle whether templates are displayed', fn: function() {
                global.ui.dataSelection.matched = !global.ui.dataSelection.matched;
                $scope.$apply();
            }},
            {key: '1', label: '1', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 1', fn: function() {
                $scope.saveManual(1);
                $scope.$apply();
            }},
            {key: '2', label: '2', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 2', fn: function() {
                $scope.saveManual(2);
                $scope.$apply();
            }},
            {key: '3', label: '3', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 3', fn: function() {
                $scope.saveManual(3);
                $scope.$apply();
            }},
            {key: '4', label: '4', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 4', fn: function() {
                $scope.saveManual(4);
                $scope.$apply();
            }},
            {key: 'z', label: 'z', controller: "detailed", description: '[Detailed screen] Focus on redshift input', fn: function($scope, e) {
                $scope.setFocusToRedshift();
                e.preventDefault();
            }},
            {key: 'm', label: 'm', controller: "detailed", description: '[Detailed screen] Set view to manually found redshift', fn: function($scope) {
                $scope.resetToManual();
                $scope.$apply();
            }},
            {key: 'shift+r', label: 'shift+r', controller: "detailed", description: '[Detailed screen] Set view to automaticly found redshift', fn: function($scope) {
                $scope.resetToAutomatic();
                $scope.$apply();
            }},
            {key: 'o', label: 'o', controller: "detailed", description: '[Detailed screen] Show the next automatic redshift result', fn: function($scope) {
                $timeout(function() { $scope.nextMatchedDetails()});
            }},
            {key: 's', label: 's', controller: "detailed", description: '[Detailed screen] Increase smoothing level', fn: function($scope) {
                $scope.incrementSmooth();
                $scope.$apply();
            }},
            {key: 'd', label: 'd', controller: "detailed", description: '[Detailed screen] Decrease smoothing level', fn: function($scope) {
                $scope.decrementSmooth();
                $scope.$apply();
            }},
            {key: 'r', label: 'r', controller: "detailed", description: '[Detailed screen] Reset graph zoom to extents', fn: function($scope) {
                global.ui.detailed.lockedBounds = false;
                $scope.$apply();
            }},
            {key: 'l', label: 'l', controller: "detailed", description: '[Detailed screen] Toggles spectral lines', fn: function($scope) {
                $scope.toggleSpectralLines();
                $scope.$apply();
            }},
            {key: 'down', label: 'down', controller: "detailed", description: '[Detailed screen] Selects the next template', fn: function($scope) {
                $scope.nextTemplate();
                $scope.$apply();
            }},
            {key: 'up', label: 'up', controller: "detailed", description: '[Detailed screen] Selects the previous template', fn: function($scope) {
                $scope.previousTemplate();
                $scope.$apply();
            }},
            {key: 'shift+y', label: 'shift+y', controller: "detailed", description: '[Detailed screen] Sets the current focus to Lyb', fn: function($scope) {
                $scope.clickSpectralLine('Lyb');
                $scope.$apply();
            }},
            {key: 'shift+l', label: 'shift+l', controller: "detailed", description: '[Detailed screen] Sets the current focus to Lya', fn: function($scope) {
                $scope.clickSpectralLine('Lya');
                $scope.$apply();
            }},
            {key: 'shift+t', label: 'shift+t', controller: "detailed", description: '[Detailed screen] Sets the current focus to N5', fn: function($scope) {
                $scope.clickSpectralLine('N5');
                $scope.$apply();
            }},
            {key: 'shift+s', label: 'shift+s', controller: "detailed", description: '[Detailed screen] Sets the current focus to Si4', fn: function($scope) {
                $scope.clickSpectralLine('Si4');
                $scope.$apply();
            }},
            {key: 'shift+c', label: 'shift+c', controller: "detailed", description: '[Detailed screen] Sets the current focus to CIV', fn: function($scope) {
                $scope.clickSpectralLine('C4');
                $scope.$apply();
            }},
            {key: 'shift+v', label: 'shift+v', controller: "detailed", description: '[Detailed screen] Sets the current focus to CIII', fn: function($scope) {
                $scope.clickSpectralLine('C3');
                $scope.$apply();
            }},
            {key: 'shift+m', label: 'shift+m', controller: "detailed", description: '[Detailed screen] Sets the current focus to MgII', fn: function($scope) {
                $scope.clickSpectralLine('Mg2');
                $scope.$apply();
            }},
            {key: 'shift+o', label: 'shift+o', controller: "detailed", description: '[Detailed screen] Sets the current focus to [OII]', fn: function($scope) {
                $scope.clickSpectralLine('O2');
                $scope.$apply();
            }},
            {key: 'shift+k', label: 'shift+k', controller: "detailed", description: '[Detailed screen] Sets the current focus to K', fn: function($scope) {
                $scope.clickSpectralLine('K');
                $scope.$apply();
            }},
            {key: 'shift+h', label: 'shift+h', controller: "detailed", description: '[Detailed screen] Sets the current focus to H', fn: function($scope) {
                $scope.clickSpectralLine('H');
                $scope.$apply();
            }},
            {key: 'shift+d', label: 'shift+d', controller: "detailed", description: '[Detailed screen] Sets the current focus to D', fn: function($scope) {
                $scope.clickSpectralLine('D');
                $scope.$apply();
            }},
            {key: 'shift+g', label: 'shift+g', controller: "detailed", description: '[Detailed screen] Sets the current focus to G', fn: function($scope) {
                $scope.clickSpectralLine('G');
                $scope.$apply();
            }},
            {key: 'shift+f', label: 'shift+f', controller: "detailed", description: '[Detailed screen] Sets the current focus to Hg', fn: function($scope) {
                $scope.clickSpectralLine('Hg');
                $scope.$apply();
            }},
            {key: 'shift+b', label: 'shift+b', controller: "detailed", description: '[Detailed screen] Sets the current focus to Hb', fn: function($scope) {
                $scope.clickSpectralLine('Hb');
                $scope.$apply();
            }},
            {key: 'shift+u', label: 'shift+u', controller: "detailed", description: '[Detailed screen] Sets the current focus to first [OIII]', fn: function($scope) {
                $scope.clickSpectralLine('O3');
                $scope.$apply();
            }},
            {key: 'shift+i', label: 'shift+i', controller: "detailed", description: '[Detailed screen] Sets the current focus to second [OIII]', fn: function($scope) {
                $scope.clickSpectralLine('O3d');
                $scope.$apply();
            }},
            {key: 'shift+j', label: 'shift+j', controller: "detailed", description: '[Detailed screen] Sets the current focus to Mg', fn: function($scope) {
                $scope.clickSpectralLine('Mg');
                $scope.$apply();
            }},
            {key: 'shift+n', label: 'shift+n', controller: "detailed", description: '[Detailed screen] Sets the current focus to Na', fn: function($scope) {
                $scope.clickSpectralLine('Na');
                $scope.$apply();
            }},
            {key: 'shift+a', label: 'shift+a', controller: "detailed", description: '[Detailed screen] Sets the current focus to Ha', fn: function($scope) {
                $scope.clickSpectralLine('Ha');
                $scope.$apply();
            }},
            {key: 'shift+w', label: 'shift+w', controller: "detailed", description: '[Detailed screen] Sets the current focus to N2', fn: function($scope) {
                $scope.clickSpectralLine('N2');
                $scope.$apply();
            }},
            {key: 'shift+z', label: 'shift+z', controller: "detailed", description: '[Detailed screen] Sets the current focus to S2', fn: function($scope) {
                $scope.clickSpectralLine('S2');
                $scope.$apply();
            }},
            {key: 'shift+x', label: 'shift+x', controller: "detailed", description: '[Detailed screen] Sets the current focus to S2 doublet', fn: function($scope) {
                $scope.clickSpectralLine('S2d');
                $scope.$apply();
            }}
        ];

        $scope.addClickHandler = function(key, fn, scope) {
            KeyboardJS.on(key, function(e) {
                if (!$("input").is(':focus')) {
                    fn(scope, e);
                }
            });
        };

        for (var i = 0; i < $scope.keybinds.length; i++) {
            if ($scope.keybinds[i].controller == null) {
                $scope.addClickHandler($scope.keybinds[i].key, $scope.keybinds[i].fn, $scope);
            }
        }
    }])
    .controller('OverviewController', ['$scope', 'spectraService', 'fitsFile', 'global', '$timeout', 'templatesService', '$state', function($scope, spectraService, fitsFile, global, $timeout, templatesService, $state) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.graphDisplaying = function() {
            return $state.current.name == 'overview' && $scope.ui.graphicalLayout;
        };
        $scope.isLoading = function() {
            return fitsFile.isLoading();
        };

        $scope.getName = function(spectra) {
            if (spectra.getFinalTemplateID()) {
                return templatesService.getNameForTemplate(spectra.getFinalTemplateID());
            } else {
                return "";
            }
        };

        // For the table section
        $scope.sortOrder = true;
        $scope.sortField = 'id';
        $scope.setSort = function(sort) {
            $scope.sortField = sort;
            $scope.sortOrder = !$scope.sortOrder;
        };
        $scope.isSortBy = function(sort) {
            return $scope.sortField == sort;
        };
        $scope.sortOverview = function(spectra) {
            var result = null;
            var nullRes = ('' + spectra.id).pad(5);
            if ($scope.sortField == 'type') {
                result = spectra.type;
            } else if ($scope.sortField == 'finalTemplateID') {
                result = spectra.getFinalTemplateID();
                if (result == null) {
                    if ($scope.sortOrder) {
                        result = "999";
                    } else {
                        result = "000"
                    }
                }
                result = result.pad(3);
            } else if ($scope.sortField == 'finalTemplateName') {
                if (spectra.getFinalTemplateID()) {
                    result = templatesService.getNameForTemplate(spectra.getFinalTemplateID())
                } else {
                    if ($scope.sortOrder) {
                        result = "zzz";
                    } else {
                        result = "000"
                    }
                }
            } else if ($scope.sortField == 'finalZ') {
                result = spectra.getFinalRedshift();
                if (result != null) {
                    result = result.toFixed(4).pad(6);
                } else {
                    if ($scope.sortOrder) {
                        result = "zzzzz";
                    } else {
                        result = "-----"
                    }
                }
                result = result.pad(10);
            } else if ($scope.sortField == 'qop') {
                result = spectra.qop;
                if (spectra.getFinalRedshift() == null) {
                    if ($scope.sortOrder) {
                        result = "z";
                    } else {
                        result = "-"
                    }
                }
            }
            return result + nullRes;
        };
        $scope.$watchCollection('[ui.active, ui.graphicalLayout]', function() {
            $timeout(function() {
                if ($scope.ui.graphicalLayout) {
                    $(".overview-item.activeSelect").scrollintoview();
                } else {
                    $(".overviewTable .activeSelect").scrollintoview();
                }
            });
        });
    }])
    .controller('DetailedController', ['$scope', 'spectraService', 'global', 'templatesService', 'spectraLineService', 'processorService', function($scope, spectraService, global, templatesService, spectraLineService, processorService) {
        $scope.settings = global.ui.detailed;
        $scope.ui = global.ui;
        $scope.bounds = global.ui.detailed.bounds;
        $scope.changedRedshift = function() {
            if (isNaN($scope.settings.redshift)) {
                $scope.settings.redshift = $scope.settings.oldRedshift;
            } else {
                $scope.settings.oldRedshift = $scope.settings.redshift;
                $scope.currentlyMatching();
            }
        };
        $scope.$watch('ui.active.getHash()', function() {
            if ($scope.getActive()) {
                $scope.currentlyMatching();
            }
        });
        $scope.getTemplatesList = function() {
            var data = [{id: '0', name: "Select a template"}];
            var t = templatesService.getTemplates();
            for (var i = 0; i < t.length; i++) {
                data.push({id: t[i].id, name: t[i].name});
            }
            return data;
        };
        $scope.toggleTemplateHasContinuum = function() {
            $scope.settings.continuum = !$scope.settings.continuum;
        };
        $scope.getContinuumText = function() {
            if ($scope.settings.continuum) {
                return "Continuum";
            } else {
                return "No continuum";
            }
        };
        $scope.hasMatchingDetails = function() {
            var spectra = $scope.getActive();
            if (spectra != null) {
                return spectra.getNumBestResults() > 1;
            }
            return false;
        };

        $scope.reanalyseSpectra = function() {
            if ($scope.hasActive()) {
                processorService.addToPriorityQueue($scope.getActive());
            }
        };
        $scope.showTopResults = function() {
            return $scope.hasActive() && $scope.getActive().hasMatches()
        };
        $scope.getMatches = function() {
            return $scope.getActive().getMatches($scope.bounds.maxMatches);
        };
        $scope.currentlyMatching = function() {
            var matches = $scope.getActive().getMatches($scope.bounds.maxMatches);
            var matched = false;
            for (var i = 0; i < matches.length; i++) {
                if ($scope.settings.redshift == matches[i].z && $scope.settings.templateId == matches[i].templateId) {
                    $scope.settings.matchedIndex = i;
                    matched = true;
                    matches[i].index = i;
                    if (i < matches.length - 1) {
                        matches[i].next = matches[i + 1];
                    } else {
                        matches[i].next = matches[0];
                    }
                    return matches[i];
                }
            }
            if (!matched) {
                $scope.settings.matchedIndex = null;
            }
            return null;
        };
        $scope.isCurrentlyMatching = function() {
            return $scope.currentlyMatching() != null;
        };
        $scope.getMatchedTemplateName = function() {
            var match = $scope.currentlyMatching();
            if (match != null) {
                return templatesService.getNameForTemplate(match.templateId);
            }
            return "";
        };
        $scope.nextMatchedDetails = function() {
            var match = $scope.currentlyMatching();
            if (match == null) {
                $scope.selectMatch($scope.getMatches()[0]);
            } else {
                $scope.selectMatch(match.next);
            }
            $scope.currentlyMatching();
            $scope.$apply();
        };
        $scope.selectMatch = function(match) {
            $scope.settings.redshift = match.z;
            $scope.settings.templateId = match.templateId;
        };
        $scope.getMatchedTemplateRedshift = function() {
            var match = $scope.currentlyMatching();
            if (match != null) {
                return match.z.toFixed(5);
            }
            return "";
        };
        $scope.resetToAutomatic = function() {
            var spectra = global.ui.active;
            if (spectra != null) {
                var best = spectra.getBestAutomaticResult();
                if (best != null) {
                    global.ui.detailed.templateId = "" + best.templateId;
                    global.ui.detailed.redshift = best.z;
                }
            }
        };
        $scope.resetToManual = function() {
            var spectra = global.ui.active;
            if (spectra != null) {
                var best = spectra.getManual();
                if (best != null) {
                    global.ui.detailed.templateId = "" + best.templateId;
                    global.ui.detailed.redshift = best.z;
                }
            }
        };
        $scope.isWaitingForSpectralLine = function() {
            return $scope.settings.waitingForSpectra;
        };
        $scope.clickSpectralLine = function(id) {
            if ($scope.settings.spectraFocus != null) {
                $scope.settings.spectralLines = true;
                var currentWavelength = spectraLineService.getFromID(id).wavelength;
                var desiredWavelength = $scope.settings.spectraFocus;
                var z = desiredWavelength/currentWavelength - 1;
                $scope.settings.redshift = "" + z;
                $scope.settings.oldRedshift = $scope.settings.redshift;
            }
        };
        $scope.getSpectralLines = function() {
            return spectraLineService.getAll();
        };
        $scope.toggleSpectralLines = function() {
            $scope.settings.spectralLines = !$scope.settings.spectralLines;
        };
        $scope.getSpectralLinePhrase = function() {
            if ($scope.settings.spectralLines) {
                return "Hide spectral lines";
            } else {
                return "Show spectral lines";
            }
        };
        $scope.setFocusToRedshift = function() {
            $('#redshiftInput').focus().select();
        };
        $scope.incrementSmooth = function() {
            if ($scope.settings.rawSmooth < $scope.bounds.maxSmooth) {
                $scope.settings.rawSmooth = "" + (parseInt($scope.settings.rawSmooth) + 1);
            }
            if ($scope.settings.processedSmooth < $scope.bounds.maxSmooth) {
                $scope.settings.processedSmooth = "" + (parseInt($scope.settings.processedSmooth) + 1);
            }
        };
        $scope.decrementSmooth = function() {
            if ($scope.settings.rawSmooth > 0) {
                $scope.settings.rawSmooth = "" + (parseInt($scope.settings.rawSmooth) - 1);
            }
            if ($scope.settings.processedSmooth > 0) {
                $scope.settings.processedSmooth = "" + (parseInt($scope.settings.processedSmooth) - 1);
            }
        };
        $scope.nextTemplate = function() {
            var t = parseInt($scope.settings.templateId);
            if (t < templatesService.getTemplates().length) {
                $scope.settings.templateId = "" + (t + 1);
            }
        };
        $scope.previousTemplate = function() {
            var t = parseInt($scope.settings.templateId);
            if (t > 0) {
                $scope.settings.templateId = "" + (t - 1);
            }
        };
        for (var i = 0; i < $scope.keybinds.length; i++) {
            if ($scope.keybinds[i].controller == "detailed") {
                $scope.addClickHandler($scope.keybinds[i].key, $scope.keybinds[i].fn, $scope);
            }
        }

    }])
    .controller('TemplatesController', ['$scope', 'templatesService', function($scope, templatesService) {
        $scope.templates = templatesService.getTemplates();
    }])
    .controller('SettingsController', ['$scope', 'processorService', 'spectraService', 'localStorageService', 'global', 'dialogs',
        function($scope, processorService, spectraService, localStorageService, global, dialogs) {

        $scope.getValues = function() {
            $scope.downloadAutomatically = spectraService.getDownloadAutomatically();
            $scope.numberOfCores = processorService.getNumberProcessors();
            $scope.saveAutomatically = spectraService.getSaveAutomatically();
        };
        $scope.getValues();

        $scope.updateDownloadAutomatically = function() {
            spectraService.setDownloadAutomatically($scope.downloadAutomatically);
        };
        $scope.updateSaveAutomatically = function() {
            spectraService.setSaveAutomatically($scope.saveAutomatically);
        };
        $scope.updateNumberProcessors = function() {
            if (isInt($scope.numberOfCores)) {
                processorService.setNumberProcessors($scope.numberOfCores);
            }
        };
        $scope.resetToDefaults = function() {
            spectraService.setDownloadAutomaticallyDefault();
            spectraService.setSaveAutomaticallyDefault();
            processorService.setDefaultNumberOfCores();
            $scope.getValues();
        };

        $scope.clearCurrentFile = function() {
            dialogs.confirm('Confirm Decision', 'Do you want to delete all local results for the currently loaded FITs file?')
                .result.then(function() { localStorageService.clearFile()});
        };
        $scope.clearAll = function() {
            dialogs.confirm('Confirm Decision', 'Do you want to delete all local results?')
                .result.then(function() { localStorageService.clearAll()});
        };
        $scope.fileLoaded = function() {
            return global.data.fitsFileName != null;
        }
    }])
    .controller('UsageController', ['$scope', function($scope) {

    }])
    .controller('FooterController', ['$scope', 'spectraService', 'processorService', 'resultsGeneratorService',
        function($scope, spectraService, processorService, resultsGeneratorService) {

        $scope.isProcessing = function() {
            return spectraService.isProcessing();
        };
        $scope.getNumberProcessed = function() {
            return spectraService.getNumberProcessed();
        };
        $scope.getNumberTotal = function() {
            return spectraService.getNumberTotal();
        };
        $scope.getNumberMatched = function() {
            return spectraService.getNumberMatched();
        };
        $scope.togglePause = function() {
            processorService.togglePause();
        };
        $scope.downloadResults = function() {
            resultsGeneratorService.downloadResults();
        };
        $scope.displayPause = function() {
            return spectraService.isProcessing() || spectraService.isMatching();
        };
        $scope.getPausedText = function() {
            if (processorService.isPaused()) {
                return "Resume";
            } else {
                return "Pause";
            }
        };
        $scope.getText = function() {
            if (spectraService.isProcessing()) {
                return "Processing spectra:   " + spectraService.getNumberProcessed() +
                    "/" + spectraService.getNumberTotal();
            } else if (spectraService.isMatching()) {
                return "Matching spectra:   " + spectraService.getNumberMatched() +
                    "/" + spectraService.getNumberTotal();
            } else {
                return "Finished all spectra";
            }
        };
        $scope.getProgressBarValue = function() {
            if (spectraService.isProcessing()) {
                return 1000*spectraService.getNumberProcessed()/$scope.getProgressBarMax();
            } else {
                return 1000*spectraService.getNumberMatched()/$scope.getProgressBarMax();
            }
        };
        $scope.getProgressBarMax = function() {
            return spectraService.getNumberTotal();
        };
        $scope.getProgressBarType = function() {
            if (spectraService.isFinishedMatching()) {
                return "info";
            } else if (spectraService.isProcessing()) {
                return "success";
            } else {
                return "danger";
            }
        };
    }])
    .controller('SidebarController', ['$scope', 'spectraService', 'fitsFile', '$state', 'global', 'resultsLoaderService', '$timeout',
        function($scope, spectraService, fitsFile, $state, global, resultsLoaderService, $timeout) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.addFiles = function(files) {
            for (var i = 0; i < files.length; i++) {
                if (files[i].name.endsWith('txt') || files[i].name.endsWith('csv')) {
                    resultsLoaderService.loadResults(files[i]);
                }
            }
            for (var i = 0; i < files.length; i++) {
                if (files[i].name.endsWith('fits')) {
                    $scope.data.fits.push(files[i]);
                }
            }
        };
        $scope.$watch('data.fits.length', function(newValue) {
            if (newValue > 0) {
                fitsFile.loadInFitsFile($scope.data.fits[0]).then(function() { console.log('Fits file loaded')});
            }
        });

        $scope.showSave = function() {
            return $state.current.name == 'detailed';
        };
        $scope.showDataSelectors = function() {
            return ($state.current.name == 'overview' && $scope.ui.graphicalLayout) ||  ($state.current.name == 'detailed')
        };
        $scope.getTitle = function() {
            return fitsFile.getFilename();
        };
        $scope.showSky = function() {
            return $state.current.name == 'detailed';
        };
        $scope.showTabular = function() {
          return $state.current.name == 'overview';
        };
        $scope.listStyle = function() {
            return {height: $scope.getListHeight()};
        };
        $scope.getListHeight = function() {
            return ($("#sidebar").height() - $("#sidebar-wrapper").height() - 35);
        };
        $scope.windowResized = function(element) {
            element.height($scope.getListHeight());
        };
        $scope.getAnalysedText = function(spectra) {
            if (spectra.hasRedshift()) {
                return "z=" + spectra.getFinalRedshift().toFixed(4) +", QOP: " + spectra.qop;
            } else {
                return "Not analysed";
            }
        };
        $scope.getDropText = function() {
            if (resultsLoaderService.hasAnyResults()) {
                return "Have loaded results. Drop in FITs file."
            } else {
                return "Drop a FITs file or a results file. Or drop a results file and THEN a FITs file."
            }
        };
        $scope.toggledRaw = function() {
            global.ui.dataSelection.raw = !global.ui.dataSelection.raw;
        };
        $scope.toggledProcessed = function() {
            global.ui.dataSelection.processed = !global.ui.dataSelection.processed;
        };
        $scope.toggleMatched = function() {
            global.ui.dataSelection.matched = !global.ui.dataSelection.matched;
        };
        $scope.toggleSky = function() {
            global.ui.dataSelection.sky = !global.ui.dataSelection.sky;
        };
        $scope.$watch('ui.active', function() {
            $timeout(function() {
                $("#sidebar-list .activeSelect").scrollintoview();
            });
        });
    }]);