/** All this file does is declare the primary application module in angularjs which is then used in all other files.
*
* Specifically, it is saying that the module named 'marz' has dependencies on all the modules listed after it in the array.
*
**/

var app = angular.module('marz', ['routerZ', 'controllersZ', 'directivesZ', 'toggle-switch']);

