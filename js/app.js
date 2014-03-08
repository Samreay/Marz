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
    $scope.menuOptions = ['Overview','Detailed','Templates','Settings'];
    $scope.overviewLarge = 0;
    $scope.active = 'Overview';
    $scope.activeIndex = 0;
    $scope.properties = {test: {label: "Test property", value: 20}};
    $scope.fitsFile = null;
    $scope.immediateAnalysis = true;
    $scope.dispRaw = 1;
    $scope.dispPre = 1;
    $scope.dispMatched = 1;
    $scope.interface = {rawColour: "#E8BA6B", processedColour: "#058518", matchedColour: "#AA0000", templateColour: '#8C0623'}
    $scope.templates = templates;
    $scope.testTIndex = 0;
    $scope.testZ = 0;
    //TODO: Core estimation
    var numberOfCores = 3;
    normalise_templates();
    $scope.workers = [];
    for (var i = 0; i < numberOfCores; i++) {
        var worker = new Worker('js/preprocessor.js');
        worker.addEventListener('message', function(e) {
            $scope.fits.spectra[e.data.index].processedIntensity = e.data.intensity;
            $scope.fits.spectra[e.data.index].processedVariance = e.data.variance;
            $scope.fits.spectra[e.data.index].matchedTID = templates[e.data.tIndex].id;
            $scope.fits.spectra[e.data.index].matchedTIndex = e.data.tIndex;
            $scope.fits.spectra[e.data.index].matchedZ = e.data.z;
            $scope.fits.spectra[e.data.index].matchedChi2 = e.data.chi2;
            var ind = e.data.tIndex;
            var arr = [];
            var start = (1+e.data.z)*templates[ind].start_lambda;
            var end = (1+e.data.z)*templates[ind].end_lambda;
            for (var i = 0; i < templates[ind].spec.length; i++) {
                arr.push(start + (i/templates[ind].spec.length)*(end-start));
            }
            $scope.fits.spectra[e.data.index].templateLambda = arr;
            $scope.fits.spectra[e.data.index].templateIntensity = templates[ind].spec;

            $scope.fits.rerender(e.data.index);
            $scope.$digest();
            for (var j = 0; j < $scope.workers.length; j++) {
                if ($scope.workers[j].index == e.data.index) {
                    $scope.workers[j].index = -1;
                }
            }
            if ($scope.immediateAnalysis) {
                $scope.fits.analyse();
            }
        });
        $scope.workers.push({'index':-1, 'worker': worker});
    }
    $scope.goToDetailed = function() {
        $scope.testTIndex = $scope.fits.spectra[$scope.activeIndex].matchedTIndex;
        $scope.testZ = $scope.fits.spectra[$scope.activeIndex].matchedZ;
        $scope.active = 'Detailed';
    }
    $scope.addfile = function (f) {
        $scope.fitsFile = f;
        var rawFits = new astro.FITS(f, function () {
            $scope.$apply(function () {
                $scope.fits = new FitsFile(f.name, rawFits, $scope);
            });
        });
    };
    $scope.setActiveIndex = function(i) {
        $scope.activeIndex = i;
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
            $scope.dispRaw = 1 - $scope.dispRaw;
        } else if (category == 'pre') {
            $scope.dispPre = 1 - $scope.dispPre;
        } else if (category == 'matched') {
            $scope.dispMatched = 1 - $scope.dispMatched;
        }
        for (var i = 0; i < $scope.fits.spectra.length; i++) {
            $scope.fits.rerender(i); //$scope.fits.spectra[i].miniRendered = -1;
        }
    }
    $scope.renderTemplate = function(i) {
        var arr = [];
        var start = templates[i].start_lambda;
        var end = templates[i].end_lambda;
        for (var j = 0; j < templates[i].spec.length; j++) {
            arr.push(start + (j/templates[i].spec.length)*(end-start));
        }
        var canvas = document.getElementById('smallTemplateCanvas' + i);
        var bounds = getMaxes([[arr, templates[i].spec]]);
        clearPlot(canvas);
        plot(arr, templates[i].spec, $scope.interface.templateColour, canvas, bounds);

    }
    $scope.renderBig = function(divid) {
        if ($scope.fits == null || $scope.fits.spectra == null || $scope.fits.spectra[$scope.activeIndex] == null || $scope.active != "Detailed") {
            return;
        }
        var data = [];
        var preprocessed = $scope.fits.spectra[$scope.activeIndex].processedIntensity != null;
        var matched = [];
        var templateIndex = $scope.testTIndex;
        var thingy = linearScaleFactor($scope.templates[templateIndex].start_lambda,$scope.templates[templateIndex].end_lambda, $scope.testZ, $scope.templates[templateIndex].spec.length)
        matched = interpolate($scope.fits.lambda, thingy, $scope.templates[templateIndex].spec);

        for (var i=0; i < $scope.fits.spectra[$scope.activeIndex].intensity.length; i++) {
            var datum = {"lambda": $scope.fits.lambda[i].toFixed(2),
                    "raw" : $scope.fits.spectra[$scope.activeIndex].intensity[i]/50};
            if (preprocessed) {
                datum.preprocessed = $scope.fits.spectra[$scope.activeIndex].processedIntensity[i];
            }
            if (preprocessed) {
                datum.matched = matched[i];
            }
            data.push(datum);
        }
        var graphProps = [];
        graphProps.push({
            "id":"raw",
            //"balloonText": "<span style='font-size:14px;'><b>[[category]]:</b> [[value]]</span>",
            "bullet": "none",
            "bulletBorderAlpha": 1,
            "bulletColor":"#FFFFFF",
            "hideBulletsCount": 50,
            "title": "Raw",
            "lineColor": $scope.interface.rawColour,
            "valueField": "raw",
            "useLineColorForBulletBorder":true
        });
        if (preprocessed) {
            graphProps.push({
                "id":"pre",
                //"balloonText": "<span style='font-size:14px;'><b>[[category]]:</b> [[value]]</span>",
                "bullet": "none",
                "bulletBorderAlpha": 1,
                "bulletColor":"#FFFFFF",
                "hideBulletsCount": 50,
                "title": "Preprocessed",
                "lineColor": $scope.interface.processedColour,
                "valueField": "preprocessed",
                "useLineColorForBulletBorder":true
            });
        }
            graphProps.push({
                "id":"mat",
                //"balloonText": "<span style='font-size:14px;'><b>[[category]]:</b> [[value]]</span>",
                "bullet": "none",
                "bulletBorderAlpha": 1,
                "bulletColor":"#FFFFFF",
                "hideBulletsCount": 50,
                "title": "Matched",
                "lineColor": $scope.interface.matchedColour,
                "valueField": "matched",
                "useLineColorForBulletBorder":true
            });

        var chart = AmCharts.makeChart("big", {
            "theme": "light",
            type: "serial",
            dataProvider: data,
            "pathToImages": "images/",
            categoryField: "lambda",
            categoryAxis: {
                title: "Wavelength",
                gridPosition: "start"
            },
//            valueAxes: [{
//                title: "Intensity"
//            }],
            graphs: graphProps,
            "chartCursor": {
                "cursorPosition": "mouse"
            },
            chartScrollbar: {
                graphLineAlpha: 1,
                graphFillAlpha: 0,
                graph: "g1",
                backgroundAlpha: 0.1,
//                graphFillColor: "#F00",
                scrollbarHeight: 50,
                selectedBackgroundAlpha: 0.4,
                selectedGraphFillAlpha: 0,
                selectedGraphLineAlpha: 1
            },
            exportConfig: {
                menuBottom: "80px",
                menuRight: "20px",
                backgroundColor: "#efefef",

                menuItemStyle	: {
                    backgroundColor			: '#DDD',
                    rollOverBackgroundColor	: '#EEE'},

                menuItems: [{
                    textAlign: 'center',
                    icon: 'images/export.png',
//                    icon: 'http://www.amcharts.com/lib/3/images/export.png',
                    onclick:function(){},
                    items: [{
                        title: 'PNG',
                        format: 'png'
                    }, {
                        title: 'SVG',
                        format: 'svg'
                    }]
                }]
            }
        });

    }



}