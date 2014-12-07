(function () {
    'use strict';

    angular.module('BobbyApp.services', ['config'])

        .constant('DEFAULT_SETTINGS', {
            'startAt': 'List',
            'mapStyle': 'default',
            'tempUnits': 'C',
            'timeScale': {value: 86400, interval: 60, text: '1 day', type: 'Averaged datapoints'}
        })

        .factory('cordova', function () {
            return window.cordova;
        })

        .factory('statusbar', function () {
            return window.StatusBar; // assumes cordova has already been loaded on the page
        })

        .factory('util', ['$q', '$http',
            function ($q, $http) {
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

        .factory('Settings', ['DEFAULT_SETTINGS',
            function (DEFAULT_SETTINGS) {
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

                _settings = angular.extend({}, _settings, DEFAULT_SETTINGS);

                return obj;
            }])

        .factory('bobby', ['$rootScope', '$http', 'auth', 'Settings', 'ENV', 'installationService',
            function ($rootScope, $http, auth, Settings, ENV, installationService) {

                var bobby = {},
                    client = {},
                    controlTypes = ['data', 'timer', 'state'],
                    currentInstallation = null,
                    refreshing = false,
                    _this = this,
                    apiEndpoint;

                apiEndpoint = ENV.domainPrefix ? 'http://' + $rootScope.domain + '.' + ENV.apiEndpoint : 'http://' + ENV.apiEndpoint;

                $rootScope.datastreams = {};

                client = mqtt.createClient(8080, ENV.MQTTServer, {username: 'JWT/' + $rootScope.domain, "password": auth.idToken});

                client.on('connect', function () {
                    console.log('MQTT connected');
                });

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
                            },
                            theDevice = _.find(currentInstallation.devices, { 'id': device }),
                            control = _.find(theDevice.controls, { 'id': stream });

                        /* check state stream on device.streamid  and set scope variable installation.device.state.value.
                         UI will listen to state: installation.device.state.value and calculated
                         installation.state.value: 0,1,2
                         */

                        /* streamTriggers should be set when installation is changed !!!!!!!!! */
                        /*
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
                         */

                        $rootScope.datastreams[device + stream].current_value = message;

                        now = Date.now();
                        $rootScope.$broadcast('message:new-reading', {device: device, control: stream, type: control.ctrlType, timestamp: moment(moment()).utc().toJSON(), value: parseFloat(message) });


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

                bobby.disableSubscriptions = function () {
                    if (currentInstallation) {
                        angular.forEach(currentInstallation.devices, function (device) {
                            angular.forEach(device.controls, function (stream) {
                                client.unsubscribe('/' + $rootScope.domain + '/' + device.id + "/" + stream.id);
                                //console.log('MQTT unsubscribe: ', '/' + $rootScope.domain + '/' + device.id + '/' + stream.id);
                            });
                        });
                    }
                };

                /* set current installation */
                bobby.setInstallation = function (newInstallation) {

                    if (!refreshing && newInstallation && currentInstallation && currentInstallation._id === newInstallation._id) {
                        return;
                    }

                    // remove current subscriptions
                    if (!refreshing && currentInstallation) {
                        angular.forEach(currentInstallation.devices, function (device) {
                            angular.forEach(device.controls, function (stream) {
                                client.unsubscribe('/' + $rootScope.domain + '/' + device.id + "/" + stream.id);
                                //console.log('MQTT unsubscribe: ', '/' + $rootScope.domain + '/' + device.id + '/' + stream.id);

                            });
                        });

                        currentInstallation = null;
                    }

                    if (!refreshing && newInstallation) {

                        currentInstallation = newInstallation;

                        // set controls
                        angular.forEach(currentInstallation.devices, function (device) {
                            angular.forEach(device.controls, function (stream) {
                                if (_.contains(controlTypes, stream.ctrlType)) {
                                    var ui_stream = angular.copy(stream);
                                    $rootScope.datastreams[device.id + stream.id] = ui_stream;
                                    $rootScope.datastreams[device.id + stream.id].id = stream.id;
                                    $rootScope.datastreams[device.id + stream.id].deviceid = device.id;
                                    /* maybe trigger should be evaluated initially */
                                    $rootScope.datastreams[device.id + stream.id].triggered = false;

                                    client.subscribe('/' + $rootScope.domain + '/' + device.id + '/' + stream.id, {qos: 0});
                                    //console.log('MQTT subscribe: ', '/' + $rootScope.domain + '/' + device.id + '/' + stream.id);

                                }
                            });
                        });
                    }


                    if (refreshing && newInstallation) {

                        currentInstallation = newInstallation;

                        var newStreams = {};

                        // set / remove controls
                        angular.forEach(currentInstallation.devices, function (device) {
                            angular.forEach(device.controls, function (stream) {
                                if (_.contains(controlTypes, stream.ctrlType)) {
                                    if ($rootScope.datastreams[device.id + stream.id]) {
                                        newStreams[device.id + stream.id] = $rootScope.datastreams[device.id + stream.id]
                                        client.unsubscribe('/' + $rootScope.domain + '/' + device.id + "/" + stream.id);
                                    }
                                    newStreams[device.id + stream.id] = stream;
                                    newStreams[device.id + stream.id].id = stream.id;
                                    newStreams[device.id + stream.id].deviceid = device.id;
                                    client.subscribe('/' + $rootScope.domain + '/' + device.id + '/' + stream.id, {qos: 0});
                                    //console.log('MQTT subscribe: ', '/' + $rootScope.domain + '/' + device.id + '/' + stream.id);

                                }
                            })
                        });

                        $rootScope.datastreams = newStreams;

                        refreshing = false;
                        $rootScope.$broadcast('scroll.refreshComplete');
                    }
                };

                bobby.refreshInstallation = function (installation) {
                    refreshing = true;
                    installationService.get(installation._id).then(function (response) {
                        bobby.setInstallation(response);
                    });
                };

                // get time series values
                bobby.getStream = function (deviceId, streamId) {

                    var pushInterval = 1,
                        interval = 1,
                        timeScale = Settings.get('timeScale'),
                        device = _.find(currentInstallation.devices, { 'id': deviceId }),
                        control = _.find(device.controls, { 'id': streamId }),
                        minute = moment().minute();

                    if (angular.isDefined(device.interval) && device.interval !== null) {
                        pushInterval = device.interval;
                    }

                    var fromTime = moment(moment()).utc().subtract(timeScale.value, 's'),
                        from = fromTime.minutes(interval * Math.floor(minute * 60 / pushInterval) / 60),
                        toTime = moment(moment()).utc(),
                        to = toTime.minutes(interval * Math.floor(minute * 60 / pushInterval) / 60);

                    if (pushInterval >= 60 && timeScale.interval < 60) {
                        interval = 60
                    } else {
                        interval = timeScale.interval
                    }

                    var options = {
                        limit: 1500,
                        from: from.startOf('minute').toJSON(),
                        to: to.startOf('minute').toJSON(),
                        interval: interval
                    };

                    if (control.ctrlType === 'timer' || control.ctrlType === 'state') {
                        options.interval = 1;
                    }

                    $http.get(apiEndpoint + 'datastreams/' + deviceId + '/' + streamId, {
                        params: options,
                        cache: true
                    }).success(function (data) {
                        $rootScope.$broadcast('message:data', {device: deviceId, control: streamId, type: control.ctrlType, data: data.data});

                    });
                };

                bobby.setTimeScale = function (timeScale, deviceid, id) {
                    Settings.set('timeScale', timeScale);
                    this.getStream(deviceid, id);
                };

                bobby.getTimeScale = function () {
                    return Settings.get('timeScale');
                };


                bobby.getColorScheme = function () {
                    return ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
                };

                return bobby;
            }
        ])

        .
        factory('installationService', ['$http', '$q', '$rootScope', 'ENV',
            function ($http, $q, $rootScope, ENV) {

                var apiEndpoint = ENV.domainPrefix ? 'http://' + $rootScope.domain + '.' + ENV.apiEndpoint : 'http://' + ENV.apiEndpoint;

                return {
                    all: function () {
                        var q = $q.defer();

                        $http.get(apiEndpoint + 'installations', { cache: true }).success(function (data) {
                            q.resolve(data);
                        }, function () {
                            q.resolve(null);
                        });
                        return q.promise;
                    },

                    get: function (id) {

                        var q = $q.defer();

                        $http.get(apiEndpoint + 'installations/' + id, { cache: true }).success(function (response) {
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
                        var q = $q.defer(),
                            myInstallation = {};

                        angular.copy(installation, myInstallation);

                        if (!_.isNull(myInstallation.__v)) {
                            delete myInstallation.__v;
                        }

                        if (!_.isNull(myInstallation._id)) {
                            delete myInstallation._id;
                        }

                        $http.put(apiEndpoint + 'installations/' + installation._id, myInstallation).success(function (response) {
                            q.resolve(response);
                        }, function () {
                            q.resolve(null);
                        });
                        return q.promise;
                    },

                    getDevice: function (id, deviceid) {

                        var q = $q.defer();

                        $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid, { cache: true }).success(function (response) {
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

                    activateDevice: function (installationId, device) {
                        var q = $q.defer(),
                            options;
                        if (angular.isDefined(installationId) && installationId != null) {
                            options = {
                                installationId: installationId,
                                deviceId: device._id,
                                interval: device.interval
                            };
                        } else {
                            options = {
                                interval: device.interval
                            };
                        }

                        $http.post(apiEndpoint + 'agent/' + device.id + '?config', options).
                            success(function (response) {
                                q.resolve(response);
                            }, function () {
                                q.resolve(null);
                            });
                        return q.promise;
                    },

                    getControl: function (id, deviceid, controlid) {
                        var q = $q.defer();

                        $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/controls/' + controlid, { cache: true }).success(function (response) {
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


                    updateDeviceControl: function (deivceId, control) {
                        var q = $q.defer();

                        $http.put(apiEndpoint + 'agent/' + deivceId + '?control', control)
                            .success(function (response) {
                                q.resolve(response);
                            }, function () {
                                q.resolve(null);
                            });
                        return q.promise;
                    },


                    updateControl: function (id, deviceid, deivceIdent, control) {
                        var q = $q.defer();

                        $http.put(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/controls/' + control._id, control)
                            .success(function (response) {
                                q.resolve(response);
                            }, function () {
                                q.resolve(null);
                            });
                        return q.promise;
                    },

                    /* triggers */

                    getTrigger: function (id, deviceid, triggerid) {
                        var q = $q.defer();

                        $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid, { cache: true }).success(function (response) {
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

                        $http.get(apiEndpoint + 'installations/' + id + '/devices/' + deviceid + '/triggers/' + triggerid + '/requests/' + requestid, { cache: true }).success(function (response) {
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

        .factory('auth0Service', ['$http', '$rootScope', 'ENV',
            function ($http, $rootScope, ENV) {

                var apiEndpoint = ENV.domainPrefix ? 'http://' + $rootScope.domain + '.' + ENV.apiEndpoint : 'http://' + ENV.apiEndpoint;

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
