/** Requires tools.js to be imported */












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
SpectralLines.prototype.addSpectralLine = function(id, name, wavelength, air, type, enabled) {
    if (id == null || name == null || wavelength == null || air == null || type == null) {
        console.warn('Not a valid line. A null was passed in.')
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
        name: name,
        wavelength: wavelength,
        type: type,
        enabled: enabled
    });
}
SpectralLines.prototype.initialiseDefault = function() {
    this.addSpectralLine('Lyb', 'Lyman Beta',       1025.722, 0, 1, 0);
    this.addSpectralLine('Lya', 'Lyman Alpha',      1215.670, 0, 1, 0);
    this.addSpectralLine('N5', 'Nitrogen 5',        1240.14, 0, 1, 0);
    this.addSpectralLine('Si4', 'Silicon 4',        1400.0, 0, 1, 0);
    this.addSpectralLine('C4', 'Carbon 4',          1549.06, 0, 1, 1);
    this.addSpectralLine('C3', 'Carbon 3',          1908.73, 0, 1, 1);
    this.addSpectralLine('Mg2', 'Magnesium 2',      2798.75, 0, 0, 1);
    this.addSpectralLine('O2', 'Oxygen 2',          3727.80, 1, 1, 1);
    this.addSpectralLine('K', 'Potassium',          3933.663, 1, 2, 1);
    this.addSpectralLine('H', 'Hydrogen',          3968.468, 1, 2, 1);
    this.addSpectralLine('D', 'Deuterium',       4101.734, 1, 0, 1);
    this.addSpectralLine('G', 'G?',                 4304.4, 1, 2, 1);
    this.addSpectralLine('Hg', 'Mercury',           4340.464, 1, 0, 1);
    this.addSpectralLine('Hb', 'Hydrogen Beta',    4861.325, 1, 0, 1);
    this.addSpectralLine('O3', 'Oxygen 3',          4958.911, 1, 1, 1);
    this.addSpectralLine('O3d', 'Oxygen 3 Doublet', 5006.843, 1, 1, 1);
    this.addSpectralLine('Mg', 'Magnesium',         5175.3, 1, 2, 1);
    this.addSpectralLine('Na', 'Sodium',            5894.0, 1, 2, 1);
    this.addSpectralLine('Ha', 'Hydrogen Alpha',   6562.80, 1, 0, 1);
    this.addSpectralLine('N2', 'Nitrogen 2',        6583.46, 1, 1, 1);
    this.addSpectralLine('S2', 'Sulfur 2',          6716.44, 1, 1, 1);
    this.addSpectralLine('S2d','Sulfur 2 Doublet',  6730.81, 1, 1, 1);
}
SpectralLines.prototype.getAll = function() {
    return this.lines;
}
SpectralLines.prototype.getEnabled = function() {
    var result = [];
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].enabled) {
            result.push(this.lines[i]);
        }
    }
    return result;
}
SpectralLines.prototype.getFromID = function(id) {
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].id == id) {
            return this.lines[i];
        }
    }
}
SpectralLines.prototype.toggle = function(id) {
    for (var i = 0; i < this.lines.length; i++) {
        if (this.lines[i].id == id) {
            this.lines[i].enabled = !this.lines[i].enabled;
            return;
        }
    }
}