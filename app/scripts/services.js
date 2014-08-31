(function () {
    'use strict';

    angular.module('BobbyApp.services', ['config'])

        .constant('DEFAULT_SETTINGS', {
            'tempUnits': 'c',
            'timeScale': {value: 86400, interval: 60, text: '1 day', type: 'Averaged datapoints'}
        })

        .factory('cordova', function () {
            return window.cordova; // assumes cordova has already been loaded on the page
        })

        .factory('statusbar', function () {
            return window.StatusBar; // assumes cordova has already been loaded on the page
        })

        .factory('Settings', ['$rootScope', 'DEFAULT_SETTINGS', function ($rootScope, DEFAULT_SETTINGS) {
            var ts,
                _settings = {},
                obj = {
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
                        return _settings.tempUnits;
                    }
                };

            try {
                _settings = JSON.parse(window.localStorage.settings);
            } catch (ignore) {
            }

            // Just in case we have new settings that need to be saved
            _settings = angular.extend({}, DEFAULT_SETTINGS, _settings);

            // upgrade silently
            ts = _settings.timeScale;

            if (typeof ts !== 'object') {
                _settings.timeScale = DEFAULT_SETTINGS.timeScale;
            }
            // Save the settings to be safe
            obj.save(_settings);
            return obj;
        }])

        .factory('bobby', [ '$q', '$rootScope', '$http', 'auth', 'Settings', 'ENV', function ($q, $rootScope, $http, auth, Settings, ENV) {

            var bobby = {},
                client = {},
                controlTypes = ['data', 'ctrlValue', 'ctrlSwitch', 'ctrlTimeValue'],
                currentInstallation = null,
                apiEndpoint = 'http://' + $rootScope.domain + ENV.apiEndpoint;

            $rootScope.datastreams = {};

            client = mqtt.createClient(8080, ENV.MQTTServer, {username: 'JWT/' + $rootScope.domain, "password": auth.idToken});

            // recieve message on current device subscription
            client.on('message', function (topic, message) {
                if (currentInstallation) {
                    var now,
                        topics = topic.split('/'),
                        device = topics[2],
                        stream = topics[3],
                        streamTriggers = [],
                        operators = {
                            lt: '<',
                            lte: '<=',
                            gt: '>',
                            gte: '>=',
                            eq: '=='
                        };

                    /* check state stream on device.streamid  and set scope variable installation.device.state.value.
                     UI will listen to state: installation.device.state.value and calculated
                     installation.state.value: 0,1,2
                     */

                    /* streamTriggers should be set when installation is changed !!!!!!!!! */
                    angular.forEach(currentInstallation.devices, function (d) {
                        if (d.triggers.length > 0 && d.id === device) {
                            streamTriggers.push(_.filter(d.triggers, { 'stream_id': stream }));
                        }
                    });

                    angular.forEach(streamTriggers, function (triggers) {
                        angular.forEach(triggers, function (trigger) {
                            if (trigger) {
                                $rootScope.datastreams[device + stream].triggered = eval(message + operators[trigger.trigger_type] + trigger.threshold_value);
                            }
                        });
                    });

                    $rootScope.datastreams[device + stream].current_value = message;

                    if ($rootScope.currentDataStream.deviceid === device && $rootScope.currentDataStream.id === stream) {
                        now = new Date();
                        $rootScope.currentDataStream.current_value = message;
                        $rootScope.currentDataStream.data.push({ timestamp: now, value: message });
                        $rootScope.$apply();
                    }
                }
            });

            /* set current device */
            bobby.setInstallation = function (newInstallation) {

                // remove current subscriptions
                if (currentInstallation) {
                    angular.forEach(currentInstallation.devices, function (device) {
                        angular.forEach(device.controls, function (stream) {
                            client.unsubscribe('/' + $rootScope.realm + '/' + device.id + "/" + stream.id);
                        });
                    });

                }

                currentInstallation = newInstallation;

                // set controls
                angular.forEach(currentInstallation.devices, function (device) {
                    angular.forEach(device.controls, function (stream) {
                        // retrieve last value
                        $http.get(apiEndpoint + 'broker/' + device.id + '/' + stream.id)
                            .success(function (data) {
                                if (_.contains(controlTypes, stream.ctrlType)) {
                                    $rootScope.datastreams[device.id + stream.id] = stream;
                                    $rootScope.datastreams[device.id + stream.id].id = stream.id;
                                    $rootScope.datastreams[device.id + stream.id].deviceid = device.id;
                                    /* maybe trigger should be evaluated initially */
                                    $rootScope.datastreams[device.id + stream.id].triggered = false;

                                    if (stream.id === $rootScope.currentDataStream.id && device.id === $rootScope.currentDataStream.deviceid) {
                                        $rootScope.currentDataStream.current_value = data.data.payload;
                                    }
                                }

                                /*
                                 if (stream.ctrlType === status) {

                                 }
                                 */
                                client.subscribe('/' + $rootScope.domain + '/' + device.id + '/' + stream.id);
                            });
                    });
                });
            };

            // get time series values
            bobby.getStream = function (device, stream) {

                var timeScale = Settings.get('timeScale'),
                    options = {
                        limit: 1500,
                        from: moment(moment()).utc().subtract(timeScale.value, 's').toJSON(),
                        to: moment(moment()).utc().toJSON(),
                        interval: timeScale.interval
                    };

                $http.get(apiEndpoint + 'datastreams/' + device + '/' + stream, {
                    params: options
                }).success(function (data) {
                    $rootScope.currentDataStream.data = data.data;
                    $rootScope.currentDataStream.id = stream;
                    $rootScope.currentDataStream.deviceid = device;
                });
            };

            bobby.setTimeScale = function (timeScale) {
                Settings.set('timeScale', timeScale);
                this.getStream($rootScope.currentDataStream.deviceid, $rootScope.currentDataStream.id);
            };

            bobby.getTimeScale = function () {
                return Settings.get('timeScale');
            };

            bobby.refresh = function () {
                var _this = this,
                    q = $q.defer();
                $http.get(apiEndpoint + 'installations').success(function (data) {
                    $rootScope.installations = data;
                    if (currentInstallation) {
                        _this.setInstallation(currentInstallation);
                    } else {
                        _this.setInstallation($rootScope.installations[0]);
                    }
                    q.resolve(data);
                }, function () {
                    q.resolve(null);
                });

                return q.promise;
            };

            return bobby;
        }])

        .factory('auth0Service', ['$http', '$rootScope', 'ENV', function ($http, $rootScope, ENV) {

            var apiEndpoint = 'http://' + $rootScope.domain + ENV.apiEndpoint;
            return {
                getUser: function (user_id) {
                    return $http.get(apiEndpoint + 'auth/users/' + user_id);
                },
                updateUser: function (user_id, metadata) {
                    return $http.put(apiEndpoint + 'auth/users/' + user_id + '/metadata', metadata);
                }
            };
        }]);
}());