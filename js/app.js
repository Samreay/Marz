var app = angular.module("thesis", ["dropzone", "keybind","ui.bootstrap"]);
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
    $scope.templateManager = new TemplateManager();
    $scope.storageManager = new StorageManager($scope.templateManager);

    $scope.properties = {};
    $scope.processorManager = null;
    $scope.properties.downloadAutomatically = new CookieProperties('downloadAutomatically', 'Download Automatically', false,
        function(v) { return typeof(v) == "boolean"; },
        null
    );
    $scope.properties.saveInBackground = new CookieProperties('saveInBackground', 'Save and load past local results', true,
        function(v) { return typeof(v) == "boolean"; },
        function(v) { if ($scope.storageManager != null) { $scope.storageManager.setActive(v); }}
    );
    $scope.properties.numCores = new CookieProperties('numCores', 'Number of Cores In Computer', 4,
        function(v) { return (!isNaN(parseInt(v)) && v > 1 && v < 33);},
        function(v) { if ($scope.processorManager != null) { $scope.processorManager.changeNumberOfCores(v - 1); }}
    );


    // Model managers
    $scope.spectalLines = new SpectralLines();
    $scope.processorManager = new ProcessorManager($scope.properties.numCores.getValue() - 1, $scope); //TODO: Core estimation
    $scope.spectraManager = new SpectraManager($scope, $scope.processorManager, $scope.templateManager);
    $scope.interfaceManager = new InterfaceManager($scope, $scope.spectraManager, $scope.templateManager, $scope.processorManager, $scope.spectalLines);
    $scope.fileManager = new FileManager();

    $scope.results = null;
    $scope.fits = null; // Initialise new FitsFile on drop.
    $scope.refreshPage = function() {
        window.location.reload();
    }
    $scope.range = function(num) {
        return indexgenerate(num);
    }
    $scope.resetAllProperties = function() {
        for (var property in $scope.properties) {
            if ($scope.properties.hasOwnProperty(property)) {
                $scope.properties[property].resetToDefault();
            }
        }
    };
    $scope.clearCurrentFile = function() {
        if (this.fits == null) {
            return;
        }
        $scope.storageManager.clearFile(this.fits.properties[0].value);
    };
    $scope.clearAll = function() {
        $scope.storageManager.clearAll();
    }
    $scope.goToMenu = function(menuOption) {
        if (menuOption == 'Detailed') {
            $scope.goToDetailed();
        }
        $scope.interfaceManager.menuActive = menuOption;
    };
    $scope.goToDetailed = function() {
        var spectra =  $scope.spectraManager.getSpectra($scope.interfaceManager.spectraIndex);
        if (spectra != null) {
            var tid = spectra.getFinalTemplate() == null ? null : spectra.getFinalTemplate().index;
            var tz = spectra.getFinalRedshift();
        }
        $scope.interfaceManager.detailedViewTemplate = tid == null ? -1 : tid;
        $scope.interfaceManager.detailedViewZ = tz == null? 0 : tz;
        $scope.interfaceManager.checkIfResultIsAMatch();
        $scope.interfaceManager.menuActive = 'Detailed';
        this.interfaceManager.updateDetailedData(true);

    };
    $scope.getDropText = function() {
        if ($scope.results == null && $scope.fits == null) {
            return 'Drop a FITS File or a results file. Or both together. Or a FITS file than a results file.';
        } else if ($scope.fits == null && $scope.results != null) {
            return 'Results file loaded. Drop in a FITs file.';
        }
    };
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
    };
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

    };
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
    };

    $scope.finishedAnalysis = function() {
        if ($scope.properties.downloadAutomatically.value) {
            var results = this.spectraManager.getOutputResults();
            this.fileManager.saveResults(results);
        }
    };
    $scope.downloadResults = function() {
        this.fileManager.saveResults(this.spectraManager.getOutputResults());
    };

    $scope.resizeEvent = function() {
        $scope.$apply();
    };

    $scope.changedTemplate = function() {
        this.interfaceManager.disableMatchedComparison();
        this.interfaceManager.changedTemplate = true;
        this.interfaceManager.updateDetailedData(false);
    };

    $scope.getSpectralLinePhrase = function() {
        if (this.interfaceManager.detailedSettings.displayingSpectralLines) {
            return 'Hide Spectral Lines';
        } else {
            return 'Show Spectral Lines';
        }
    };
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
            result = parseInt(spectra.getFinalTemplateID());
            if (isNaN(result)) {
                result = null;
            }
        }
        if ($scope.interfaceManager.overviewSortField == 'finalTemplateName') {
            result = spectra.getFinalTemplateName();
            if ($scope.interfaceManager.overviewReverseSort) {
                nullRes = '00000000' + spectra.id;
            } else {
                nullRes = 'zzzzzzz' + spectra.id;
            }
        }
        if ($scope.interfaceManager.overviewSortField == 'finalZ') {
            result = spectra.getFinalRedshift();
        }
        if ($scope.interfaceManager.overviewSortField == 'manualQOP') {
            result = spectra.finalQOP;
        }
        if (result == null) {
            return nullRes;
        } else {
            return result;
        }
    };
    $(window).on("resize",$scope.resizeEvent);
    $(window).on('beforeunload', function(){
        return 'Please ensure results are saved before navigating away.';
    });

//    Do the keybindings
    $scope.keybinds = [
        {key: 'shift+?', label: '?', description: 'Go to the Usage tab', fn: function() {
            $scope.interfaceManager.menuActive = 'Usage';
            $scope.$apply();
        }},
        {key: 'n', label: 'n', description: 'Selects to the next spectra', fn: function() {
            $scope.interfaceManager.nextSpectra();
            $scope.goToDetailed();
            $scope.$apply();
        }},
        {key: 'b', label: 'b', description: 'Selects to the previous spectra', fn: function() {
            $scope.interfaceManager.previousSpectra();
            $scope.goToDetailed();
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
        }}
    ];

    for (var i = 0; i < $scope.keybinds.length; i++) {
        KeyboardJS.on($scope.keybinds[i].key, $scope.keybinds[i].fn);
    }

}