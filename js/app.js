var app = angular.module("thesis", ["dropzone"]);
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
    $scope.properties = {test: {label: "Test property", value: 20}};


    // Model managers
    $scope.templateManager = new TemplateManager();
    $scope.processorManager = new ProcessorManager(1, $scope); //TODO: Core estimation
    $scope.spectraManager = new SpectraManager($scope, $scope.processorManager, $scope.templateManager);
    $scope.interfaceManager = new InterfaceManager($scope, $scope.spectraManager, $scope.templateManager, $scope.processorManager);
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
        this.interfaceManager.updateDetailedData();

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
        if ($scope.interfaceManager.menuActive == 'Detailed') $scope.goToDetailed();
        $timeout(function() {
            var leftrel = $('.spectralList ul li.activeSelect').position().top;
            var leftheight = $('.spectralList').height();
            var rightrel = $('.overviewList ul li.activeSelect').position().top;
            var rightheight = $('.central').height();
            if (leftrel < 50 || leftrel > leftheight-50) {
                $('.spectralList').animate({scrollTop: (leftrel- $('.spectralList ul').position().top)+'px'},300);
            }
            if (rightrel < 150 || rightrel > rightheight-150) {
                $('.central').animate({scrollTop: (rightrel - $('.overviewList ul').position().top)+'px'},300);
            }
        }, 0, false);
    };
    $scope.toggleDisp = function(category) {
        if (category == 'raw') {
            $scope.interfaceManager.dispRaw = 1 - $scope.interfaceManager.dispRaw;
        } else if (category == 'pre') {
            $scope.interfaceManager.dispPre = 1 - $scope.interfaceManager.dispPre;
        } else if (category == 'matched') {
            $scope.interfaceManager.dispMatched = 1 - $scope.interfaceManager.dispMatched;
        }
        for (var i = 0; i < $scope.spectraManager.getAll().length; i++) {
            $scope.interfaceManager.rerenderOverview(i);
        }
        if (this.interfaceManager.menuActive == 'Detailed') {
            this.interfaceManager.updateDetailedData();
        }
    }

    $scope.finishedProcessing = function() {
        var results = this.spectraManager.getOutputResults();
        this.fileManager.saveResults(results);
    }

}