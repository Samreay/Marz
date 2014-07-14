importScripts('../lib/regression.js', 'tools.js', 'methods.js', 'templates.js')
var templateManager = new TemplateManager();
var self = this;



self.addEventListener('message', function(event) {
    console.log(event.data);


    setTimeout(function() {
        self.postMessage(event.data);
    }, 3000);
});