function ResultsLoader(file, scope) {
    this.file = file;
    this.scope = scope;
    this.results = [];
}
ResultsLoader.prototype.load = function() {
    var reader = new FileReader();
    reader.onload = function(e) {
        var text = reader.result;
        var lines = text.split('\n');
        for (var i = 1; i < lines.length - 1; i++) {
            var columns = lines[i].split(',');
            if (columns.length != 7) {
                console.warn('Results do not appear to be a correct format');
            } else {
                this.results.push({id: parseInt(columns[0]),
                    automaticTemplateID: parseInt(columns[5]),
                    automaticRedshift: parseFloat(columns[7]),
                    automaticChi2: parseInt(columns[8]),
                    finalTemplateID: parseInt(columns[9]),
                    finalRedshift: parseFloat(columns[11]),
                    qop: parseInt(columns[12])});
            }
        }
        this.setResults();
    }.bind(this);

    reader.readAsText(this.file);

}
ResultsLoader.prototype.hasResults = function() {
    return this.results.length > 0;
}
ResultsLoader.prototype.setResults = function() {
    var spectraList = this.scope.spectraManager.getAll();
    if (spectraList != null && spectraList.length != 0) {
        for (var i = 0; i < this.results.length; i++) {
            var r = this.results[i];
            var index = this.scope.spectraManager.getIndexViaID(r.id);
            var spectra = this.scope.spectraManager.getSpectra(index);
            spectra.setResults(r.automaticTemplateID, r.automaticRedshift, r.automaticChi2, r.finalTemplateID, r.finalRedshift, r.qop);
            this.scope.spectraManager.addToUpdated(index);
            this.scope.interfaceManager.rerenderOverview(index);
        }
    }
    this.scope.$apply();
}