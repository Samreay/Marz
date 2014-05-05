function InterfaceManager(scope, spectraManager, templateManager, processorManager, spectralLines) {
    this.scope = scope;
    this.spectraManager = spectraManager;
    this.templateManager = templateManager;
    this.processorManager = processorManager;
    this.spectralLines = spectralLines;

    this.menuOptions = ['Overview', 'Detailed', 'Templates', 'Settings', 'Usage'];
    this.menuActive = 'Overview';
    this.spectraIndex = 0;

    this.dispRaw = 1;
    this.dispProcessed = 1;
    this.dispSky = 1;
    this.dispTemplate = 1;
    this.changedRaw = 1;
    this.changedProcessed = 1;
    this.changedTemplate = 1;
    this.detailedViewZMax = 4;

    this.overviewGraph = true;
    this.overviewSortField = 'id';
    this.overviewReverseSort = false;


    this.interface = {
        unselected: '#E8E8E8',
        rawColour: "#F7A519",
        processedColour: "#058518",
        matchedColour: "#AA0000",
        skyColour: "#009DFF",
        templateColour: '#8C0623'};

    this.detailedViewTemplate = -1;
    this.detailedRecreate = false;
    this.detailedViewZ = 0;
    this.detailViewSmoothMax = 5;
    this.detailViewRawSmooth = 3;
    this.detailViewProcessedSmooth = 0;

    this.detailedCanvas = null;
    this.detailedSettings = new DetailedPlotSettings(this, spectralLines);

    this.renderOverviewDone = new Array();

}
InterfaceManager.prototype.getPausedText = function() {
    if (this.processorManager.isPaused()) {
        return "Resume";
    } else {
        return "Pause";
    }
}
InterfaceManager.prototype.changeRawSmooth = function() {
    this.renderDetailedInitial();
}
InterfaceManager.prototype.changeProcessedSmooth = function() {
    this.renderDetailedInitial();
}
InterfaceManager.prototype.getButtonColour = function(category) {
    if (category == 'raw') {
        if (this.dispRaw) {
            return this.interface.rawColour;
        } else {
            return this.interface.unselected;
        }
    }
    if (category == 'pro') {
        if (this.dispProcessed) {
            return this.interface.processedColour;
        } else {
            return this.interface.unselected;
        }
    }
    if (category == 'templ') {
        if (this.dispTemplate) {
            return this.interface.templateColour;
        } else {
            return this.interface.unselected;
        }
    }
    if (category == 'sky') {
        if (this.dispSky) {
            return this.interface.skyColour;
        } else {
            return this.interface.unselected;
        }
    }
}
InterfaceManager.prototype.getNumSpectra = function () {
    return this.spectraManager.getAll().length;
}
InterfaceManager.prototype.getNumAnalysed = function () {
    return this.spectraManager.getAnalysed().length;
}
InterfaceManager.prototype.getNumProcessed = function () {
    return this.spectraManager.getProcessed().length;
}
InterfaceManager.prototype.isMenuActive = function (array) {
    for (var i = 0; i < array.length; i++) {
        if (this.menuActive == array[i]) {
            return true;
        }
    }
    return false;
}
InterfaceManager.prototype.getProgessPercent = function () {
    if (this.getNumSpectra() == 0) {
        return 0;
    }
    return Math.ceil(-0.01 + (100 * this.getNumAnalysed() / this.getNumSpectra()));
}
InterfaceManager.prototype.saveManual = function (qop) {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    spectra.setManual(parseFloat(this.detailedViewZ), this.detailedViewTemplate, qop);
    this.rerenderOverview(spectra.index);
}
InterfaceManager.prototype.waitingDrop = function() {
    return this.getNumSpectra() == 0;
}
InterfaceManager.prototype.finishedProcessing = function () {
    if (this.getNumSpectra() == 0) {
        return false
    }
    return (this.getNumSpectra() == this.getNumProcessed());
}
InterfaceManager.prototype.analysing = function() {
    return this.scope.properties.processAndMatchTogether.value || this.finishedProcessing();
}
InterfaceManager.prototype.getProgressBarType = function() {
    if (this.finishedAnalysis()) {
        return "info";
    } else if (this.analysing()) {
        return "danger";
    } else {
        return "success";
    }
}
InterfaceManager.prototype.finishedAnalysis = function () {
    if (this.getNumSpectra() == 0) {
        return false
    }
    return (this.getNumSpectra() == this.getNumAnalysed());
}
InterfaceManager.prototype.showFooter = function () {
    return (this.processorManager.isProcessing() || this.getNumAnalysed());
}
InterfaceManager.prototype.getDetailedZ = function () {
    return parseFloat(this.detailedViewZ);
}
InterfaceManager.prototype.getDetailedTemplate = function() {
    return this.templateManager.templates[this.detailedViewTemplate];
}
InterfaceManager.prototype.getMinRedshiftForDetailedTemplate = function() {
    return this.getDetailedTemplate().redshift;
}
InterfaceManager.prototype.renderTemplate = function (i) {
    var canvas = document.getElementById('smallTemplateCanvas' + i);
    var arr = this.templateManager.getTemplateLambda(i);
    var bounds = getMaxes([
        [arr, this.templateManager.get(i).spec]
    ]);
    clearPlot(canvas);
    plot(arr, this.templateManager.get(i).spec, this.interface.templateColour, canvas, bounds);

}
InterfaceManager.prototype.plotZeroLine = function (canvas, colour, bounds) {
    var c = canvas.getContext("2d");
    var h = canvas.height;
    var w = canvas.width;
    var ymin = bounds[2];
    var ymax = bounds[3];
    var hh = h - (5 + (0 - ymin) * (h - 10) / (ymax - ymin)) + 0.5;
    c.strokeStyle = colour;
    c.moveTo(0, hh);
    c.lineTo(w, hh);
    c.stroke();
}
InterfaceManager.prototype.rerenderOverview = function (index) {
    this.renderOverviewDone['' + index] = 0;
    this.renderOverview(index);
}
InterfaceManager.prototype.renderOverview = function (index) {
    if (this.menuActive != 'Overview' || !this.overviewGraph) {
        return
    }
    var v = this.spectraManager.getSpectra(index);
    if (this.renderOverviewDone['' + index] == 1) {
        return;
    } else {
        this.renderOverviewDone['' + index] = 1;
    }
    var canvas = document.getElementById("smallGraphCanvas" + index);
    if (canvas == null) {
        this.renderOverviewDone['' + index] = 0;
        return;
    }
    var width = canvas.clientWidth;
    if (v.intensity.length > 0) {
        var lambda = condenseToXPixels(v.lambda, width);
        var intensity = condenseToXPixels(v.intensity, width);
        var processedLambda = condenseToXPixels(v.processedLambda, width);
        var processed = condenseToXPixels(v.processedIntensity, width);
        var r = this.templateManager.getShiftedLinearTemplate(v.getFinalTemplate(), v.getFinalRedshift())
        if (r[0] == null || r[1] == null) {
            var tempIntensity = null;
        } else {
            var tempIntensity = condenseToXPixels(interpolate(v.lambda, r[0], r[1]), width);
        }
        clearPlot(canvas);
        var toBound = [];
        if (this.dispRaw) {
            toBound.push([lambda, intensity]);
        }
        if (this.dispProcessed) {
            toBound.push([processedLambda, processed]);
        }
        if (this.dispTemplate && tempIntensity != null) {
            toBound.push([lambda, tempIntensity]);
        }

        var bounds = getMaxes(toBound);
        this.plotZeroLine(canvas, "#C4C4C4", bounds);
        if (this.dispRaw) {
            plot(lambda, intensity, this.interface.rawColour, canvas, bounds);
        }
        if (this.dispProcessed) {
            plot(processedLambda,processed, this.interface.processedColour, canvas, bounds);
        }
        if (this.dispTemplate && tempIntensity != null) {
            plot(lambda, tempIntensity, this.interface.matchedColour, canvas, bounds);
        }
    }
}












