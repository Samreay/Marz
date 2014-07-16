angular.module('controllersZ', ['ui.router', 'ui.bootstrap', 'servicesZ'])
    .controller('NavbarController', ['$scope', '$state', function($scope, $state) {
        $scope.states = [
            {name: 'overview', icon: "th"},
            {name: 'detailed', icon: "signal"},
            {name: 'templates', icon: "tasks"},
            {name: 'settings', icon: "cog"},
            {name: 'usage', icon: "question-sign"}
        ];
        $scope.isActive = function(state) {
            return $state.current.name == state;
        }
    }])
    .controller('MainController', ['$scope', 'spectraService', 'global', function($scope, spectraService, global) {
        $scope.isWaitingDrop = function() {
            return !spectraService.hasSpectra();
        };
        $scope.isActive = function(spectra) {
            if (spectra.id == null) {
                return global.ui.active == spectra;
            } else {
                return global.ui.active == spectra.id;
            }
        };
        $scope.setActive = function(spectra) {
            if (spectra.id == null) {
                global.ui.active = spectra;
            } else {
                global.ui.active = spectra.id;
            }
        };
        //TODO: Uncomment these out and set up proper function binds when they exist.
        /*$scope.keybinds = [
            {key: 'shift+?', label: '?', description: 'Go to the Usage tab', fn: function() {
                $scope.go('usage');
            }},
            {key: 'n', label: 'n', description: 'Selects to the next spectra', fn: function() {
                $scope.nextSpectra();
                $scope.$apply();
            }},
            {key: 'b', label: 'b', description: 'Selects to the previous spectra', fn: function() {
                $scope.previousSpectra();
                $scope.$apply();
            }},
            {key: 't', label: 't', description: 'Toggle whether templates are displayed', fn: function() {
                $scope.interfaceManager.dispTemplate = 1 - $scope.interfaceManager.dispTemplate;
                $scope.$apply();
            }},
            {key: '1', label: '1', description: '[Detailed screen] Save with manual QOP of 1', fn: function() {
                $scope.interfaceManager.saveManual(1);
                $scope.$apply();
            }},
            {key: '2', label: '2', description: '[Detailed screen] Save with manual QOP of 2', fn: function() {
                $scope.interfaceManager.saveManual(2);
                $scope.$apply();
            }},
            {key: '3', label: '3', description: '[Detailed screen] Save with manual QOP of 3', fn: function() {
                $scope.interfaceManager.saveManual(3);
                $scope.$apply();
            }},
            {key: '4', label: '4', description: '[Detailed screen] Save with manual QOP of 4', fn: function() {
                $scope.interfaceManager.saveManual(4);
                $scope.$apply();
            }},
            {key: 'z', label: 'z', description: '[Detailed screen] Focus on redshift input', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.setFocusToRedshift();
                    $scope.$apply();
                    return false;
                }
            }},
            {key: 'm', label: 'm', description: '[Detailed screen] Set view to manually found redshift', fn: function() {
                $scope.interfaceManager.resetToManual();
                $scope.$apply();
            }},
            {key: 'shift+r', label: 'shift+r', description: '[Detailed screen] Set view to automaticly found redshift', fn: function() {
                $scope.interfaceManager.resetToAutomatic();
                $scope.$apply();
            }},
            {key: 'o', label: 'o', description: '[Detailed screen] Show the next automatic redshift result', fn: function() {
                $scope.interfaceManager.nextMatchedDetails();
                $scope.$apply();
            }},
            {key: 's', label: 's', description: '[Detailed screen] Increase smoothing level', fn: function() {
                $scope.interfaceManager.incrementSmooth();
                $scope.$apply();
            }},
            {key: 'd', label: 'd', description: '[Detailed screen] Decrease smoothing level', fn: function() {
                $scope.interfaceManager.decrementSmooth();
                $scope.$apply();
            }},
            {key: 'r', label: 'r', description: '[Detailed screen] Reset graph zoom to extents', fn: function() {
                $scope.interfaceManager.detailedSettings.lockedBounds = false;
                $scope.$apply();
            }},
            {key: 'l', label: 'l', description: '[Detailed screen] Toggles spectral lines', fn: function() {
                $scope.interfaceManager.detailedSettings.toggleSpectralLines();
                $scope.$apply();
            }},
            {key: 'down', label: 'down', description: '[Detailed screen] Selects the next template', fn: function() {
                $scope.interfaceManager.nextTemplate();
                $scope.$apply();
            }},
            {key: 'up', label: 'up', description: '[Detailed screen] Selects the previous template', fn: function() {
                $scope.interfaceManager.previousTemplate();
                $scope.$apply();
            }},
            {key: 'shift+y', label: 'shift+y', description: '[Detailed screen] Sets the current focus to Lyb', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Lyb');
                }
                $scope.$apply();
            }},
            {key: 'shift+l', label: 'shift+l', description: '[Detailed screen] Sets the current focus to Lya', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Lya');
                }
                $scope.$apply();
            }},
            {key: 'shift+t', label: 'shift+t', description: '[Detailed screen] Sets the current focus to N5', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('N5');
                }
                $scope.$apply();
            }},
            {key: 'shift+s', label: 'shift+s', description: '[Detailed screen] Sets the current focus to Si4', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Si4');
                }
                $scope.$apply();
            }},
            {key: 'shift+c', label: 'shift+c', description: '[Detailed screen] Sets the current focus to CIV', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('C4');
                }
                $scope.$apply();
            }},
            {key: 'shift+v', label: 'shift+v', description: '[Detailed screen] Sets the current focus to CIII', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('C3');
                }
                $scope.$apply();
            }},
            {key: 'shift+m', label: 'shift+m', description: '[Detailed screen] Sets the current focus to MgII', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Mg2');
                }
                $scope.$apply();
            }},
            {key: 'shift+o', label: 'shift+o', description: '[Detailed screen] Sets the current focus to [OII]', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('O2');
                }
                $scope.$apply();
            }},
            {key: 'shift+k', label: 'shift+k', description: '[Detailed screen] Sets the current focus to K', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('K');
                }
                $scope.$apply();
            }},
            {key: 'shift+h', label: 'shift+h', description: '[Detailed screen] Sets the current focus to H', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('H');
                }
                $scope.$apply();
            }},
            {key: 'shift+d', label: 'shift+d', description: '[Detailed screen] Sets the current focus to D', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('D');
                }
                $scope.$apply();
            }},
            {key: 'shift+g', label: 'shift+g', description: '[Detailed screen] Sets the current focus to G', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('G');
                }
                $scope.$apply();
            }},
            {key: 'shift+f', label: 'shift+f', description: '[Detailed screen] Sets the current focus to Hg', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Hg');
                }
                $scope.$apply();
            }},
            {key: 'shift+b', label: 'shift+b', description: '[Detailed screen] Sets the current focus to Hb', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Hb');
                }
                $scope.$apply();
            }},
            {key: 'shift+u', label: 'shift+u', description: '[Detailed screen] Sets the current focus to first [OIII]', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('O3');
                }
                $scope.$apply();
            }},
            {key: 'shift+i', label: 'shift+i', description: '[Detailed screen] Sets the current focus to second [OIII]', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('O3d');
                }
                $scope.$apply();
            }},
            {key: 'shift+j', label: 'shift+j', description: '[Detailed screen] Sets the current focus to Mg', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Mg');
                }
                $scope.$apply();
            }},
            {key: 'shift+n', label: 'shift+n', description: '[Detailed screen] Sets the current focus to Na', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Na');
                }
                $scope.$apply();
            }},
            {key: 'shift+a', label: 'shift+a', description: '[Detailed screen] Sets the current focus to Ha', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('Ha');
                }
                $scope.$apply();
            }},
            {key: 'shift+w', label: 'shift+w', description: '[Detailed screen] Sets the current focus to N2', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('N2');
                }
                $scope.$apply();
            }},
            {key: 'shift+z', label: 'shift+z', description: '[Detailed screen] Sets the current focus to S2', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('S2');
                }
                $scope.$apply();
            }},
            {key: 'shift+x', label: 'shift+x', description: '[Detailed screen] Sets the current focus to S2 doublet', fn: function() {
                if ($scope.interfaceManager.menuActive == 'Detailed') {
                    $scope.interfaceManager.clickSpectralLine('S2d');
                }
                $scope.$apply();
            }}
        ];

        for (var i = 0; i < $scope.keybinds.length; i++) {
            KeyboardJS.on($scope.keybinds[i].key, $scope.keybinds[i].fn);
        }*/
    }])
    .controller('OverviewController', ['$scope', 'spectraService', 'fitsFile', 'global', function($scope, spectraService, fitsFile, global) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.isLoading = function() {
            return fitsFile.isLoading();
        };

        // For the table section
        $scope.sortOrder = true;
        $scope.sortField = 'id';
        $scope.setSort = function(sort) {
            $scope.sortField = sort;
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
                result = parseInt(spectra.getFinalTemplateID());
                if (isNaN(result)) result = "";
            } else if ($scope.sortField == 'finalTemplateName') {
                result = spectra.getFinalTemplateName();// + ('' + spectra.id).pad(4);
            } else if ($scope.sortField == 'finalZ') {
                result = spectra.getFinalRedshift();
            } else if ($scope.sortField == 'qop') {
                result = spectra.qop;
            }
            return result + nullRes;
        };

    }])
    .controller('DetailedController', ['$scope', function($scope) {

    }])
    .controller('TemplatesController', ['$scope', 'templatesService', function($scope, templatesService) {
        $scope.templates = templatesService.getTemplates();
    }])
    .controller('SettingsController', ['$scope', 'processorService', 'spectraService', function($scope, processorService, spectraService) {

        $scope.getValues = function() {
            $scope.downloadAutomatically = spectraService.getDownloadAutomatically();
            $scope.numberOfCores = processorService.getNumberProcessors() + 1;
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
                processorService.setNumberProcessors($scope.numberOfCores - 1);
            }
        };
        $scope.resetToDefaults = function() {
            spectraService.setDownloadAutomaticallyDefault();
            spectraService.setSaveAutomaticallyDefault();
            processorService.setDefaultNumberOfCores();
            $scope.getValues();
        };

        $scope.clearCurrentFile = function() {
            //TODO: Clear current file
        };
        $scope.clearAll = function() {
            //TODO: Clear all files
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
                return spectraService.getNumberProcessed();
            } else {
                return spectraService.getNumberMatched();
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
    .controller('SidebarController', ['$scope', 'spectraService', 'fitsFile', '$state', 'global', function($scope, spectraService, fitsFile, $state, global) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.addFiles = function(files) {
            if (files.length > 2) {
                console.log("Loading in more than two files at once.");
                return;
            }
            for (var i = 0; i < files.length; i++) {
                if (files[i].name.endsWith('fits')) {
                    fitsFile.loadInFitsFile(files[i]).then(function() { console.log('Fits file loaded')});
                } else if (files[i].name.endsWith('txt')) {
                    spectraService.loadInResults(files[i]);
                }
            }
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
        $scope.toggleRaw = function() {
            $scope.ui.dataSelection.raw = !$scope.ui.dataSelection.raw;
        };
        $scope.toggleProcessed = function() {
            $scope.ui.dataSelection.processed = !$scope.ui.dataSelection.processed;
        };
        $scope.toggleMatched = function() {
            $scope.ui.dataSelection.matched = !$scope.ui.dataSelection.matched;
        };
        $scope.toggleSky = function() {
            $scope.ui.dataSelection.sky = !$scope.ui.dataSelection.sky;
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
    }]);