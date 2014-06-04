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
            if (columns.length != 13) {
                console.warn('Results do not appear to be a correct format');
            } else {
                this.results.push({id: columns[0],
                    automaticTemplateID: parseInt(columns[5]),
                    automaticRedshift: parseFloat(columns[7]),
                    automaticChi2: parseInt(columns[8]),
                    finalTemplateID: columns[9],
                    finalRedshift: parseFloat(columns[11]),
                    qop: parseInt(columns[12])});
            }
        }
        this.setResults();
    }.bind(this);

    reader.readAsText(this.file);

};
ResultsLoader.prototype.hasResults = function() {
    return this.results.length > 0;
};
ResultsLoader.prototype.setResults = function() {
    var spectraList = this.scope.spectraManager.getAll();
    if (spectraList != null && spectraList.length != 0) {
        for (var i = 0; i < this.results.length; i++) {
            var r = this.results[i];
            var index = this.scope.spectraManager.getIndexViaID(r.id);
            var spectra = this.scope.spectraManager.getSpectra(index);
            spectra.setResults(r.automaticTemplateID, r.automaticRedshift, r.automaticChi2, r.finalTemplateID, r.finalRedshift, r.qop, true);
        }
    }
    this.scope.$apply();
}





function StorageManager(templateManager) {
    this.templateManager = templateManager;
    if (this.supportsLocalStorage()) {
        this.active = true;
        this.purgeOldStorage();
    } else {
        this.active = false;
    }
}
StorageManager.prototype.setActive = function(active) {
    this.active = active;
}
StorageManager.prototype.purgeOldStorage = function() {
    var ratio = decodeURIComponent(JSON.stringify(localStorage)).length / (5 * 1024 * 1024);
    if (ratio > 0.85) {
        console.log('Pruning local storage. Currently at ' + Math.ceil(ratio*100) + '%');
        var dates = [];
        for (var i = 0; i < localStorage.length; i++) {
            dates.push(JSON.parse(localStorage[localStorage.key(i)])[0]);
        }
        dates.sort();
        var mid = dates[Math.floor(dates.length / 2)];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (JSON.parse(localStorage[key])[0] <= mid) {
                localStorage.removeItem(key);
            }
        }
        ratio = decodeURIComponent(JSON.stringify(localStorage)).length / (5 * 1024 * 1024);
        console.log('Pruned local storage. Currently at ' + Math.ceil(ratio*100) + '%');
    }
};
StorageManager.prototype.supportsLocalStorage = function() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        console.warn('Local storage is not available.');
        return false;
    }
};
StorageManager.prototype.getKeyFromSpectra = function(spectra) {
    return spectra.filename + spectra.name;
};
StorageManager.prototype.clearFile = function(filename) {
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(filename, 0) == 0) {
            localStorage.removeItem(key);
            i--;
        }
    }
};
StorageManager.prototype.clearAll = function() {
    localStorage.clear();
};
StorageManager.prototype.getValueFromSpectra = function(spectra) {
    if (spectra.getFinalRedshift() == null) return null;
    var output = spectra.getOutputValues();
    return [output.automaticTemplateID, output.automaticZ, output.automaticChi2, output.manualTemplateID, output.manualZ, output.finalQOP];
};
StorageManager.prototype.saveSpectra = function(spectra) {
    if (!this.active) return;
    var key = this.getKeyFromSpectra(spectra);
    var val = this.getValueFromSpectra(spectra);
    if (val != null) {
        val.unshift(Date.now());
        localStorage[key] = JSON.stringify(val);
    }
};
StorageManager.prototype.loadSpectra = function(spectra) {
    if (!this.active) return;
    var key = this.getKeyFromSpectra(spectra);
    var val = localStorage[key];
    if (val != null) {
        val = JSON.parse(val);
        if (val != null) {
            spectra.setResults(val[1], parseFloat(val[2]), parseInt(val[3]), val[4], parseFloat(val[5]), parseInt(val[6]), false);
        }
    }
};