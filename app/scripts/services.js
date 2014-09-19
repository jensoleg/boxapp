(function () {
    'use strict';

    angular.module('BobbyApp.services', ['config'])

        .constant('DEFAULT_SETTINGS', {
            'startAt': 'List',
            'mapStyle': 'Custom grey',
            'tempUnits': 'C',
            'timeScale': {value: 86400, interval: 60, text: '1 day', type: 'Averaged datapoints'}
        })

        .factory('cordova', function () {
            return window.cordova;
        })

        .factory('statusbar', function () {
            return window.StatusBar; // assumes cordova has already been loaded on the page
        })

        .factory('util', ['$q', '$http', function ($q, $http) {
            var util = {};
            util.objectIdDel = function (copiedObjectWithId) {
                if (copiedObjectWithId !== null && typeof copiedObjectWithId !== 'string' &&
                    typeof copiedObjectWithId !== 'number' && typeof copiedObjectWithId !== 'boolean') {
                    //for array length is defined however for objects length is undefined
                    if (typeof copiedObjectWithId.length === 'undefined') {
                        delete copiedObjectWithId._id;
                        for (var key in copiedObjectWithId) {
                            this.objectIdDel(copiedObjectWithId[key]); //recursive del calls on object elements
                        }
                    }
                    else {
                        for (var i = 0; i < copiedObjectWithId.length; i++) {
                            this.objectIdDel(copiedObjectWithId[i]);  //recursive del calls on array elements
                        }
                    }
                }
            };

            util.findNested = function findNested(obj, key, memo) {
                _.isArray(memo) || (memo === []);
                _.forOwn(obj, function (val, i) {
                    if (i === key) {
                        memo.push(val);
                    } else {
                        findNested(val, key, memo);
                    }
                });
                return memo;
            };

            return util;
        }])

        .factory('Settings', ['DEFAULT_SETTINGS', function (DEFAULT_SETTINGS) {
            var ts,
                _settings = {},
                obj = {
                    getSettings: function () {
                        return _settings;
                    },
                    // Save the settings to localStorage
                    save: function (settings) {
                        if (settings) {
                            _settings = settings;
                        }
                        window.localStorage.settings = JSON.stringify(_settings);
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

        .factory('bobby', ['$rootScope', '$http', 'auth', 'Settings', 'ENV', function ($rootScope, $http, auth, Settings, ENV) {

            var bobby = {},
                client = {},
                controlTypes = ['data', 'ctrlValue', 'ctrlSwitch', 'ctrlTimeValue'],
                currentInstallation = null,
                currentStream = {
                    device: null,
                    stream: null
                },
                apiEndpoint = 'http://' + $rootScope.domain + '.' + ENV.apiEndpoint;

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

                    if (currentStream.device === device && currentStream.stream === stream) {
                        now = new Date();
                        $rootScope.$broadcast('message:new-reading', { timestamp: now, value: message });
                    }

                    $rootScope.datastreams[device + stream].current_value = message;
                    $rootScope.$apply();
                }
            });


            bobby.objectIdDel = function (copiedObjectWithId) {
                if (copiedObjectWithId !== null && typeof copiedObjectWithId !== 'string' &&
                    typeof copiedObjectWithId !== 'number' && typeof copiedObjectWithId !== 'boolean') {
                    //for array length is defined however for objects length is undefined
                    if (typeof copiedObjectWithId.length === 'undefined') {
                        delete copiedObjectWithId._id;
                        for (var key in copiedObjectWithId) {
                            this.objectIdDel(copiedObjectWithId[key]); //recursive del calls on object elements
                        }
                    }
                    else {
                        for (var i = 0; i < copiedObjectWithId.length; i++) {
                            this.objectIdDel(copiedObjectWithId[i]);  //recursive del calls on array elements
                        }
                    }
                }
            };

            /* set current installation */
            bobby.setInstallation = function (newInstallation) {

                if (newInstallation && currentInstallation && currentInstallation._id === newInstallation._id) {
                    return;
                }

                // remove current subscriptions
                if (currentInstallation) {
                    angular.forEach(currentInstallation.devices, function (device) {
                        angular.forEach(device.controls, function (stream) {
                            client.unsubscribe('/' + $rootScope.domain + '/' + device.id + "/" + stream.id);
                        });
                    });

                    currentInstallation = null;
                }

                if (newInstallation) {

                    currentInstallation = newInstallation;

                    // set controls
                    angular.forEach(currentInstallation.devices, function (device) {
                        angular.forEach(device.controls, function (stream) {
                            if (_.contains(controlTypes, stream.ctrlType)) {
                                $rootScope.datastreams[device.id + stream.id] = stream;
                                $rootScope.datastreams[device.id + stream.id].id = stream.id;
                                $rootScope.datastreams[device.id + stream.id].deviceid = device.id;
                                /* maybe trigger should be evaluated initially */
                                $rootScope.datastreams[device.id + stream.id].triggered = false;
                            }
                            client.subscribe('/' + $rootScope.domain + '/' + device.id + '/' + stream.id);
                        });
                    });
                }
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
                    currentStream.device = device;
                    currentStream.stream = stream;
                    $rootScope.$broadcast('message:data', data.data);

                });
            };

            bobby.setTimeScale = function (timeScale, deviceid, id) {
                Settings.set('timeScale', timeScale);
                this.getStream(deviceid, id);
            };

            bobby.getTimeScale = function () {
                return Settings.get('timeScale');
            };

            return bobby;
        }])

        .factory('installationService', ['$http', '$q', '$rootScope', 'ENV', function ($http, $q, $rootScope, ENV) {

            var apiEndpoint = 'http://' + $rootScope.domain + '.' + ENV.apiEndpoint;

            return {
                all: function () {
                    var q = $q.defer();

                    $http.get(apiEndpoint + 'installations').success(function (data) {
                        q.resolve(data);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                get: function (id) {

                    var q = $q.defer();

                    $http.get(apiEndpoint + 'installations/' + id).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                newInstallation: function (installation) {
                    var q = $q.defer();

                    $http.post(apiEndpoint + 'installations', installation).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                removeInstallation: function (id) {
                    var q = $q.defer();

                    $http.delete(apiEndpoint + 'installations/' + id).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;

                },

                updateInstallation: function (installation) {
                    var q = $q.defer();

                    $http.put(apiEndpoint + 'installations/' + installation._id, installation).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                getDevice: function (id, deviceid) {

                    var q = $q.defer();

                    $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                newDevice: function (id, device) {

                    var q = $q.defer();

                    $http.post(apiEndpoint + 'installations/' + id + '/devices/', device).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                removeDevice: function (id, deviceid) {
                    var q = $q.defer();

                    $http.delete(apiEndpoint + 'installations/' + id + '/devices/' + deviceid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                updateDevice: function (id, device) {
                    var q = $q.defer();

                    $http.put(apiEndpoint + 'installations/' + id + '/devices/' + device._id, device).success(function (response) {
                        //installations = data;
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                activateDevice: function (device) {
                    var q = $q.defer();

                    $http.post(apiEndpoint + 'agent/' + device.id + '?config', {
                        "customer": "development",
                        "user": "contact@bobbytechnologies.dk",
                        "pass": "tekno",
                        "client_id": "kpWrEQ5gJclwuAljKpHgNcJA3NwNZ0FL"
                    }).
                        success(function (response) {
                            q.resolve(response);
                        }, function () {
                            q.resolve(null);
                        });
                    return q.promise;
                },

                getControl: function (id, deviceid, controlid) {
                    var q = $q.defer();

                    $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/controls/' + controlid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                newControl: function (id, deviceid, control) {
                    var q = $q.defer();

                    $http.post(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/controls', control).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                removeControl: function (id, deviceid, controlid) {
                    var q = $q.defer();

                    $http.delete(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/controls/' + controlid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                updateControl: function (id, deviceid, control) {
                    var q = $q.defer();

                    $http.put(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/controls/' + control._id, control).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                /* triggers */

                getTrigger: function (id, deviceid, triggerid) {
                    var q = $q.defer();

                    $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },
                newTrigger: function (id, deviceid, trigger) {
                    var q = $q.defer();

                    $http.post(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers', trigger).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },
                removeTrigger: function (id, deviceid, triggerid) {
                    var q = $q.defer();

                    $http.delete(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },
                updateTrigger: function (id, deviceid, trigger) {
                    var q = $q.defer();

                    $http.put(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + trigger._id, trigger).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                /* request */

                getRequest: function (id, deviceid, triggerid, requestid) {
                    var q = $q.defer();

                    $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid + '/requests/' + requestid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },
                newRequest: function (id, deviceid, triggerid, request) {
                    var q = $q.defer();

                    $http.post(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid + '/requests/', request).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },
                removeRequest: function (id, deviceid, triggerid, requestid) {
                    var q = $q.defer();

                    $http.delete(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid + '/requests/' + requestid).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },
                updateRequest: function (id, deviceid, triggerid, request) {
                    var q = $q.defer();

                    $http.put(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid + '/requests/' + request._id, request).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                },

                requester: function (request) {
                    var q = $q.defer();

                    $http.post(apiEndpoint + 'requests/test', request).success(function (response) {
                        q.resolve(response);
                    }, function () {
                        q.resolve(null);
                    });
                    return q.promise;
                }

            };
        }])

        .
        factory('auth0Service', ['$http', '$rootScope', 'ENV', function ($http, $rootScope, ENV) {

            var apiEndpoint = 'http://' + $rootScope.domain + '.' + ENV.apiEndpoint;

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