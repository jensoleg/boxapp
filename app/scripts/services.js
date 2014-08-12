angular.module('XivelyApp.services', ['ngResource'])

    .constant('DEFAULT_SETTINGS', {
        'tempUnits': 'c',
        'keyXively': 'BPWvM1ZU0HLKSHs82lG3x1vdzoOSRomAEVpywvNJwGElgciw',
        'feedXively': '1664985147',
        'useFlickr': true,
        'useDeviceLoc': true,
        'timeScale': {value: 86400, interval: 300, text: '1 day', type: 'Averaged datapoints'},
        'skipIntro': false

    })
    .constant('SCANDIT_API_KEY', 'cFzwjrDwEeOHumeEBBIoRqXMaSSy36Uq4650VHVlShc')
    .constant('FLICKR_API_KEY', '504fd7414f6275eb5b657ddbfba80a2c')
    .constant('OPENWEATHER_API_KEY', 'a8c98220ff98a42893423c2f6627e39f')
    .constant('DEFAULTDEVICE', 'K0NppbqG6awI')


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
/*
        if (_settings) {
            window.localStorage['settings'] = JSON.stringify(_settings);
        }
*/
        var obj = {
            getSettings: function () {
                return _settings;
            },
            // Save the settings to localStorage
            save: function (newSetting) {
                window.localStorage['settings'] = JSON.stringify(newSetting);
                _settings = newSetting;
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

    .factory('Geo', function ($q) {
        return {
            reverseGeocode: function (lat, lng) {
                var q = $q.defer();

                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    'latLng': new google.maps.LatLng(lat, lng)
                }, function (results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        //console.log('Reverse', results);
                        if (results.length > 0) {
                            var r = results[0];
                            var a, types;
                            var parts = [];
                            var foundLocality = false;
                            var foundState = false;
                            for (var i = 0; i < r.address_components.length; i++) {
                                a = r.address_components[i];
                                types = a.types;
                                for (var j = 0; j < types.length; j++) {
                                    if (!foundLocality && types[j] == 'locality') {
                                        foundLocality = true;
                                        parts.push(a.long_name);
                                    } else if (!foundState && types[j] == 'administrative_area_level_1') {
                                        foundState = true;
                                        //parts.push(a.long_name);
                                    }
                                }
                            }
                            //console.log('Reverse', parts);
                            q.resolve(parts.join(' '));
                        }
                    } else {
                        //console.log('reverse fail', results, status);
                        q.reject(results);
                    }
                });

                return q.promise;
            },
            getLocation: function () {
                var q = $q.defer();

                navigator.geolocation.getCurrentPosition(function (position) {
                    q.resolve(position);
                }, function (error) {
                    q.reject(error);
                });

                return q.promise;
            }
        };
    })

    .factory('Flickr', function ($q, $resource, FLICKR_API_KEY) {
        var baseUrl = 'https://api.flickr.com/services/rest/';


        var flickrSearch = $resource(baseUrl, {
            method: 'flickr.groups.pools.getPhotos',
            group_id: '1463451@N25',
            safe_search: 1,
            jsoncallback: 'JSON_CALLBACK',
            api_key: FLICKR_API_KEY,
            format: 'json'
        }, {
            get: {
                method: 'JSONP'
            }
        });

        return {
            search: function (tags, lat, lng) {
                var q = $q.defer();
                flickrSearch.get({
                    tags: tags,
                    lat: lat,
                    lng: lng
                }, function (val) {
                    q.resolve(val);
                }, function (httpResponse) {
                    q.reject(httpResponse);
                });

                return q.promise;
            }
        };
    })

    .factory('Weather', function ($q, $resource, OPENWEATHER_API_KEY) {

        var baseUrl = 'http://api.openweathermap.org/data/2.5';

        var locationResource = $resource(baseUrl + '/weather', {
            callback: 'JSON_CALLBACK',
            APPID: OPENWEATHER_API_KEY
        }, {
            get: {
                method: 'JSONP'
            }
        });

        var forecastResource = $resource(baseUrl + '/forecast/daily', {
            callback: 'JSON_CALLBACK',
            APPID: OPENWEATHER_API_KEY
        }, {
            get: {
                method: 'JSONP'

            }
        });

        var hourlyResource = $resource(baseUrl + '/forecast', {
            callback: 'JSON_CALLBACK',
            APPID: OPENWEATHER_API_KEY
        }, {
            get: {
                method: 'JSONP'
            }
        });

        return {
            getForecast: function (lat, lng) {
                var q = $q.defer();

                forecastResource.get({
                    lat: lat, lon: lng
                }, function (resp) {
                    q.resolve(resp);
                }, function (httpResponse) {
                    q.reject(httpResponse);
                });

                return q.promise;
            },

            getHourly: function (lat, lng) {
                var q = $q.defer();

                hourlyResource.get({
                    lat: lat, lon: lng
                }, function (resp) {
                    q.resolve(resp);
                }, function (httpResponse) {
                    q.reject(httpResponse);
                });

                return q.promise;
            },

            getAtLocation: function (lat, lng) {
                var q = $q.defer();

                locationResource.get({
                    lat: lat, lon: lng
                }, function (resp) {
                    q.resolve(resp);
                }, function (error) {
                    q.reject(error);
                });

                return q.promise;
            }
        }
    })

    .factory('bobby', function ($q, $rootScope, $http, auth, $location, DEFAULTDEVICE, Settings) {

        var _this = this,
            bobby = {},
            client = {},
            controlTypes = ['data', 'ctrlValue', 'ctrlSwitch', 'ctrlTimeValue'],
            baseUrl = 'http://' + $rootScope.realm + '.bobbytechnologies.dk/api/',
        //baseUrl = 'http://' + $location.host() + ':8081/api/',
            currentDevice = null;

        $rootScope.devices = {};
        $rootScope.datastreams = {};


        client = mqtt.createClient(8080, 'mqtt.bobbytechnologies.dk', {"username": "JWT/" + $rootScope.realm, "password": auth.idToken});

        // recieve message on current device subscription
        client.on('message', function (topic, message) {
            if (currentDevice) {
                var topics = topic.split('/'),
                    stream = topics[3];
                $rootScope.datastreams[stream].newValue = message;
                $rootScope.datastreams[stream].current_value = message;

                /*  check trigger */

                var trigger,
                    index,
                    operators = {
                        lt: '<',
                        lte: '<=',
                        gt: '>',
                        gte: '>=',
                        eq: '=='
                    };

                if (currentDevice.triggers) {
                    index = _.findIndex(currentDevice.triggers, function (trigger) {
                        return trigger.stream_id === stream;
                    });
                    if (index >= 0) {
                        trigger = currentDevice.triggers[index];
                    }
                }

                if (trigger) {
                    $rootScope.datastreams[stream].triggered = eval(message + operators[trigger.trigger_type] + trigger.threshold_value);
                }

                /* check trigger */

                // update scoped streams
                if (stream == $rootScope.currentDataStream.id) {
                    var now = new Date();
                    $rootScope.currentDataStream.current_value = message;
                    $rootScope.currentDataStream.data.push({ timestamp: now, value: message });
                }
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
                $http.get(baseUrl + 'broker/' + currentDevice.id + '/' + stream.id)
                    .success(function (data) {
                        stream.newValue = data.data.payload;
                        stream.current_value = data.data.payload;
                        $rootScope.datastreams[stream.id] = stream;
                        $rootScope.datastreams[stream.id].triggered = false;

                        if (stream.id == $rootScope.currentDataStream.id) {
                            $rootScope.currentDataStream.current_value = stream.newValue;
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
        bobby.getStream = function (stream) {

            $http.get(baseUrl + 'datastreams/' + currentDevice.id + '/' + stream, {
                params: { limit: 10 }
            }).success(function (data) {
                $rootScope.currentDataStream.data = data.data;
                $rootScope.currentDataStream.id = stream;
            });
        };

        bobby.setTimeScale = function (timeScale) {
            Settings.set('timeScale', timeScale);
            xively.get($rootScope.currentDataStream.id, timeScale);
        };

        bobby.getTimeScale = function () {
            return Settings.get('timeScale');
        };

        bobby.refresh = function (init) {
            var _this = this,
                q = $q.defer();
            // $http.get('devices.json').success(function (data) {
            $http.get(baseUrl + 'devices').success(function (data) {
                $rootScope.devices = data;
                if (currentDevice)
                    _this.setDevice(currentDevice);
                else
                    _this.setDevice($rootScope.devices[0]);

                if (Settings.get('useDeviceLoc'))
                    q.resolve(currentDevice.location);
                else
                    q.resolve(null);

                return q.promise;
            }, function (error) {
                q.resolve(null);
            });

            return q.promise;
        };

        return bobby;
    })

    .factory('scandit', function ($rootScope, Settings, cordova, SCANDIT_API_KEY) {

        var _this = this;
        _this.init = function () {
        };

        return {
            scan: function (success, failure) {
                cordova.exec(success, failure, "ScanditSDK", "scan",
                    [SCANDIT_API_KEY,
                        {"beep": true,
                            "1DScanning": true,
                            "2DScanning": true}]);

            }
        };
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

        //var baseUrl = 'https://decoplant.auth0.com/api/users/';
        var baseUrl = 'http://' + $rootScope.realm + '.bobbytechnologies.dk/api/';

        return {
            getUser: function (user_id, user) {
                return $http.get(baseUrl + 'auth/users/' + user_id);
            },
            updateUser: function (user_id, metadata) {

                return $http.put(baseUrl + 'auth/users/' + user_id + '/metadata', metadata);

            }
        };
    });