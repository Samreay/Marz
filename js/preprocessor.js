/**
 * This file is responsible for data preprocessing. Extra preprocessing functions
 * should be added to this file, and the method calls added to the processData function.
 */
importScripts('tools.js', 'regression.js')

/**
 * Removes blanks by setting intensity to zero, and variance to null. Null variance will be removed
 * when performing template matching.
 */
function removeBlanks(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        if (isNaN(intensity[i])) {
            intensity[i] = 0;
            variance[i] = null;
        }
    }
}
function polyFit(intensity, polydeg) {
    var data = [];
    for (var i = 0; i < intensity.length; i++) {
        data.push([i, intensity[i]]);
    }
    var result = polynomial(data, polydeg).equation;
    for (var i = 0; i < intensity.length; i++) {
        var y = 0;
        for (var j = 0; j < result.length; j++) {
            y += result[j] * Math.pow(i, j);
        }
        intensity[i] = y;
    }
}
function wait(milliseconds) {
    var e = new Date().getTime() + (milliseconds);
    while (new Date().getTime() <= e) {}
}
function squareWave(intensity, variance) {
    var r = intensity.length * Math.random();
    for (var i = 0; i < intensity.length; i++) {
        if (i < r) {
            intensity[i] = 1000;
        } else {
            intensity[i] = 500;
        }
    }
}


/**
 * Exploit javascripts passing by array references so return statements are not needed.
 */
function processData(intensity, variance) {
    wait(500);
    removeBlanks(intensity, variance)
    polyFit(intensity, 8);
}

self.addEventListener('message', function(e) {
    var d = e.data;
    processData(d.intensity, d.variance)
    self.postMessage({'index': d.index, 'intensity': d.intensity, 'variance': d.variance})
}, false);

