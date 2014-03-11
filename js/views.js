function InterfaceManager(scope, spectraManager, templateManager) {
    this.scope = scope;
    this.spectraManager = spectraManager;
    this.templateManager = templateManager;

    this.menuOptions = ['Overview','Detailed','Templates','Settings'];
    this.menuActive = 'Overview';

    this.spectraIndex = 0;

    this.dispRaw = 1;
    this.dispPre = 1;
    this.dispMatched = 1;


    this.interface = {
        rawColour: "#E8BA6B",
        processedColour: "#058518",
        matchedColour: "#AA0000",
        templateColour: '#8C0623'};

    this.detailedViewTemplate = 0;
    this.detailedViewZ = 0;
    this.detailedUpdateRequired = false;
    this.detailedViewZMax = 2;

    this.detailedChart = null;
    this.detailedRawGraph = null;
    this.detailedProcessedGraph = null;
    this.detailedMatchedGraph = null;
    this.chartScrollbar = null;


    this.renderOverviewDone = new Array();

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
        var preprocessed = condenseToXPixels(v.processedIntensity, width);
        var tempLambda = condenseToXPixels(v.templateLambda, width);
        var tempIntensity = condenseToXPixels(v.templateIntensity, width);

        clearPlot(canvas);
        var toBound = [];
        if (this.dispRaw) { toBound.push([lambda, intensity]); }
        if (this.dispPre) { toBound.push([lambda, preprocessed]); }
        if (this.dispMatched) { toBound.push([tempLambda, tempIntensity]); }

        var bounds = getMaxes(toBound);
        this.plotZeroLine(canvas, "#C4C4C4", bounds);
        if (this.dispRaw) { plot(lambda, intensity, this.interface.rawColour, canvas, bounds); }
        if (this.dispPre) { plot(lambda, preprocessed, this.interface.processedColour, canvas, bounds); }
        if (this.dispMatched) { plot(tempLambda, tempIntensity, this.interface.matchedColour, canvas, bounds); }
    }
}
InterfaceManager.prototype.updateDetailedData = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    var isPreprocessed = spectra.isProcessed();
    if (this.detailedChart != null) {
        if (this.dispRaw) {
            this.detailedChart.showGraph(this.detailedRawGraph);
        } else {
            this.detailedChart.hideGraph(this.detailedRawGraph);
        }
        if (this.dispPre && isPreprocessed) {
            this.detailedChart.showGraph(this.detailedProcessedGraph);
        } else {
            this.detailedChart.hideGraph(this.detailedProcessedGraph);
        }
        if (this.dispMatched) {
            this.detailedChart.showGraph(this.detailedMatchedGraph);
        } else {
            this.detailedChart.hideGraph(this.detailedMatchedGraph);
        }
        if (isPreprocessed) {
            this.chartScrollbar.graph = this.detailedProcessedGraph;
        } else {
            this.chartScrollbar.graph = this.detailedRawGraph;
        }
    }
    this.detailedUpdateRequired = true;
}
InterfaceManager.prototype.getDetailedData = function() {
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);

    var isPreprocessed = spectra.isProcessed();
    var isMatched = spectra.isMatched();

    var ti = this.detailedViewTemplate;
    var tz = this.getDetailedZ();


    var templateYs = null;
    if (isMatched || this.dispMatched) {
        //TODO: Move interpolate to templateManager
        templateYs = interpolate(spectra.lambda, this.templateManager.getShiftedLambda(ti, tz), this.templateManager.get(ti).spec);
    }
    var data = [];
    for (var i=0; i < spectra.intensity.length; i++) {
        var datum = {"lambda": spectra.lambda[i].toFixed(2)}
        if (this.dispRaw) {
            datum.raw = spectra.intensity[i].toFixed(2);
        }
        if (isPreprocessed && this.dispPre) {
            datum.preprocessed = spectra.processedIntensity[i].toFixed(2);
        }
        if (this.dispMatched) {
            datum.matched = templateYs[i].toFixed(2);
        }
        data.push(datum);
    }

    return data;
}
InterfaceManager.prototype.renderDetailed = function() {
    if (this.detailedChart != null && !this.detailedUpdateRequired) {
        return;
    }
    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    if (spectra == null || spectra.intensity == null || this.menuActive != "Detailed") {
        return;
    }


    if (this.detailedChart == null) {
        d = [{'lambda':1,'raw':2,'preprocessed':3,'matched':4}];
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

        var chartCursor = new AmCharts.ChartCursor();
        chartCursor.cursorPosition = "mouse";
        c.addChartCursor(chartCursor);

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
        this.detailedRawGraph.valueField = "raw";
        this.detailedRawGraph.bullet = "none";
        this.detailedRawGraph.lineThickness = 1;
        this.detailedRawGraph.lineColor = this.interface.rawColour;
        c.addGraph(this.detailedRawGraph);

        this.detailedProcessedGraph = new AmCharts.AmGraph();
        this.detailedProcessedGraph.title = "preprocessed";
        this.detailedProcessedGraph.valueField = "preprocessed";
        this.detailedProcessedGraph.bullet = "none";
        this.detailedProcessedGraph.lineThickness = 1;
        this.detailedProcessedGraph.lineColor = this.interface.processedColour;
        c.addGraph(this.detailedProcessedGraph);

        this.detailedMatchedGraph = new AmCharts.AmGraph();
        this.detailedMatchedGraph.title = "matched";
        this.detailedMatchedGraph.valueField = "matched";
        this.detailedMatchedGraph.bullet = "none";
        this.detailedMatchedGraph.lineThickness = 1;
        this.detailedMatchedGraph.lineColor = this.interface.matchedColour;
        c.addGraph(this.detailedMatchedGraph);


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

    } else if (document.getElementById('big').innerHTML.length < 100) { //TODO: Better check
        this.detailedChart.write('big');
    }

    if (this.detailedUpdateRequired) {
        this.detailedChart.dataProvider = this.getDetailedData();
        this.detailedChart.validateData();
        this.detailedUpdateRequired = false;
    }
}