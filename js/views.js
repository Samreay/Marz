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

    this.renderOverviewDone = new Array();

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
//TODO: Live data.
InterfaceManager.prototype.renderDetailed = function(divid) {

    var spectra = this.spectraManager.getSpectra(this.spectraIndex);
    if (spectra == null || spectra.intensity == null || this.menuActive != "Detailed") {
        return;
    }

    var data = [];
    var preprocessed = spectra.processedIntensity != null;
    var ti = this.detailedViewTemplate;
    var tz = this.detailedViewZ;


    var templateXs = this.templateManager.getShiftedLambda(ti, tz);
    var matched = interpolate(spectra.lambda, templateXs, this.templateManager.get(ti).spec);

    for (var i=0; i < spectra.intensity.length; i++) {
        var datum = {"lambda": spectra.lambda[i].toFixed(2),
            "raw" : spectra.intensity[i]/5000};
        if (preprocessed) {
            datum.preprocessed = spectra.processedIntensity[i];
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
        "lineColor": this.interface.rawColour,
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
            "lineColor": this.interface.processedColour,
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
        "lineColor": this.interface.matchedColour,
        "valueField": "matched",
        "useLineColorForBulletBorder":true
    });

    var chart = AmCharts.makeChart(divid, {
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