InterfaceManager.prototype.updateDetailedData = function (changedToDetailed) {
    /*if (changedToDetailed || this.detailedCanvas == null) {
        this.renderDetailedInitial();
    } else {
        if (this.changedRaw || this.changedProcessed) {
            this.changedRaw = false;
            this.changedProcessed = false;
            this.renderDetailedStatic();
        }
        if (this.changedTemplate) {
            this.changedTemplate = false;
            this.renderDetailedTemplate();
        }
    }*/
}
InterfaceManager.prototype.renderDetailedInitial = function() {
    var c = document.getElementById ('detailedCanvas');
    if (c == null || c.clientWidth == 0) {
        this.detailedRecreate = true;
        return;
    } else {
        if (this.detailedCanvas == null || this.detailedRecreate) {
            this.detailedCanvas = c;
            this.detailedRecreate = false;
            c.addEventListener("mousedown", this.detailedSettings, false);
            c.addEventListener("mouseup", this.detailedSettings, false);
            c.addEventListener("mousemove", this.detailedSettings, false);
            c.addEventListener("mouseout", this.detailedSettings, false);
            c.addEventListener("touchstart", this.detailedSettings, false);
            c.addEventListener("touchend", this.detailedSettings, false);
            c.addEventListener("touchmove", this.detailedSettings, false);
            this.detailedSettings.setCanvas(c);
        }
        this.detailedSettings.refreshSettings();
        this.detailedSettings.clearData();
        this.getTemplateData();
        this.getStaticData();
        this.detailedSettings.redraw();
    }
}
InterfaceManager.prototype.getStaticData = function () {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    if (spectra == null) return;
    if (this.dispRaw && spectra.intensity != null) {
        this.detailedSettings.addData('raw',true, this.interface.rawColour,
            spectra.lambda, spectra.intensity, spectra.variance);
    }
    if (this.dispProcessed && spectra.processedIntensity != null) {
        this.detailedSettings.addData('processed',true,this.interface.processedColour,
            spectra.processedLambda, spectra.processedIntensity, spectra.processedVariance);
    }
    if (this.dispSky) {
        this.detailedSettings.addData('sky', false, this.interface.skyColour,
            spectra.lambda, spectra.sky)
    }
}
InterfaceManager.prototype.getTemplateData = function () {
    if (!this.dispTemplate || this.detailedViewTemplate == -1) {
        return null;
    }
    if (this.spectraManager.getSpectra(this.spectraIndex) == null) return;
    var r = this.templateManager.getShiftedLinearTemplate(this.detailedViewTemplate, this.getDetailedZ());
    this.detailedSettings.addData('template', false, this.interface.templateColour, r[0].slice(0), r[1].slice(0));
}
InterfaceManager.prototype.clickSpectralLine= function(id) {
    if (this.detailedSettings.waitingForSpectra) {
        var currentWavelength = this.spectralLines.getFromID(id).wavelength;
        var desiredWavelength = this.detailedSettings.getFocusWavelength();
        var z = desiredWavelength/currentWavelength - 1;
        this.detailedViewZ = z;
        //this.detailedSettings.selectedSpectra();
    } else {
        this.spectralLines.toggle(id);
    }
    if (!this.detailedSettings.displayingSpectralLines)  {
        this.detailedSettings.toggleSpectralLines();
    }
}


