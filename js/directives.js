angular.module('directivesZ', ['servicesZ', 'ngSanitize'])
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
                        scope.addFiles(f);
                    });
                });
            }
        }
    })
    .directive('overviewItem', ['drawingService', 'global', function(drawingService, global) {
        return {
            restrict: "A",
            scope: {
                overviewItem: "="
            },
            link: function($scope, $element, $attr) {
                $scope.$watch('overviewItem.getHash()', function() {
                    drawingService.drawOverviewOnCanvas($scope.overviewItem, $element[0]);
                });
                $scope.$on('dataSelectionChanged', function() {
                    drawingService.drawOverviewOnCanvas($scope.overviewItem, $element[0]);
                });
            }
        }
    }])
    .directive('templateItem', ['$window', '$timeout', 'drawingService', function($window, $timeout, drawingService) {
        return {
            restrict: "A",
            scope: {
                templateItem: "=",
                renderOnResize: "="
            },
            link: function($scope, $element) {
                var render = function() {
                    drawingService.drawTemplateOnCanvas($scope.templateItem, $element[0]);
                };
                if ($scope.renderOnResize) {
                    angular.element($window).on('resize', function() {
                        render();
                    });
                }
                $timeout(render);
            }
        }
    }])
    .directive('resize', ['$window', '$timeout', function($window, $timeout) {
        return {
            restrict: "A",
            scope: {
                resize: "="
            },
            link: function($scope, $element) {
                angular.element($window).on('resize', function() {
                    $scope.resize($element);
                });
                $timeout(function() {
                    $scope.resize($element);
                });
            }
        }
    }])
    .directive('keybind', function() {

        return {
            restrict: 'E',
            replace: true,
            scope: {
                bind: "="
            },
            link: function(scope, element, attrs) {
                scope.getlabels = function() {
                    var html = "";
                    var keys = scope.bind.label.split(",");
                    for (var i = 0; i < keys.length; i++) {
                        if (i != 0) {
                            html += " or ";
                        }
                        html += "<code>" + keys[i] + "</code>"
                    }
                    return html;
                }
            },
            templateUrl: 'templates/keybind.html'
        }

    });

;