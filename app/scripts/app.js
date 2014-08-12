angular.module('XivelyApp', ['dx', 'ionic', 'auth0', 'ngCookies', 'XivelyApp.services', 'XivelyApp.filters', 'XivelyApp.directives'])

    .config(function ($stateProvider, $urlRouterProvider, $httpProvider, authProvider) {

        var hostname = location.hostname.split('.'),
            realm = hostname[0];

        if (realm === '127') {
            realm = 'decoplant';
        }

        authProvider.init({
            domain: realm + '.auth0.com',
            clientID: 'riQAyvtyyRBNvO9zhRsQAXMEtaQA02uW',
            callbackURL: location.href,
            loginState: 'login',
            dict: {signin: {title: ' ' /*realm.charAt(0).toUpperCase() + realm.slice(1)*/}}
        });


        authProvider.on('forbidden', function ($state, auth) {
            auth.signout();
            $state.go('login');
        });

        $httpProvider.interceptors.push('authInterceptor');

        $stateProvider
            .state('app', {
                url: "/app",
                abstract: true,
                templateUrl: "templates/menu.html",
                controller: 'AppCtrl'
            })
            .state('app.main', {
                url: '/main',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/main.html',
                        controller: 'WeatherCtrl'
                    }
                },
                data: {
                    requiresLogin: true
                }
            })
            .state('app.installations', {
                url: "/installations",
                views: {
                    'menuContent': {
                        templateUrl: "templates/installations.html",
                        controller: 'InstallationsCtrl'
                    }
                },
                data: {
                    requiresLogin: true
                }
            })
            .state('app.device', {
                url: "/device/:deviceid",
                views: {
                    'menuContent': {
                        templateUrl: "templates/device.html",
                        controller: 'DeviceCtrl'
                    }
                },
                data: {
                    requiresLogin: true
                }
            })
            .state('app.settings', {
                url: '/settings',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/settings.html',
                        controller: 'SettingsCtrl'
                    }
                },
                data: {
                    requiresLogin: true
                }
            })
            .state('app.login', {
                url: '/login',
                views: {
                    'menuContent': {
                        controller: 'LoginCtrl',
                        templateUrl: 'templates/login.html'
                    }
                },
                pageTitle: 'Login'
            })

        $urlRouterProvider.otherwise("app/login");

    })

    .run(function (auth, $http, $rootScope) {

        var hostname = location.hostname.split('.'),
            realm = hostname[0];

        if (realm === '127') {
            realm = 'decoplant';
        }
        $rootScope.realm = realm;
        // This hooks al auth events to check everything as soon as the app starts
        auth.hookEvents();
    })

    .filter('int', function () {
        return function (v) {
            return parseInt(v) || '';
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

    .controller('AppCtrl', function ($scope, auth, $state, $ionicModal, $ionicSideMenuDelegate) {

        $scope.signout = function () {
            $ionicSideMenuDelegate.toggleLeft();
            auth.signout();
            $state.go('app.login');
        };

        $scope.settings = function () {
            $ionicSideMenuDelegate.toggleLeft();
            $state.go('app.settings');
        };

        $scope.installations = function () {
            $ionicSideMenuDelegate.toggleLeft();
            $state.go('app.installations');
        };

        $scope.home = function () {
            $ionicSideMenuDelegate.toggleLeft();
            $state.go('app.main');
        };

    })

    .controller('LoginCtrl', function (auth, $state, $rootScope) {

        var logo = '../images/' + $rootScope.realm + '.png'
        auth.signin({
            popup: true,
            showSignup: false,
            icon: logo,
            showIcon: true
        }).then(function (profile) {
            $state.go('app.main');
        }, function () {
            console.log("There was an error signin in");
        });

    })

    .controller('LogoutCtrl', function (auth, $state) {
        auth.signout();
        $state.go('app.login');
    })

    .controller('InstallationsCtrl', function ($scope, $rootScope) {

        $scope.data = {};

        $scope.installationer = [
            {deviceId: 'K0NppbqG6awI', place: 'Reception', location: 'Comwell Aarhus'},
            {deviceId: 'K0NppbqG6awI', place: 'Lounge', location: 'Comwell Aarhus'},
            {deviceId: 'K0NppbqG6awI', place: 'Restaurant', location: 'Comwell Aarhus'},
            {deviceId: 'K0NppbqG6awI', place: 'Reception', location: 'Bella Sky Comwell'},
            {deviceId: 'K0NppbqG6awI', place: 'Shop', location: 'Decoplant'}
        ];

        $scope.clearSearch = function() {
            $scope.data.searchQuery = '';
        };

    })

    .controller('DeviceCtrl', function ($scope, $stateParams) {
    })

    .controller('WeatherCtrl', function ($window, $ionicSideMenuDelegate, $location, auth, $scope, $timeout, $state, $ionicPlatform, $ionicScrollDelegate, $ionicNavBarDelegate, $ionicLoading, $ionicSlideBoxDelegate, $rootScope, Settings, bobby, Weather, Geo, Flickr, $ionicModal, focus) {
        var _this = this;

        ionic.Platform.ready(function () {
            // Hide the status bar
            if (ionic.Platform.isIOS())
                StatusBar.hide();
        });

        $rootScope.$on('$locationChangeStart', function (event, newUrl, oldUrl) {
            event.preventDefault();
        });

        $scope.installations = [
            {deviceId: 'K0NppbqG6awI', place: 'Reception', location: 'Comwell Aarhus'},
            {deviceId: 'K0NppbqG6awI', place: 'Lounge', location: 'Comwell Aarhus'},
            {deviceId: 'K0NppbqG6awI', place: 'Restaurant', location: 'Comwell Aarhus'},
            {deviceId: 'K0NppbqG6awI', place: 'Reception', location: 'Bella Sky Comwell'},
            {deviceId: 'K0NppbqG6awI', place: 'Shop', location: 'Decoplant'}
        ];

        $scope.installation = $scope.installations[0];


        $scope.timescale = [
            {value: 300, interval: 0, text: '5 minutes', type: 'Raw datapoints'},
            {value: 1800, interval: 0, text: '30 minutes', type: 'Raw datapoints'},
            {value: 3600, interval: 0, text: '1 hours', type: 'Raw datapoints'},
            {value: 21600, interval: 300, text: '6 hours', type: 'Averaged datapoints'},
            {value: 86400, interval: 300, text: '1 day', type: 'Averaged datapoints'},
            {value: 604800, interval: 10800, text: '7 days', type: 'Averaged datapoints'},
            {value: 2592000, interval: 86400, text: '1 month', type: 'Averaged datapoints'},
            {value: 7776000, interval: 86400, text: '3 months', type: 'Averaged datapoints'}
        ];

        /* get graf time scale form settings */
        var ts = bobby.getTimeScale();
        $scope.timeScale = _.find($scope.timescale, { 'value': ts.value });

        $scope.activeBgImageIndex = 0;
        $rootScope.currentDataStream = {};
        $rootScope.activeStream = null;
        $scope.activeStreamReady = false;

        $scope.gaugeScale = {};
        $scope.gaugeRange = {};
        $scope.gaugeValue = null;
        $scope.gaugeSubvalues = [];
        $scope.viewXively = false;

        $scope.gaugeSettings =
        {
            subvalues: $scope.gaugeSubvalues,
            scale: $scope.gaugeScale,
            rangeContainer: $scope.gaugeRange,
            tooltip: { enabled: true },
            value: $scope.gaugeValue,
            subvalueIndicator: {
                offset: -10 }
        };

        $scope.chartLabel =
        {
            argumentType: 'datetime',
            label: { format: 'H:mm', color: 'white'},
            valueMarginsEnabled: false,
            tick: {
                visible: true
            }
        };

        $scope.chartData = [];

        $scope.chartSettings =
        {
            dataSource: $scope.chartData,
            argumentAxis: $scope.chartLabel,
            valueAxis: {
                valueMarginsEnabled: false,
                tick: {
                    visible: true
                },
                type: 'continuous',
                valueType: 'numeric',
                tickInterval: 0.5,
                grid: {visible: false},
                //min: 0,
                label: {visible: true, color: 'white'}
            },
            series: [
                {
                    argumentField: 'timestamp',
                    valueField: 'value',
                    type: 'line',
                    point: { visible: false },
                    style: { opacity: 0.70 },
                    color: 'rgba(255,255,255,0.9)',
                    hoverStyle: { color: 'rgb(74, 135, 238)' }
                }
            ],
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
            /*
             loadingIndicator: {
             text: "Loading Xively data ...",
             backgroundColor: ""
             }
             */
        };

        $scope.toggleView = function (index) {
            //$scope.viewXively = !$scope.viewXively;
            $ionicScrollDelegate.$getByHandle('details').scrollBottom();
        };

        $scope.selectDevice = function (device) {
            $scope.refreshData(true);
        };

        $scope.selectAction = function (time) {
            $scope.timeScale = _.find($scope.timescale, { 'value': time.value });
            bobby.setTimeScale($scope.timeScale);
            $scope.loadXively = true;
        };
        /*
         $scope.showSettings = function () {
         if (!$scope.settingsModal) {
         // Load the modal from the given template URL
         $ionicModal.fromTemplateUrl('settings.html', function (modal) {
         $scope.settingsModal = modal;
         $scope.settingsModal.show();
         }, {
         // The animation we want to use for the modal entrance
         animation: 'slide-in-up'
         });
         } else {
         $scope.settingsModal.show();
         }
         };
         */
        $scope.showData = function (stream) {
            if (!(angular.isUndefined($rootScope.activeStream) || $rootScope.activeStream === null) && $rootScope.activeStream.id == $rootScope.datastreams[stream].id) {
                $rootScope.activeStream = null;
                $scope.activeStreamReady = false;
                $scope.chartData = null;
                $ionicScrollDelegate.$getByHandle('details').scrollBottom();
            }
            else {
                //$("#chartContainer").dxChart('instance').showLoadingIndicator();
                $scope.loadXively = true;
                bobby.getStream(stream);
                $rootScope.activeStream = $rootScope.datastreams[stream];
            }
        };

        $scope.showValueCtrl = function (stream) {
            $rootScope.datastreams[stream].isSelecting = true;
            $rootScope.datastreams[stream].newValue = $rootScope.datastreams[stream].current_value;
            focus('input-time');
        };

        $scope.setValueCtrl = function (stream) {
            $rootScope.datastreams[stream].isSelecting = false;
            $rootScope.datastreams[stream].current_value = $rootScope.datastreams[stream].newValue;
            bobby.publish(stream, $rootScope.datastreams[stream].current_value);
        };

        $scope.closeValueCtrl = function (stream) {
            $rootScope.datastreams[stream].isSelecting = false;
            $rootScope.datastreams[stream].newValue = $rootScope.datastreams[stream].current_value;
        };

        $scope.toggleCtrlSwitch = function (stream) {
            bobby.publish(stream, $rootScope.datastreams[stream].current_value);
        };

        $rootScope.$watchCollection('currentDataStream.data', function (data) {
            if (angular.isDefined(data) && data.length > 0 && $rootScope.activeStream != null) {

                if ($scope.timeScale.value <= 86400)
                    $scope.chartLabel.label = { format: 'H:mm', color: 'white'};
                else if ($scope.timeScale.value <= 604800)
                    $scope.chartLabel.label = { format: 'ddd', color: 'white'};
                else if ($scope.timeScale.value <= 2592000)
                    $scope.chartLabel.label = { format: 'dd-MM', color: 'white'};
                else
                    $scope.chartLabel.label = { format: 'MMM', color: 'white'};
                $scope.chartData = data;
                $scope.chartSettings.dataSource = $scope.chartData;
                _this.updateGauge($rootScope.activeStream, data[data.length - 1].value);

            }
            else {
                $scope.chartData = [];
                $scope.gaugeValue = null;
                $scope.chartSettings.dataSource = $scope.chartData;
                $scope.gaugeSettings.value = $scope.gaugeValue;
            }
            $scope.loadXively = false;
            $scope.activeStreamReady = $rootScope.activeStream != null;
            $ionicSlideBoxDelegate.$getByHandle('charts').update();
            $ionicScrollDelegate.$getByHandle('details').scrollBottom();
        });

        this.updateGauge = function (stream, newValue) {
            $scope.gaugeScale =
            {
                startValue: stream.minDomain, endValue: stream.maxDomain,
                majorTick: { tickInterval: 5 },
                minorTick: {
                    visible: true,
                    tickInterval: 1
                },
                label: {
                    customizeText: function (arg) {
                        return arg.valueText;
                    }
                },
                valueType: "numeric"
            };

            $scope.gaugeRange =
            {
                ranges: [
                    { startValue: stream.minDomain, endValue: stream.minCritical, color: '#0077BE'},
                    { startValue: stream.minCritical, endValue: stream.maxCritical, color: '#E6E200'},
                    { startValue: stream.maxCritical, endValue: stream.maxDomain, color: '#77DD77'}
                ],
                offset: 5
            };

            $scope.gaugeValue = newValue;

            if (stream.min_value && stream.max_value) {
                $scope.gaugeSubvalues = [stream.min_value, stream.max_value];
                $scope.gaugeSettings.subvalues = $scope.gaugeSubvalues;
            }

            $scope.gaugeSettings.scale = $scope.gaugeScale;
            $scope.gaugeSettings.rangeContainer = $scope.gaugeRange;
            $scope.gaugeSettings.value = $scope.gaugeValue;
        };


        $scope.$on('refreshDone', function () {
            $timeout(function () {
                console.log('refresh Done');
                $rootScope.$broadcast('scroll.refreshComplete');
                $ionicScrollDelegate.$getByHandle('details').scrollBottom();
            }, 100);
        });


        this.getBackgroundImage = function (lat, lng, locString) {
            Flickr.search(locString, lat, lng).then(function (resp) {
                var photos = resp.photos;
                if (photos.photo.length) {
                    $scope.bgImages = photos.photo;
                    _this.cycleBgImages();
                }
            }, function (error) {
                console.error('Unable to get Flickr images', error);
            });
        };

        this.getForecast = function (lat, lng) {
            Weather.getForecast(lat, lng).then(function (resp) {
                $scope.forecast = resp.list;
            }, function (error) {
                alert('Unable to get forecast. Try again later');
                console.error(error);
            });

            Weather.getHourly(lat, lng).then(function (resp) {
                $scope.hourly = resp.list;
            }, function (error) {
                alert('Unable to get forecast. Try again later.');
                console.error(error);
            });
        };

        this.getCurrent = function (lat, lng) {

            Weather.getAtLocation(lat, lng).then(function (resp) {
                $scope.current = resp;
                _this.getForecast(resp.coord.lat, resp.coord.lon);
            }, function (error) {
                alert('Unable to get current conditions');
                console.error(error);
            });
        };

        this.cycleBgImages = function () {
            $timeout(function cycle() {
                if ($scope.bgImages && (Settings.get('useFlickr'))) {
                    $scope.activeBgImage = $scope.bgImages[$scope.activeBgImageIndex++ % $scope.bgImages.length];
                }
                $timeout(cycle, 120000);
            });
        };

        $scope.refreshData = function (init) {

            if (init) {
                $scope.loading = $ionicLoading.show({
                    content: 'Finding  location... <i class="icon ion-loading-c">',
                    showBackdrop: true,
                    animation: 'fade-in'
                });
            }

            bobby.refresh(init).then(function (location) {
                if (location) {

                    _this.getCurrent(location.lat, location.lng);
                    Geo.reverseGeocode(location.lat, location.lng).then(function (locString) {
                        $scope.currentCity = locString;
                        if (Settings.get('useFlickr'))
                            _this.getBackgroundImage(location.lat, location.lng, locString);
                        else
                            $scope.activeBgImage = null;

                        //$rootScope.$broadcast('scroll.refreshComplete');
                        $scope.$broadcast('refreshComplete');

                        $scope.loading.hide();
                    });
                } else
                    Geo.getLocation().then(function (position) {
                        var lat = position.coords.latitude;
                        var lng = position.coords.longitude;

                        _this.getCurrent(lat, lng);

                        Geo.reverseGeocode(lat, lng).then(function (locString) {
                            $scope.currentCity = locString;
                            if (Settings.get('useFlickr'))
                                _this.getBackgroundImage(lat, lng, locString);
                            else
                                $scope.activeBgImage = null;

                        });
                        //$rootScope.$broadcast('scroll.refreshComplete');
                        $scope.$broadcast('refreshComplete');

                        $scope.loading.hide();

                    }, function (error) {
                        alert('Unable to get current location: ' + error);
                        $rootScope.$broadcast('scroll.refreshComplete');
                        $scope.$broadcast('refreshComplete');
                        $scope.loading.hide();
                    });
            });

        };

        $scope.refreshData(true);

    }).
    controller('SettingsCtrl', function ($scope, $state, Settings, scandit, auth, auth0Service) {
        var _this = this;

        $scope.settings = Settings.getSettings();
        auth0Service.getUser(auth.profile.user_id).then(function (profile) {
            $scope.settings = profile.data.app;
        });

        // Watch deeply for settings changes, and save them
        // if necessary
        $scope.$watch('settings', function (event) {
            //Settings.set
            Settings.save(event);
        }, true);

        $scope.saveSettings = function () {
            auth0Service.updateUser(auth.profile.user_id, { app: Settings.getSettings()}).then(function () {
            });
        };

        _this.success = function (resultArray) {
            $scope.settings.deviceId = resultArray[0];
        };

        _this.failure = function (error) {
            // alert("Failed: " + error);
        };

        $scope.scan = function () {
            scandit.scan(_this.success, _this.failure);
        };

    });
