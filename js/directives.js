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

                var top = 30;
                var bottom = 50;
                var left = 60;
                var right = 20;

                var templateScale = '1';
                var minScale = 0.2;
                var maxScale = 5;

                var axesColour = '#444';
                var zeroLineColour = '#444';
                var stepColour = '#CCC';
                var dragInteriorColour = 'rgba(38, 147, 232, 0.2)';
                var dragOutlineColour = 'rgba(38, 147, 232, 0.6)';
                var spacingFactor = 2;

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

                var labelWidth = 70;
                var labelHeight = 40;
                var labelFont = '10pt Verdana';
                var labelFill = '#222';

                var minDragForZoom = 20;
                var displayingSpectralLines = true;
                var spectralLineColour = 'rgba(0, 115, 255, 0.8)';
                var spectralLineTextColour = '#FFFFFF';

                var templatePixelOffset = 30;
                var skyAverage = 0;

                var focusX = null;
                var focusY = null;
                var focusDataX = null;
                var focusDataY = null;
                var focusCosmeticColour = 'rgba(104, 0, 103, 0.9)';
                var focusCosmeticMaxRadius = 6;

                var xMin = 3300;
                var xMax = 7200;
                var yMin = -500;
                var yMax = 1000;

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

                var convertCanvasXCoordinateToDataPoint = function(x) {
                    return xMin + ((x-left)/(width)) * (xMax - xMin);
                };
                var convertCanvasYCoordinateToDataPoint = function(y) {
                    return yMin + (1-((y-top)/(height))) * (yMax - yMin);
                };
                var convertDataXToCanvasCoordinate = function(x) {
                    return left + ((x-xMin)/(xMax-xMin)) * width;
                };
                var convertDataYToCanvasCoordinate = function(y) {
                    return top  + (1-((y-yMin)/(yMax-yMin))) * height;
                };
                var checkDataXInRange = function(x) {
                    return x >= xMin && x <= xMax;
                };
                var checkDataYInRange = function(y) {
                    return y >= yMin && y <= yMax;
                };
                var checkDataXYInRange = function(x,y) {
                    return checkDataXInRange(x) && checkDataYInRange(y);
                };
                var checkCanvasYInRange = function(y) {
                    return y >= top && y <= (top + height);
                };
                var checkCanvasXInRange = function(x) {
                    return x >= left && x <= (left + width)
                };
                var checkCanvasInRange = function(x,y) {
                    return checkCanvasXInRange(x) && checkCanvasYInRange(y);
                };
                var removeFocus = function() {
                    focusX = null;
                    focusY = null;
                };
                var windowToCanvas = function(e) {
                    var result = {};
                    var rect = canvas.getBoundingClientRect();
                    result.x = e.clientX - rect.left;
                    result.y = e.clientY - rect.top;
                    result.dataX = convertCanvasXCoordinateToDataPoint(result.x);
                    result.dataY = convertCanvasYCoordinateToDataPoint(result.y);
                    if (result.dataX < xMin || result.dataX > xMax) result.dataX = null;
                    if (result.dataY < yMin || result.dataY > yMax) result.dataY = null;
                    result.inside = (result.dataX != null && result.dataY != null);
                    return result;
                };

                var canvasMouseDown = function(loc) {
                    if (loc.inside) {
                        lastXDown = loc.x;
                        lastYDown = loc.y;
                    }
                };
                var recalculateFocus = function() {
                    if (focusDataX == null || focusDataY == null) return;
                    if (checkDataXYInRange(focusDataX, focusDataY)) {
                        focusX = convertDataXToCanvasCoordinate(focusDataX);
                        focusY = convertDataYToCanvasCoordinate(focusDataY);
                    } else {
                        removeFocus();
                    }
                };
                var canvasMouseUp = function(loc) {
                    currentMouseX = loc.x;
                    currentMouseY = loc.y;
                    if (lastXDown != null && lastYDown != null && currentMouseX != null && currentMouseY != null &&
                        distance(lastXDown, lastYDown, currentMouseX, currentMouseY) > minDragForZoom) {
                        var x1 = convertCanvasXCoordinateToDataPoint(lastXDown);
                        var x2 = convertCanvasXCoordinateToDataPoint(currentMouseX);
                        var y1 = convertCanvasYCoordinateToDataPoint(lastYDown);
                        var y2 = convertCanvasYCoordinateToDataPoint(currentMouseY);
                        xMin = Math.min(x1, x2);
                        xMax = Math.max(x1, x2);
                        yMin = Math.min(y1, y2);
                        yMax = Math.max(y1, y2);
                        $scope.detailed.lockedBounds = true;
                        recalculateFocus();
                        addTemplateData();
                    } else {
                        if (loc.x > (canvas.width - zoomOutWidth) && loc.y < zoomOutHeight) {
                            $scope.detailed.lockedBounds = false;
                            getBounds();
                            addTemplateData();
                            redraw();
                        } else if (checkCanvasInRange(loc.x, loc.y)) {
                            focusX = loc.x;
                            focusY = loc.y;
                            focusDataX = convertCanvasXCoordinateToDataPoint(loc.x);
                            focusDataY = convertCanvasYCoordinateToDataPoint(loc.y);
                            global.ui.detailed.spectraFocus = focusDataX;
                            global.ui.detailed.waitingForSpectra = true;
                            $scope.$apply();
                        }
                    }
                    lastXDown = null;
                    lastYDown = null;
                    redraw()
                };
                var canvasMouseMove = function(loc) {
                    if (!loc.inside) return;
                    currentMouseX = loc.x;
                    currentMouseY = loc.y;
                    redraw();
                    if (lastXDown != null && lastYDown != null) {
                        if (distance(loc.x, loc.y, lastXDown, lastYDown) < minDragForZoom) {
                            return;
                        }
                        c.strokeStyle = dragOutlineColour;
                        c.fillStyle = dragInteriorColour;
                        var w = loc.x - lastXDown;
                        var h = loc.y - lastYDown;
                        c.fillRect(lastXDown + 0.5, lastYDown, w, h);
                        c.strokeRect(lastXDown + 0.5, lastYDown, w, h);
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
                    if (res.inside) {
                        var r0 = (res.dataX - xMin) / (xMax - xMin);
                        var r1 = (res.dataY - yMin) / (yMax - yMin);
                        var w = xMax - xMin;
                        var h = yMax - yMin;
                        xMin = res.dataX - r0 * w * zoomXRatio;
                        xMax = xMin + (w * zoomXRatio);
                        yMin = res.dataY - r1 * h * zoomXRatio;
                        yMax = yMin + (h * zoomXRatio);
                        $scope.detailed.lockedBounds = true;
                    }
                    getBounds();
                    addTemplateData();
                    redraw();
                };
                var zoomOut = function(res) {
                    if (res.inside) {
                        var r0 = (res.dataX - xMin) / (xMax - xMin);
                        var r1 = (res.dataY - yMin) / (yMax - yMin);
                        var w = xMax - xMin;
                        var h = yMax - yMin;
                        xMin = res.dataX - r0 * w * (1/zoomXRatio);
                        xMax = xMin + (w * (1/zoomXRatio));
                        yMin = res.dataY - r1 * h * (1/zoomXRatio);
                        yMax = yMin + (h * (1/zoomXRatio));
                        $scope.detailed.lockedBounds = true;
                        var rawData = null;
                        if (data.length > 0) {
                            for (var i = 0; i < data.length; i++) {
                                if (data[i].id == 'data') {
                                    rawData = data[i];
                                }
                            }
                        }
                        $scope.detailed.lockedBounds = true;
                        if (rawData != null && rawData.x && rawData.x.length > 0) {
                            if (xMin < rawData.x[0] || xMax > rawData.x[rawData.x.length - 1]) {
                                $scope.detailed.lockedBounds = false;
                            }
                        }
                    }
                    getBounds();
                    addTemplateData();
                    redraw();
                };
                var handleEvent = function(e) {
                    var res = windowToCanvas(e);
                    e.preventDefault();
                    e.stopPropagation();
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
                    width = canvas.width - left - right;
                    height = canvas.height - top - bottom;
                };
                var getBounds = function() {
                    if ($scope.detailed.lockedBounds) return;
                    var c = 0;
                    xMin = 9e9;
                    xMax = -9e9;
                    yMin = 9e9;
                    yMax = -9e9;
                    for (var i = 0; i < data.length; i++) {
                        if (data.id == "data" && i < startRawTruncate) continue;
                        if (data[i].bound) {
                            c++;
                        }
                        var xs = data[i].x;
                        if (data[i].bound) {
                            if (xs != null) {
                                for (var j = 0; j < xs.length; j++) {
                                    if (xs[j] < xMin) {
                                        xMin = xs[j];
                                    }
                                    if (xs[j] > xMax) {
                                        xMax = xs[j];
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
                                    if (xs[j] < xMin || xs[j] > xMax) continue;
                                    if (ys[j] < yMin) {
                                        yMin = ys[j];
                                    }
                                    if (ys[j] > yMax) {
                                        yMax = ys[j];
                                    }
                                }
                            }
                        }
                    }
                    if (c == 0) {
                        xMin = 3300;
                        xMax = 7200;
                        yMin = -500;
                        yMax = 1000;
                    } else {
                        yMin = yMax - spacingFactor*(yMax - yMin);
                    }
                    recalculateFocus();
                };
                var clearPlot = function() {
                    c.save();
                    c.setTransform(1, 0, 0, 1, 0, 0);
                    c.clearRect(0, 0, canvas.width, canvas.height);
                    c.restore();
                };
                var plotZeroLine = function() {
                    var y = convertDataYToCanvasCoordinate(0);
                    if (y > (top + height) || y < top) {
                        return;
                    }
                    c.strokeStyle = zeroLineColour;
                    c.beginPath();
                    c.moveTo(left, y + 0.5);
                    c.lineTo(left + width, y + 0.5);
                    c.stroke();
                };
                var plotAxes = function() {
                    c.strokeStyle = axesColour;
                    c.beginPath();
                    c.moveTo(left, top);
                    c.lineTo(left, top + height);
                    c.lineTo(left + width, top + height);
                    c.stroke();
                };
                var plotAxesLabels = function(onlyLabels) {
                    c.font = labelFont;
                    c.strokeStyle = stepColour;
                    c.filLStyle = labelFill;
                    c.textAlign = 'center';
                    c.textBaseline="top";

                    var y = top + height + 5;
                    c.beginPath()
                    for (var i = 0; i < width / labelWidth; i++) {
                        var x = left + (labelWidth * i) + 0.5;
                        if (onlyLabels) {
                            c.fillText(convertCanvasXCoordinateToDataPoint(x).toFixed(0), x, y);
                        } else {
                            c.moveTo(x, top);
                            c.lineTo(x, top + height);
                        }
                    }
                    c.textAlign = 'right';
                    c.textBaseline="middle";
                    x = left - 10;
                    var zero = convertDataYToCanvasCoordinate(0);
                    if (zero < top) {
                        zero = top;
                    }
                    if (zero > (top + height)) {
                        zero = (top + height);
                    }
                    for (var i = 0; i < (zero - top) / labelHeight; i++) {
                        y = zero - (labelHeight * i) + 0.5;
                        if (onlyLabels) {
                            c.fillText(convertCanvasYCoordinateToDataPoint(y + 0.5).toFixed(1), x, y);
                        } else {
                            c.moveTo(left, y);
                            c.lineTo(left + width, y);
                        }
                    }
                    for (var i = 1; i < (top + height - zero) / labelHeight; i++) {
                        y = zero + (labelHeight * i) + 0.5;
                        if (onlyLabels) {
                            c.fillText(convertCanvasYCoordinateToDataPoint(y + 0.5).toFixed(1), x, y);
                        } else {
                            c.moveTo(left, y);
                            c.lineTo(left + width, y);
                        }
                    }
                    if (!onlyLabels) {
                        c.stroke();
                    }
                };
                var renderPlots = function() {
                    for (var j = 0; j < data.length; j++) {
                        c.beginPath();
                        c.strokeStyle = data[j].colour;
                        var xs = data[j].x;
                        var ys = data[j].y2 == null ? data[j].y : data[j].y2;
                        var disconnect = true;
                        var x = 0;
                        var y = 0;
                        var yOffset = 0;
                        if (data[j].id == 'template') {
                            yOffset = 20 // parseInt(templatePixelOffset);
                        } else if (data[j].id == 'sky') {
                            yOffset = height + top;
                        } else if (data[j].id == 'variance') {
                            yOffset = top + 5;
                            c.moveTo(left, top + 5);
                            c.lineTo(left + width, top + 5);
                        } else if (data[j].id == "data") {
                            yOffset = -20;
//                            yOffset = top + ((height-top-bottom)* (1 - 1/spacingFactor));
                        }
                        var start = 1;
                        if (data[j].id == "data") {
                            start = startRawTruncate;
                        }
                        for (var i = start; i < xs.length; i++) {
                            x = convertDataXToCanvasCoordinate(xs[i]);
                            if (data[j].id == "sky") {
                                y = yOffset - ys[i];
                            } else if (data[j].id == "variance") {
                                y = yOffset + ys[i];
                            } else {
                                y = convertDataYToCanvasCoordinate(ys[i]) - yOffset;
                            }

                            if (disconnect == true) {
                                disconnect = false;
                                c.moveTo(x, y);
                            } else {
                                c.lineTo(x, y);
                            }
                        }
                        c.stroke();
                    }
                };
                var clearSurrounding = function() {
                    c.clearRect(0, 0, canvas.width, top);
                    c.clearRect(0, 0, left, canvas.height);
                    c.clearRect(0, top + height, canvas.width, bottom);
                    c.clearRect(left + width, 0, right, canvas.height);
                };
                var drawZoomOut = function() {
                    var x = canvas.width - zoomOutWidth;
                    var y = 0;
                    c.drawImage(zoomOutImg, x, y);
                };
                var plotSpectralLines = function() {
                    if (!$scope.detailed.spectralLines) return;
                    var lines = spectraLineService.getAll();
                    c.strokeStyle = spectralLineColour;
                    c.filLStyle = spectralLineColour;
                    c.textAlign = 'center';
                    c.textBaseline = 'bottom';
                    c.font = labelFont;

                    for (var i = 0; i < lines.length; i++) {
                        var lambda = shiftWavelength(lines[i].wavelength, parseFloat(global.ui.detailed.redshift));
                        if (checkDataXInRange(lambda)) {
                            var x = 0.5 + Math.floor(convertDataXToCanvasCoordinate(lambda));
                            c.beginPath();
                            c.moveTo(x, top);
                            c.lineTo(x, top + height);
                            c.stroke();
                            c.beginPath();
                            c.moveTo(x, top);
                            c.lineTo(x - 20, top - 5);
                            c.lineTo(x - 20, top - 20);
                            c.lineTo(x + 20, top - 20);
                            c.lineTo(x + 20, top - 5);
                            c.closePath();
                            c.fillStyle = spectralLineColour;
                            c.fill();
                            c.fillStyle = spectralLineTextColour;
                            c.fillText(lines[i].label, x, top - 5);
                        }
                    }
                };
                var drawFocus = function() {
                    if (focusX == null || focusY == null) return;
                    c.strokeStyle = focusCosmeticColour;
                    c.lineWidth = 2;
                    c.beginPath();
                    c.arc(focusX, focusY, 2, 0, 2 * Math.PI, false);
                    c.stroke();
                    c.beginPath();
                    c.arc(focusX, focusY, focusCosmeticMaxRadius, 0, 2 * Math.PI, false);
                    c.stroke();
                    c.lineWidth = 1;
                };
                var drawCursor = function() {
                    if (currentMouseX == null || currentMouseY == null) return;
                    if (!checkCanvasInRange(currentMouseX, currentMouseY)) return;
                    var w = 70;
                    var h = 16;
                    c.strokeStyle = cursorColour;
                    c.beginPath();
                    c.moveTo(left, currentMouseY + 0.5);
                    c.lineTo(currentMouseX - cursorXGap, currentMouseY + 0.5);
                    c.moveTo(currentMouseX + cursorXGap, currentMouseY + 0.5);
                    c.lineTo(left + width, currentMouseY + 0.5);
                    c.moveTo(currentMouseX + 0.5, top);
                    c.lineTo(currentMouseX + 0.5, currentMouseY - cursorYGap);
                    c.moveTo(currentMouseX + 0.5, currentMouseY + cursorYGap);
                    c.lineTo(currentMouseX + 0.5, top + height);
                    c.stroke();
                    c.beginPath();
                    c.moveTo(left, currentMouseY + 0.5);
                    c.lineTo(left - 5, currentMouseY + h/2);
                    c.lineTo(left - w, currentMouseY + h/2);
                    c.lineTo(left - w, currentMouseY - h/2);
                    c.lineTo(left - 5, currentMouseY - h/2);
                    c.closePath();
                    c.fillStyle = cursorColour;
                    c.fill();
                    c.fillStyle = cursorTextColour;
                    c.textAlign = 'right';
                    c.textBaseline = 'middle';
                    c.fillText(convertCanvasYCoordinateToDataPoint(currentMouseY + 0.5).toFixed(1), left - 10, currentMouseY)
                    c.beginPath();
                    var y = top + height;
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
                    c.fillText(convertCanvasXCoordinateToDataPoint(currentMouseX + 0.5).toFixed(1), currentMouseX + 0.5, y + 5)

                };
                var redraw = function() {
                    refreshSettings();
                    getBounds();
                    clearPlot();
                    plotZeroLine();
                    plotAxes();
                    plotAxesLabels(false);
                    renderPlots();
                    clearSurrounding();
                    plotAxesLabels(true);
                    drawZoomOut();
                    plotSpectralLines();
                    recalculateFocus();
                    drawFocus();
                    drawCursor();
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
                        var height = (yMax - yMin) / spacingFactor;
                        r = normaliseSection(r[0], r[1], xMin, xMax, yMin, height);
                        data.push({id: "template", colour: global.ui.colours.matched, x: r.xs,y: r.ys});
                    }
                };
                $scope.$watchCollection('[ui.dataSelection.processed, detailed.continuum]', function() {
                    addBaseData();
                    getBounds();
                    addTemplateData();
                    redraw();
                });
                $scope.$watchCollection('[detailed.redshift, detailed.templateId, ui.dataSelection.matched, detailed.continuum]', function() {
                    getBounds();
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
                        getBounds();
                        addTemplateData();
                        redraw();
                    }
                });
                $scope.$watch('getActiveHash()', function() {
                    addBaseData();
                    addSkyData();
                    getBounds();
                    addTemplateData();
                    $scope.detailed.lockedBounds = false;
                    redraw();
                });
                $scope.$watch('detailed.smooth', function() {
                    smoothData('data');
                    getBounds();
                    addTemplateData();
                    redraw();
                });
                $scope.$watchCollection('[detailed.width, detailed.height, detailed.spectralLines]', function() {
                    getBounds();
                    addTemplateData();
                    redraw();
                });
            }
        }
    }]);