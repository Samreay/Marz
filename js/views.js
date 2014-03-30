function InterfaceManager(scope, spectraManager, templateManager, processorManager) {
    this.scope = scope;
    this.spectraManager = spectraManager;
    this.templateManager = templateManager;
    this.processorManager = processorManager;

    this.menuOptions = ['Overview','Detailed','Templates','Settings', 'Usage'];
    this.menuActive = 'Overview';
    this.spectraIndex = 0;

    this.dispRaw = 1;
    this.dispPre = 1;
    this.dispMatched = 1;
    this.dispRawPrev = 1;
    this.dispPrePrev = 1;
    this.dispMatchedPrev = 1;
    this.detailedViewZMax = 2.5;

    this.interface = {
        rawColour: "#E8BA6B",
        processedColour: "#058518",
        matchedColour: "#AA0000",
        templateColour: '#8C0623'};

    this.detailedViewTemplate = 0;
    this.detailedViewZ = 0;
    this.detailedUpdateRequired = false;

    this.detailedChart = null;
    this.detailedRawGraph = null;
    this.detailedProcessedGraph = null;
    this.detailedMatchedGraph = null;
    this.chartScrollbar = null;


    this.renderOverviewDone = new Array();

}
InterfaceManager.prototype.getNumSpectra = function() {
    return this.spectraManager.getAll().length;
}
InterfaceManager.prototype.getNumAnalysed = function() {
    return this.spectraManager.getAnalysed().length;
}
InterfaceManager.prototype.isMenuActive = function(array) {
    for (var i = 0; i < array.length; i++) {
        if (this.menuActive == array[i]) {
            return true;
        }
    }
    return false;
}
InterfaceManager.prototype.getProgessPercent = function() {
    if (this.getNumSpectra() == 0) {
        return 0;
    }
    return Math.ceil(-0.01 + (100 * this.getNumAnalysed() / this.getNumSpectra()));
}
InterfaceManager.prototype.saveManual = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    spectra.setManual(parseFloat(this.detailedViewZ), this.detailedViewTemplate);
}
InterfaceManager.prototype.finishedAnalysis = function() {
    return (this.getNumSpectra() == this.getNumAnalysed());
}
InterfaceManager.prototype.showFooter = function() {
    return (this.processorManager.isProcessing() || this.getNumAnalysed());
}
InterfaceManager.prototype.getDetailedZ = function() {
    return parseFloat(this.detailedViewZ);
}
InterfaceManager.prototype.renderTemplate = function(i) {
    var canvas = document.getElementById('smallTemplateCanvas' + i);
    var arr = this.templateManager.getTemplateLambda(i);
    var bounds = getMaxes([[arr, this.templateManager.get(i).spec]]);
    clearPlot(canvas);
    plot(arr, this.templateManager.get(i).spec, this.interface.templateColour, canvas, bounds);

}
InterfaceManager.prototype.plotZeroLine = function(canvas, colour, bounds) {
    var c = canvas.getContext("2d");
    var h = canvas.height;
    var w = canvas.width;
    var ymin = bounds[2];
    var ymax = bounds[3];
    var hh = h - (5 + (0-ymin)*(h-10)/(ymax-ymin));
    c.strokeStyle = colour;
    c.moveTo(0, hh);
    c.lineTo(w, hh);
    c.stroke();
}
InterfaceManager.prototype.rerenderOverview = function(index) {
    this.renderOverviewDone[''+index] = 0;
    this.renderOverview(index);
}
InterfaceManager.prototype.renderOverview = function(index) {
    var v = this.spectraManager.getSpectra(index);
    if (this.renderOverviewDone[''+index] == 1) {
        return;
    } else {
        this.renderOverviewDone[''+index] = 1;
    }
    var canvas = document.getElementById("smallGraphCanvas"+index);
    var width = Math.max(canvas.clientWidth, canvas.width);
    if (v.intensity.length > 0) {
        var lambda = condenseToXPixels(v.lambda, width);
        var intensity = condenseToXPixels(v.intensity, width);
        var preprocessedLambda = condenseToXPixels(v.processedLambda, width);
        var preprocessed = condenseToXPixels(v.processedIntensity, width);
        var tempLambda = condenseToXPixels(v.templateLambda, width);
        var tempIntensity = condenseToXPixels(v.templateIntensity, width);

        clearPlot(canvas);
        var toBound = [];
        if (this.dispRaw) { toBound.push([lambda, intensity]); }
        if (this.dispPre) { toBound.push([preprocessedLambda, preprocessed]); }
        if (this.dispMatched) { toBound.push([tempLambda, tempIntensity]); }

        var bounds = getMaxes(toBound);
        this.plotZeroLine(canvas, "#C4C4C4", bounds);
        if (this.dispRaw) { plot(lambda, intensity, this.interface.rawColour, canvas, bounds); }
        if (this.dispPre) { plot(preprocessedLambda, preprocessed, this.interface.processedColour, canvas, bounds); }
        if (this.dispMatched) { plot(tempLambda, tempIntensity, this.interface.matchedColour, canvas, bounds); }
    }
}
InterfaceManager.prototype.updateDetailedData = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    var isPreprocessed = spectra == null ? false : spectra.isProcessed();
    if (this.detailedChart != null) {
        if (this.dispRaw) {
            if (!this.dispRawPrev) {
                this.detailedChart.showGraph(this.detailedRawGraph);
                this.dispRawPrev = true;
            }
        } else {
            if (this.dispRawPrev) {
                this.detailedChart.hideGraph(this.detailedRawGraph);
                this.dispRawPrev = false;
            }
        }
        if (this.dispPre && isPreprocessed) {
            if (!this.dispPrePrev) {
                this.detailedChart.showGraph(this.detailedProcessedGraph);
                this.dispPrePrev = true;
            }
        } else {
            if (this.dispPrePrev) {
                this.detailedChart.hideGraph(this.detailedProcessedGraph);
                this.dispPrePrev = false;
            }
        }
        if (this.dispMatched) {
            if (!this.dispMatchedPrev) {
                this.detailedChart.showGraph(this.detailedMatchedGraph);
                this.dispMatchedPrev = true;
            }
        } else {
            if (this.dispMatchedPrev) {
                this.detailedChart.hideGraph(this.detailedMatchedGraph);
                this.dispMatchedPrev = false;
            }
        }
        if (isPreprocessed) {
            this.chartScrollbar.graph = this.detailedProcessedGraph;
        } else {
            this.chartScrollbar.graph = this.detailedRawGraph;
        }
    }
    this.detailedUpdateRequired = true;
}

