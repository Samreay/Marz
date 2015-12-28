node = true;

require("./workerMethods.js")();

/*var fs = require('fs');
var dependencies = [ 'js/config.js', 'lib/regression.js', 'js/extension.js',  'js/spectralLines.js', 'js/methods.js', 'js/templates.js', 'js/classes.js', 'lib/dsp.js', 'js/workerMethods.js'];
for (var i = 0; i < dependencies.length; i++) {
    eval(fs.readFileSync(dependencies[i]) + '');
}
*/
process.on('message', function(event) {
    var result = handleEvent(event);
    process.send({data: result});
});
