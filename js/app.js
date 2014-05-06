var app = angular.module("thesis", ["dropzone","ui.bootstrap"]);
app.filter('onlyDisplay', function () {
    return function (arr) {
        var result = [];
        angular.forEach(arr, function (item) {
            if (item.display) {
                result.push(item);
            }
        });
        return result;
    };
});

function MainController($scope, $timeout) {
    $scope.properties = {downloadAutomatically: {label: "Download Automatically", value: false},
                         processAndMatchTogether: {label: "Process and Match in same step", value: false},
                         numberOfCores: {label: "Number of Cores In Computer", value: 3}};


    // Model managers
    $scope.templateManager = new TemplateManager();
    $scope.spectalLines = new SpectralLines();
    $scope.processorManager = new ProcessorManager($scope.properties.numberOfCores.value - 1, $scope, $scope.properties.processAndMatchTogether.value); //TODO: Core estimation
    $scope.spectraManager = new SpectraManager($scope, $scope.processorManager, $scope.templateManager);
    $scope.interfaceManager = new InterfaceManager($scope, $scope.spectraManager, $scope.templateManager, $scope.processorManager, $scope.spectalLines);
    $scope.fileManager = new FileManager();

    $scope.results = null;
    $scope.fits = null; // Initialise new FitsFile on drop.
    $scope.goToMenu = function(menuOption) {
        if (menuOption == 'Detailed') {
            $scope.goToDetailed();
        }
        $scope.interfaceManager.menuActive = menuOption;
    }
    $scope.goToDetailed = function() {
        var spectra =  $scope.spectraManager.getSpectra($scope.interfaceManager.spectraIndex);
        if (spectra != null) {
            var tid = spectra.getFinalTemplate();
            var tz = spectra.getFinalRedshift();
        }
        $scope.interfaceManager.detailedViewTemplate = tid == null ? -1 : tid;
        $scope.interfaceManager.detailedViewZ = tz == null? 0 : tz;
        $scope.interfaceManager.menuActive = 'Detailed';
        this.interfaceManager.updateDetailedData(true);

    }
    $scope.getDropText = function() {
        if ($scope.results == null && $scope.fits == null) {
            return 'Drop a FITS File or a results file. Or both together. Or a FITS file than a results file.';
        } else if ($scope.fits == null && $scope.results != null) {
            return 'Results file loaded. Drop in a FITs file.';
        }
    }
    $scope.addfiles = function (f) {
        var hadFits = false;
        var hadResults = false;
        for (var i = 0; i < f.length; i++) {
            if (endsWith(f[i].name, '.fits')) {
                if (!hadFits) {
                    hadFits = true;
                    var name = f[i].name;
                    var rawFits = new astro.FITS(f[i], function () {
                        $scope.$apply(function () {
                            $scope.fileManager.setFitsFileName(name);
                            $scope.fits = new FitsFile(name, rawFits, $scope);
//                          $scope.fits = new TemplateExtractor(f.name, rawFits, $scope);
                        });
                    });
                } else {
                    console.warn('Already had a fits file'); //TODO: Alerts system
                }
            } else if (endsWith(f[i].name, '.txt')) {
                if (!hadResults) {
                    hadResults = true;
                    $scope.results = new ResultsLoader(f[i], $scope);
                    $scope.results.load();
                }
            }
        }

    };
    $scope.updatedSpectra = function(i) {
        $scope.interfaceManager.rerenderOverview(i);
        if ($scope.interfaceManager.spectraIndex == i && $scope.interfaceManager.menuActive == 'Detailed') {
            this.goToDetailed();
        }
        $scope.$digest();
    }
    $scope.checkIfInView = function(element, scrollable) {
        var padding = 100;
        var docViewTop = $(scrollable).offset().top;
        var docViewBottom = docViewTop + $(scrollable).height();

        var elemTop = $(element).offset().top;
        var elemBottom = elemTop + $(element).height();
        var s = 0;
        if (elemTop < docViewTop) {
            s = docViewTop - elemTop + padding;
            $(scrollable).animate({scrollTop: '-='+s}, 300);

        } else if (elemBottom > docViewBottom) {
            s = elemBottom - docViewBottom + padding;
            $(scrollable).animate({scrollTop: '+='+s}, 300);
        }

    }
    $scope.setSpectraIndex = function(i) {
        $scope.interfaceManager.spectraIndex = i;
        //TODO: Remove duplicate code
        if ($scope.interfaceManager.menuActive == 'Detailed') {
            $scope.interfaceManager.detailedSettings.unlockBounds(); // So that it can zoom out. Need to rework events. Sigh.
            $scope.goToDetailed();
        }
        $timeout(function() {
            if ($scope.interfaceManager.overviewGraph) {
                $scope.checkIfInView('.overviewList .activeSelect', '#central');
            } else {
                $scope.checkIfInView('.overviewTable .activeSelect', '#central');
            }
            $scope.checkIfInView('.spectralList .activeSelect', '.spectralList');
        }, 0, false);
    };
    $scope.toggleDisp = function(category) {
        if (category == 'raw') {
            $scope.interfaceManager.dispRaw = 1 - $scope.interfaceManager.dispRaw;
            $scope.interfaceManager.changedRaw = 1;
            if ($scope.interfaceManager.dispRaw == 0 && $scope.interfaceManager.dispProcessed == 0) {
                $scope.interfaceManager.dispProcessed = 1;
            }
        } else if (category == 'pro') {
            $scope.interfaceManager.dispProcessed = 1 - $scope.interfaceManager.dispProcessed;
            $scope.interfaceManager.changedProcessed = 1;
            if ($scope.interfaceManager.dispRaw == 0 && $scope.interfaceManager.dispProcessed == 0) {
                $scope.interfaceManager.dispRaw = 1;
            }
        } else if (category == 'templ') {
            $scope.interfaceManager.dispTemplate = 1 - $scope.interfaceManager.dispTemplate;
            $scope.interfaceManager.changedTemplate = 1;
        } else if (category == 'sky') {
            $scope.interfaceManager.dispSky = 1 - $scope.interfaceManager.dispSky;
            $scope.interfaceManager.changedTemplate = 1;
        }
        //TODO: Consider making this only if the overview screen is active
        for (var i = 0; i < $scope.spectraManager.getAll().length; i++) {
            $scope.interfaceManager.rerenderOverview(i);
        }
        if (this.interfaceManager.menuActive == 'Detailed') {
            this.interfaceManager.updateDetailedData(false);
        }
    }

    $scope.finishedAnalysis = function() {
        if ($scope.properties.downloadAutomatically.value) {
            var results = this.spectraManager.getOutputResults();
            this.fileManager.saveResults(results);
        }
    }
    $scope.downloadResults = function() {
        this.fileManager.saveResults(this.spectraManager.getOutputResults());
    }

    $scope.resizeEvent = function() {
        if ($scope.interfaceManager.detailedCanvas != null) {
            $scope.interfaceManager.detailedSettings.redraw();
        }
        if ($scope.interfaceManager.menuActive == 'Templates') {
            $scope.interfaceManager.renderAlltemplates();
        }
    }

    $scope.changedTemplate = function() {
        this.interfaceManager.changedTemplate = true;
        this.interfaceManager.updateDetailedData(false);
    }

    $scope.getSpectralLinePhrase = function() {
        if (this.interfaceManager.detailedSettings.displayingSpectralLines) {
            return 'Hide Spectral Lines';
        } else {
            return 'Show Spectral Lines';
        }
    }
    $scope.sortOverview = function(spectra) {
        var result = null;
        var nullRes = 9e9 + spectra.id;
        if ($scope.interfaceManager.overviewReverseSort) {
            nullRes = -1 * nullRes;
        }
        if ($scope.interfaceManager.overviewSortField == 'id') {
            result = spectra.id;
        }
        if ($scope.interfaceManager.overviewSortField == 'finalTemplateID') {
            result = parseInt(spectra.finalTemplateID);
            if (isNan(result)) {
                result = null;
            }
        }
        if ($scope.interfaceManager.overviewSortField == 'finalTemplateName') {
            result = spectra.finalTemplateName;
            if ($scope.interfaceManager.overviewReverseSort) {
                nullRes = '00000000' + spectra.id;
            } else {
                nullRes = 'zzzzzzz' + spectra.id;
            }
        }
        if ($scope.interfaceManager.overviewSortField == 'finalZ') {
            result = spectra.finalZ;
        }
        if ($scope.interfaceManager.overviewSortField == 'manualQOP') {
            result = spectra.finalQOP;
        }
        if (result == null) {
            return nullRes;
        } else {
            return result;
        }
    }
    $(window).on("resize",$scope.resizeEvent);
    $(window).on('beforeunload', function(){
        return 'Please ensure results are saved before navigating away.';
    });
}