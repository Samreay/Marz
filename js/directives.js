angular.module('directivesZ', ['servicesZ'])
    .directive('dropzone', function() {
        return {
            restrict : "A",
            link: function (scope, elem) {
                var onDragOver = function(e) {
                    e.preventDefault();
                    elem.addClass("dropover");

                };
                var onDragEnd = function(e) {
                    e.preventDefault();
                    elem.removeClass("dropover");
                };
                elem.bind('dragover', onDragOver);
                elem.bind('dragenter', onDragOver);
                elem.bind('dragleave', onDragEnd);
                elem.bind('drop', function(e) {
                    onDragEnd(e);
                    var f = e.originalEvent.dataTransfer.files;
                    scope.$apply(function(){
                        scope.addfiles(f);
                    });
                });
            }
        }
    })
    .directive('overviewItem', ['drawingService', function(drawingService) {
        return {
            restrict: "A",
            scope: {
                overviewItem: "="
            },
            link: function($scope, $element, $attr) {
                drawingService.drawOverviewOnCanvas($scope.overviewItem, $element[0]);
            }
        }
    }]);