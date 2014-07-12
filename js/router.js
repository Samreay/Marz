angular.module('routerZ', ['ui.router'])
    .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/overview');
        $stateProvider
            .state('overview', {
                url: '/overview',
                templateUrl: 'templates/overview.html',
                controller: 'OverviewController'
            })
            .state('detailed', {
                url: '/detailed',
                templateUrl: 'templates/detailed.html',
                controller: 'DetailedController'

            })
            .state('templates', {
                url: '/templates',
                templateUrl: 'templates/templates.html',
                controller: 'TemplatesController'

            })
            .state('settings', {
                url: '/settings',
                templateUrl: 'templates/settings.html',
                controller: 'SettingsController'

            })
           .state('usage', {
                url: '/usage',
                templateUrl: 'templates/usage.html',
                controller: 'UsageController'
           });
    }]);