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
    .controller('MainController', ['$scope', 'spectraManager', function($scope, spectraManager) {
        $scope.isWaitingDrop = function() {
            return !spectraManager.hasSpectra();
        };
    }])
    .controller('OverviewController', ['$scope', 'spectraManager', 'fitsFile', 'global', function($scope, spectraManager, fitsFile, global) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.isLoading = function() {
            return fitsFile.isLoading();
        };

    }])
    .controller('DetailedController', ['$scope', function($scope) {

    }])
    .controller('TemplatesController', ['$scope', function($scope) {

    }])
    .controller('SettingsController', ['$scope', function($scope) {

    }])
    .controller('UsageController', ['$scope', function($scope) {

    }])
    .controller('FooterController', ['$scope', 'spectraManager', function($scope, spectraManager) {
        $scope.isProcessing = function() {
            return spectraManager.isProcessing();
        };
        $scope.getNumberProcessed = function() {
            return spectraManager.getNumberProcessed();
        };
        $scope.getNumberTotal = function() {
            return spectraManager.getNumberTotal();
        };
        $scope.getNumberMatched = function() {
            return spectraManager.getNumberMatched();
        }
    }])
    .controller('SidebarController', ['$scope', 'spectraManager', 'fitsFile', '$state', 'global', function($scope, spectraManager, fitsFile, $state, global) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.addfiles = function(files) {
            if (files.length > 2) {
                console.log("Loading in more than two files at once.");
                return;
            }
            for (var i = 0; i < files.length; i++) {
                if (files[i].name.endsWith('fits')) {
                    fitsFile.loadInFitsFile(files[i]).then(function() { console.log('Fits file loaded')});
                } else if (files[i].name.endsWith('txt')) {
                    spectraManager.loadInResults(files[i]);
                }
            }
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
        $scope.getListHeight = function() {
            return ($("#sidebar").height() - $("#sidebar-wrapper").height() - 35) + "px";
        };
        $scope.getAnalysedText = function(spectra) {
            if (spectra.hasRedshift()) {
                return "z=" + spectra.getFinalRedshift().toFixed(4) +", QOP: " + spectra.qop;
            } else {
                return "Not analysed";
            }
        }
    }]);