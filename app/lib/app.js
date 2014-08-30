(function () {
    'use strict';

    angular.module('BobbyApp', ['dx', 'ionic', 'auth0', 'BobbyApp.controllers', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])

        .config([ '$stateProvider', '$urlRouterProvider', '$httpProvider', 'authProvider', function ($stateProvider, $urlRouterProvider, $httpProvider, authProvider) {

            var //hostname = location.hostname.split('.'),
                realm = 'decoplant';

            //realm = hostname[0];

            //if (realm === 'localhost' || angular.isUndefined(realm)) {

            $httpProvider.defaults.headers.common.realm = realm;
            //}


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
                domain: 'decoplant.auth0.com',
                clientID: 'riQAyvtyyRBNvO9zhRsQAXMEtaQA02uW',
                callbackURL: 'dummy',
                loginState: 'login',
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
            $urlRouterProvider.otherwise("/login");

        }])

        .run(['auth', '$rootScope', '$ionicPlatform', function (auth, $rootScope, $ionicPlatform) {

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
            /*
             var hostname = location.hostname.split('.');
             realm = hostname[0];

             if (realm === 'localhost' || angular.isUndefined(realm)) {
             realm = 'decoplant';
             $rootScope.baseUrl = 'http://' + $location.host() + ':8081/api/';
             $rootScope.hostMQTT = $location.host();
             } else {
             $rootScope.baseUrl = 'http://' + $location.host() + '/api/';
             $rootScope.hostMQTT = 'mqtt.bobbytechnologies.dk';
             }
             */
            $rootScope.baseUrl = 'http://decoplant.bobbytechnologies.dk/api/';
            $rootScope.hostMQTT = 'mqtt.bobbytechnologies.dk';

            $rootScope.realm = 'decoplant';

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

        .controller('LoginCtrl', ['auth', '$state', function (auth) {

//        var logo = '../images/' + $rootScope.realm + '.png';
            var logo = './images/decoplant.png';

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

            // Watch deeply for settings changes, and save them
            // if necessary
            $scope.$watch('settings', function (event) {
                Settings.save(event);
            }, true);

            $scope.saveSettings = function () {
                auth0Service.updateUser(auth.profile.user_id, { app: Settings.getSettings()});
            };
        }]);
}());