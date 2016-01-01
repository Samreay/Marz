var deps = ["./methods"];
for (var i = 0; i < deps.length; i++) {
    require(deps[i])();
}


function SpectralLines() {
    this.lines = [];
    this.types = {
        BOTH: 0,
        EMISSION: 1,
        ABSORPTION: 2
    };
    this.initialiseDefault();
}
/**
 * Adds a spectral line to the globally available array.
 *
 * @param id - the short name of the line (eg 'Lya')
 * @param name - the full name of the line (eg 'Lyman Alpha')
 * @param wavelength - the wavelength of the line
 * @param air - true if the wavelength is with respect to air, not the vacuum
 * @param type - whether this a line found in emission or absorption spectra, or both. Use. spectraLines.TYPES
 * @param enabled - whether or not to use the spectral line
 */
SpectralLines.prototype.addSpectralLine = function(id, label, name, wavelength, air, type, enabled, shortcut, displayLines) {
    if (id == null || label == null || name == null || wavelength == null || air == null || type == null) {
        console.warn('Not a valid line. A null was passed in.');
        return;
    }
    if (parseFloat(wavelength) == null || isNaN(parseFloat(wavelength))) {
        console.warn('Wavelength is not a valid number');
        return;
    }
    if (type < 0 || type > 2) {
        console.warn('Type is not valid');
        return;
    }

    if (air) {
        wavelength = convertSingleVacuumFromAir(wavelength);
    }
    if (displayLines == null || typeof displayLines == "undefined") {
        displayLines = [wavelength];
    } else if (air) {
        for (var i = 0; i < displayLines.length; i++) {
            displayLines[i] = convertSingleVacuumFromAir(displayLines[i])
        }
    }
    // Check if already exists.
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].id == id) {
            console.warn('Id of ' + id + ' already declared');
            return;
        } else if (this.lines[i].name == name) {
            console.warn('Name of ' + name + ' already declared');
            return;
        } else if (this.lines[i].wavelength == wavelength) {
            console.warn('Vacuum wavelength of ' + wavelength.toFixed(2) + ' already declared');
            return;
        }
    }
    this.lines.push({
        id: id,
        label: label,
        name: name,
        wavelength: wavelength,
        logWavelength: Math.log(wavelength)/Math.LN10,
        type: type,
        enabled: enabled,
        shortcut: shortcut,
        displayLines: displayLines
    });
};
SpectralLines.prototype.initialiseDefault = function() {
    this.addSpectralLine('Lyb','Ly\u03B2', 'Lyman Beta',     1025.722,  0, 1, 1, 'shift+y');
    this.addSpectralLine('Lya','Ly\u03B1', 'Lyman Alpha',    1215.670,  0, 1, 1, 'shift+l');
    this.addSpectralLine('N5', '[NV]',  'Nitrogen 5',        1240.14,   0, 1, 1, 'shift+t');
    this.addSpectralLine('Si4','Si4', 'Silicon 4',           1400.0,    0, 1, 1, 'shift+s');
    this.addSpectralLine('C4', 'CIV',  'Carbon 4',           1549.06,   0, 1, 1, 'shift+c');
    this.addSpectralLine('C3', 'CIII',  'Carbon 3',          1908.73,   0, 1, 1, 'shift+v');
    this.addSpectralLine('Mg2','MgII', 'Magnesium 2',        2798.75,   0, 0, 1, 'shift+m');
    this.addSpectralLine('O2', '[OII]',  'Oxygen 2',         3728.485,  0, 1, 1, 'shift+o', [3727.09, 3729.88]);
    this.addSpectralLine('Ne3', '[NeIII]',  'Neon 3',        3869.81,   0, 1, 1, '[');
    this.addSpectralLine('K',  'K',   'Potassium',           3933.663,  1, 2, 1, 'shift+k');
    this.addSpectralLine('H',  'H',   'Hydrogen',            3968.468,  1, 2, 1, 'shift+h');
    this.addSpectralLine('Hd',  'H\u03B4', 'Hydrogen Delta', 4102.92,   0, 0, 1, 'shift+d');
    this.addSpectralLine('G',  'G',   'G',                   4304.4,    1, 2, 1, 'shift+g');
    this.addSpectralLine('Hg', 'H\u03B3',  'Hydrogen gamma', 4341.69,   0, 0, 1, 'shift+f');
    this.addSpectralLine('Hb', 'H\u03B2',  'Hydrogen Beta',  4861.325,  1, 0, 1, 'shift+b');
    this.addSpectralLine('O3', '[OIII]',  'Oxygen 3',        4958.911,  1, 1, 1, 'shift+u');
    this.addSpectralLine('O3d','[OIII]', 'Oxygen 3 Doublet', 5006.843,  1, 1, 1, 'shift+i');
    this.addSpectralLine('Mg', 'Mg',  'Magnesium',           5175.3,    1, 2, 1, 'shift+j');
    this.addSpectralLine('Na', 'Na',  'Sodium',              5894.0,    1, 2, 1, 'shift+n');
    this.addSpectralLine('N2', '[NII]',  'Nitrogen 2',       6549.84,   0, 1, 1, 'shift+q');
    this.addSpectralLine('Ha', 'H\u03B1',  'Hydrogen Alpha', 6562.80,   1, 0, 1, 'shift+a');
    this.addSpectralLine('N2d', '[NII]','Nitrogen 2 Doublet',6585.23,   0, 1, 1, 'shift+w');
    this.addSpectralLine('S2', '[SII]',  'Sulfur 2',         6718.32,   0, 1, 1, 'shift+z');
    this.addSpectralLine('S2d','[SII]', 'Sulfur 2 Doublet',  6732.71,   0, 1, 1, 'shift+x');
};
SpectralLines.prototype.getAll = function() {
    return this.lines;
};
SpectralLines.prototype.getEnabled = function() {
    var result = [];
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].enabled) {
            result.push(this.lines[i]);
        }
    }
    return result;
};
SpectralLines.prototype.getFromID = function(id) {
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].id == id) {
            return this.lines[i];
        }
    }
    return null;
};
SpectralLines.prototype.getNext = function(id) {
    if (id == null) return null;
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].id == id) {
            return this.lines[(i + 1) % this.lines.length].id;
        }
    }
    return null;
};
SpectralLines.prototype.getPrevious = function(id) {
    if (id == null) return null;
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].id == id) {
            return this.lines[(i + this.lines.length - 1) % this.lines.length].id;
        }
    }
    return null;
};
SpectralLines.prototype.toggle = function(id) {
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].id == id) {
            this.lines[i].enabled = !this.lines[i].enabled;
            return;
        }
    }
};


module.exports = function() {
    this.SpectralLines = SpectralLines;
};