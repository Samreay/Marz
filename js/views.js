function InterfaceManager(scope, spectraManager, templateManager, processorManager) {
    this.scope = scope;
    this.spectraManager = spectraManager;
    this.templateManager = templateManager;
    this.processorManager = processorManager;

    this.menuOptions = ['Overview', 'Detailed', 'Templates', 'Settings', 'Usage'];
    this.menuActive = 'Overview';
    this.spectraIndex = 0;

    this.dispRaw = 1;
    this.dispProcessed = 1;
    this.dispTemplate = 1;
    this.changedRaw = 1;
    this.changedProcessed = 1;
    this.changedTemplate = 1;
    this.detailedViewZMax = 2.5;

    this.interface = {
        rawColour: "#E8BA6B",
        processedColour: "#058518",
        matchedColour: "#AA0000",
        templateColour: '#8C0623'};

    this.detailedViewTemplate = 0;
    this.detailedViewZ = 0;
    this.detailedUpdateRequired = false;

    this.detailedCanvas = null;
    this.detailedBounds = null;
    this.detailedSettings = new DetailedPlotSettings();

    this.renderOverviewDone = new Array();

}
InterfaceManager.prototype.getNumSpectra = function () {
    return this.spectraManager.getAll().length;
}
InterfaceManager.prototype.getNumAnalysed = function () {
    return this.spectraManager.getAnalysed().length;
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
InterfaceManager.prototype.saveManual = function () {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    spectra.setManual(parseFloat(this.detailedViewZ), this.detailedViewTemplate);
}
InterfaceManager.prototype.finishedAnalysis = function () {
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
    var hh = h - (5 + (0 - ymin) * (h - 10) / (ymax - ymin));
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
    var v = this.spectraManager.getSpectra(index);
    if (this.renderOverviewDone['' + index] == 1) {
        return;
    } else {
        this.renderOverviewDone['' + index] = 1;
    }
    var canvas = document.getElementById("smallGraphCanvas" + index);
    var width = Math.max(canvas.clientWidth, canvas.width);
    if (v.intensity.length > 0) {
        var lambda = condenseToXPixels(v.lambda, width);
        var intensity = condenseToXPixels(v.intensity, width);
        var processedLambda = condenseToXPixels(v.processedLambda, width);
        var processed = condenseToXPixels(v.processedIntensity, width);
        var r = this.templateManager.getShiftedLinearTemplate(v.getFinalTemplate(), v.getFinalRedshift())
        var tempLambda = condenseToXPixels(r[0], width);
        var tempIntensity = condenseToXPixels(r[1], width);

        clearPlot(canvas);
        var toBound = [];
        if (this.dispRaw) {
            toBound.push([lambda, intensity]);
        }
        if (this.dispProcessed) {
            toBound.push([processedLambda, processed]);
        }
        if (this.dispTemplate) {
            toBound.push([tempLambda, tempIntensity]);
        }

        var bounds = getMaxes(toBound);
        this.plotZeroLine(canvas, "#C4C4C4", bounds);
        if (this.dispRaw) {
            plot(lambda, intensity, this.interface.rawColour, canvas, bounds);
        }
        if (this.dispProcessed) {
            plot(processedLambda,processed, this.interface.processedColour, canvas, bounds);
        }
        if (this.dispTemplate) {
            plot(tempLambda, tempIntensity, this.interface.matchedColour, canvas, bounds);
        }
    }
}












InterfaceManager.prototype.updateDetailedData = function (changedToDetailed) {
    if (changedToDetailed || this.detailedCanvas == null) {
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
    }
}
InterfaceManager.prototype.renderDetailedInitial = function() {
    var c = document.getElementById ('detailedCanvas');
    if (c == null || c.clientWidth == 0) {
        return;
    } else {
        this.detailedCanvas = c;
        this.resizeDetailedCanvas();
    }
}
InterfaceManager.prototype.renderDetailedBackground = function() {
    clear(this.detailedCanvas);
}
InterfaceManager.prototype.getStaticData = function () {
    var data = [];
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    if (this.dispRaw && spectra.intensity != null) {
        data.push({id: 'raw',
            colour: this.interface.rawColour,
            x: spectra.lambda,
            y: spectra.intensity,
            e: spectra.variance});
    }
    if (this.dispProcessed && spectra.processedIntensity != null) {
        data.push({id: 'processed',
            colour: this.interface.processedColour,
            x: spectra.processedLambda,
            y: spectra.processedIntensity,
            e: spectra.processedVariance});
    }
    console.log('Got data');
    return data;
}
InterfaceManager.prototype.getTemplateData = function () {
    var r = this.templateManager.getShiftedLinearTemplate(this.detailedViewTemplate, this.getDetailedZ());
    return [{id: 'template',
        colour: this.interface.templateColour,
        x: r[0],
        y: r[1]}];
}
InterfaceManager.prototype.renderDetailedStatic = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    if (spectra == null) return;

    var dataToPlot = this.getStaticData(); //TODO: Only do this when data changes
    this.detailedBounds = getBounds(dataToPlot);
    plotDetailed(this.detailedCanvas, dataToPlot, this.detailedBounds, this.detailedSettings);
}
InterfaceManager.prototype.renderDetailedTemplate = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    if (spectra == null) return;

    var dataToPlot = this.getTemplateData(); //TODO: Only do this when data changes
    plotDetailed(this.detailedCanvas, dataToPlot, this.detailedBounds, this.detailedSettings);

}
InterfaceManager.prototype.resizeDetailedCanvas = function() {
    this.detailedCanvas.width = this.detailedCanvas.clientWidth;
    this.detailedCanvas.height = this.detailedCanvas.clientHeight;
    this.renderDetailedBackground();
    this.renderDetailedStatic();
    this.renderDetailedTemplate();
}



function DetailedPlotSettings() {
    this.top = 20;
    this.bottom = 50;
    this.left = 50;
    this.right = 20;
}