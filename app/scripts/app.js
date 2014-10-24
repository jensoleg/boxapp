(function () {
    'use strict';

    angular.module('BobbyApp', ['angular-storage', 'angular-jwt', 'auth0', 'ngCookies', 'ngCordova', 'monospaced.elastic', 'google-maps'.ns(), 'dx', 'ionic', 'config', 'angular-loading-bar', 'ngAnimate', 'BobbyApp.controllers', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])
        .config(['authProvider', 'jwtInterceptorProvider', '$stateProvider', '$urlRouterProvider', '$httpProvider', 'ENV', 'cfpLoadingBarProvider', 'GoogleMapApiProvider'.ns(),
            function (authProvider, jwtInterceptorProvider, $stateProvider, $urlRouterProvider, $httpProvider, ENV, cfpLoadingBarProvider, GoogleMapApi) {

                $stateProvider
                    .state('login', {
                        url: '/login',
                        templateUrl: 'templates/login.html',
                        controller: 'LoginCtrl'
                    })
                    .state('app', {
                        url: '/app',
                        abstract: true,
                        templateUrl: 'templates/menu.html',
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
                                templateUrl: 'templates/bobbybox.html',
                                controller: 'BoxCtrl',
                                resolve: {
                                    installation: ['$stateParams', 'installationService', function ($stateParams, installationService) {
                                        return installationService.get($stateParams.id);
                                    }]
                                },
                                data: {
                                    requiresLogin: true
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
                                },
                                data: {
                                    requiresLogin: true
                                }
                            }
                        }
                    });


                /* loading bar */

                cfpLoadingBarProvider.latencyThreshold = 100;
                cfpLoadingBarProvider.includeSpinner = false;

                GoogleMapApi.configure({
                    key: 'AIzaSyDYMiqXnyqG-OH4Hp3Cy8pUYqPzZb5ysqM',
                    v: '3.18',
                    libraries: 'places,weather'
                });

                authProvider.init({
                    clientID: ENV.auth.clientID,
                    domain: ENV.auth.domain,
                    loginState: 'login'
                });


                jwtInterceptorProvider.tokenGetter = ['store', 'jwtHelper', 'auth', function (store, jwtHelper, auth) {
                    var idToken = store.get('token');
                    var refreshToken = store.get('refreshToken');
                    if (!idToken || !refreshToken) {
                        return null;
                    }
                    if (jwtHelper.isTokenExpired(idToken)) {
                        return auth.refreshIdToken(refreshToken).then(function (idToken) {
                            store.set('token', idToken);
                            return idToken;
                        });
                    } else {
                        return idToken;
                    }
                }];

                $httpProvider.interceptors.push('jwtInterceptor');

                $urlRouterProvider.otherwise('/app/map');
            }])

        .run(['auth', 'store', '$rootScope', 'ENV', 'jwtHelper', '$location',
            function (auth, store, $rootScope, ENV, jwtHelper, $location) {

                if (ENV.domainPrefix) {
                    $rootScope.domain = ENV.auth.domain.split('.')[0];
                } else {
                    $rootScope.domain = ENV.name;
                }

                $rootScope.$on('$locationChangeStart', function () {
                    if (!auth.isAuthenticated) {
                        var token = store.get('token');
                        var refreshToken = store.get('refreshToken');
                        if (token) {
                            if (!jwtHelper.isTokenExpired(token)) {
                                auth.authenticate(store.get('profile'), token);
                            } else {
                                if (refreshToken) {
                                    return auth.refreshIdToken(refreshToken).then(function (idToken) {
                                        store.set('token', idToken);
                                        auth.authenticate(store.get('profile'), idToken);
                                    });
                                } else {
                                    $location.path('/login');
                                }
                            }
                        }
                    }
                });

                // This hooks al auth events to check everything as soon as the app starts
                auth.hookEvents();

            }])

        .controller('LoginCtrl', ['$log', '$location', 'auth', 'store', '$rootScope', 'ENV',
            function ($log, $location, auth, store, $rootScope, ENV) {

                var logo = './images/' + $rootScope.domain + '.png';

                if (!ENV.domainPrefix) {
                    logo = './images/development.png';
                }

                $log.debug('login');

                auth.signin({
                    popup: true,
                    disableSignupAction: true,
                    disableResetAction: false,
                    gravatar: true,
                    closable: false,
                    standalone: true,
                    rememberLastLogin: true,
                    dict: {signin: {title: ' '}},
                    icon: logo,
                    authParams: {
                        scope: 'openid offline_access',
                        device: 'Mobile device'
                    }
                }, function (profile, id_token, access_token, state, refresh_token) {

                    $log.info('login ok ' + profile.name);

                    store.set('profile', profile);
                    store.set('token', id_token);
                    store.set('refreshToken', refresh_token);

                    $location.path('/app/installations');

                }, function (error) {
                    console.log("There was an error logging in", error);
                });

            }]);

}());
