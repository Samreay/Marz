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
    $scope.menuOptions = ['Overview','Detailed','Settings'];
    $scope.active = 'Overview';
    $scope.activeIndex = 0;
    $scope.properties = {test: {label: "Test property", value: 20}};
    $scope.fitsFile = null;
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
    $scope.renderBig = function(divid) {
        if ($scope.fits == null || $scope.fits.spectra == null || $scope.fits.spectra[$scope.activeIndex] == null) {
            return;
        }
        var data = [];
        for (var i=0; i<$scope.fits.spectra[$scope.activeIndex].intensity.length; i++) {
                data.push({"lambda": $scope.fits.lambda[i].toFixed(2),
                    "v" : $scope.fits.spectra[$scope.activeIndex].intensity[i]});
        }
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
            graphs: [{
                "id":"g1",
                "balloonText": "<span style='font-size:14px;'><b>[[category]]:</b> [[value]]</span>",
                "bullet": "none",
                "bulletBorderAlpha": 1,
                "bulletColor":"#FFFFFF",
                "hideBulletsCount": 50,
                "title": "red line",
                "valueField": "v",
                "useLineColorForBulletBorder":true
            }],
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