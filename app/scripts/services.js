'use strict';

angular.module('XivelyApp.services', ['ngResource'])

    .constant('DEFAULT_SETTINGS', {
        'tempUnits': 'c',
        'timeScale': {value: 86400, interval: 60, text: '1 day', type: 'Averaged datapoints'}
    })

    .factory('cordova', function () {
        return window.cordova; // assumes cordova has already been loaded on the page
    })

    .factory('Settings', function ($rootScope, DEFAULT_SETTINGS) {
        var _settings = {};
        try {
            _settings = JSON.parse(window.localStorage['settings']);
        } catch (e) {
        }

        // Just in case we have new settings that need to be saved
        _settings = angular.extend({}, DEFAULT_SETTINGS, _settings);

        // upgrade silently
        var ts = _settings.timeScale;
        if (typeof ts !== 'object')
            _settings.timeScale = DEFAULT_SETTINGS.timeScale;

        var obj = {
            getSettings: function () {
                return _settings;
            },
            // Save the settings to localStorage
            save: function () {
                window.localStorage.settings = JSON.stringify(_settings);
                $rootScope.$broadcast('settings.changed', _settings);
            },
            // Get a settings val
            get: function (k) {
                return _settings[k];
            },
            // Set a settings val
            set: function (k, v) {
                _settings[k] = v;
                this.save();
            },

            getTempUnits: function () {
                return _settings['tempUnits'];
            }
        };

        // Save the settings to be safe
        obj.save(_settings);
        return obj;
    })

    .factory('bobby', function ($q, $rootScope, $http, auth, $location, Settings) {

        var _this = this,
            bobby = {},
            client = {},
            controlTypes = ['data', 'ctrlValue', 'ctrlSwitch', 'ctrlTimeValue'],
            currentDevice = null;

        $rootScope.devices = {};
        $rootScope.datastreams = {};


        client = mqtt.createClient(8080, $rootScope.hostMQTT, {"username": "JWT/" + $rootScope.realm, "password": auth.idToken});

        // recieve message on current device subscription
        client.on('message', function (topic, message) {
            if (currentDevice) {
                var topics = topic.split('/'),
                    stream = topics[3];
                $rootScope.datastreams[stream].newValue = message;
                $rootScope.datastreams[stream].current_value = message;

                /*  check trigger */
                var streamTriggers,
                    operators = {
                        lt: '<',
                        lte: '<=',
                        gt: '>',
                        gte: '>=',
                        eq: '=='
                    };

                if (currentDevice.triggers) {
                    streamTriggers =_.filter(currentDevice.triggers, { 'stream_id': stream });
                }

                _.forEach(streamTriggers, function(trigger) {

                    if (trigger) {
                        $rootScope.datastreams[stream].triggered = eval(message + operators[trigger.trigger_type] + trigger.threshold_value);
                    }

                    // update scoped streams
                    if (stream === $rootScope.currentDataStream.id) {
                        var now = new Date();
                        $rootScope.currentDataStream.current_value = message;
                        $rootScope.currentDataStream.data.push({ timestamp: now, value: message });
                        $rootScope.$apply();
                    }
                });
            }
        });

        /* set current device */
        bobby.setDevice = function (newDevice) {

            // remove current subscriptions
            if (currentDevice) {
                angular.forEach(currentDevice.controls, function (stream) {
                    client.unsubscribe('/' + $rootScope.realm + '/' + currentDevice.id + "/" + stream.id);
                });
            }

            currentDevice = newDevice;

            // set controls
            angular.forEach(currentDevice.controls, function (stream) {
                // retrieve last value
                $http.get($rootScope.baseUrl + 'broker/' + currentDevice.id + '/' + stream.id)
                    .success(function (data) {
                        stream.newValue = data.data.payload;
                        stream.current_value = data.data.payload;
                        $rootScope.datastreams[stream.id] = stream;
                        $rootScope.datastreams[stream.id].triggered = false;

                        if (stream.id === $rootScope.currentDataStream.id) {
                            $rootScope.currentDataStream.current_value = stream.current_value;
                        }

                        client.subscribe('/' + $rootScope.realm + '/' + currentDevice.id + '/' + stream.id);
                    });
            });
        };

        // Publish value on current device
        bobby.publish = function (topic, payload) {
            client.publish('/' + $rootScope.realm + '/' + currentDevice.id + "/" + topic, payload, {retain: true});
        };

        // get time series values
        bobby.getStream = function (stream, options) {

            var timeScale = Settings.get('timeScale');
                options = {limit: 100,
                from: moment().subtract('s', timeScale.value).toJSON(),
                to: moment().toJSON(),
                interval: timeScale.interval
            };

            $http.get($rootScope.baseUrl + 'datastreams/' + currentDevice.id + '/' + stream, {
                params: options
            }).success(function (data) {
                $rootScope.currentDataStream.data = data.data;
                $rootScope.currentDataStream.id = stream;
            });
        };

        bobby.setTimeScale = function (timeScale) {
            Settings.set('timeScale', timeScale);
            this.getStream($rootScope.currentDataStream.id);
        };

        bobby.getTimeScale = function () {
            return Settings.get('timeScale');
        };

        bobby.refresh = function (init) {
            var _this = this,
                q = $q.defer();
            // $http.get('devices.json').success(function (data) {
            $http.get($rootScope.baseUrl + 'devices').success(function (data) {
                $rootScope.devices = data;
                if (currentDevice)
                    _this.setDevice(currentDevice);
                else
                    _this.setDevice($rootScope.devices[0]);

                return q.promise;
            }, function (error) {
                q.resolve(null);
            });

            return q.promise;
        };

        return bobby;
    })

    .factory('focus', function ($rootScope, $timeout) {
        return function (name) {
            $timeout(function () {
                $rootScope.$broadcast('focusOn', name);
            });
        };
    })
    .service('Loading', function ($ionicLoading) {

        var currentLoading;

        this.start = function () {
            if (!currentLoading) {
                currentLoading = $ionicLoading.show({
                    content: 'Loading'
                });
            }
        };

        this.stop = function () {
            if (currentLoading) {
                $ionicLoading.hide();
                currentLoading = null;
            }
        };

    })

    .factory('auth0Service', function ($q, $resource, $http, $rootScope) {

        return {
            getUser: function (user_id, user) {
                return $http.get($rootScope.baseUrl + 'auth/users/' + user_id);
            },
            updateUser: function (user_id, metadata) {
                return $http.put($rootScope.baseUrl + 'auth/users/' + user_id + '/metadata', metadata);
            }
        };
    });