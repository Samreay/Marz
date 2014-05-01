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
    $scope.properties = {downloadAutomatically: {label: "Download Automatically", value: false}};


    // Model managers
    $scope.templateManager = new TemplateManager();
    $scope.spectalLines = new SpectralLines();
    $scope.processorManager = new ProcessorManager(1, $scope); //TODO: Core estimation
    $scope.spectraManager = new SpectraManager($scope, $scope.processorManager, $scope.templateManager);
    $scope.interfaceManager = new InterfaceManager($scope, $scope.spectraManager, $scope.templateManager, $scope.processorManager, $scope.spectalLines);
    $scope.fileManager = new FileManager();


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
        $scope.interfaceManager.detailedViewTemplate = tid == null ? 0 : tid;
        $scope.interfaceManager.detailedViewZ = tz == null? 0 : tz;
        $scope.interfaceManager.menuActive = 'Detailed';
        this.interfaceManager.updateDetailedData(true);

    }
    $scope.addfile = function (f) {
        var rawFits = new astro.FITS(f, function () {
            $scope.$apply(function () {
                $scope.fileManager.setFitsFileName(f.name);
                $scope.fits = new FitsFile(f.name, rawFits, $scope);
//                $scope.fits = new TemplateExtractor(f.name, rawFits, $scope);
            });
        });
    };
    $scope.updatedSpectra = function(i) {
        $scope.interfaceManager.rerenderOverview(i);
        if ($scope.interfaceManager.spectraIndex == i && $scope.interfaceManager.menuActive == 'Detailed') {
            this.goToDetailed();
        }
        $scope.$digest();
    }
    $scope.setSpectraIndex = function(i) {
        $scope.interfaceManager.spectraIndex = i;
        //TODO: Remove duplicate code
        if ($scope.interfaceManager.menuActive == 'Detailed') {
            $scope.interfaceManager.detailedSettings.unlockBounds(); // So that it can zoom out. Need to rework events. Sigh.
            $scope.goToDetailed();
        }
        $timeout(function() {
            var leftrel = $('.spectralList ul li.activeSelect').position().top;
            var leftheight = $('.spectralList').height();
            var rightrel = $('.overviewList ul li.activeSelect').position().top;
            var rightheight = $('#central').height();
            if (leftrel < 50 || leftrel > leftheight-50) {
                $('.spectralList').animate({scrollTop: (leftrel- $('.spectralList ul').position().top)+'px'},300);
            }
            if (rightrel < 150 || rightrel > rightheight-150) {
                $('#central').animate({scrollTop: (rightrel - $('.overviewList ul').position().top)+'px'},300);
            }
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
        }
        //TODO: Consider making this only if the overview screen is active
        for (var i = 0; i < $scope.spectraManager.getAll().length; i++) {
            $scope.interfaceManager.rerenderOverview(i);
        }
        if (this.interfaceManager.menuActive == 'Detailed') {
            this.interfaceManager.updateDetailedData(false);
        }
    }

    $scope.finishedProcessing = function() {
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
            result = spectra.manualQOP;
        }
        if (result == null) {
            return nullRes;
        } else {
            return result;
        }
    }
    $(window).on("resize",$scope.resizeEvent);
}