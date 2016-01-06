node = true;

require("./workerMethods.js")();

process.on('message', function(event) {
    var result = handleEvent(event);
    process.send({data: result});
});
