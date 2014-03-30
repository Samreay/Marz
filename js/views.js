function InterfaceManager(scope, spectraManager, templateManager, processorManager) {
    this.scope = scope;
    this.spectraManager = spectraManager;
    this.templateManager = templateManager;
    this.processorManager = processorManager;

    this.menuOptions = ['Overview', 'Detailed', 'Templates', 'Settings', 'Usage'];
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
        var preprocessedLambda = condenseToXPixels(v.processedLambda, width);
        var preprocessed = condenseToXPixels(v.processedIntensity, width);
        var tempLambda = condenseToXPixels(v.templateLambda, width);
        var tempIntensity = condenseToXPixels(v.templateIntensity, width);

        clearPlot(canvas);
        var toBound = [];
        if (this.dispRaw) {
            toBound.push([lambda, intensity]);
        }
        if (this.dispPre) {
            toBound.push([preprocessedLambda, preprocessed]);
        }
        if (this.dispMatched) {
            toBound.push([tempLambda, tempIntensity]);
        }

        var bounds = getMaxes(toBound);
        this.plotZeroLine(canvas, "#C4C4C4", bounds);
        if (this.dispRaw) {
            plot(lambda, intensity, this.interface.rawColour, canvas, bounds);
        }
        if (this.dispPre) {
            plot(preprocessedLambda, preprocessed, this.interface.processedColour, canvas, bounds);
        }
        if (this.dispMatched) {
            plot(tempLambda, tempIntensity, this.interface.matchedColour, canvas, bounds);
        }
    }
}
InterfaceManager.prototype.updateDetailedData = function () {
    /*var spectra = this.spectraManager.getSpectra(this.spectraIndex);
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
    }*/
    this.detailedUpdateRequired = true;
}

//TODO: Bloody recode this entire bloody section and mangle the x axis so that I dont need to interpolate a thousand
//TODO: bloody times. God I'm close to just writing the graphing functions myself.
InterfaceManager.prototype.getDetailedData = function () {
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
    for (var i = 0; i < data.length; i++) {
        data[i].lambda = new Date(data[i].lambda * 1e7);
        if (!isFinite(data[i].raw) || isNaN(data[i].raw) || data[i].raw == null) {
            data[i].raw = 0;
        } else {
            data[i].raw = data[i].raw;
        }
        if (data[i].pre != null) {
            data[i].pre = data[i].pre.toFixed(2);
        } else {
            data[i].pre = 0;
        }
        if (data[i].matched != null) {
            data[i].matched = data[i].matched.toFixed(2);
        } else {
            data[i].matched = 0;
        }
        //data[i].lambda = new Date(1e9*i);
        //data[i].raw = (Math.random() * 100).toFixed(2);
        //data[i].pre = (Math.random() * 200).toFixed(2);
        //data[i].matched = (Math.random() * 100-100).toFixed(2);
    }
    data[0].raw = 0.1;
    data[0].pre = 0.1;
    data[0].matched = 0.1;
    return data;
}
InterfaceManager.prototype.renderInitialDetailedChart = function() {
    var chart = new AmCharts.AmStockChart();
    this.detailedChart = chart;
    chart.pathToImages = "images/";

    var dataSet = new AmCharts.DataSet();
    dataSet.dataProvider = this.getDetailedData();
    dataSet.fieldMappings = [{fromField: "raw", toField: "value"}];
    dataSet.categoryField = "lambda";
    dataSet.title = "Raw Data"
    dataSet.color = this.interface.rawColour;

    var dataSet2 = new AmCharts.DataSet();
    dataSet2.dataProvider = this.getDetailedData();
    dataSet2.fieldMappings = [{fromField: "pre", toField: "value"}];
    dataSet2.categoryField = "lambda";
    dataSet2.title = "Processed Data"
    dataSet2.compared = true;
    dataSet2.color = this.interface.processedColour;

    var dataSet3 = new AmCharts.DataSet();
    dataSet3.dataProvider = this.getDetailedData();
    dataSet3.fieldMappings = [{fromField: "matched", toField: "value"}];
    dataSet3.categoryField = "lambda";
    dataSet3.title = "Template Prediction"
    dataSet3.compared = true;
    dataSet3.color = this.interface.matchedColour;

    chart.dataSets = [dataSet, dataSet2, dataSet3];


    var stockPanel = new AmCharts.StockPanel();
    chart.panels = [stockPanel];

    var legend = new AmCharts.StockLegend();
    legend.valueTextComparing = "[[value]]";
    stockPanel.stockLegend = legend;
    stockPanel.sequencedAnimation = false;


    var panelsSettings = new AmCharts.PanelsSettings();
    panelsSettings.startDuration = 1;
    chart.panelsSettings = panelsSettings;

    var graph = new AmCharts.StockGraph();
    graph.valueField = "value";
    graph.comparable = true;
    graph.type = "line";
    graph.balloonText = "[[title]]: [[value]]"
    graph.compareGraphBalloonText = "[[title]]: [[value]]"
    graph.periodValue = "Average";
    stockPanel.addStockGraph(graph);

    var categoryAxis = stockPanel.categoryAxis;
    categoryAxis.labelFunction = function (a, b) {
        return b.valueOf()/1e7;
    }

    var categoryAxesSettings = new AmCharts.CategoryAxesSettings();
    categoryAxesSettings.dashLength = 5;
    categoryAxesSettings.maxSeries = 100;
    categoryAxesSettings.groupToPeriods = ["ss"];
    categoryAxesSettings.minPeriod = "ss";
    chart.categoryAxesSettings = categoryAxesSettings;

    var valueAxesSettings = new AmCharts.ValueAxesSettings();
    valueAxesSettings.dashLength = 5;
    chart.valueAxesSettings = valueAxesSettings;

    var chartScrollbarSettings = new AmCharts.ChartScrollbarSettings();
    chartScrollbarSettings.graph = graph;
    chartScrollbarSettings.graphType = "line";
    chart.chartScrollbarSettings = chartScrollbarSettings;


    var periodSelector = new AmCharts.PeriodSelector();
    periodSelector.periods = [
        {period: "MAX", label: "Zoom Out"}
    ];
    chart.periodSelector = periodSelector;

    this.renderChart();


}
InterfaceManager.prototype.renderChart = function() {
    this.detailedChart.write('big');
    this.detailedChart.panels[0].chartCursor.categoryBalloonFunction = function (date) {
        return date.valueOf()/1e7;
    };
}
InterfaceManager.prototype.renderDetailed = function () {
     var spectra = this.spectraManager.getSpectra(this.spectraIndex);
     if (spectra == null || spectra.intensity == null) {
        console.log("Not rendering detailed");
     } else {
         if (this.detailedChart == null) {
             this.renderInitialDetailedChart();
         } else if (document.getElementById('big').innerHTML.length < 100) { //TODO: Better check
            this.renderChart();
        } else {
             this.detailedChart.validateData();
         }
     }
}