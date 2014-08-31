(function () {
    'use strict';

    angular.module('BobbyApp', ['dx', 'ionic', 'auth0', 'config', 'BobbyApp.controllers', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])

        .config([ '$stateProvider', '$urlRouterProvider', '$httpProvider', 'authProvider', 'ENV', function ($stateProvider, $urlRouterProvider, $httpProvider, authProvider, ENV) {

            $stateProvider
                .state('login', {
                    url: '/login',
                    templateUrl: 'templates/login.html',
                    controller: 'LoginCtrl'
                })
                .state('app', {
                    url: "/app",
                    abstract: true,
                    templateUrl: "templates/menu.html",
                    controller: 'AppCtrl',
                    data: {
                        requiresLogin: true
                    }
                })
                .state('app.main', {
                    url: '/main',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/main.html',
                            controller: 'BoxCtrl'
                        }
                    }
                })
                .state('app.installations', {
                    url: "/installations",
                    views: {
                        'menuContent': {
                            templateUrl: "templates/installations.html",
                            controller: 'InstallationsCtrl'
                        }
                    }
                })
                .state('app.settings', {
                    url: '/settings',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/settings.html',
                            controller: 'SettingsCtrl'
                        }
                    }
                });

            authProvider.init({
                domain: ENV.auth.domain,
                clientID: ENV.auth.clientID,
                callbackURL: location.href,
                loginState: 'login',
                minutesToRenewToken: 60,
                dict: {signin: {title: ' '}}
            });

            authProvider.on('forbidden', function ($location, auth) {
                auth.signout();
                $location.path('/login');
            });

            authProvider.on('loginSuccess', function ($location) {
                $location.path('/app/main');
            });

            authProvider.on('loginFailure', function ($location) {
                $location.path('/login');
            });

            $httpProvider.interceptors.push('authInterceptor');

            $urlRouterProvider.otherwise('/login');

        }])

        .run(['auth', '$rootScope', '$ionicPlatform', 'ENV', function (auth, $rootScope, $ionicPlatform, ENV) {

            $ionicPlatform.ready(function () {

                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                if (window.cordova && window.cordova.plugins.Keyboard) {
                    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                }
                if (window.StatusBar) {
                    // org.apache.cordova.statusbar required
                    StatusBar.styleDefault();
                }

            });

            $rootScope.domain = ENV.auth.domain.split('.')[0];

            // This hooks al auth events to check everything as soon as the app starts
            auth.hookEvents();

        }])

        .controller('AppCtrl', ['$scope', 'auth', '$state', '$ionicSideMenuDelegate', function ($scope, auth, $state, $ionicSideMenuDelegate) {

            $scope.signout = function () {
                $ionicSideMenuDelegate.toggleLeft();
                auth.signout();
                $state.go('login');
            };

        }])

        .controller('LoginCtrl', ['auth', '$rootScope', function (auth, $rootScope) {

            var logo = './images/' + $rootScope.domain + '.png';

            auth.signin({
                popup: true,
                showSignup: true,
                standalone: true,
                offline_mode: true,
                device: 'Phone',
                icon: logo,
                showIcon: true
            });

        }])

        .controller('SettingsCtrl', ['$scope', 'Settings', 'auth', 'auth0Service', function ($scope, Settings, auth, auth0Service) {

            $scope.settings = Settings.getSettings();

            auth0Service.getUser(auth.profile.user_id).then(function (profile) {
                $scope.settings = profile.data.app;
            });

            // Watch deeply for settings changes, and save them if necessary
            $scope.$watch('settings', function (event) {
                Settings.save(event);
            }, true);

            $scope.saveSettings = function () {
                auth0Service.updateUser(auth.profile.user_id, { app: Settings.getSettings()});
            };
        }]);
}());