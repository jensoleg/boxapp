(function () {
    'use strict';

    angular.module('BobbyApp', ['ngCordova', 'monospaced.elastic', 'dx', 'ionic', 'auth0', 'config', 'angular-loading-bar', 'ngAnimate', 'BobbyApp.controllers', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])

        .config([ '$stateProvider', '$urlRouterProvider', '$httpProvider', 'authProvider', 'ENV', 'cfpLoadingBarProvider', 'msdElasticConfig', function ($stateProvider, $urlRouterProvider, $httpProvider, authProvider, ENV, cfpLoadingBarProvider) {

            $stateProvider
                .state('login', {
                    url: '/login',
                    templateUrl: './templates/login.html',
                    controller: 'LoginCtrl'
                })
                .state('app', {
                    url: '/app',
                    abstract: true,
                    templateUrl: "./templates/menu.html",
                    controller: 'InstallationsCtrl',
                    resolve: {
                        installations: ['installationService', function (installationService) {
                            return installationService.all();
                        }]
                    },
                    data: {
                        requiresLogin: true
                    }
                })
                .state('app.main', {
                    url: '/main/:id',
                    views: {
                        'menuContent': {
                            templateUrl: './templates/bobbybox.html',
                            controller: 'BoxCtrl',
                            resolve: {
                                installation: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                    return installationService.get($stateParams.id);
                                }]
                            }
                        }
                    }
                })
                .state('app.map', {
                    url: '/map',
                    views: {
                        'menuContent': {
                            templateUrl: './templates/installations.map.html',
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

            $urlRouterProvider.otherwise('/app/map');

            /* loading bar */
            cfpLoadingBarProvider.latencyThreshold = 100;
            cfpLoadingBarProvider.includeSpinner = false;

        }])

        .run(['auth', '$rootScope', 'ENV', function (auth, $rootScope, ENV) {


            $rootScope.domain = ENV.auth.domain.split('.')[0];

            if (window.localStorage.getItem("profile") !== null) {
                $rootScope.profile = JSON.parse(window.localStorage.profile);
            }

            // This hooks al auth events to check everything as soon as the app starts
            auth.hookEvents();

        }])

        .controller('LoginCtrl', ['$location', 'auth', '$rootScope', 'Settings', function ($location, auth, $rootScope, Settings) {

            var logo = './images/' + $rootScope.domain + '.png';

            auth.signin({
                popup: true,
                showSignup: true,
                standalone: true,
                offline_mode: true,
                enableReturnUserExperience: false,
                icon: logo,
                showIcon: true
            }, function (profile) {

                $rootScope.profile = profile;

                if (profile.app) {
                    Settings.save(profile.app);
                }

                $location.path('/app/installations');

            }, function (error) {
                console.log("There was an error logging in", error);
            });

        }]);

}());