function DetailedPlotSettings(interfaceManager, spectralLines) {
    this.interfaceManager = interfaceManager;
    this.top = 30;
    this.bottom = 50;
    this.left = 60;
    this.right = 20;

    this.templateScale = '1';
    this.minScale = 0.2;
    this.maxScale = 3;

    this.axesColour = '#444';
    this.zeroLineColour = '#444';
    this.stepColour = '#CCC';
    this.dragInteriorColour = 'rgba(38, 147, 232, 0.2)';
    this.dragOutlineColour = 'rgba(38, 147, 232, 0.6)';
    this.spacingFactor = 1.4;

    this.zoomOutWidth = 20;
    this.zoomOutHeight = 20;
    this.zoomOutImg = new Image();
    this.zoomOutImg.src = 'images/lens.png'

    this.cursorColour = 'rgba(104, 0, 103, 0.9)';
    this.cursorTextColour = '#FFFFFF';
    this.cursorXGap = 10;
    this.cursorYGap = 10;

    this.data = [];
    this.template = null;

    this.labelWidth = 70;
    this.labelHeight = 40;
    this.labelFont = '10pt Verdana';
    this.labelFill = '#222';

    this.minDragForZoom = 20;
    this.lockedBounds = false;

    this.spectralLines = spectralLines;
    this.displayingSpectralLines = false;
    this.spectralLineColour = 'rgba(0, 115, 255, 0.8)';
    this.spectralLineTextColour = '#FFFFFF';

    this.focusX = null;
    this.focusY = null;
    this.focusDataX = null;
    this.focusDataY = null;
    this.focusCosmeticColour = 'rgba(104, 0, 103, 0.9)';
    this.focusCosmeticMaxRadius = 6;
    this.waitingForSpectra = false;
}
DetailedPlotSettings.prototype.toggleSpectralLines = function() {
    this.displayingSpectralLines = !this.displayingSpectralLines;
    this.redraw()
}
DetailedPlotSettings.prototype.unlockBounds = function() {
    this.lockedBounds = false;
}
DetailedPlotSettings.prototype.setCanvas = function(canvas) {
    this.canvas = canvas;
    this.c = canvas.getContext("2d");
    this.c.lineWidth = 1;
    this.refreshSettings();
}
DetailedPlotSettings.prototype.refreshSettings = function () {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.width = this.canvas.width - this.left - this.right;
    this.height = this.canvas.height - this.top - this.bottom;

}
DetailedPlotSettings.prototype.getCanvas = function() {
    return this.canvas;
}
DetailedPlotSettings.prototype.setTemplateScale = function() {
    if (this.template == null) {
        return;
    }
    var s = parseFloat(this.templateScale);
    if (s == null || isNaN(s) || s < this.minScale || s > this.maxScale) {
        return;
    }
    for (var i = 0; i < this.data.length; i++) {
        if (this.data[i].id == 'template') {
            for (var j = 0; j < this.data[i].y.length; j++) {
                this.data[i].y[j] = this.template[j] * s;
            }
        }
    }
    this.redraw();
}
DetailedPlotSettings.prototype.clearData = function() {
    this.data = [];
}
DetailedPlotSettings.prototype.addData = function(id, bound, colour, x, y, e) {
    var item = {id: id, bound: bound, colour: colour, x: x, y: y, e: e};
    if (id == 'template') {
        this.template = [];
        for (var v = 0; v < y.length; v++) {
            this.template.push(y[v]);
        }
        var s = parseFloat(this.templateScale);
        for (var i = 0; i < y.length; i++) {
            y[i] *= s;
        }
    }
    if (id == 'raw' && parseInt(this.interfaceManager.detailViewRawSmooth) != 0) {
        item.y = fastSmooth(item.y, parseInt(this.interfaceManager.detailViewRawSmooth));
    } else if (id == 'processed' && parseInt(this.interfaceManager.detailViewProcessedSmooth) != 0) {
        item.y = fastSmooth(item.y, parseInt(this.interfaceManager.detailViewProcessedSmooth));
    }
    this.data.push(item);
}
DetailedPlotSettings.prototype.getBounds = function() {
    if (this.lockedBounds) return;
    var c = 0;
    this.xMin = 9e9;
    this.xMax = -9e9;
    this.yMin = 9e9;
    this.yMax = -9e9;
    for (var i = 0; i < this.data.length; i++) {
        if (this.data[i].bound) {
            c++;
        }
        var xs = this.data[i].x;
        var ys = this.data[i].y;
        if (this.data[i].bound) {
            if (xs != null) {
                for (var j = 0; j < xs.length; j++) {
                    if (xs[j] < this.xMin) {
                        this.xMin = xs[j];
                    }
                    if (xs[j] > this.xMax) {
                        this.xMax = xs[j];
                    }
                }
            }
        }
    }
    for (var i = 0; i < this.data.length; i++) {
        var xs = this.data[i].x;
        var ys = this.data[i].y;
        if (ys != null) {
            for (var j = 0; j < ys.length; j++) {
                if (xs[j] < this.xMin || xs[j] > this.xMax) continue;
                if (ys[j] < this.yMin) {
                    this.yMin = ys[j];
                }
                if (ys[j] > this.yMax) {
                    this.yMax = ys[j];
                }
            }
        }
    }
    if (c == 0) {
        this.xMin = 4000;
        this.xMax = 9000;
        this.yMin = -500;
        this.yMax = 1000;
    } else {
        if (this.yMin < 0) {
            this.yMin *= this.spacingFactor;
        } else {
            this.yMin /= this.spacingFactor;
        }
        if (this.yMax < 0) {
            this.yMax /= this.spacingFactor;
        } else {
            this.yMax *= this.spacingFactor;
        }
    }
    this.recalculateFocus();
}
DetailedPlotSettings.prototype.removeFocus = function() {
    this.focusX = null;
    this.focusY = null;
    this.focusDataX = null;
    this.focusDataY = null;
    this.waitingForSpectra = false;
}
DetailedPlotSettings.prototype.recalculateFocus = function() {
    if (this.focusX == null || this.focusY == null) return;
    if (this.checkDataXYInRange(this.focusDataX, this.focusDataY)) {
        this.focusX = this.convertDataXToCanvasCoordinate(this.focusDataX);
        this.focusY = this.convertDataYToCanvasCoordinate(this.focusDataY);
    } else {
        this.removeFocus();
    }
}
DetailedPlotSettings.prototype.convertCanvasXCoordinateToDataPoint = function(x) {
    return this.xMin + ((x-this.left)/(this.width)) * (this.xMax - this.xMin);
}
DetailedPlotSettings.prototype.convertCanvasYCoordinateToDataPoint = function(y) {
    return this.yMin + (1-((y-this.top)/(this.height))) * (this.yMax - this.yMin);
}
DetailedPlotSettings.prototype.convertDataYToCanvasCoordinate = function(y) {
    return this.top  + (1-((y-this.yMin)/(this.yMax-this.yMin))) * this.height;
}
DetailedPlotSettings.prototype.convertDataXToCanvasCoordinate = function(x) {
    return this.left + ((x-this.xMin)/(this.xMax-this.xMin)) * this.width;
}
DetailedPlotSettings.prototype.convertDataYToCanvasCoordinate = function(y) {
    return this.top  + (1-((y-this.yMin)/(this.yMax-this.yMin))) * this.height;
}
DetailedPlotSettings.prototype.clearPlot = function() {
    this.c.save();
    this.c.setTransform(1, 0, 0, 1, 0, 0);
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.c.restore();
}
DetailedPlotSettings.prototype.renderPlots = function() {
    for (var j = 0; j < this.data.length; j++) {
        this.c.beginPath();
        this.c.strokeStyle = this.data[j].colour;
        var xs = this.data[j].x;
        var ys = this.data[j].y;
        var disconnect = true;
        for (var i = 1; i < xs.length; i++) {
            if (disconnect == true) {
                disconnect = false;
                this.c.moveTo(this.convertDataXToCanvasCoordinate(xs[i]),this.convertDataYToCanvasCoordinate(ys[i]));
            } else {
                this.c.lineTo(this.convertDataXToCanvasCoordinate(xs[i]),this.convertDataYToCanvasCoordinate(ys[i]));
            }
        }
        this.c.stroke();
    }
}
DetailedPlotSettings.prototype.clearSurrounding = function() {
    this.c.clearRect(0, 0, this.canvas.width, this.top);
    this.c.clearRect(0, 0, this.left, this.canvas.height);
    this.c.clearRect(0, this.top + this.height, this.canvas.width, this.bottom);
    this.c.clearRect(this.left + this.width, 0, this.right, this.canvas.height);
}
DetailedPlotSettings.prototype.plotAxes = function() {
    this.c.strokeStyle = this.axesColour;
    this.c.beginPath();
    this.c.moveTo(this.left, this.top);
    this.c.lineTo(this.left, this.top + this.height);
    this.c.lineTo(this.left + this.width, this.top + this.height);
    this.c.stroke();
}
DetailedPlotSettings.prototype.plotAxesLabels = function(onlyLabels) {
    this.c.font = this.labelFont;
    this.c.strokeStyle = this.stepColour;
    this.c.filLStyle = this.labelFill;
    this.c.textAlign = 'center';
    this.c.textBaseline="top";

    var y = this.top + this.height + 5;
    this.c.beginPath()
    for (var i = 0; i < this.width / this.labelWidth; i++) {
        var x = this.left + (this.labelWidth * i) + 0.5;
        if (onlyLabels) {
            this.c.fillText(this.convertCanvasXCoordinateToDataPoint(x).toFixed(0), x, y);
        } else {
            this.c.moveTo(x, this.top);
            this.c.lineTo(x, this.top + this.height);
        }
    }
    this.c.textAlign = 'right';
    this.c.textBaseline="middle";
    x = this.left - 10;
    var zero = this.convertDataYToCanvasCoordinate(0);
    if (zero < this.top) {
        zero = this.top;
    }
    if (zero > (this.top + this.height)) {
        zero = (this.top + this.height);
    }
    for (var i = 0; i < (zero - this.top) / this.labelHeight; i++) {
        y = zero - (this.labelHeight * i) + 0.5;
        if (onlyLabels) {
            this.c.fillText(this.convertCanvasYCoordinateToDataPoint(y + 0.5).toFixed(0), x, y);
        } else {
            this.c.moveTo(this.left, y);
            this.c.lineTo(this.left + this.width, y);
        }
    }
    for (var i = 1; i < (this.top + this.height - zero) / this.labelHeight; i++) {
        y = zero + (this.labelHeight * i) + 0.5;
        if (onlyLabels) {
            this.c.fillText(this.convertCanvasYCoordinateToDataPoint(y + 0.5).toFixed(0), x, y);
        } else {
            this.c.moveTo(this.left, y);
            this.c.lineTo(this.left + this.width, y);
        }
    }
    if (!onlyLabels) {
        this.c.stroke();
    }
}
DetailedPlotSettings.prototype.plotZeroLine = function() {
    var y = this.convertDataYToCanvasCoordinate(0);
    if (y > (this.top + this.height) || y < this.top) {
        return;
    }
    this.c.strokeStyle = this.zeroLineColour;
    this.c.beginPath();
    this.c.moveTo(this.left, y + 0.5);
    this.c.lineTo(this.left + this.width, y + 0.5);
    this.c.stroke();
}
DetailedPlotSettings.prototype.drawZoomOut = function() {
    var x = this.canvas.width - this.zoomOutWidth;
    var y = 0;
    this.c.drawImage(this.zoomOutImg, x, y);
}
DetailedPlotSettings.prototype.plotSpectralLines = function() {
    if (!this.displayingSpectralLines) return;
    var lines = this.spectralLines.getEnabled();
    this.c.strokeStyle = this.spectralLineColour;
    this.c.filLStyle = this.spectralLineColour;
    this.c.textAlign = 'center';
    this.c.textBaseline = 'bottom';
    this.c.font = this.labelFont;

    for (var i = 0; i < lines.length; i++) {
        var lambda = shiftWavelength(lines[i].wavelength, this.interfaceManager.getDetailedZ());
        if (this.checkDataXInRange(lambda)) {
            var x = 0.5 + Math.floor(this.convertDataXToCanvasCoordinate(lambda));
            this.c.beginPath();
            this.c.moveTo(x, this.top);
            this.c.lineTo(x, this.top + this.height);
            this.c.stroke();
            this.c.beginPath();
            this.c.moveTo(x, this.top);
            this.c.lineTo(x - 20, this.top - 5);
            this.c.lineTo(x - 20, this.top - 20);
            this.c.lineTo(x + 20, this.top - 20);
            this.c.lineTo(x + 20, this.top - 5);
            this.c.closePath();
            this.c.fillStyle = this.spectralLineColour;
            this.c.fill();
            this.c.fillStyle = this.spectralLineTextColour;
            this.c.fillText(lines[i].label, x, this.top - 5);
        }
    }
}
DetailedPlotSettings.prototype.drawFocus = function() {
    if (this.focusX == null || this.focusY == null) return;
    this.c.strokeStyle = this.focusCosmeticColour;
    this.c.lineWidth = 2;
    this.c.beginPath();
    this.c.arc(this.focusX, this.focusY, 2, 0, 2 * Math.PI, false);
    this.c.stroke();
    this.c.beginPath();
    this.c.arc(this.focusX, this.focusY, this.focusCosmeticMaxRadius, 0, 2 * Math.PI, false);
    this.c.stroke();
    this.c.lineWidth = 1;
}
DetailedPlotSettings.prototype.drawCursor = function() {
    if (this.currentMouseX == null || this.currentMouseY == null) return;
    if (!this.checkCanvasInRange(this.currentMouseX, this.currentMouseY)) return;
    var w = 70;
    var h = 16;
    this.c.strokeStyle = this.cursorColour;
    this.c.beginPath();
    this.c.moveTo(this.left, this.currentMouseY + 0.5);
    this.c.lineTo(this.currentMouseX - this.cursorXGap, this.currentMouseY + 0.5);
    this.c.moveTo(this.currentMouseX + this.cursorXGap, this.currentMouseY + 0.5);
    this.c.lineTo(this.left + this.width, this.currentMouseY + 0.5);
    this.c.moveTo(this.currentMouseX + 0.5, this.top);
    this.c.lineTo(this.currentMouseX + 0.5, this.currentMouseY - this.cursorYGap);
    this.c.moveTo(this.currentMouseX + 0.5, this.currentMouseY + this.cursorYGap);
    this.c.lineTo(this.currentMouseX + 0.5, this.top + this.height);
    this.c.stroke();
    this.c.beginPath();
    this.c.moveTo(this.left, this.currentMouseY + 0.5);
    this.c.lineTo(this.left - 5, this.currentMouseY + h/2);
    this.c.lineTo(this.left - w, this.currentMouseY + h/2);
    this.c.lineTo(this.left - w, this.currentMouseY - h/2);
    this.c.lineTo(this.left - 5, this.currentMouseY - h/2);
    this.c.closePath();
    this.c.fillStyle = this.cursorColour;
    this.c.fill();
    this.c.fillStyle = this.cursorTextColour;
    this.c.textAlign = 'right';
    this.c.textBaseline = 'middle';
    this.c.fillText(this.convertCanvasYCoordinateToDataPoint(this.currentMouseY + 0.5).toFixed(1), this.left - 10, this.currentMouseY)
    this.c.beginPath();
    var y = this.top + this.height;
    this.c.moveTo(this.currentMouseX, y);
    this.c.lineTo(this.currentMouseX + w/2, y + 5);
    this.c.lineTo(this.currentMouseX + w/2, y + 5 + h);
    this.c.lineTo(this.currentMouseX - w/2, y + 5 + h);
    this.c.lineTo(this.currentMouseX - w/2, y + 5);
    this.c.closePath();
    this.c.fillStyle = this.cursorColour;
    this.c.fill();
    this.c.fillStyle = this.cursorTextColour;
    this.c.textAlign = 'center';
    this.c.textBaseline = 'top';
    this.c.fillText(this.convertCanvasXCoordinateToDataPoint(this.currentMouseX + 0.5).toFixed(1), this.currentMouseX + 0.5, y + 5)

}
DetailedPlotSettings.prototype.redraw = function() {
    this.refreshSettings();
    this.getBounds();
    this.clearPlot();
    this.plotZeroLine();
    this.plotAxes();
    this.plotAxesLabels(false);
    this.renderPlots();
    this.clearSurrounding();
    this.plotAxesLabels(true);
    this.drawZoomOut();
    this.plotSpectralLines();
    this.drawFocus();
    this.drawCursor();
}