//TODO: Bloody recode this entire bloody section and mangle the x axis so that I dont need to interpolate a thousand
//TODO: bloody times. God I'm close to just writing the graphing functions myself.
InterfaceManager.prototype.getDetailedData = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    var data = JSON.parse(JSON.stringify(spectra.plotData));
    var ti = this.detailedViewTemplate;
    var tz = this.getDetailedZ();
    var isProcessed = spectra.isProcessed();
    if (this.dispMatched) {
        var l = isProcessed ? spectra.plotProcessedLambda : spectra.plotLambda;
        var matched = this.templateManager.getPlottingShiftedLinearLambda(ti, tz, l);
        addValuesToDataDictionary(data, l, matched, 'matched', spectra.gap);
    }
    return data;
}
InterfaceManager.prototype.renderDetailed = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    if (spectra == null || spectra.intensity == null || this.menuActive != "Detailed") {
        return;
    }
    if (!(this.detailedChart == null || this.detailedUpdateRequired == true)) {
        return;
    }


    if (this.detailedChart == null) {
        //this.detailedChart = new AmCharts.AmXYChart();
        this.detailedChart = new AmCharts.AmSerialChart();
        var c = this.detailedChart;
        c.zoomOutOnDataUpdate = false;
        c.dataProvider = this.getDetailedData();
        c.theme = "light";
        c.pathToImages = "images/";
        c.categoryField = "lambda";

        var categoryAxis = c.categoryAxis;
        categoryAxis.title = "Wavelength";
        categoryAxis.gridPosition = "start";
        //categoryAxis.parseDates = true;
        //categoryAxis.minPeriod = "mm";
        /*var xAxis = new AmCharts.ValueAxis();
        //xAxis.title = "Wavelength";
        xAxis.position = "bottom";
        xAxis.autoGridCount = true;
        xAxis.gridAlpha = 0.1;
        //xAxis.gridPosition = "start";
        c.addValueAxis(xAxis);*/

//        var yAxis = new AmCharts.ValueAxis();
//        yAxis.position = "left";
//        yAxis.gridAlpha = 0.1;
//        yAxis.autoGridCount = true;
//        c.addValueAxis(yAxis);

        c.exportConfig = {
            menuBottom: "80px",
            menuRight: "20px",
            backgroundColor: "#efefef",
            menuItemStyle: {backgroundColor: '#DDD', rollOverBackgroundColor: '#EEE'},
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
        };

        this.detailedRawGraph = new AmCharts.AmGraph();
        this.detailedRawGraph.title = "raw";
//        this.detailedRawGraph.xField = "x";
        this.detailedRawGraph.valueField = "raw";
        //this.detailedRawGraph.bullet = "none";
        this.detailedRawGraph.lineThickness = 1;
        //this.detailedRawGraph.connect = true;
        this.detailedRawGraph.lineColor = this.interface.rawColour;
        //this.detailedRawGraph.balloonText = "Lambda: [[x]], I: [[raw]]";
        c.addGraph(this.detailedRawGraph);

        this.detailedProcessedGraph = new AmCharts.AmGraph();
        this.detailedProcessedGraph.title = "preprocessed";
//        this.detailedProcessedGraph.xField = "x";
        this.detailedProcessedGraph.valueField = "pre";
        //this.detailedProcessedGraph.bullet = "none";
        this.detailedProcessedGraph.lineThickness = 1;
        //this.detailedProcessedGraph.connect = true;
        this.detailedProcessedGraph.lineColor = this.interface.processedColour;
        //this.detailedProcessedGraph.balloonText = "Lambda: [[x]], I: [[pre]]";
        c.addGraph(this.detailedProcessedGraph);

        this.detailedMatchedGraph = new AmCharts.AmGraph();
        this.detailedMatchedGraph.title = "matched";
//        this.detailedMatchedGraph.xField = "x";
//        this.detailedMatchedGraph.yField = "matched";
        this.detailedMatchedGraph.valueField = "matched";
        this.detailedMatchedGraph.bullet = "none";
        this.detailedMatchedGraph.lineThickness = 1;
        this.detailedMatchedGraph.connect = true;
        this.detailedMatchedGraph.lineColor = this.interface.matchedColour;
        //this.detailedMatchedGraph.balloonText = "Lambda: [[x]], I: [[matched]]";
        c.addGraph(this.detailedMatchedGraph);

        var chartCursor = new AmCharts.ChartCursor();
        chartCursor.cursorPosition = "mouse";
        chartCursor.bulletsEnabled = true;
        c.addChartCursor(chartCursor);

        this.chartScrollbar = new AmCharts.ChartScrollbar();
        if (spectra.isProcessed()) {
            this.chartScrollbar.graph = this.detailedProcessedGraph;
        } else {
            this.chartScrollbar.graph = this.detailedRawGraph;
        }
        this.chartScrollbar.scrollbarHeight = 50;
        this.chartScrollbar.color = "#FFFFFF";
        this.chartScrollbar.autoGridCount = false;
        this.chartScrollbar.graphLineAlpha = 1;
        this.chartScrollbar.selectedGraphLineAlpha = 1;
        c.addChartScrollbar(this.chartScrollbar);

        c.write('big');
        this.detailedUpdateRequired = false;

    } else if (document.getElementById('big').innerHTML.length < 100) { //TODO: Better check
        this.detailedChart.write('big');
    }
    if (this.detailedUpdateRequired) {
        this.detailedChart.dataProvider = this.getDetailedData();
        this.detailedChart.validateData();
        this.detailedUpdateRequired = false;
    }
}