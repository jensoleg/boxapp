(function () {
    'use strict';

    angular.module('BobbyApp', ['lumx', 'ngCordova', 'angular-storage', 'angular-jwt', 'auth0', 'ngCookies', 'monospaced.elastic', 'uiGmapgoogle-maps', 'dx', 'ionic', 'config', 'angular-loading-bar', 'ngAnimate', 'BobbyApp.controllers', 'BobbyApp.alarms.controllers', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])
        .config(['$locationProvider', '$compileProvider', 'authProvider', 'jwtInterceptorProvider', '$stateProvider', '$urlRouterProvider', '$httpProvider', '$ionicConfigProvider', 'ENV', 'cfpLoadingBarProvider', 'uiGmapGoogleMapApiProvider',
            function ($locationProvider, $compileProvider, authProvider, jwtInterceptorProvider, $stateProvider, $urlRouterProvider, $httpProvider, $ionicConfigProvider, ENV, cfpLoadingBarProvider, GoogleMapApi) {
console.log('in config')
                $stateProvider
                    .state('login', {
                        url: '/login',
                        templateUrl: 'templates/login.html',
                        controller: 'LoginCtrl'
                    })
                    .state('box', {
                        url: '/main/:id',

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
                    })
                    .state('map', {
                        url: '/map',
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
                    })
                    .state('disqus', {
                        url: '/disqus/:id',
                        templateUrl: 'templates/installation.note.html',
                        controller: 'DisqusCtrl',
                        data: {
                            requiresLogin: true
                        }
                    });

                $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|maps|tel|geo):/);
/*
                $locationProvider.html5Mode(true);
                $locationProvider.hashPrefix('!');
*/
                /* loading bar */


                cfpLoadingBarProvider.latencyThreshold = 300;
                cfpLoadingBarProvider.includeSpinner = true;

                GoogleMapApi.configure({
                    key: 'AIzaSyDYMiqXnyqG-OH4Hp3Cy8pUYqPzZb5ysqM',
                    v: '3.17',
                    libraries: 'places,weather'
                });

                authProvider.init({
                    domain: ENV.auth.domain,
                    clientID: ENV.auth.clientID,
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

                $ionicConfigProvider.views.swipeBackEnabled(true);

                $ionicConfigProvider.backButton.text('');
                $urlRouterProvider.otherwise('/map');

            }])

        .run(['disqus', 'auth', 'store', '$rootScope', 'ENV', 'jwtHelper', '$location', '$document',
            function (disqus, auth, store, $rootScope, ENV, jwtHelper, $location, $document) {
                var profile;

                if (ENV.domainPrefix) {
                    $rootScope.domain = ENV.auth.domain.split('.')[0];
                } else {
                    $rootScope.domain = ENV.name;
                }

                // This events gets triggered on refresh or URL change
                var refreshingToken = null;
                $rootScope.$on('$locationChangeStart', function() {
                    var token = store.get('token'),
                        refreshToken = store.get('refreshToken');
                    if (token) {
                        if (!jwtHelper.isTokenExpired(token)) {
                            if (!auth.isAuthenticated) {
                                auth.authenticate(store.get('profile'), token);
                            }
                        } else {
                            if (refreshToken) {
                                if (refreshingToken === null) {
                                    refreshingToken =  auth.refreshIdToken(refreshToken).then(function(idToken) {
                                        store.set('token', idToken);
                                        auth.authenticate(store.get('profile'), idToken);
                                    }).finally(function() {
                                        refreshingToken = null;
                                    });
                                }
                                return refreshingToken;
                            } else {
                                $location.path('/login');
                            }
                        }
                    } else {
                        $location.path('/login');
                    }

                });
                $document.on("resume", function (event) {
                    $rootScope.$broadcast('message:resume');
                });

                // This hooks al auth events to check everything as soon as the app starts
                auth.hookEvents();

                profile = store.get('profile');
                if (profile !== null) {
                    disqus.signon(profile);
                }

            }])

        .controller('LoginCtrl', ['disqus', 'auth', 'store', '$rootScope', 'ENV', '$location', '$state',
            function (disqus, auth, store, $rootScope, ENV, $location, $state) {

                var logo = './images/' + $rootScope.domain + '.png';

                if (!ENV.domainPrefix) {
                    logo = './images/development.png';
                }
                auth.signin({
                    popup: true,
                    disableSignupAction: true,
                    disableResetAction: false,
                    gravatar: true,
                    closable: false,
                    standalone: true,
                    rememberLastLogin: false,
                    dict: {signin: {title: ' '}},
                    icon: logo,
                    connection: ['Username-Password-Authentication'],
                    sso: false,
                    authParams: {
                        scope: 'openid offline_access',
                        device: 'Mobile device'
                    }
                }, function (profile, id_token, access_token, state, refresh_token) {
                    store.set('profile', profile);
                    store.set('token', id_token);
                    store.set('refreshToken', refresh_token);
                    disqus.signon(profile);

                    $state.go('map');
                }, function (error) {
                    console.log("There was an error logging in", error);
                });

            }]);

}());