DetailedPlotSettings.prototype.handleEvent = function(e) {
    var res = this.windowToCanvas(e);
    if (e.type == 'mousedown' || e.type == "touchstart") {
        this.canvasMouseDown(res);
    } else if (e.type == 'mouseup' || e.type == 'touchend') {
        this.canvasMouseUp(res);
    } else if (e.type == 'mousemove' || e.type == 'touchmove') {
        this.canvasMouseMove(res);
    } else if (e.type == 'mouseout') {
        this.mouseOut(res);
    }
}
DetailedPlotSettings.prototype.checkDataXInRange = function(x) {
    return x >= this.xMin && x <= this.xMax;
}
DetailedPlotSettings.prototype.checkDataYInRange = function(y) {
    return y >= this.yMin && y <= this.yMax;
}
DetailedPlotSettings.prototype.checkDataXYInRange = function(x,y) {
    return this.checkDataXInRange(x) && this.checkDataYInRange(y);
}
DetailedPlotSettings.prototype.checkCanvasXInRange = function(x) {
    return x >= this.left && x <= (this.left + this.width)
}
DetailedPlotSettings.prototype.checkCanvasYInRange = function(y) {
    return y >= this.top && y <= (this.top + this.height);
}
DetailedPlotSettings.prototype.checkCanvasInRange = function(x,y) {
    return this.checkCanvasXInRange(x) && this.checkCanvasYInRange(y);
}
DetailedPlotSettings.prototype.windowToCanvas = function(e) {
    var result = {};
    var rect = this.canvas.getBoundingClientRect();
    result.x = e.clientX - rect.left;
    result.y = e.clientY - rect.top;
    result.dataX = this.convertCanvasXCoordinateToDataPoint(result.x);
    result.dataY = this.convertCanvasYCoordinateToDataPoint(result.y);
    if (result.dataX < this.xMin || result.dataX > this.xMax) result.dataX = null;
    if (result.dataY < this.yMin || result.dataY > this.yMax) result.dataY = null;
    result.inside = (result.dataX != null && result.dataY != null);

    return result;
}
DetailedPlotSettings.prototype.canvasMouseDown = function(loc) {
    if (loc.inside) {
        this.lastXDown = loc.x;
        this.lastYDown = loc.y;
    }
}
DetailedPlotSettings.prototype.selectedSpectra = function() {
    this.focusX = null;
    this.focusY = null;
    this.waitingForSpectra = false;
}
DetailedPlotSettings.prototype.getWaiting = function() {
    return this.waitingForSpectra;
}
DetailedPlotSettings.prototype.getFocusWavelength = function() {
    return this.convertCanvasXCoordinateToDataPoint(this.focusX);
}
DetailedPlotSettings.prototype.canvasMouseUp = function(loc) {
    this.currentMouseX = loc.x;
    this.currentMouseY = loc.y;
    if (this.lastXDown != null && this.lastYDown != null && this.currentMouseX != null && this.currentMouseY != null &&
        distance(this.lastXDown, this.lastYDown, this.currentMouseX, this.currentMouseY) > this.minDragForZoom) {
        var x1 = this.convertCanvasXCoordinateToDataPoint(this.lastXDown);
        var x2 = this.convertCanvasXCoordinateToDataPoint(this.currentMouseX);
        var y1 = this.convertCanvasYCoordinateToDataPoint(this.lastYDown);
        var y2 = this.convertCanvasYCoordinateToDataPoint(this.currentMouseY);
        this.xMin = Math.min(x1, x2);
        this.xMax = Math.max(x1, x2);
        this.yMin = Math.min(y1, y2);
        this.yMax = Math.max(y1, y2);
        this.lockedBounds = true;
        this.recalculateFocus();
    } else {
        if (loc.x > (this.canvas.width - this.zoomOutWidth) && loc.y < this.zoomOutHeight) {
            this.lockedBounds = false;
        } else if (this.checkCanvasInRange(loc.x, loc.y)) {
            if (this.focusX == null && this.focusY == null) {
                this.focusX = loc.x;
                this.focusY = loc.y;
                this.focusDataX = this.convertCanvasXCoordinateToDataPoint(loc.x);
                this.focusDataY = this.convertCanvasYCoordinateToDataPoint(loc.y);
                this.waitingForSpectra = true;
            } else {
                this.removeFocus();
            }
        }
    }
    this.lastXDown = null;
    this.lastYDown = null;
    //this.redraw();
    this.interfaceManager.scope.$apply();
}
DetailedPlotSettings.prototype.canvasMouseMove = function(loc) {
    if (!loc.inside) return;
    this.redraw();

    this.currentMouseX = loc.x;
    this.currentMouseY = loc.y;

    if (this.lastXDown != null && this.lastYDown != null) {

        if (distance(loc.x, loc.y, this.lastXDown, this.lastYDown) < this.minDragForZoom) {
            return;
        }
        this.c.strokeStyle = this.dragOutlineColour;
        this.c.fillStyle = this.dragInteriorColour;
        var w = loc.x - this.lastXDown;
        var h = loc.y - this.lastYDown;
        this.c.fillRect(this.lastXDown + 0.5, this.lastYDown, w, h);
        this.c.strokeRect(this.lastXDown + 0.5, this.lastYDown, w, h);
    }
}
DetailedPlotSettings.prototype.mouseOut = function(loc) {
    this.currentMouseX = null;
    this.currentMouseY = null;
    this.redraw();
}
