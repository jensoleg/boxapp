angular.module('BobbyApp', ['dx', 'ionic', 'auth0', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])

    .config([ '$stateProvider', '$urlRouterProvider', '$httpProvider', 'authProvider', function ($stateProvider, $urlRouterProvider, $httpProvider, authProvider) {

        var hostname = location.hostname.split('.'),
            realm = hostname[0];

        //if (realm === 'localhost' || angular.isUndefined(realm)) {
        realm = 'decoplant';
        $httpProvider.defaults.headers.common['realm'] = realm;
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

        authProvider.on('forbidden', function ($state, auth) {
            auth.signout();
            $location.path('/login');
        });

        authProvider.on('loginSuccess', function ($location) {
            $location.path('/app/main');
        });

        authProvider.on('loginFailure', function ($location, error) {
            $location.path('/login');
        });

        $httpProvider.interceptors.push('authInterceptor');
        $urlRouterProvider.otherwise("/login");

    }])

    .run(['auth', '$rootScope', '$location', '$ionicPlatform', function (auth, $rootScope, $location, $ionicPlatform) {

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

        var hostname = location.hostname.split('.'),
            realm = hostname[0];
        /*

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

    .
    filter('int', function () {
        return function (v) {
            return parseInt(v) || '';
        };
    })

    .filter('datastreamFilter', function () {
        return function (items, device) {
            var filtered = [];
            if (!device) {
                return items;
            }

            angular.forEach(items, function (item) {
                if (item.deviceid === device) {
                    filtered.push(item);
                }
            });

            return filtered;
        };
    })

    .filter('orderObjectBy', function () {
        return function (items, field, reverse) {
            var filtered = [];
            angular.forEach(items, function (item) {
                filtered.push(item);
            });
            filtered.sort(function (a, b) {
                return a[field].localeCompare(b[field]);
            });
            filtered.sort();
            if (reverse) filtered.reverse();
            return filtered;
        };
    })

    .controller('AppCtrl', ['$scope', 'auth', '$state', '$ionicModal', '$ionicSideMenuDelegate', function ($scope, auth, $state, $ionicModal, $ionicSideMenuDelegate) {

        $scope.signout = function () {
            $ionicSideMenuDelegate.toggleLeft();
            auth.signout();
            $state.go('login');
        };

    }])

    .controller('LoginCtrl', ['auth', '$state', '$rootScope', function (auth, $state, $rootScope) {

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
            }
        );

    }])

    .controller('InstallationsCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {

        $scope.data = {};

        console.log($rootScope.installations);

        $scope.clearSearch = function () {
            $scope.data.searchQuery = '';
        };

    }])

    .controller('BoxCtrl', ['$location', '$scope', '$rootScope', 'Settings', 'bobby', 'focus', function ($location, $scope, $rootScope, Settings, bobby, focus) {
        var _this = this;

        $scope.domainName = $rootScope.realm.charAt(0).toUpperCase() + $rootScope.realm.slice(1);

        $rootScope.installations = [];

        $scope.timescale = [
            {value: 300, interval: 1, text: '5 minutes', type: 'Raw datapoints'},
            {value: 1800, interval: 1, text: '30 minutes', type: 'Raw datapoints'},
            {value: 3600, interval: 1, text: '1 hours', type: 'Raw datapoints'},
            {value: 21600, interval: 1, text: '6 hours', type: 'Raw datapoints'},
            {value: 86400, interval: 60, text: '1 day', type: 'Averaged datapoints'},
            {value: 604800, interval: 3600, text: '7 days', type: 'Averaged datapoints'},
            {value: 2592000, interval: 3600, text: '1 month', type: 'Averaged datapoints'},
            {value: 7776000, interval: 3600, text: '3 months', type: 'Averaged datapoints'}
        ];

        /* get graf time scale form settings */
        var ts = bobby.getTimeScale();
        $scope.timeScale = _.find($scope.timescale, { 'value': ts.value });

        $rootScope.currentDataStream = {};
        $rootScope.activeStream = null;
        $scope.activeStreamReady = false;

        $scope.viewXively = false;
        $scope.shownDevice = [];

        $scope.chartLabel =
        {
            argumentType: 'datetime',
            label: { format: 'H:mm',
                font: { color: 'white'}
            },
            valueMarginsEnabled: false,
            tick: {
                visible: true
            }
        };

        $scope.series = [
            {
                argumentField: 'timestamp',
                valueField: 'value',
                type: 'area',
                point: { visible: false },
                opacity: 1.00,
                tick: {
                    visible: true,
                    color: 'white'
                },
                color: 'rgb(74, 135, 238)',
                hoverStyle: { color: 'rgb(74, 135, 238)' }
            }
        ];

        $scope.chartData = [];

        $scope.chartSettings =
        {
            dataSource: $scope.chartData,
            argumentAxis: $scope.chartLabel,
            valueAxis: {
                valueMarginsEnabled: false,
                tick: {
                    visible: true,
                    color: 'white'
                },
                showZero: false,
                type: 'continuous',
                valueType: 'numeric',
                grid: {visible: false},
                label: { font: { color: 'white'}}
            },
            series: $scope.series,
            legend: {
                visible: false
            },
            tooltip: {
                enabled: true
            },
            crosshair: {
                enabled: true,
                horizontalLine: {
                    color: 'white',
                    dashStyle: 'longDash'
                },
                verticalLine: {
                    color: 'white',
                    dashStyle: 'dotdashdot'
                },
                opacity: 0.8
            }
        };

        $scope.toggleDevice = function (device) {
            if ($scope.isDeviceShown(device)) {
                $scope.shownDevice[device] = false;
            } else {
                $scope.shownDevice[device] = true;
            }
        };

        $scope.isDeviceShown = function (device) {
            return $scope.shownDevice[device];
        };

        $scope.selectDevice = function (device) {
            $scope.refreshData(true);
        };

        $scope.selectAction = function (time) {
            $scope.timeScale = _.find($scope.timescale, { 'value': time.value });
            bobby.setTimeScale($scope.timeScale);
            $scope.loadXively = true;
        };

        $scope.showData = function (device, stream) {
            if (!(angular.isUndefined($rootScope.activeStream) || $rootScope.activeStream === null) &&
                $rootScope.activeStream.id === $rootScope.datastreams[device + stream].id &&
                $rootScope.activeStream.deviceid === $rootScope.datastreams[device + stream].deviceid) {
                $rootScope.activeStream = null;
                $scope.activeStreamReady = false;
                $scope.chartData = null;
            }
            else {
                $scope.loadXively = true;
                bobby.getStream(device, stream);
                $rootScope.activeStream = $rootScope.datastreams[device + stream];
                $rootScope.activeStream.id = $rootScope.datastreams[device + stream].id;
                $rootScope.activeStream.deviceid = $rootScope.datastreams[device + stream].deviceid;
            }
        };

        $scope.showValueCtrl = function (device, stream) {
            $rootScope.datastreams[device + stream].isSelecting = true;
            $rootScope.datastreams[device + stream].newValue = $rootScope.datastreams[device + stream].current_value;
            focus('input-time');
        };

        $scope.setValueCtrl = function (device, stream) {
            $rootScope.datastreams[device + stream].isSelecting = false;
            $rootScope.datastreams[device + stream].current_value = $rootScope.datastreams[device + stream].newValue;
            bobby.publish(stream, $rootScope.datastreams[device + stream].current_value);
        };

        $scope.closeValueCtrl = function (device, stream) {
            $rootScope.datastreams[device + stream].isSelecting = false;
            $rootScope.datastreams[device + stream].newValue = $rootScope.datastreams[device + stream].current_value;
        };

        $scope.toggleCtrlSwitch = function (device, stream) {
            bobby.publish(stream, $rootScope.datastreams[device + stream].current_value);
        };

        $rootScope.$watchCollection('currentDataStream.data', function (data) {
            $scope.loadXively = false;
            if (angular.isDefined(data) && data.length > 0 && $rootScope.activeStream !== null) {

                if ($scope.timeScale.value <= 86400)
                    $scope.chartLabel.label = { format: 'H:mm', font: { color: 'white'}};
                else if ($scope.timeScale.value <= 604800)
                    $scope.chartLabel.label = { format: 'ddd', font: { color: 'white'}};
                else if ($scope.timeScale.value <= 2592000)
                    $scope.chartLabel.label = { format: 'dd-MM', font: { color: 'white'}};
                else
                    $scope.chartLabel.label = { format: 'MMM', font: { color: 'white'}};

                if ($rootScope.activeStream.id === 'online') {
                    $scope.series[0].type = 'stepLine';
                } else {
                    $scope.series[0].type = 'area';
                }
                $scope.chartSettings.series = $scope.series;

                $scope.chartData = data;
                $scope.chartSettings.dataSource = $scope.chartData;

                /*
                 _this.updateGauge($rootScope.activeStream, data[data.length - 1].value);
                 */
            }
            else {
                $scope.chartData = [];
                $scope.chartSettings.dataSource = $scope.chartData;
                /*
                 $scope.gaugeValue = null;
                 $scope.gaugeSettings.value = $scope.gaugeValue;
                 */
            }

            $scope.activeStreamReady = $rootScope.activeStream !== null;
        }, true);

        $scope.refreshData = function (init) {

            bobby.refresh(init).then(function (location) {
                $scope.installation = $rootScope.installations[0];
                $scope.$broadcast('refreshComplete');
            });

        };

        $scope.refreshData(true);

    }]).

    controller('SettingsCtrl', ['$scope', 'Settings', 'auth', 'auth0Service', function ($scope, Settings, auth, auth0Service) {
        var _this = this;

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
            auth0Service.updateUser(auth.profile.user_id, { app: Settings.getSettings()}).then(function () {
            });
        };
    }]);
