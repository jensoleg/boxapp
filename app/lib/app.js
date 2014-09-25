(function () {
    'use strict';

    angular.module('BobbyApp', ['monospaced.elastic', 'dx', 'ionic', 'auth0', 'config', 'angular-loading-bar', 'ngAnimate', 'BobbyApp.controllers', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])

        .config([ '$stateProvider', '$urlRouterProvider', '$httpProvider', 'authProvider', 'ENV', 'cfpLoadingBarProvider', 'msdElasticConfig', function ($stateProvider, $urlRouterProvider, $httpProvider, authProvider, ENV, cfpLoadingBarProvider, msdElasticConfig) {

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
                    url: '/main/:id',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/bobbybox.html',
                            controller: 'BoxCtrl',
                            resolve: {
                                installation: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                    return installationService.get($stateParams.id);
                                }]
                            }
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
                })
                .state('app.installations', {
                    url: '/installations',
                    views: {
                        'menuContent': {
                            templateUrl: "templates/installations.list.html",
                            controller: 'InstallationsCtrl',
                            resolve: {
                                installations: ['installationService', function (installationService) {
                                    return installationService.all();
                                }]
                            }
                        }
                    }
                })
                .state('app.detail', {
                    url: '/installations/:id',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/installations.devices.html',
                            controller: 'InstallationCtrl',
                            resolve: {
                                installation: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                    return installationService.get($stateParams.id);
                                }]
                            }
                        }
                    }
                })
                .state('app.device', {
                    url: '/installations/:id/device/:deviceid',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/device.html',
                            controller: 'DeviceCtrl',
                            resolve: {
                                device: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                    return installationService.getDevice($stateParams.id, $stateParams.deviceid);
                                }]
                            }
                        }
                    }
                })
                .state('app.control', {
                    url: '/installations/:id/device/:deviceid/control/:controlid',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/control.html',
                            controller: 'ControlDetailCtrl',
                            resolve: {
                                control: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                    return installationService.getControl($stateParams.id, $stateParams.deviceid, $stateParams.controlid);
                                }]
                            }
                        }
                    }
                })
                .state('app.trigger', {
                    url: '/installations/:id/device/:deviceid/trigger/:triggerid',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/trigger.html',
                            controller: 'TriggerDetailCtrl',
                            resolve: {
                                trigger: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                    return installationService.getTrigger($stateParams.id, $stateParams.deviceid, $stateParams.triggerid);
                                }],
                                device: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                    return installationService.getDevice($stateParams.id, $stateParams.deviceid);
                                }]
                            }
                        }
                    }
                })
                .state('app.map', {
                    url: '/map',
                    views: {
                        'menuContent': {
                            templateUrl: 'templates/installations.map.html',
                            controller: 'MapCtrl',
                            resolve: {
                                installations: ['installationService', function (installationService) {
                                    return installationService.all();
                                }]
                            }
                        }
                    }
                });

            authProvider.init({
                domain: ENV.auth.domain,
                clientID: ENV.auth.clientID,
                callbackURL: 'dummy',
                loginState: 'login',
                dict: {signin: {title: ' '}}
            });

            $httpProvider.interceptors.push('authInterceptor');

            $urlRouterProvider.otherwise('/app/installations');

            /* loading bar */
            cfpLoadingBarProvider.latencyThreshold = 500;
            cfpLoadingBarProvider.includeSpinner = false;

            /* elastic textarea */
            //msdElasticConfig.append = '\n';

        }])

        .run(['auth', '$rootScope', '$ionicPlatform', 'cordova', 'statusbar', 'ENV', function (auth, $rootScope, $ionicPlatform, cordova, statusbar, ENV) {

            $ionicPlatform.ready(function () {

                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                /*
                 if (cordova && cordova.plugins.Keyboard) {
                 cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                 }
                 */
                if (statusbar) {
                    statusbar.styleDefault();
                }

            });

            $rootScope.domain = ENV.auth.domain.split('.')[0];

            if (window.localStorage.getItem("profile") !== null) {
                $rootScope.profile = JSON.parse(window.localStorage.profile);
            }

            // This hooks al auth events to check everything as soon as the app starts
            auth.hookEvents();

        }])

        .controller('AppCtrl', ['bobby', '$scope', 'auth', '$state', '$ionicSideMenuDelegate', function (bobby, $scope, auth, $state, $ionicSideMenuDelegate) {

            $scope.signout = function () {
                bobby.setInstallation(null);
                $ionicSideMenuDelegate.toggleLeft();
                auth.signout();
                $state.go('login');
            };

        }])

        .controller('LoginCtrl', ['auth', '$rootScope', '$location', function (auth, $rootScope, $location) {

            var logo = './images/' + $rootScope.domain + '.png';

            auth.signin({
                popup: true,
                showSignup: true,
                standalone: true,
                offline_mode: true,
//                enableReturnUserExperience: false,
                icon: logo,
                showIcon: true
            }, function (profile) {

                $rootScope.profile = profile;

                window.localStorage.profile = JSON.stringify(profile);

                if (profile.app && profile.app.startAt && profile.app.startAt === 'Map') {
                    $location.path('/app/map');
                } else {
                    $location.path('/app/installations');
                }
            }, function (error) {
                console.log("There was an error logging in", error);
            });

        }])

        .controller('SettingsCtrl', ['$scope', 'Settings', 'auth', 'auth0Service', function ($scope, Settings, auth, auth0Service) {

            if (auth.profile.app) {
                $scope.settings = auth.profile.app;
            } else {
                $scope.settings = Settings.getSettings();
            }

            $scope.$on("$destroy", function () {
                Settings.save($scope.settings);
                auth0Service.updateUser(auth.profile.user_id, { app: $scope.settings});
            });

        }]);
}());