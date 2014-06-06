'use strict';

angular.module('keybind', ['ngSanitize'])
    .directive('keybind', function() {

        return {
            restrict: 'E',
            replace: true,
            scope: {
                bind: "=bind"
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


