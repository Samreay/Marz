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
    .controller('SettingsController', ['$scope', function($scope) {

    }])
    .controller('UsageController', ['$scope', function($scope) {

    }])
    .controller('FooterController', ['$scope', 'spectraService', 'processorService', function($scope, spectraService, processorService) {
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
            //TODO: SOMETHING
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