angular.module('directivesZ', ['servicesZ', 'ngSanitize'])
    .directive('dropzone', function() {
        return {
            restrict : "A",
            link: function (scope, elem) {
                var onDragOver = function(e) {
                    e.preventDefault();
                    elem.addClass("dropover");

                };
                var onDragEnd = function(e) {
                    e.preventDefault();
                    elem.removeClass("dropover");
                };
                elem.bind('dragover', onDragOver);
                elem.bind('dragenter', onDragOver);
                elem.bind('dragleave', onDragEnd);
                elem.bind('drop', function(e) {
                    onDragEnd(e);
                    var f = e.originalEvent.dataTransfer.files;
                    scope.$apply(function(){
                        scope.addFiles(f);
                    });
                });
            }
        }
    })
    .directive('onFilesSelected', [function() {
        return {
            restrict: 'A',
            link: function(scope, element, attr, ctrl) {
                element.bind("change", function() {
                    scope.$apply(function(){
                        scope.addFiles(element[0].files);
                    });
                });
            }
        }
    }])
    .directive('overviewItem', ['drawingService', 'global', function(drawingService, global) {
        return {
            restrict: "A",
            scope: {
                overviewItem: "="
            },
            link: function($scope, $element, $attr) {
                $scope.data = global.ui.dataSelection;
                $scope.$watchCollection('[overviewItem.getHash(), data.raw, data.processed, data.matched]', function() {
                    drawingService.drawOverviewOnCanvas($scope.overviewItem, $element[0]);
                });
            }
        }
    }])
    .directive('templateItem', ['$window', '$timeout', 'drawingService', function($window, $timeout, drawingService) {
        return {
            restrict: "A",
            scope: {
                templateItem: "=",
                renderOnResize: "="
            },
            link: function($scope, $element) {
                var render = function() {
                    drawingService.drawTemplateOnCanvas($scope.templateItem, $element[0]);
                };
                if ($scope.renderOnResize) {
                    angular.element($window).on('resize', function() {
                        render();
                    });
                }
                $timeout(render);
            }
        }
    }])
    .directive('resize', ['$window', '$timeout', 'global', function($window, $timeout, global) {
        return {
            restrict: "A",
            scope: {
                resize: "="
            },
            link: function($scope, $element) {
                angular.element($window).on('resize', function(e) {
                    $scope.resize($element);
                    global.ui.detailed.width = $window.innerWidth;
                    global.ui.detailed.height = $window.innerHeight;
                    $scope.$apply();
                });
                $timeout(function() {
                    $scope.resize($element);
                });
            }
        }
    }])
    .directive('prettyprint', function() {
        return {
            restrict: 'C',
            link: function postLink(scope, element, attrs) {
                element.html(prettyPrintOne(element.html()));
            }
        };
    })
    .directive('keybind', function() {

        return {
            restrict: 'E',
            replace: true,
            scope: {
                bind: "="
            },
            link: function(scope, element, attrs) {
                scope.getlabels = function() {
                    var html = "";
                    var keys = scope.bind.label.split(",");
                    for (var i = 0; i < keys.length; i++) {
                        if (i != 0) {
                            html += " or ";
                        }
                        html += "<code>" + keys[i] + "</code>"
                    }
                    return html;
                }
            },
            templateUrl: 'templates/partials/keybind.html'
        }

    })
    .directive('detailedItem', ['$rootScope', 'global', 'spectraLineService', 'templatesService', '$timeout', function($rootScope, global, spectraLineService, templatesService, $timeout) {
        return {
            restrict: "A",
            link: function($scope, $element, $attr) {
                $scope.ui = global.ui;
                $scope.detailed = global.ui.detailed;
                var annotationColour = "#F00";
                var xcor = true;
                var xcorData = null;
                var xcorHeight = 50;
                var xcorLineColour = "#F00";
                var xcorPlotColour = "#333";
                var xcorBound = {
                    top: 15,
                    left: 5,
                    right: 5,
                    bottom: 5,
                    height: xcorHeight,
                    width: 300,
                    callout: true,
                    xcorCallout: true
                };

                var callout = false;
                var maxCallouts = 4;
                var minCalloutWidth = 300;
                var callouts = [[1000, 1100], [1200, 1260], [1500, 1600], [1850, 2000],
                    [2700, 2900], [3700, 3780], [3855, 4000], [4800, 5040], [6520, 6600], [6700, 6750]];
                var defaultMin = 3300;
                var defaultMax = 7200;
                var mainBound = {
                    xMin: defaultMin,
                    xMax: defaultMax,
                    yMin: -500,
                    yMax: 1000,
                    top: 30,
                    bottom: 30,
                    left: 60,
                    right: 20,
                    width: 300,
                    height: 300,
                    lockedBounds: false,
                    callout: false
                };
                var bounds = [mainBound];
                var baseBottom = 30;
                var baseTop = 30;
                var templateScale = '1';
                var minScale = 0.2;
                var maxScale = 5;

                var axesColour = '#444';
                var zeroLineColour = '#111';
                var stepColour = '#DDD';
                var dragInteriorColour = 'rgba(38, 147, 232, 0.2)';
                var dragOutlineColour = 'rgba(38, 147, 232, 0.6)';
                var spacingFactor = 1.4;
                var calloutSpacingFactor = 1.3;
                var templateFactor = 1.3;

                var zoomOutWidth = 40;
                var zoomOutHeight = 40;
                var zoomOutImg = new Image();
                zoomOutImg.src = 'images/lens.png'

                var cursorColour = 'rgba(104, 0, 103, 0.9)';
                var cursorTextColour = '#FFFFFF';
                var cursorXGap = 2;
                var cursorYGap = 2;

                var data = [];
                var template = null;

                var labelWidth = 120;
                var labelHeight = 60;
                var labelFont = '10pt Verdana';
                var labelFill = '#222';

                var minDragForZoom = 20;
                var displayingSpectralLines = true;
                var spectralLineColour = 'rgba(0, 115, 255, 0.8)';
                var spectralLineTextColour = '#FFFFFF';

                var templatePixelOffset = 30;
                var skyAverage = 0;

                var focusDataX = null;
                var focusDataY = null;
                var focusCosmeticColour = 'rgba(104, 0, 103, 0.9)';
                var focusCosmeticMaxRadius = 6;


                var zoomXRatio = 0.8;

                var height = 100;
                var width = 300;

                var startRawTruncate = 5;

                var lastXDown = null;
                var lastYDown = null;
                var currentMouseX = null;
                var currentMouseY = null;

                var canvas = $element[0];
                var c = canvas.getContext("2d");

                var convertCanvasXCoordinateToDataPoint = function(bound, x) {
                    return bound.xMin + ((x-bound.left)/(bound.width)) * (bound.xMax - bound.xMin);
                };
                var convertCanvasYCoordinateToDataPoint = function(bound, y) {
                    return bound.yMin + (1-((y-bound.top)/(bound.height))) * (bound.yMax - bound.yMin);
                };
                var convertDataXToCanvasCoordinate = function(bound, x) {
                    return bound.left + ((x-bound.xMin)/(bound.xMax-bound.xMin)) * bound.width;
                };
                var convertDataYToCanvasCoordinate = function(bound, y) {
                    return bound.top  + (1-((y-bound.yMin)/(bound.yMax-bound.yMin))) * bound.height;
                };
                var checkDataXInRange = function(bound, x) {
                    return x >= bound.xMin && x <= bound.xMax;
                };
                var checkDataYInRange = function(bound, y) {
                    return y >= bound.yMin && y <= bound.yMax;
                };
                var checkDataXYInRange = function(bound, x, y) {
                    return checkDataXInRange(bound, x) && checkDataYInRange(bound, y);
                };
                var checkCanvasYInRange = function(bound, y) {
                    return y >= bound.top && y <= (bound.top + bound.height);
                };
                var checkCanvasXInRange = function(bound, x) {
                    return x >= bound.left && x <= (bound.left + bound.width)
                };
                var checkCanvasInRange = function(bound, x, y) {
                    if (bound == null) {
                        return false;
                    }
                    return checkCanvasXInRange(bound, x) && checkCanvasYInRange(bound, y);
                };
                var windowToCanvas = function(e) {
                    var result = {};
                    var rect = canvas.getBoundingClientRect();
                    result.x = e.clientX - rect.left;
                    result.y = e.clientY - rect.top;
                    result.dataX = null;
                    result.dataY = null;
                    result.bound = null;
                    if (xcor) {
                        if (result.x > xcorBound.left && result.x < xcorBound.left + xcorBound.width
                            && result.y > xcorBound.top - 15 && result.y < xcorBound.top + xcorBound.height) {
                            result.dataX = convertCanvasXCoordinateToDataPoint(xcorBound, result.x);
                            result.dataY = convertCanvasYCoordinateToDataPoint(xcorBound, result.y);
                            result.bound = xcorBound;
                        }
                    }
                    if (result.bound == null) {
                        for (var i = 0; i < bounds.length; i++) {
                            if (checkCanvasInRange(bounds[i], result.x, result.y)) {
                                result.dataX = convertCanvasXCoordinateToDataPoint(bounds[i], result.x);
                                result.dataY = convertCanvasYCoordinateToDataPoint(bounds[i], result.y);
                                result.bound = bounds[i];
                                break;
                            }
                        }
                    }
                    result.inside = (result.dataX != null && result.dataY != null);
                    return result;
                };

                var canvasMouseDown = function(loc) {
                    if (loc.inside) {
                        lastXDown = loc.x;
                        lastYDown = loc.y;
                    }
                    if (loc.bound && loc.bound.xcorCallout) {
                        xcorEvent(loc.dataX);
                    }
                };
                var canvasMouseUp = function(loc) {
                    currentMouseX = loc.x;
                    currentMouseY = loc.y;
                    if (lastXDown != null && lastYDown != null && currentMouseX != null && currentMouseY != null &&
                        distance(lastXDown, lastYDown, currentMouseX, currentMouseY) > minDragForZoom && loc.bound != null && loc.bound.callout == false) {
                        var x1 = convertCanvasXCoordinateToDataPoint(loc.bound, lastXDown);
                        var x2 = convertCanvasXCoordinateToDataPoint(loc.bound, currentMouseX);
                        var y1 = convertCanvasYCoordinateToDataPoint(loc.bound, lastYDown);
                        var y2 = convertCanvasYCoordinateToDataPoint(loc.bound, currentMouseY);
                        loc.bound.xMin = Math.min(x1, x2);
                        loc.bound.xMax = Math.max(x1, x2);
                        loc.bound.yMin = Math.min(y1, y2);
                        loc.bound.yMax = Math.max(y1, y2);
                        loc.bound.lockedBounds = true;
                    } else {
                        if (loc.bound && loc.bound.callout == false && loc.x > (loc.bound.left + loc.bound.width - zoomOutWidth - 10) && loc.y < (zoomOutHeight + 10)) {
                            loc.bound.lockedBounds = false;
                            redraw();
                        } else if (checkCanvasInRange(loc.bound, loc.x, loc.y)) {
                            focusDataX = convertCanvasXCoordinateToDataPoint(loc.bound, loc.x);
                            focusDataY = convertCanvasYCoordinateToDataPoint(loc.bound, loc.y);
                            global.ui.detailed.spectraFocus = focusDataX;
                            global.ui.detailed.waitingForSpectra = true;
                            $scope.$apply();
                        }
                    }
                    lastXDown = null;
                    lastYDown = null;
                    redraw()
                };
                var xcorEvent = function(z) {
                    $scope.detailed.redshift = z.toFixed(4);
                    $scope.$apply();
                };
                var canvasMouseMove = function(loc) {
                    if (!loc.inside) return;
                    currentMouseX = loc.x;
                    currentMouseY = loc.y;
                    if (loc.bound != null && loc.bound.xcorCallout != true) {
                        redraw();
                        if (lastXDown != null && lastYDown != null) {
                            if (distance(loc.x, loc.y, lastXDown, lastYDown) < minDragForZoom || loc.bound == null || loc.bound.callout) {
                                return;
                            }
                            c.strokeStyle = dragOutlineColour;
                            c.fillStyle = dragInteriorColour;
                            var w = loc.x - lastXDown;
                            var h = loc.y - lastYDown;
                            c.fillRect(lastXDown + 0.5, lastYDown, w, h);
                            c.strokeRect(lastXDown + 0.5, lastYDown, w, h);
                        }
                    } else if (loc.bound != null && loc.bound.xcorCallout == true) {
                        if (lastXDown != null && lastXDown != null) {
                            xcorEvent(loc.dataX);
                        }
                    }
                };
                var mouseOut = function(loc) {
                    currentMouseX = null;
                    currentMouseY = null;
                    redraw();
                };
                var isScrollingUp = function(e) {
                    if (e.originalEvent) {
                        e = e.originalEvent;
                    }
                    //pick correct delta variable depending on event
                    var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
                    return (e.detail || delta > 0);
                };
                var zoomIn = function(res) {
                    if (res.inside && res.bound && !res.bound.callout) {
                        var r0 = (res.dataX - res.bound.xMin) / (res.bound.xMax - res.bound.xMin);
                        var r1 = (res.dataY - res.bound.yMin) / (res.bound.yMax - res.bound.yMin);
                        var w = res.bound.xMax - res.bound.xMin;
                        var h = res.bound.yMax - res.bound.yMin;
                        res.bound.xMin = res.dataX - r0 * w * zoomXRatio;
                        res.bound.xMax = res.bound.xMin + (w * zoomXRatio);
                        res.bound.yMin = res.dataY - r1 * h * zoomXRatio;
                        res.bound.yMax = res.bound.yMin + (h * zoomXRatio);
                        res.bound.lockedBounds = true;
                    }
                    redraw();
                };
                var zoomOut = function(res) {
                    if (res.inside && res.bound && !res.bound.callout) {
                        var r0 = (res.dataX - res.bound.xMin) / (res.bound.xMax - res.bound.xMin);
                        var r1 = (res.dataY - res.bound.yMin) / (res.bound.yMax - res.bound.yMin);
                        var w = res.bound.xMax - res.bound.xMin;
                        var h = res.bound.yMax - res.bound.yMin;
                        res.bound.xMin = res.dataX - r0 * w * (1/zoomXRatio);
                        res.bound.xMax = res.bound.xMin + (w * (1/zoomXRatio));
                        res.bound.yMin = res.dataY - r1 * h * (1/zoomXRatio);
                        res.bound.yMax = res.bound.yMin + (h * (1/zoomXRatio));
                        res.bound.lockedBounds = true;
                        var rawData = null;
                        if (data.length > 0) {
                            for (var i = 0; i < data.length; i++) {
                                if (data[i].id == 'data') {
                                    rawData = data[i];
                                }
                            }
                        }
                        res.bound.lockedBounds = true;
                        if (rawData != null && rawData.x && rawData.x.length > 0) {
                            if (res.bound.xMin < rawData.x[0] || res.bound.xMax > rawData.x[rawData.x.length - 1]) {
                                res.bound.lockedBounds = false;
                            }
                        }
                    }
                    redraw();
                };
                var handleEvent = function(e) {
                    var res = windowToCanvas(e);
                    //e.preventDefault();
                    //e.stopPropagation();
                    if (e.type == 'mousedown' || e.type == "touchstart") {
                        canvasMouseDown(res);
                    } else if (e.type == 'mouseup' || e.type == 'touchend') {
                        canvasMouseUp(res);
                    } else if (e.type == 'mousemove' || e.type == 'touchmove') {
                        canvasMouseMove(res);
                    } else if (e.type == 'mouseout') {
                        mouseOut(res);
                    } else if (e.type == 'mousewheel') {
                        if (isScrollingUp(e)) {
                            zoomIn(res);
                        } else {
                            zoomOut(res);
                        }
                    }
                };
                var refreshSettings = function () {
                    canvas.width = canvas.clientWidth;
                    canvas.height = canvas.clientHeight;
                    callout = canvas.height > 500;
                    xcor = xcorData && (canvas.height > 550);
                    xcorBound.width = canvas.width - xcorBound.left - xcorBound.right;
                    xcorBound.height = xcorHeight - xcorBound.top - xcorBound.bottom;
                    bounds[0].top = xcor ? baseTop + xcorHeight : baseTop;
                    bounds[0].bottom =  callout ? Math.floor(canvas.height * 0.3) + baseBottom : baseBottom;
                    bounds[0].width = canvas.width - bounds[0].left - bounds[0].right;
                    bounds[0].height = canvas.height - bounds[0].top - bounds[0].bottom;
                };
                var getBounds = function(bound) {
                    if (bound.lockedBounds) return;
                    var c = 0;
                    if (!bound.callout) {
                        bound.xMin = 9e9;
                        bound.xMax = -9e9;
                    }
                    bound.yMin = 9e9;
                    bound.yMax = -9e9;
                    for (var i = 0; i < data.length; i++) {
                        if (data.id == "data" && i < startRawTruncate) continue;
                        if (data[i].bound) {
                            c++;
                        }
                        if (!bound.callout) {
                            var xs = data[i].x;
                            if (data[i].bound) {
                                if (xs != null) {
                                    for (var j = 0; j < xs.length; j++) {
                                        if (xs[j] < bound.xMin) {
                                            bound.xMin = xs[j];
                                        }
                                        if (xs[j] > bound.xMax) {
                                            bound.xMax = xs[j];
                                        }
                                    }
                                }
                            }
                        }
                    }
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].bound) {
                            var xs = data[i].x;
                            var ys = data[i].y;
                            if (data[i].y2 != null) {
                                ys = data[i].y2;
                            }
                            if (ys != null) {
                                for (var j = 0; j < ys.length; j++) {
                                    if (xs[j] < bound.xMin || xs[j] > bound.xMax) continue;
                                    if (ys[j] < bound.yMin) {
                                        bound.yMin = ys[j];
                                    }
                                    if (ys[j] > bound.yMax) {
                                        bound.yMax = ys[j];
                                    }
                                }
                            }
                        }
                    }
                    if (c == 0) {
                        if (!bound.callout) {
                            bound.xMin = 3300;
                            bound.xMax = 7200;
                        }
                        bound.yMin = -500;
                        bound.yMax = 1000;
                    } else {
                        bound.yMin = bound.yMax - (bound.callout ? calloutSpacingFactor : spacingFactor) *(bound.yMax - bound.yMin);
                    }
                };
                var clearPlot = function() {
                    /*c.save();
                    c.setTransform(1, 0, 0, 1, 0, 0);
                    c.clearRect(0, 0, canvas.width, canvas.height);
                    c.restore();*/
                    c.rect(0, 0, canvas.width, canvas.height);
                    c.fillStyle = "rgb(249, 249, 249)";
                    c.fill();
                };
                var plotZeroLine = function(bound, colour) {
                    if (typeof colour === "undefined") colour = zeroLineColour;
                    var y = convertDataYToCanvasCoordinate(bound, 0);
                    if (y > (bound.top + bound.height) || y < bound.top) {
                        return;
                    }
                    c.strokeStyle = zeroLineColour;
                    c.beginPath();
                    c.moveTo(bound.left, Math.floor(y) + 0.5);
                    c.lineTo(bound.left + bound.width, Math.floor(y) + 0.5);
                    c.stroke();
                };
                var plotAxes = function(bound, colour) {
                    if (typeof colour === "undefined") colour = axesColour;
                    c.strokeStyle = colour;
                    c.beginPath();
                    c.moveTo(bound.left - 0.5, bound.top + 0.5);
                    c.lineTo(bound.left - 0.5, bound.top + bound.height + 0.5);
                    c.lineTo(bound.left + bound.width - 0.5, bound.top + bound.height + 0.5);
                    if (bound.callout) {
                        c.lineTo(bound.left - 0.5 + bound.width, bound.top + 0.5);
                        c.lineTo(bound.left - 0.5, bound.top + 0.5);
                    }
                    c.stroke();
                };
                var plotAxesLabels = function(onlyLabels, bound) {
                    c.font = labelFont;
                    c.strokeStyle = stepColour;
                    c.fillStyle = labelFill;
                    c.textAlign = 'center';
                    c.textBaseline="top";

                    var startX = convertCanvasXCoordinateToDataPoint(bound, bound.left);
                    var endX = convertCanvasXCoordinateToDataPoint(bound, bound.left + bound.width);
                    var xRange = endX - startX;
                    var numLabels = bound.width / labelWidth;
                    var xStep = xRange / numLabels;
                    var base = 10;
                    var exponent = Math.floor(Math.log(xStep)/Math.log(base));
                    if (exponent == 0 && Math.floor(Math.log(xStep)/Math.log(5)) > 0) {
                        base = 5;
                        exponent = Math.floor(Math.log(xStep)/Math.log(5));
                    }
                    xStep = Math.max(1, Math.floor(xStep / Math.pow(base, exponent))) * Math.pow(base, exponent);
                    var firstX = startX - startX % xStep;
                    var y = bound.top + bound.height + 5;
                    c.beginPath()
                    for (var i = firstX + xStep; i < endX; i += xStep) {
                        var x = convertDataXToCanvasCoordinate(bound, i) + 0.5;
                        if (onlyLabels) {
                            c.fillText(parseFloat((i).toPrecision(4)), x, y);
                        } else {
                            c.moveTo(x, bound.top);
                            c.lineTo(x, bound.top + bound.height);
                        }
                    }
                    c.textAlign = 'right';
                    c.textBaseline="middle";

                    var endY = convertCanvasYCoordinateToDataPoint(bound, bound.top);
                    var startY = convertCanvasYCoordinateToDataPoint(bound, bound.top + bound.height);
                    var yRange = endY - startY;
                    numLabels = bound.height / labelHeight;
                    var yStep = yRange / numLabels;
                    base = 10;
                    exponent = Math.floor(Math.log(yStep)/Math.log(base));
                    if (exponent == 0 && Math.floor(Math.log(yStep)/Math.log(5)) > 0) {
                        base = 5;
                        exponent = Math.floor(Math.log(yStep)/Math.log(5));
                    }
                    yStep = Math.max(1, Math.floor(yStep / Math.pow(base, exponent))) * Math.pow(base, exponent);
                    var firstY = startY - startY % yStep;

                    x = bound.left - 10;
                    for (var i = firstY + yStep; i < endY; i += yStep) {
                        var y = convertDataYToCanvasCoordinate(bound, i);
                        if (onlyLabels) {
                            var lbl = parseFloat((i).toPrecision(4));
                            if (Math.abs(lbl - 0) < 1e-10) {
                                c.fillText('0', x, y);
                            } else {
                                c.fillText(lbl, x, y);
                            }
                        } else {
                            c.moveTo(bound.left, y);
                            c.lineTo(bound.left + bound.width, y);
                        }
                    }
                    if (!onlyLabels) {
                        c.stroke();
                    }
                };
                var annotatePlot = function(name, bound) {
                    plotText(name, bound.left, 0, annotationColour);
                };
                var plotText = function(text, x, y, colour) {
                    c.textAlign = 'left';
                    c.textBaseline = 'top';
                    c.font = labelFont;
                    c.strokeStyle = colour;
                    c.fillStyle = colour;
                    c.fillText(text, x, y);

                };
                var plotZLine = function(bound) {
                    var z = parseFloat($scope.detailed.redshift)
                    if (z < bound.xMin || z > bound.xMax) {
                        return;
                    }
                    var x = bound.left + bound.width * (z - bound.xMin) / (bound.xMax - bound.xMin);
                    var btm = binarySearch(xcorData.zs, z);
                    var xc = 0;
                    if (btm[0] == btm[1]) {
                        xc = xcorData.xcor[btm[0]];
                    } else {
                        var part = findCorrespondingFloatIndex(xcorData.zs, z, btm[0]) - btm[0];
                        xc = xcorData.xcor[btm[0]] * (part - 1) + part * xcorData.xcor[btm[1]]
                    }
                    xc = xc / xcorData.weight;
                    c.beginPath();
                    c.setLineDash([2, 2]);
                    c.strokeStyle = xcorLineColour;
                    c.moveTo(x, bound.top);
                    c.lineTo(x, bound.top + bound.height);
                    c.stroke()
                    c.setLineDash([0]);
                    c.textAlign = 'left';
                    c.textBaseline = 'top';
                    c.font = labelFont;
                    c.strokeStyle = xcorLineColour;
                    c.fillStyle = xcorLineColour;
                    c.fillText($scope.detailed.redshift, Math.max(x, bound.left + 40), 0);


                };
                var plotXcorData = function() {
                    if (xcor) {
//                        plotAxes(xcorBound, "#aaa");
                        annotatePlot("XCor", xcorBound);
                        if (xcorData != null && xcorData.zs != null && xcorData.xcor != null) {
                            xcorBound.xMin = xcorData.zs[0];
                            xcorBound.xMax = xcorData.zs[xcorData.zs.length - 1];
                            xcorBound.yMin = getMin(xcorData.xcor);
                            xcorBound.yMax = getMax(xcorData.xcor);
                            plotZeroLine(xcorBound, "#999");
                            renderLinearPlot(xcorBound, xcorData.zs, xcorData.xcor, xcorPlotColour);
                            plotZLine(xcorBound);
                        }
                    }
                };
                var renderLinearPlot = function(bound, xs, ys, colour) {
                    c.beginPath();
                    c.strokeStyle = colour;
                    for (var i = 0; i < xs.length; i++) {
                        var x = bound.left + (xs[i]-bound.xMin)/(bound.xMax-bound.xMin) * (bound.width);
                        var y = bound.top + bound.height - ((ys[i]-bound.yMin)*(bound.height)/(bound.yMax-bound.yMin));
                        if (i == 0) {
                            c.moveTo(x,y);
                        } else {
                            c.lineTo(x,y);
                        }
                    }
                    c.stroke();
                };
                var renderPlots = function(bound) {
                    for (var j = 0; j < data.length; j++) {
                        c.beginPath();
                        c.strokeStyle = data[j].colour;
                        var xs = data[j].x;
                        var ys = data[j].y2 == null ? data[j].y : data[j].y2;
                        var disconnect = true;
                        var oob = false;
                        var x = 0;
                        var y = 0;
                        var yOffset = 0;
                        var r = 1;
                        var o = 0;
                        if (data[j].id == 'template') {
                            var lower = binarySearch(xs, bound.xMin)[0];
                            var upper = binarySearch(xs, bound.xMax)[1];
                            var min = getMin(ys, lower, upper);
                            var max = getMax(ys, lower, upper);
                            r = ((bound.yMax - bound.yMin) / (max - min)) / (bound.callout ? calloutSpacingFactor : spacingFactor) / templateFactor;
                            o = bound.yMin - r * min;
                            yOffset = 20;
                        } else if (data[j].id == 'sky') {
                            if (bound.callout) {
                                continue;
                            }
                            yOffset = bound.height + bound.top;
                        } else if (data[j].id == 'variance') {
                            if (bound.callout) {
                                continue;
                            }
                            yOffset = bound.top + 5;
                            c.moveTo(bound.left, bound.top + 5);
                            c.lineTo(bound.left + bound.width, bound.top + 5);
                            c.moveTo(bound.left, bound.top + 5)
                        } else if (data[j].id == "data") {
                            if (bound.callout) {
                                yOffset = -5;
                            } else {
                                yOffset = 0;
                            }
                        }
                        var start = 0;
                        if (data[j].id == "data") {
                            start = startRawTruncate;
                        }
                        var mx2 = bound.left;
                        var mx1 = bound.left;
                        var i = start;
                        var cx = null;
                        var yp = 0;
                        for (i = start; i < xs.length - 1; i++) {
                            if (xs[i] >= bound.xMin && xs[i] <= bound.xMax) {
                                x = cx;
                                cx = convertDataXToCanvasCoordinate(bound, xs[i + 1]);
                                mx1 = mx2;
                                if (x == null) {
                                    x = convertDataXToCanvasCoordinate(bound, xs[i]);
                                    if (i == 0) {
                                        mx1 = x;
                                    } else {
                                        mx1 = bound.left;
                                    }
                                }
                                mx2 = (x + cx) / 2;
                                if (data[j].id == "sky") {
                                    y = yOffset - ys[i];
                                } else if (data[j].id == "variance") {
                                    y = yOffset + ys[i];
                                } else if (data[j].id == 'template') {
                                    y = convertDataYToCanvasCoordinate(bound, ys[i] * r + o) - yOffset;
                                } else {
                                    y = convertDataYToCanvasCoordinate(bound, ys[i]) - yOffset;
                                }
                                if (y < bound.top) {
                                    oob = true;
                                    y = bound.top;
                                } else if (y > (bound.top + bound.height)) {
                                    oob = true;
                                    y = (bound.top + bound.height);
                                } else {
                                    oob = false;
                                }
                                if (disconnect == true) {
                                    disconnect = false;
                                    if (i > 0) {
                                        if (data[j].id == "sky") {
                                            yp = yOffset - ys[i - 1];
                                        } else if (data[j].id == "variance") {
                                            yp = yOffset + ys[i - 1];
                                        } else if (data[j].id == 'template') {
                                            yp = convertDataYToCanvasCoordinate(bound, ys[i - 1] * r + o) - yOffset;
                                        } else {
                                            yp = convertDataYToCanvasCoordinate(bound, ys[i - 1]) - yOffset;
                                        }
                                        c.moveTo(bound.left, yp);
                                        c.lineTo(mx1, yp);
                                    }
                                    c.lineTo(mx1, y);
                                } else {
                                    c.lineTo(mx1, y);
                                    if (oob) {
                                        c.moveTo(mx2, y);
                                    } else {
                                        c.lineTo(mx2, y);
                                    }
                                }
                            }
                        }
                        c.stroke();
                    }
                };
                var drawZoomOut = function(bound) {
                    if (!bound.callout) {
                        var x = bound.left + bound.width + 20 - zoomOutWidth;
                        var y = bound.top - 15;
                        c.drawImage(zoomOutImg, x, y);
                    }
                };
                var plotSpectralLines = function(bound) {
                    if (!$scope.detailed.spectralLines) return;
                    var lines = spectraLineService.getAll();
                    c.strokeStyle = spectralLineColour;
                    c.fillStyle = spectralLineColour;
                    c.textAlign = 'center';
                    c.textBaseline = 'bottom';
                    c.font = labelFont;

                    for (var i = 0; i < lines.length; i++) {
                        var lambda = shiftWavelength(lines[i].wavelength, parseFloat(global.ui.detailed.redshift));
                        if (checkDataXInRange(bound, lambda)) {
                            var x = 0.5 + Math.floor(convertDataXToCanvasCoordinate(bound, lambda));
                            c.beginPath();
                            c.setLineDash([5, 3]);
                            c.moveTo(x, bound.top - 5);
                            c.lineTo(x, bound.top + bound.height);
                            c.stroke();
                            c.setLineDash([0]);
                            c.beginPath();
                            c.moveTo(x, bound.top - 5);
                            c.lineTo(x - 20, bound.top - 10);
                            c.lineTo(x - 20, bound.top - 23);
                            c.lineTo(x + 20, bound.top - 23);
                            c.lineTo(x + 20, bound.top - 10);
                            c.closePath();
                            c.fillStyle = spectralLineColour;
                            c.fill();
                            c.fillStyle = spectralLineTextColour;
                            c.fillText(lines[i].label, x, bound.top - 9);
                        }
                    }
                };
                var drawFocus = function(bound) {
                    if (focusDataX == null || focusDataX == null) return;
                    if (checkDataXYInRange(bound, focusDataX, focusDataY)) {
                        var x = convertDataXToCanvasCoordinate(bound, focusDataX);
                        var y = convertDataYToCanvasCoordinate(bound, focusDataY);
                        c.strokeStyle = focusCosmeticColour;
                        c.lineWidth = 2;
                        c.beginPath();
                        c.arc(x, y, 2, 0, 2 * Math.PI, false);
                        c.stroke();
                        c.beginPath();
                        c.arc(x, y, focusCosmeticMaxRadius, 0, 2 * Math.PI, false);
                        c.stroke();
                        c.lineWidth = 1;
                    }
                };
                var drawCursor = function(bound) {
                    if (currentMouseX == null || currentMouseY == null) return;
                    if (!checkCanvasInRange(bound, currentMouseX, currentMouseY)) return;
                    var w = 70;
                    var h = 16;
                    c.strokeStyle = cursorColour;
                    c.beginPath();
                    c.moveTo(bound.left, currentMouseY + 0.5);
                    c.lineTo(currentMouseX - cursorXGap, currentMouseY + 0.5);
                    c.moveTo(currentMouseX + cursorXGap, currentMouseY + 0.5);
                    c.lineTo(bound.left + bound.width, currentMouseY + 0.5);
                    c.moveTo(currentMouseX + 0.5, bound.top);
                    c.lineTo(currentMouseX + 0.5, currentMouseY - cursorYGap);
                    c.moveTo(currentMouseX + 0.5, currentMouseY + cursorYGap);
                    c.lineTo(currentMouseX + 0.5, bound.top + bound.height);
                    c.stroke();
                    c.beginPath();
                    c.moveTo(bound.left, currentMouseY + 0.5);
                    c.lineTo(bound.left - 5, currentMouseY + h/2);
                    c.lineTo(bound.left - w, currentMouseY + h/2);
                    c.lineTo(bound.left - w, currentMouseY - h/2);
                    c.lineTo(bound.left - 5, currentMouseY - h/2);
                    c.closePath();
                    c.fillStyle = cursorColour;
                    c.fill();
                    c.fillStyle = cursorTextColour;
                    c.textAlign = 'right';
                    c.textBaseline = 'middle';
                    c.fillText(convertCanvasYCoordinateToDataPoint(bound, currentMouseY + 0.5).toFixed(1), bound.left - 10, currentMouseY)
                    c.beginPath();
                    var y = bound.top + bound.height;
                    c.moveTo(currentMouseX, y);
                    c.lineTo(currentMouseX + w/2, y + 5);
                    c.lineTo(currentMouseX + w/2, y + 5 + h);
                    c.lineTo(currentMouseX - w/2, y + 5 + h);
                    c.lineTo(currentMouseX - w/2, y + 5);
                    c.closePath();
                    c.fillStyle = cursorColour;
                    c.fill();
                    c.fillStyle = cursorTextColour;
                    c.textAlign = 'center';
                    c.textBaseline = 'top';
                    c.fillText(convertCanvasXCoordinateToDataPoint(bound, currentMouseX + 0.5).toFixed(1), currentMouseX + 0.5, y + 5)

                };
                var plotWindow = function(bound) {
                    getBounds(bound);
                    plotAxesLabels(false, bound);
                    plotZeroLine(bound);
                    renderPlots(bound);
                    plotAxes(bound);
                    plotAxesLabels(true, bound);
                    drawFocus(bound);
                    drawZoomOut(bound);
                    plotSpectralLines(bound);
                    drawCursor(bound);
                };
                var selectCalloutWindows = function() {
                    var baseData = _.filter(data, function(x) { return x.id == 'data'; });
                    var redshift = parseFloat($scope.detailed.redshift);
                    var start = defaultMin;
                    var end = defaultMax;

                    var desiredNumberOfCallouts = Math.min(Math.floor(canvas.width * 1.0 / minCalloutWidth), maxCallouts);

                    if (baseData != null && baseData.length > 0 && !isNaN(redshift)) {
                        start = baseData[0].x[0];
                        end = baseData[0].x[baseData[0].x.length - 1];
                    }

                    var availableCallouts = _.filter(callouts, function(c) {
                        return (1 + redshift) * c[0] >= start && (1 + redshift) * c[1] <= end;
                    });

                    var numCallouts = Math.min(desiredNumberOfCallouts, availableCallouts.length);
                    bounds = [mainBound];

                    for (var i = 0; i < numCallouts; i++) {
                        bounds.push({
                            xMin: availableCallouts[i][0] * (1 + redshift),
                            xMax: availableCallouts[i][1] * (1 + redshift),
                            yMin: 0,
                            yMax: 0,
                            callout: true,
                            lockedBounds: false
                        });
                    }

                    if (callout) {
                        var w = (canvas.width / numCallouts);
                        var h = Math.floor(canvas.height * 0.3);
                        var numCallout = 0;
                        for (var i = 0; i < bounds.length; i++) {
                            if (bounds[i].callout) {
                                bounds[i].left = 60 + w*numCallout;
                                bounds[i].top = 20 + canvas.height - h;
                                bounds[i].bottom = 20;
                                bounds[i].right = 10+(w*(numCallout+1));
                                bounds[i].height = h - 40;
                                bounds[i].width = w - 60;
                                numCallout++;
                            }
                        }
                    }
                };
                var redraw = function() {
                    refreshSettings();
                    selectCalloutWindows();
                    clearPlot();
                    plotXcorData();
                    for (var i = 0; i < bounds.length; i++) {
                        plotWindow(bounds[i]);
                    }
                };

                $element.bind("mousedown", handleEvent);
                $element.bind("mouseup",   handleEvent);
                $element.bind("mousemove", handleEvent);
                $element.bind("mouseout",  handleEvent);
                $element.bind("touchstart",handleEvent);
                $element.bind("touchend",  handleEvent);
                $element.bind("touchmove", handleEvent);
                $element.bind("mousewheel", handleEvent);



                var smoothData = function(id) {
                    var smooth = parseInt($scope.detailed.smooth);
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == id) {
                            data[i].y2 = fastSmooth(data[i].y, smooth);
                        }
                    }
                };
                $scope.getActiveHash = function() {
                    if ($scope.ui.active == null) return "";
                    return $scope.ui.active.getHash();
                };
                var addXcorData = function() {
                    if (global.ui.active == null || global.ui.active.templateResults == null) {
                        xcorData = null;
                    } else {
                        xcorData = global.ui.active.templateResults[$scope.detailed.templateId];
                    }
                };
                var addBaseData = function() {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == 'data') {
                            data.splice(i, 1);
                            break;
                        }
                    }
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == 'variance') {
                            data.splice(i, 1);
                            break;
                        }
                    }
                    if (global.ui.active != null) {
                        var ys = null;
                        var xs = null;
                        var colour = "#000";
                        if (global.ui.dataSelection.processed && global.ui.active.processedLambdaPlot != null) {
                            xs = global.ui.active.processedLambdaPlot;
                            ys = global.ui.detailed.continuum ? global.ui.active.processedContinuum : global.ui.active.processedIntensity;
                            colour = global.ui.colours.processed;
                        } else {
                            ys = global.ui.detailed.continuum ? global.ui.active.intensityPlot : global.ui.active.getIntensitySubtracted();
                            xs = global.ui.active.lambda;
                            colour = global.ui.colours.raw;
                        }
                        data.push({id: 'data', bound: true, colour: colour, x: xs, y: ys});
                        if (global.ui.dataSelection.variance) {
                            if (global.ui.dataSelection.processed && global.ui.active.processedVariancePlot != null) {
                                ys = global.ui.active.processedVariancePlot;
                            } else {
                                ys = global.ui.active.variancePlot;
                            }
                            data.push({id: 'variance', bound: false, colour: global.ui.colours.variance, x: xs, y: ys});
                        }
                        smoothData('data');
                    }
                };
                var addSkyData = function() {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == 'sky') {
                            data.splice(i, 1);
                            break;
                        }
                    }
                    if (global.ui.active != null && global.ui.active.sky != null) {
                        skyAverage = global.ui.active.skyAverage;
                        data.push({id: 'sky', colour: global.ui.colours.sky, bound: false, x: global.ui.active.lambda, y: global.ui.active.sky})
                    }
                };
                var addTemplateData = function() {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == 'template') {
                            data.splice(i, 1);
                            break;
                        }
                    }
                    if ($scope.detailed.templateId != "0" && $scope.ui.dataSelection.matched) {
                        var r = templatesService.getTemplateAtRedshift($scope.detailed.templateId,
                            parseFloat($scope.detailed.redshift), $scope.detailed.continuum);
                        data.push({id: "template", colour: global.ui.colours.matched, x: r[0],y: r[1]});
                    }
                };
                $scope.$watchCollection('[ui.dataSelection.processed, detailed.continuum]', function() {
                    addBaseData();
                    redraw();
                });
                $scope.$watch('detailed.templateId', function() {
                    addXcorData();
                });
                $scope.$watchCollection('[detailed.redshift, detailed.templateId, ui.dataSelection.matched, detailed.continuum]', function() {
                    addTemplateData();
                    redraw();
                });
                $scope.$watch('ui.dataSelection.variance', function() {
                    addBaseData();
                    redraw();
                });
                $scope.$watch('ui.dataSelection.sky', function() {
                    addSkyData();
                    redraw();
                });
                $scope.$watchCollection('[detailed.lockedBoundsCounter, detailed.lockedBounds]', function() {
                    if ($scope.detailed.lockedBounds == false) {
                        bounds[0].lockedBounds = false;
                        redraw();
                    }
                });
                $scope.$watch('getActiveHash()', function() {
                    addBaseData();
                    addSkyData();
                    addTemplateData();
                    addXcorData();
                    $scope.detailed.lockedBounds = false;
                    bounds[0].lockedBounds = false;
                    redraw();
                });
                $scope.$watch('detailed.smooth', function() {
                    smoothData('data');
                    redraw();
                });
                $scope.$watchCollection('[detailed.width, detailed.height, detailed.spectralLines]', function() {
                    redraw();
                });
            }
        }
    }]);