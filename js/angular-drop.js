(function() {
    'use strict';
    angular.module('dropzone', []).directive('dropzone', function() {
        return {
            restrict : "A",
            link: function (scope, elem) {
                var onDragOver = function(e) {
                    e.preventDefault();
                    $('.fitsFileSelector').addClass("dropover");

                }
                var onDragEnd = function(e) {
                    e.preventDefault();
                    $('.fitsFileSelector').removeClass("dropover");
                }
                elem.bind('dragover', onDragOver);
                elem.bind('dragenter', onDragOver);
                elem.bind('dragleave', onDragEnd);
                elem.bind('drop', function(e) {
                    onDragEnd(e)
                    var f = e.originalEvent.dataTransfer.files;
                    scope.$apply(function(){
                        scope.addfiles(f);
                    });
                });
            }
        }
    });
}).call(this);