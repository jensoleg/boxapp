(function () {
    'use strict';

    angular.module('BobbyApp.controllers', ['angularUtils.directives.dirDisqus', 'lumx', 'ngFx', 'angular-storage', 'ionic', 'uiGmapgoogle-maps', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives', 'chart', 'map-icons', 'map-styles'])

        .filter('int', function () {
            return function (v) {
                return parseInt(v, 10) || '';
            };
        })

        .filter('logicalop', function () {

            var opertors = {'lt': '<', 'lte': '<=', 'gt': '>', 'gte': '>=', 'eq': '='};

            return function (v) {
                return opertors[v];
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
                if (reverse) {
                    filtered.reverse();
                }
                return filtered;
            };
        })

        .controller('InstallationsCtrl', ['bobby', 'toastMessage', '$ionicHistory', '$location', '$rootScope', '$scope', '$timeout', 'Settings', '$state', 'installationService', '$ionicModal', '$ionicPopup', 'auth', 'store', 'auth0Service', '$cacheFactory',
            function (bobby, toastMessage, $ionicHistory, $location, $rootScope, $scope, $timeout, Settings, $state, installationService, $ionicModal, $ionicPopup, auth, store, auth0Service, $cacheFactory) {

                installationService.all()
                    .then(function (newInstallations) {
                        $scope.installations = newInstallations;
                    });

                $scope.selectInst = function (instId) {
                    $ionicHistory.clearCache();
                    $state.go('box', {id: instId});
                };

                $scope.newInst = {location: {'lat': null, 'lng': null}};
                $scope.$state = $state;

                $rootScope.$on('message:refreshInstallation', function (evt, data) {
                    var $httpDefaultCache = $cacheFactory.get('$http');
                    $httpDefaultCache.removeAll();

                    installationService.all()
                        .then(function (newInstallations) {
                            $scope.installations = newInstallations;
                            toastMessage.toast("Refresh finished");
                        });
                });

                auth.profilePromise.then(function () {
                    $scope.userName = auth.profile.name;
                });

                $rootScope.$on('message:signout', function (evt, data) {

                    var settings = Settings.getSettings();
                    Settings.save(settings);

                    auth0Service.updateUser(auth.profile.user_id, {app: settings}).success(function (response) {

                        bobby.setInstallation(null);
                        // bobby.close();
                        if (!ionic.Platform.isWebView()) {
                            store.remove('profile');
                            store.remove('token');
                            store.remove('refreshToken');
                        }
                        auth.signout();
                        $state.go('login');

                    }, function () {
                        console.log('failed to save user metadata');
                    });

                });

                $rootScope.$on('message:new-alarm', function (evt, data) {
                    var installation = _.find($scope.installations, {'_id': data.installation});
                    installation['alarm'] = data.value;
                });

                /* Edit installation */

                $ionicModal.fromTemplateUrl('templates/installation.edit.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.editModal = modal;
                });

                $scope.closeEdit = function () {
                    $scope.editModal.hide();
                };

                $scope.doneEdit = function () {
                    $scope.editModal.hide();
                    $scope.update();
                };

                $scope.$on('$destroy', function () {
                    $scope.editModal.remove();
                    $scope.newModal.remove();
                });

                $scope.editInstallation = function (i) {
                    $scope.installation = i;
                    $scope.editModal.show();
                };

                $scope.instValid = function () {
                    return $scope.installation && $scope.installation.name && $scope.installation.placement && $scope.installation.address;
                };

                $scope.update = function () {
                    installationService.updateInstallation($scope.installation);
                };

                /* Remove installation */

                $scope.remove = function (installation) {
                    var confirmPopup = $ionicPopup.confirm({
                        title: '',
                        template: 'Are you sure you want to remove ' + installation.name + ' ' + installation.placement + '?',
                        cancelType: 'button-clear button-dark',
                        okType: 'button-clear button-positive'
                    });
                    confirmPopup.then(function (res) {
                        if (res) {

                            angular.forEach(installation.devices, function (device) {

                                installationService.deactivateDevice(device.id)
                                    .then(function () {
                                        installationService.removeDevice(installation._id, device._id)
                                            .then(function (response) {
                                                toastMessage.toast("Installation removed");
                                            }, function (response) {
                                                toastMessage.toast("remove failed");
                                                console.log('error', response);
                                            });
                                    }, function (response) {
                                        toastMessage.toast("remove failed");
                                        console.log('error', response);
                                    });
                            });

                            installationService.removeInstallation(installation._id);
                            _.pull($scope.installations, installation);
                            $rootScope.$broadcast('message:installation-removed', installation);
                        }
                    });

                    $scope.installation = null;

                };

                /* Add new installation */

                $rootScope.$on('message:newInstallation', function (evt, data) {
                    $scope.newInst = {location: {'lat': null, 'lng': null}};
                    $scope.newModal.show();
                });

                $ionicModal.fromTemplateUrl('templates/installation.new.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.newModal = modal;
                });

                $scope.closeNew = function () {
                    $scope.newModal.hide();
                };

                $scope.doneNew = function () {
                    $scope.newModal.hide();
                    $scope.saveNew();
                };

                $scope.newInstValid = function () {
                    return $scope.newInst && $scope.newInst.name && $scope.newInst.placement && $scope.newInst.address;
                };

                $scope.saveNew = function () {
                    installationService.newInstallation($scope.newInst)
                        .then(function (response) {
                            toastMessage.toast("Installation saved");
                            $scope.installations.push(response);
                            $rootScope.$broadcast('message:installation-new', response);
                            $location.path('/app/main/' + response._id);
                        }, function (response) {
                            toastMessage.toast("Save failed");
                            console.log('error', response);
                        });
                };

                /* Copy an installation */
                $scope.copyInstallation = function (i) {
                    var copy = _.cloneDeep(i);
                    bobby.objectIdDel(copy);
                    delete copy.__v;
                    delete copy._id;
                    delete copy.$$hashKey;
                    copy.name = 'Copy of ' + i.name;
                    $scope.newInst = copy;
                    /* save in database */
                    installationService.newInstallation($scope.newInst)
                        .then(function (response) {
                            $scope.installations.push(response);
                        }, function (response) {
                            console.log('error', response);
                        });

                };
            }])

        .controller('InstallationCtrl', ['bobby',  'toastMessage', '$scope', '$rootScope', '$ionicLoading', 'installationService', '$ionicModal', '$ionicPopup',
            function (bobby,  toastMessage, $scope, $rootScope, $ionicLoading, installationService, $ionicModal, $ionicPopup) {

                $scope.isIOS = ionic.Platform.isIOS();

                $scope.newDevice = {};

                $scope.$on('message:new-device', function (evt) {
                    $scope.addDevice();
                });
                $scope.$on('message:edit-device', function (evt, device) {
                    $scope.editDevice(device);
                });
                $scope.$on('message:remove-device', function (evt, device) {
                    $scope.removeDevice(device);
                });
                $scope.$on('message:copy-device', function (evt, device) {
                    $scope.copyDevice(device);
                });

                $ionicModal.fromTemplateUrl('templates/installation.device.edit.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.editModal = modal;
                });

                $scope.closeEditDevice = function () {
                    $scope.editModal.hide();
                };

                $scope.doneEditDevice = function () {
                    $scope.editModal.hide();
                    $scope.updateDevice();
                };

                $scope.editDevice = function (d) {
                    $scope.device = d;
                    $scope.editModal.show();
                };

                $scope.deviceValid = function () {
                    return $scope.device && $scope.device.name &&
                        $scope.device.placement &&
                        $scope.device.interval &&
                        $scope.device.id;
//                        $scope.device.planId;
                };

                $scope.updateDevice = function () {

                    installationService.updateDevice($scope.$parent.installation._id, $scope.device)
                        .then(function (response) {

                            if ($scope.device.interval) {
                                $ionicLoading.show({
                                    template: 'Reconfiguring device...'
                                });

                                installationService.activateDevice(null, $scope.device)
                                    .then(function (impResponse) {
                                        $ionicLoading.hide();
                                        toastMessage.toast("Device updated");
                                        $rootScope.$broadcast('message:installation-changed', response);
                                    });
                            } else {
                                toastMessage.toast("Device updated");
                                $rootScope.$broadcast('message:installation-changed', response);
                            }

                        }, function (response) {
                            toastMessage.toast("Device update failed");
                            console.log('error', response);
                        });
                };

                /* Remove device */

                $scope.removeDevice = function (device) {
                    var confirmPopup = $ionicPopup.confirm({
                        title: '',
                        template: 'Are you sure you want to remove ' + device.name + ' ' + device.placement + '?',
                        cancelType: 'button-clear button-dark',
                        okType: 'button-clear button-positive'
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            installationService.deactivateDevice(device.id)
                                .then(function () {
                                    installationService.removeDevice($scope.$parent.installation._id, device._id)
                                        .then(function (response) {
                                            $rootScope.$broadcast('message:installation-changed', response);
                                            toastMessage.toast("Device removed");
                                        }, function (response) {
                                            console.log('error', response);
                                        });
                                }, function (response) {
                                    console.log('error', response);
                                    toastMessage.toast("Remove of device failed");
                                });
                        }
                    });
                };

                /* new device */
                $ionicModal.fromTemplateUrl('templates/installation.device.new.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.newModal = modal;
                });

                $scope.closeNewDevice = function () {
                    $scope.newModal.hide();
                };

                $scope.doneNewDevice = function () {
                    $scope.newModal.hide();
                    $scope.saveNewDevice();
                };

                $scope.addDevice = function () {
                    $scope.newDevice = {};
                    $scope.newModal.show();
                };

                $scope.newDeviceValid = function () {
                    return $scope.newDevice && $scope.newDevice.name &&
                        $scope.newDevice.placement &&
                        $scope.newDevice.interval &&
                        $scope.newDevice.id;
//                        $scope.newDevice.planId;
                };
/*
                $scope.blinkup = function () {
                    $blinkup.start(function (result) {
                            $scope.newDevice.id = result.split("/")[3];
                            $scope.newDevice.planId = result.split("/")[4];
                            toastMessage.toast("BlinkUp succeeded");
                        },
                        function (error) {
                            toastMessage.toast(error);
                        }
                    );
                };

                $scope.blinkUpWiFi = function () {
                    $blinkup.wifi($scope.device.planId, function () {
                            toastMessage.toast("Device wifi updated");
                        },
                        function (error) {
                            toastMessage.toast(error);
                        }
                    );
                };
*/
                $scope.saveNewDevice = function () {

                    var installation = $scope.$parent.installation;
                    installationService.newDevice(installation._id, $scope.newDevice)
                        .then(function (response) {
                            if ($scope.newDevice.id) {
                                var device = _.find(response.devices, {'id': $scope.newDevice.id});

                                $ionicLoading.show({
                                    template: 'Activating device...'
                                });

                                installationService.activateDevice(installation._id, device)
                                    .then(function (impResponse) {
                                        var newInstallation = angular.fromJson(JSON.parse(impResponse));
                                        $rootScope.$broadcast('message:installation-changed', newInstallation);
                                        $ionicLoading.hide();
                                        toastMessage.toast("New device was activated");
                                    }, function (impResponse) {
                                        console.log('Device activation failed');
                                        $ionicLoading.hide();
                                    }
                                );
                            }
                        }, function (response) {
                            console.log('error', response);
                        });
                };

                /* Copy a device */
                $scope.copyDevice = function (i) {
                    var copy = _.cloneDeep(i);
                    bobby.objectIdDel(copy);
                    delete copy.__v;
                    delete copy.$$hashKey;
                    copy.name = 'Copy of ' + i.name;
                    copy.id = 'Copy of ' + i.id;

                    $scope.newDevice = copy;
                    $scope.saveNewDevice();
                };

                $scope.$on('$destroy', function () {
                    $scope.editModal.remove();
                    $scope.newModal.remove();

                });

            }
        ])

        .controller('SensorCtrl', ['bobby', 'toastMessage', '$scope', '$rootScope', '$ionicModal', '$ionicPopup', 'installationService',
            function (bobby, toastMessage, $scope, $rootScope, $ionicModal, $ionicPopup, installationService) {

                var deviceId,
                    curDevice;

                $scope.newControl = {};
                $scope.types = ['data', 'status'];
                $scope.sensorTypeEnabled = false;

                $scope.$on('message:new-control', function (evt, device) {
                    deviceId = device._id;
                    curDevice = device;
                    $scope.addControl();
                });

                $scope.$on('message:edit-control', function (evt, device, control) {
                    deviceId = device._id;
                    curDevice = device;
                    $scope.editControl(device, control);
                });

                $scope.$on('message:remove-control', function (evt, device, control) {
                    deviceId = device._id;
                    curDevice = device;
                    $scope.removeControl(control);
                });

                $scope.$on('message:copy-control', function (evt, device, control) {
                    deviceId = device._id;
                    curDevice = device;
                    $scope.copyControl(control);
                });

                /* Edit Control */

                $ionicModal.fromTemplateUrl('templates/installation.control.edit.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.editSensorModal = modal;
                });

                $scope.closeEditControl = function () {
                    $scope.editSensorModal.hide();
                    $scope.sensorTypeEnabled = false;
                };

                $scope.doneEditControl = function () {
                    $scope.editSensorModal.hide();
                    $scope.sensorTypeEnabled = false;
                    $scope.updateControl();
                };

                $scope.editControl = function (d, c) {
                    $scope.device = d;
                    $scope.control = c;
                    $scope.sensorTypeEnabled = $scope.control && (!angular.isDefined($scope.control.unit) || $scope.control.unit.name === '' || _.contains($scope.sensorTypes, $scope.control.unit.name));
                    $scope.editSensorModal.show();
                };

                $scope.updateControl = function () {
                    delete $scope.control.$$hashKey;
                    installationService.updateDeviceControl(curDevice.id, $scope.control)
                        .then(function (control) {
                            if ($scope.control.ctrlType === "data") {
                                $scope.control.unit.symbol = control.symbol;
                                $scope.control.unit.units = control.units;
                            }
                            installationService.updateControl($scope.$parent.$parent.installation._id, deviceId, curDevice.id, $scope.control)
                                .then(function (response) {
                                    $rootScope.$broadcast('message:installation-changed', response);
                                    toastMessage.toast("Control updated succesfully");
                                }, function (response) {
                                    console.log('error', response);
                                });

                        }, function (response) {
                            console.log('error', response);
                        });
                };

                /* Remove control */

                $scope.removeControl = function (control) {
                    var confirmPopup = $ionicPopup.confirm({
                        title: '',
                        template: 'Are you sure you want to remove ' + control.name + '?',
                        cancelType: 'button-clear button-dark',
                        okType: 'button-clear button-positive'
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            installationService.removeDeviceControl(curDevice.id, control)
                                .then(function () {
                                    installationService.removeControl($scope.$parent.$parent.installation._id, deviceId, control._id)
                                        .then(function (response) {
                                            toastMessage.toast("Control removed");
                                            $rootScope.$broadcast('message:installation-changed', response);
                                        }, function (response) {
                                            toastMessage.toast("Remove control failed");
                                            console.log('error', response);
                                        });
                                }, function (response) {
                                    toastMessage.toast("Remove control failed");
                                    console.log('error', response);
                                });
                        }
                    });
                };

                /* new control */
                $ionicModal.fromTemplateUrl('templates/installation.control.new.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.newSensorModal = modal;
                });

                $scope.closeNewControl = function () {
                    $scope.newSensorModal.hide();
                };

                $scope.doneNewControl = function () {
                    $scope.newSensorModal.hide();
                    $scope.saveNewControl();
                };

                $scope.addControl = function () {
                    $scope.newControl = {unit: {name: undefined}};
                    $scope.newSensorModal.show();
                };

                $scope.saveNewControl = function () {
                    installationService.newControl($scope.$parent.$parent.installation._id, deviceId, $scope.newControl)
                        .then(function (response) {
                            var device = _.find(response.devices, {'_id': deviceId}),
                                control = _.find(device.controls, {'id': $scope.newControl.id});

                            installationService.updateDeviceControl(curDevice.id, control)
                                .then(function (deviceControl) {
                                    control.ctrlType = "data";
                                    control.symbol = deviceControl.symbol;
                                    control.unit.units = deviceControl.units;
                                    installationService.updateControl($scope.$parent.$parent.installation._id, deviceId, curDevice.id, control)
                                        .then(function (response) {
                                            toastMessage.toast("Control saved");
                                            $rootScope.$broadcast('message:installation-changed', response);
                                        }, function (response) {
                                            toastMessage.toast("Save control failed");
                                            console.log('error', response);
                                        });

                                }, function (response) {
                                    toastMessage.toast("Save control failed");
                                    console.log('error', response);
                                });
                        }, function (response) {
                            console.log('error', response);
                        });
                };

                /* Copy a control */
                $scope.copyControl = function (i) {
                    var copy = _.cloneDeep(i);
                    bobby.objectIdDel(copy);
                    delete copy.__v;
                    delete copy.$$hashKey;
                    copy.name = 'Copy of ' + i.name;
                    copy.id = 'Copy of ' + i.id;

                    $scope.newControl = copy;
                    $scope.saveNewControl();
                };

                /* timers */

                $scope.closeEditTimer = function () {
                    $scope.editTimerModal.hide();
                };

                $scope.editTimer = function (t) {
                    $scope.timer = t;

                    var tStr = $scope.timer.time.split(":");
                    $scope.timer.timerTime = new Date(1970, 0, 1, tStr[0], tStr[1], 0);

                    var hours = Math.floor($scope.timer.duration / 3600),
                        minutes = Math.floor(($scope.timer.duration - (hours * 3600)) / 60),
                        seconds = $scope.timer.duration - (hours * 3600) - (minutes * 60);
                    $scope.timer.timeDuration = ("0" + hours).substr(-2, 2) + ':' + ("0" + minutes).substr(-2, 2) + ':' + ("0" + seconds).substr(-2, 2);

                    $scope.editTimerModal.show();
                };

                $scope.doneEditTimer = function () {
                    $scope.editTimerModal.hide();

                    $scope.timer.time = moment($scope.timer.timerTime).format('HH:mm');

                    var now = new Date(),
                        timeStr = $scope.timer.time.split(":"),
                        hour = timeStr[0],
                        min = timeStr[1],
                        time = moment.utc([now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(min)]);

                    $scope.timer.timestamp = time.format('X');
                    delete $scope.timer.timeDuration;
                };

                $scope.addTimer = function () {
                    $scope.newTimer = {};
                    $scope.newTimer.enabled = false;
                    $scope.newTimer.days = [false, false, false, false, false, false, false];
                    $scope.newTimer.time = '00:00:00';
                    $scope.newTimer.timeDuration = "00:00:00";
                    $scope.newTimer.timerTime = new Date(1970, 0, 1, 0, 0, 0);

                    $scope.newTimerModal.show();
                };

                $scope.closeNewTimer = function () {
                    $scope.newTimerModal.hide();
                };

                $scope.doneNewTimer = function () {
                    $scope.newTimerModal.hide();

                    $scope.newTimer.time = moment($scope.newTimer.timerTime).format('HH:mm');

                    var now = new Date(),
                        timeStr = $scope.newTimer.time.split(":"),
                        hour = timeStr[0],
                        min = timeStr[1],
                        time = moment.utc([now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(min)]);

                    $scope.newTimer.timestamp = time.format('X');
                    delete $scope.newTimer.timeDuration;
                    $scope.control.timers.push($scope.newTimer);
                };

                $scope.removeTimer = function (t) {
                    _.remove($scope.control.timers, {'name': t.name});
                };

                $scope.isTimerFormValid = function (timer) {
                    return timer && timer.name && timer.name.length > 0 &&
                            //  timer.timestamp && timer.timestamp.length > 0 &&
                        timer.duration && timer.duration.length > 0 &&
                        timer.days && timer.days.length > 0 &&
                        _.difference(timer.days, [true]).length < 7;
                };

                $ionicModal.fromTemplateUrl('templates/installation.timer.edit.html', {
                    scope: $scope,
                    animation: 'slide-in-right'
                }).then(function (modal) {
                    $scope.editTimerModal = modal;
                });

                $ionicModal.fromTemplateUrl('templates/installation.timer.new.html', {
                    scope: $scope,
                    animation: 'slide-in-right'
                }).then(function (modal) {
                    $scope.newTimerModal = modal;
                });

                $scope.$on('$destroy', function () {
                    $scope.editSensorModal.remove();
                    $scope.newSensorModal.remove();
                    $scope.editTimerModal.remove();
                    $scope.newTimerModal.remove();
                });
            }])

        .controller('BoxCtrl', ['$ionicModal', '$ionicScrollDelegate', 'installation', 'installationService', 'toastMessage', '$location', '$ionicLoading', '$ionicPopover', '$scope', '$state', '$rootScope', '$window', 'bobby', 'chart', '$interval', '$timeout', '$cacheFactory',
            function ($ionicModal, $ionicScrollDelegate, installation, installationService, toastMessage, $location, $ionicLoading, $ionicPopover, $scope, $state, $rootScope, $window, bobby, chart, $interval, $timeout, $cacheFactory) {

                $scope.domainName = $rootScope.domain.charAt(0).toUpperCase() + $rootScope.domain.slice(1);
                $scope.notes = "";

                $scope.color = {
                    red: Math.floor(Math.random() * 255),
                    green: Math.floor(Math.random() * 255),
                    blue: Math.floor(Math.random() * 255)
                };

                var seriesData = [],
                    colorScheme = bobby.getColorScheme();

                $rootScope.datastreams = [];

                $scope.shownDevice = [];
                $scope.chartColorNumber = 0;
                $scope.chartColor = [];
                $scope.showChart = false;
                $scope.showTimeline = false;
                $scope.removed = false;
                $scope.showContact = false;

                $scope.isWebView = ionic.Platform.isWebView() && !ionic.Platform.isAndroid();

                var ts = bobby.getTimeScale();
                $scope.timeScales = chart.timeScales;
                /* get graf time scale form settings */
                $scope.selectedScale = _.find($scope.timeScales, {'value': ts.value});

                $scope.chartLabel = chart.chartLabel;
                $scope.chartSettings = chart.chartSettings;
                $scope.installation = installation;

                $scope.doRefresh = function () {
                    var $httpDefaultCache = $cacheFactory.get('$http');
                    $httpDefaultCache.removeAll();
                    bobby.refreshInstallation($scope.installation);
                    toastMessage.toast("Refresh finished");
                };

                $scope.rangeSettings = {
                    sliderMarker: {
                        format: "H:mm",
                        visible: true
                    },
                    sliderHandle: {
                        visible: true,
                        width: 1,
                        opacity: 0.75
                    },
                    dataSource: [],
                    dataSourceField: 'timestamp',
                    chart: {
                        commonSeriesSettings: {
                            argumentField: 'timestamp',
                            valueField: 'value'
                        },
                        seriesTemplate: {
                            nameField: "name",
                            customizeSeries: function (seriesStream) {
                                var idStr = seriesStream.split("-"),
                                    stream = idStr[0],
                                    type = idStr[1];

                                if (type === 'data') {
                                    return {type: 'area', opacity: 0.75, color: $rootScope.datastreams[stream].color};
                                }
                                return {type: 'stepArea', color: $rootScope.datastreams[stream].color};
                            }
                        }
                    },
                    scale: {
                        valueType: 'datetime',
                        label: {
                            format: 'H:mm'
                        }
                    },
                    behavior: {
                        snapToTicks: false,
                        callSelectedRangeChanged: "onMoving"
                    },
                    margin: {
                        left: 0,
                        right: -15
                    },
                    selectedRangeChanged: function (e) {
                        var start = moment(e.endValue),
                            end = moment(e.startValue),
                            days = start.diff(end, 'day');

                        if (days <= 1) {
                            $scope.chartLabel.label = {format: 'H:mm'};
                        } else if (days <= 30) {
                            $scope.chartLabel.label = {format: 'dd'};
                        } else {
                            $scope.chartLabel.label = {format: 'd-MM'};
                        }

                        var chart = $("#chartContainer").dxChart("instance");
                        chart.zoomArgument(e.startValue, e.endValue);
                    }
                };

                $scope.chartSettings.seriesTemplate = {
                    nameField: "name",
                    customizeSeries: function (seriesStream) {
                        var idStr = seriesStream.split("-"),
                            stream = idStr[0],
                            type = idStr[1];

                        if ($rootScope.datastreams[stream] == null)
                            return;

                        if (type === 'data') {
                            return {type: 'area', color: $rootScope.datastreams[stream].color};
                        }
                        return {type: 'stepArea', color: $rootScope.datastreams[stream].color};
                    }
                };

                $rootScope.$on('message:installation-removed', function (evt, installation) {
                    $scope.removed = true;
                });


                $rootScope.$watch($rootScope.datastreams, function (val) {
                    var alarms = bobby.alarms($scope.installation._id);

                    if (alarms) {
                        _.forEach(alarms, function (alarm) {
                            var topics = alarm.path.split('/'),
                                device = topics[2],
                                control = topics[3];
                            $rootScope.datastreams[device + control].alarm = alarm.value;
                        });
                    }
                });

                $rootScope.$on('message:new-alarm', function (evt, data) {
                    if (data.installation == $scope.installation._id) {
                        $rootScope.datastreams[data.device + data.control].alarm = data.value;
                    }
                });

                $scope.$on('$destroy', function () {
                    bobby.disableSubscriptions();
                    if ($scope.popover) {
                        $scope.popover.remove();
                    }
                    if ($scope.noteModal) {
                        $scope.noteModal.remove()
                    }
                });

                $scope.toggleTimeline = function () {
                    $scope.showTimeline = !$scope.showTimeline;
                    if (!$scope.showTimeline) {
                        $scope.UpdateNote()
                    }
                };

                $scope.aNewControl = function (deviceId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId});
                    $scope.$broadcast('message:new-control', device);
                };

                $scope.aEditControl = function (deviceId, controlId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId}),
                        control = _.find(device.controls, {'id': controlId});
                    $scope.$broadcast('message:edit-control', device, control);
                };

                $scope.aEditAlarms = function (deviceId, controlId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId}),
                        control = _.find(device.controls, {'id': controlId});
                    $scope.$broadcast('message:edit-alarms', $scope.installation, device, control);
                };

                $scope.aRemoveControl = function (deviceId, controlId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId}),
                        control = _.find(device.controls, {'id': controlId});
                    $scope.$broadcast('message:remove-control', device, control);
                };

                $scope.aCopyControl = function (deviceId, controlId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId}),
                        control = _.find(device.controls, {'id': controlId});
                    $scope.$broadcast('message:copy-control', device, control);
                };

                $scope.aNewDevice = function () {
                    $scope.$broadcast('message:new-device');
                };

                $scope.aEditDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId});
                    $scope.$broadcast('message:edit-device', device);
                };

                $scope.aRemoveDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId});
                    $scope.$broadcast('message:remove-device', device);
                };

                $scope.aCopyDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId});
                    $scope.$broadcast('message:copy-device', device);
                };

                $scope.activateDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, {'id': deviceId});
                    installationService.activateDevice($scope.installation._id, device).then(function (response) {
                        $rootScope.$broadcast('message:installation-changed', $scope.installation);
                    });
                };

                $rootScope.$on('message:installation-changed', function (evt, installation) {
                    var $httpDefaultCache = $cacheFactory.get('$http');
                    $httpDefaultCache.removeAll();
                    $scope.installation = installation;
                    bobby.refreshInstallation(installation);
                });

                $scope.startTimer = function ($event, deviceId, controlId) {
                    $scope.currentControlId = controlId;
                    $scope.currentDeviceId = deviceId;
                    $scope.showTimerCtrl = true;
                    $scope.controlTimer = {
                        name: 'StartTimer',
                        enabled: true,
                        time: '',
                        timestamp: 0,
                        //timeDuration: "00:00:00",
                        duration: 0,
                        days: []
                    };


                    /*
                     $ionicPopover.fromTemplateUrl('templates/setTimer.html', {
                     scope: $scope
                     }).then(function (popover) {
                     $scope.popover = popover;
                     $scope.controlTimer = {
                     name: 'StartTimer',
                     enabled: true,
                     time: '',
                     timestamp: 0,
                     //timeDuration: "00:00:00",
                     duration: 0,
                     days: []
                     };
                     popover.show($event);
                     });
                     */
                };

                $scope.setTimer = function (timer) {

                    var device = _.find($scope.installation.devices, {'id': $scope.currentDeviceId}),
                        control = _.find(device.controls, {'id': $scope.currentControlId}),
                        aControl = angular.copy(control);

                    aControl.timers = [];
                    //delete timer.timeDuration;
                    aControl.timers.push(timer);
                    delete aControl.$$hashKey;

                    installationService.updateDeviceControl($scope.currentDeviceId, aControl)
                        .then(function (control) {
                            console.log('done:', control);
                        });

                    $scope.currentControlId = '';
                    $scope.currentDeviceId = '';
                    $scope.showTimerCtrl = false;

                    // $scope.popover.hide();
                };

                $scope.cancelTimer = function () {
                    $scope.currentControlId = '';
                    $scope.currentDeviceId = '';
                    $scope.showTimerCtrl = false;
                };

                /* handling notes */

                /*
                 $scope.UpdateNote = function () {
                 $scope.installation.metadata = $scope.notes;
                 installationService.updateInstallation($scope.installation)
                 .then(function () {
                 toastMessage.toast("Note saved");
                 $cacheFactory.get('$http').removeAll();
                 });
                 };

                 $ionicModal.fromTemplateUrl('templates/installation.note.html', {
                 scope: $scope,
                 animation: 'slide-in-up'
                 }).then(function (modal) {
                 $scope.noteModal = modal;
                 });
                 */
                $scope.editNote = function () {
                    $state.go('disqus', {id: $scope.installation._id})
                };
                /*
                 $scope.closeNote = function () {
                 $scope.notes = "";
                 $scope.noteModal.hide();
                 };

                 $scope.saveNote = function () {
                 $scope.installation.metadata = $scope.notes;
                 $scope.noteModal.hide();
                 $scope.UpdateNote();
                 };
                 */

                $scope.toggleDevice = function (device) {
                    $scope.shownDevice[device] = !$scope.isDeviceShown(device);
                };

                $scope.isDeviceShown = function (device) {
                    return $scope.shownDevice[device];
                };

                $scope.selectAction = function (time) {

                    $scope.selectedScale = _.find($scope.timeScales, {'value': time.value});

                    angular.forEach($scope.installation.devices, function (device) {
                        angular.forEach(device.controls, function (control) {
                            var controlColor = _.find($scope.chartColor, {'control': device.id + control.id});
                            if (controlColor) {
                                bobby.setTimeScale($scope.selectedScale, device.id, control.id);
                            }
                        });
                    });
                };


                $scope.showData = function (device, stream, type) {

                    var filterItem = device + stream + '-' + type,
                        controlColor = _.find($scope.chartColor, {'control': device + stream});

                    if (controlColor) {

                        $scope.chartColor = _.without($scope.chartColor, controlColor);

                        if ($scope.chartColor.length === 0) {
                            $scope.showChart = false;
                        }

                        $rootScope.datastreams[device + stream].color = null;

                        seriesData = _.filter(seriesData, function (item) {
                            return item.name !== filterItem;
                        });

                        $scope.chartSettings.dataSource = seriesData;
                        $scope.rangeSettings.dataSource = seriesData;

                    } else {

                        var color = colorScheme[$scope.chartColorNumber];

                        $scope.showChart = true;

                        $rootScope.datastreams[device + stream].color = color;

                        $scope.chartColor.push({control: device + stream, color: color});

                        ($scope.chartColorNumber < 19) ? $scope.chartColorNumber++ : $scope.chartColorNumber = 0

                        bobby.getStream(device, stream);
                    }

                    $scope.chartSettings.valueAxis.constantLines = [];
                    if ($scope.chartColor.length == 1) {
                        var control = $scope.chartColor[0].control;
                        if ($rootScope.datastreams[control].maxCritical) {
                            $scope.chartSettings.valueAxis.constantLines.push({value: $rootScope.datastreams[control].maxCritical});
                        }

                        if ($rootScope.datastreams[control].minCritical) {
                            $scope.chartSettings.valueAxis.constantLines.push({value: $rootScope.datastreams[control].minCritical});
                        }
                    }

                    $ionicScrollDelegate.resize()
                };

                $rootScope.$on('message:new-reading', function (evt, data) {

                    if ($scope.chartSettings.dataSource.length > 0 && _.find($scope.chartColor, {'control': data.device + data.control})) {
                        $scope.chartSettings.dataSource.push({
                            'name': data.device + data.control + '-' + data.type,
                            'timestamp': new Date(data.timestamp),
                            'value': data.value
                        });
                    }
                });

                $rootScope.$on('message:data', function (evt, data) {
                    if (angular.isDefined(data.data) && data.data.length > 0) {
                        if ($scope.selectedScale.value <= 86400) {
                            $scope.chartLabel.label = {format: 'H:mm'};
                            $scope.rangeSettings.scale.label.format = 'H:mm';
                        } else if ($scope.selectedScale.value <= 604800) {
                            $scope.chartLabel.label = {format: 'ddd'};
                            $scope.rangeSettings.scale.label.format = 'H:mm';
                        } else if ($scope.selectedScale.value <= 2592000) {
                            $scope.chartLabel.label = {format: 'd-MM'};
                            $scope.rangeSettings.scale.label.format = 'dd';
                        } else {
                            $scope.chartLabel.label = {format: 'MMM'};
                            $scope.rangeSettings.scale.label.format = 'dd';
                        }

                        $scope.chartSettings.argumentAxis = $scope.chartLabel;

                        var stream = data.device + data.control + '-' + data.type;
                        seriesData = _.filter(seriesData, function (item) {
                            return item.name !== stream;
                        });

                        _.forEach(data.data, function (obs) {
                            seriesData.push({
                                'name': stream,
                                'timestamp': new Date(obs.timestamp),
                                'value': obs.value
                            });

                        });

                        $timeout(function () {
                            $scope.chartSettings.dataSource = seriesData;
                            $scope.rangeSettings.dataSource = seriesData;
                        }, 25);

                    } else {
                        $scope.chartSettings.dataSource = [];
                        $scope.rangeSettings.dataSource = [];
                    }

                }, true);

                $rootScope.$on('message:resume', function (evt, data) {
                    bobby.refreshInstallation($scope.installation);
                });

                if ($scope.shownDevice.length === 0) {
                    var windowWidth = $window.innerWidth;
                    angular.forEach($scope.installation.devices, function (item) {
                        if (windowWidth > 981) {
                            $scope.shownDevice[item.id] = true;
                        } else {
                            $scope.shownDevice[item.id] = false;
                        }
                    });
                }

                $scope.showContact = true;

                bobby.setInstallation($scope.installation);

            }
        ])

        .controller('MapCtrl', ['uiGmapGoogleMapApi', 'uiGmapIsReady', '$cordovaSplashscreen', '$scope', '$location', '$rootScope', '$cordovaGeolocation', 'Settings', 'icons', 'styles', 'installations', '$state', '$ionicLoading',
            function (GoogleMapApi, IsReady, $cordovaSplashscreen, $scope, $location, $rootScope, $cordovaGeolocation, Settings, icons, styles, installations, $state, $ionicLoading) {

                $rootScope.searchFilter = "";

                var mapStyles = {
                        'Custom grey blue': 'GreyBlue',
                        'Custom grey': 'grey',
                        'Google map': 'default',
                        'Apple map': 'ios'
                    },
                    markers = [];

                var showSplash = true;

                GoogleMapApi.then(function (maps) {
                    maps.visualRefresh = true;
                });

                IsReady.promise(2).then(function (instances) {
                    instances.forEach(function (inst) {
                        inst.map.ourID = inst.instance;
                    });
                    showSplash = false;
                });

                $scope.$state = $state;
                /*
                 $ionicPopover.fromTemplateUrl('templates/selectMapType.html', {
                 scope: $scope
                 }).then(function (popover) {
                 $scope.popover = popover;
                 });

                 /*
                 $scope.setMapStyle = function (mapStyle) {

                 Settings.set('mapStyle', mapStyle);

                 var settings = Settings.getSettings();
                 auth0Service.updateUser(auth.profile.user_id, {app: settings});

                 $scope.map.options.styles = styles[mapStyle];
                 $scope.popover.hide();

                 $scope.map.control.refresh();
                 };
                 */
                angular.forEach(installations, function (item) {
                    var ret = {
                        latitude: item.location.lat,
                        longitude: item.location.lng,
                        id: item._id,
                        icon: icons.cube,
                        opacity: 1,
                        options: {
                            labelAnchor: '-30 -4',
                            labelContent: item.name, // + ' ' + item.placement,
                            labelClass: 'labelMarker'
                        }
                    };
                    markers.push(ret);
                });

                $rootScope.$on('message:installation-removed', function (evt, installation) {
                    _.remove(markers, function (marker) {
                        return marker.id === installation._id;
                    });
                });

                $rootScope.$on('message:installation-new', function (evt, installation) {
                    var ret = {
                        latitude: installation.location.lat,
                        longitude: installation.location.lng,
                        id: installation._id,
                        icon: icons.cube,
                        opacity: 1,
                        options: {
                            labelAnchor: '-30 -4',
                            labelContent: installation.name, // + ' ' + item.placement,
                            labelClass: 'labelMarker'
                        }
                    };
                    markers.push(ret);
                });

                $rootScope.$on('message:new-alarm', function (evt, data) {
                    var marker = _.find(markers, {'id': data.installation});
                    marker.icon = data.value > 0 ? icons.cubered : icons.cube;
                    marker.alarm = data.value
                });

                angular.extend($scope, {
                    map: {
                        control: {},
                        showTraffic: false,
                        showBicycling: false,
                        showWeather: false,
                        showHeat: false,
                        center: {
                            latitude: $rootScope.origCenter ? $rootScope.origCenter.latitude : 55.51833,
                            longitude: $rootScope.origCenter ? $rootScope.origCenter.longitude : 10.46037
                        },
                        clusterOptions: {
                            calculator: function (markers, numStyles) {
                                var index = 1;//green
                                _.each(markers.dict, function (marker) {
                                    if (angular.isDefined(marker.model.alarm) && marker.model.alarm > 0) {
                                        index = 3;
                                    }
                                });

                                return {text: markers.length, index: index};
                            },
                            gridSize: 50,
                            ignoreHidden: true,
                            minimumClusterSize: 2,
                            styles: [
                                {
                                    height: 52,
                                    url: './images/m1.png',
                                    width: 53
                                },
                                {
                                    height: 56,
                                    url: './images/m2.png',
                                    width: 55
                                },
                                {
                                    height: 53,
                                    url: './images/m3.png',
                                    width: 52
                                },
                                {
                                    height: 78,
                                    url: './images/m4.png',
                                    width: 78
                                },
                                {
                                    height: 90,
                                    url: './images/m5.png',
                                    width: 90
                                }
                            ]
                        },
                        options: {
                            streetViewControl: false,
                            mapTypeControl: false,
                            zoomControl: false,
                            panControl: false,
                            maxZoom: 16,
                            minZoom: 5,
                            scrollwheel: true,
                            /*
                             streetViewControlOptions: {
                             position: google.maps.ControlPosition.RIGHT_BOTTOM
                             },
                             zoomControlOptions: {
                             style: google.maps.ZoomControlStyle.SMALL,
                             position: google.maps.ControlPosition.LEFT_CENTER
                             },
                             mapTypeControlOptions: {
                             position: google.maps.ControlPosition.BOTTOM_CENTER
                             },
                             */
                            styles: styles[Settings.get('mapStyle')]
                        },
                        zoom: $rootScope.origZoom ? $rootScope.origZoom : 7,
                        dragging: true,
                        bounds: {},
                        markers: markers,
                        events: {
                            tilesloaded: function (map, eventName, originalEventArgs) {
                                if (showSplash && ionic.Platform.isWebView()) {
                                    $cordovaSplashscreen.hide();
                                }
                            }
                        },
                        getGMap: function () {
                        }
                    }
                });

                $scope.map.markers = markers;

                var onMarkerClicked = function (marker) {
                    $state.go('box', {id: marker.id})
                };

                $scope.onMarkerClicked = onMarkerClicked;

                _.each(markers, function (marker) {
                    marker.onClicked = function () {
                        onMarkerClicked(marker);
                    };
                });

                /* obsolete when caching
                 $scope.$on("$destroy", function () {
                 $rootScope.origCenter = {
                 latitude: $scope.map.center.latitude,
                 longitude: $scope.map.center.longitude
                 };
                 $rootScope.origZoom = $scope.map.control.getGMap().getZoom();
                 });
                 */

                var onSuccess = function (position) {
                    $ionicLoading.hide();
                    $scope.map.center = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    $scope.map.control.getGMap().setZoom(14);
                };

                function onError(error) {
                    $ionicLoading.hide();
                    console.log('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
                }

                $scope.myPosition = function () {

                    $ionicLoading.show({
                        template: 'Finding your location...'
                    });

                    if (ionic.Platform.isWebView()) {
                        $cordovaGeolocation
                            .getCurrentPosition()
                            .then(onSuccess, onError);
                    } else {
                        navigator.geolocation.getCurrentPosition(onSuccess, onError);
                    }
                };

                $scope.$on('$ionicView.enter', function () {
                    $scope.map.control.refresh($rootScope.origCenter);
                });

                $scope.toggleWeather = function () {
                    $scope.map.showWeather = !$scope.map.showWeather
                };

                $scope.signout = function () {
                    $rootScope.$broadcast('message:signout');
                };

                $scope.refresh = function () {
                    $rootScope.$broadcast('message:refreshInstallation');
                };

                $scope.newInstallation = function () {
                    $rootScope.$broadcast('message:newInstallation');
                }

            }])

        .controller('DisqusCtrl', ['$window', '$rootScope', '$scope', '$stateParams', '$location',
            function ($window, $rootScope, $scope, $stateParams, $location) {

                if ($window.DISQUS != null) {
                    $window.DISQUS.reset({
                        reload: true,
                        config: function () {
                            this.page.remote_auth_s3 = $rootScope.sso.auth;
                        }
                    });
                }

                $scope.disqusId = $stateParams.id;
                $scope.disqusUrl = $location.absUrl() + '/' + $scope.disqusId;

            }]);

}());
