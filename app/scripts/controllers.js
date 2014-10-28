(function () {
    'use strict';

    angular.module('BobbyApp.controllers', ['angular-storage', 'ionic', 'google-maps'.ns(), 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives', 'chart', 'config.box', 'map-icons', 'map-styles'])

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

        .controller('InstallationsCtrl', ['bobby', '$location', '$rootScope', '$scope', '$timeout', 'Settings', '$state', 'installations', 'installationService', '$ionicListDelegate', '$ionicModal', '$ionicPopup', 'auth', 'store', 'auth0Service', '$ionicSideMenuDelegate', '$cacheFactory',
            function (bobby, $location, $rootScope, $scope, $timeout, Settings, $state, installations, installationService, $ionicListDelegate, $ionicModal, $ionicPopup, auth, store, auth0Service, $ionicSideMenuDelegate, $cacheFactory) {

                $scope.installations = installations;
                $scope.newInst = {location: {'lat': null, 'lng': null}};
                $scope.$state = $state;

                $scope.doRefresh = function () {
                    var $httpDefaultCache = $cacheFactory.get('$http');
                    $httpDefaultCache.removeAll();

                    installationService.all()
                        .then(function (newInstallations) {
                            $scope.installations = newInstallations;
                            $scope.$broadcast('scroll.refreshComplete');
                        });
                };

                $scope.clearSearch = function () {
                    this.data.searchQuery = '';
                };

                auth.profilePromise.then(function () {
                    $scope.userName = auth.profile.name;
                });

                $scope.signout = function () {

                    var settings = Settings.getSettings();
                    Settings.save(settings);
                    auth0Service.updateUser(auth.profile.user_id, { app: settings});
                    bobby.setInstallation(null);

                    if (!ionic.Platform.isWebView()) {
                        store.remove('profile');
                        store.remove('token');
                        store.remove('refreshToken');
                    }

                    // bobby.close();
                    $ionicSideMenuDelegate.toggleLeft();
                    $timeout(function () {
                        auth.signout();
                        $state.go('login');
                    }, 300);
                };
                /* Edit installation */

                $ionicModal.fromTemplateUrl('templates/installation.edit.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.editModal = modal;
                });

                $scope.closeEdit = function () {
                    $scope.editModal.hide();
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.doneEdit = function () {
                    $scope.editModal.hide();
                    $ionicListDelegate.closeOptionButtons();
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
                            installationService.removeInstallation(installation._id);
                            _.pull($scope.installations, installation);
                            $rootScope.$broadcast('message:installation-removed', installation);
                        }
                        $ionicListDelegate.closeOptionButtons();
                    });

                    $scope.installation = null;

                };

                /* Add new installation */

                $ionicModal.fromTemplateUrl('templates/installation.new.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    $scope.newModal = modal;
                });

                $scope.closeNew = function () {
                    $scope.newModal.hide();
                    $ionicListDelegate.closeOptionButtons();

                };

                $scope.doneNew = function () {
                    $scope.newModal.hide();
                    $scope.saveNew();
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.newInstallation = function () {
                    $scope.newInst = {location: {'lat': null, 'lng': null}};
                    $scope.newModal.show();
                };

                $scope.saveNew = function () {
                    installationService.newInstallation($scope.newInst)
                        .then(function (response) {
                            $scope.installations.push(response);
                            $rootScope.$broadcast('message:installation-new', response);
                            $location.path('/app/main/' + response._id);
                        }, function (response) {
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

                    $ionicListDelegate.closeOptionButtons();
                };
            }])

        .controller('InstallationCtrl', ['bobby', '$scope', '$rootScope', '$ionicLoading', 'installationService', '$ionicModal', '$ionicPopup', '$ionicListDelegate',
            function (bobby, $scope, $rootScope, $ionicLoading, installationService, $ionicModal, $ionicPopup, $ionicListDelegate) {

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
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.doneEditDevice = function () {
                    $scope.editModal.hide();
                    $scope.updateDevice();
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.editDevice = function (d) {
                    $scope.device = d;
                    $scope.editModal.show();
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
                                        $rootScope.$broadcast('message:installation-changed', response);
                                    });
                            } else {
                                $rootScope.$broadcast('message:installation-changed', response);
                            }

                        }, function (response) {
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
                            installationService.removeDevice($scope.$parent.installation._id, device._id)
                                .then(function (response) {
                                    $rootScope.$broadcast('message:installation-changed', response);
                                }, function (response) {
                                    console.log('error', response);
                                });
                        }
                        $ionicListDelegate.closeOptionButtons();
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
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.doneNewDevice = function () {
                    $scope.newModal.hide();
                    $scope.saveNewDevice();
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.addDevice = function () {
                    $scope.newDevice = {};
                    $scope.newModal.show();
                };

                $scope.saveNewDevice = function () {

                    var installation = $scope.$parent.installation;
                    installationService.newDevice(installation._id, $scope.newDevice)
                        .then(function (response) {
                            if ($scope.newDevice.id) {
                                var device = _.find(response.devices, { 'id': $scope.newDevice.id });

                                $ionicLoading.show({
                                    template: 'Activating device...'
                                });

                                installationService.activateDevice(installation._id, device)
                                    .then(function (impResponse) {
                                        var newInstallation = angular.fromJson(JSON.parse(impResponse));
                                        $rootScope.$broadcast('message:installation-changed', newInstallation);
                                        $ionicLoading.hide();
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
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.$on('$destroy', function () {
                    $scope.editModal.remove();
                    $scope.newModal.remove();

                });

            }
        ])

        .controller('SensorCtrl', ['bobby', '$scope', '$rootScope', '$ionicModal', '$ionicPopup', 'installationService', '$ionicListDelegate',
            function (bobby, $scope, $rootScope, $ionicModal, $ionicPopup, installationService, $ionicListDelegate) {

                var deviceId,
                    curDevice;

                $scope.newControl = {};
                $scope.types = ['data', 'status'];
                $scope.sensorTypes = ['moisture', 'raw'];
                $scope.sensorTypeEnabled = false;

                $scope.$on('message:new-control', function (evt, device) {
                    deviceId = device._id;
                    curDevice = device;
                    $scope.addControl();
                });
                $scope.$on('message:edit-control', function (evt, device, control) {
                    deviceId = device._id;
                    curDevice = device;
                    $scope.editControl(control);
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
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.doneEditControl = function () {
                    $scope.editSensorModal.hide();
                    $scope.sensorTypeEnabled = false;
                    $scope.updateControl();
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.editControl = function (c) {
                    $scope.control = c;
                    $scope.sensorTypeEnabled = $scope.control && (!angular.isDefined($scope.control.unit)  || $scope.control.unit.name === '' || _.contains($scope.sensorTypes, $scope.control.unit.name));
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
                            installationService.removeControl($scope.$parent.$parent.installation._id, deviceId, control._id)
                                .then(function (response) {
                                    $rootScope.$broadcast('message:installation-changed', response);
                                }, function (response) {
                                    console.log('error', response);
                                });
                            $ionicListDelegate.closeOptionButtons();
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
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.doneNewControl = function () {
                    $scope.newSensorModal.hide();
                    $scope.saveNewControl();
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.addControl = function () {
                    $scope.newControl = {};
                    $scope.newSensorModal.show();
                };

                $scope.saveNewControl = function () {
                    installationService.newControl($scope.$parent.$parent.installation._id, deviceId, $scope.newControl)
                        .then(function (response) {
                            $rootScope.$broadcast('message:installation-changed', response);
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
                    $ionicListDelegate.closeOptionButtons();
                };


                /* timers */

                $scope.closeEditTimer = function () {
                    $scope.editTimerModal.hide();
                    $ionicListDelegate.closeOptionButtons();
                };


                $scope.editTimer = function (t) {
                    $scope.timer = t;

                    var hours = Math.floor($scope.timer.duration / 3600),
                        minutes = Math.floor(($scope.timer.duration - (hours * 3600)) / 60),
                        seconds = $scope.timer.duration - (hours * 3600) - (minutes * 60);
                    $scope.timer.timeDuration = ("0" + hours).substr(-2, 2) + ':' + ("0" + minutes).substr(-2, 2) + ':' + ("0" + seconds).substr(-2, 2);

                    $scope.editTimerModal.show();
                };

                $scope.doneEditTimer = function () {
                    $scope.editTimerModal.hide();
                    delete $scope.timer.timeDuration;
                    $ionicListDelegate.closeOptionButtons();
                };

                $scope.addTimer = function () {
                    $scope.newTimer = {};
                    $scope.newTimer.enabled = false;
                    $scope.newTimer.days = [false, false, false, false, false, false, false];

                    $scope.newTimer.time = '00:00';
                    $scope.newTimer.timeDuration = "00:00:00";

                    $scope.newTimerModal.show();
                };

                $scope.closeNewTimer = function () {
                    $scope.newTimerModal.hide();
                };

                $scope.doneNewTimer = function () {
                    $scope.newTimerModal.hide();
                    delete $scope.newTimer.timeDuration;
                    $scope.control.timers.push($scope.newTimer);
                };

                $scope.removeTimer = function (t) {
                    _.remove($scope.control.timers, { 'name': t.name });
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


        .controller('BoxCtrl', ['installation', 'installationService', '$ionicLoading', '$ionicPopover', '$cordovaKeyboard', '$ionicSideMenuDelegate', '$scope', '$state', '$rootScope', '$window', 'bobby', 'chart', 'box', '$interval', '$timeout', '$ionicListDelegate', '$cacheFactory',
            function (installation, installationService, $ionicLoading, $ionicPopover, $cordovaKeyboard, $ionicSideMenuDelegate, $scope, $state, $rootScope, $window, bobby, chart, box, $interval, $timeout, $ionicListDelegate, $cacheFactory) {

                $ionicSideMenuDelegate.toggleLeft(false);

                $scope.domainName = $rootScope.domain.charAt(0).toUpperCase() + $rootScope.domain.slice(1);

                var seriesData = [],
                    colorScheme = bobby.getColorScheme();

                $scope.shownDevice = [];
                $scope.chartColorNumber = 0;
                $scope.chartColor = [];
                $scope.showChart = false;
                $scope.showTimeline = false;
                $scope.removed = false;

                $scope.isWebView = ionic.Platform.isWebView() && !ionic.Platform.isAndroid();

                var ts = bobby.getTimeScale();
                $scope.timeScales = chart.timeScales;
                /* get graf time scale form settings */
                $scope.selectedScale = _.find($scope.timeScales, { 'value': ts.value });

                $scope.chartLabel = chart.chartLabel;
                $scope.chartSettings = chart.chartSettings;
                $scope.installation = installation;

                if ($state.params.id && box.installation && box.installation._id === $state.params.id) {
                    $scope.shownDevice = box.shownDevice;
                    $scope.chartColorNumber = box.chartColorNumber;
                    $scope.chartColor = box.chartColor;
                    $scope.showChart = box.showChart;

                    if (box.selectedScale) {
                        $scope.selectedScale = box.selectedScale;
                    }
                    seriesData = $scope.chartSettings.dataSource;

                } else {
                    chart.chartSettings.dataSource = [];
                    $rootScope.datastreams = {};
                }

                $scope.chartSettings.seriesTemplate = {
                    nameField: "name",
                    customizeSeries: function (seriesStream) {
                        var idStr = seriesStream.split("-"),
                            stream = idStr[0],
                            type = idStr[1];

                        if (type === 'data') {
                            return {type: 'area', color: $rootScope.datastreams[stream].color};
                        }
                        return {type: 'stepArea', color: $rootScope.datastreams[stream].color};
                    }
                };

                $rootScope.$on('message:installation-removed', function (evt, installation) {
                    $scope.removed = true;
                });

                $scope.$on('$destroy', function () {
                    // Make sure that the interval is destroyed too
                    sparklineFeed = undefined;
                    box.installation = $scope.installation;
                    box.shownDevice = $scope.shownDevice;
                    box.chartColorNumber = $scope.chartColorNumber;
                    box.chartColor = $scope.chartColor;
                    box.selectedScale = $scope.selectedScale;
                    box.showChart = $scope.showChart;

                    bobby.disableSubscriptions();
                    if ($scope.popover) {
                        $scope.popover.remove();
                    }
                });

                $scope.toggleTimeline = function () {
                    $scope.showTimeline = !$scope.showTimeline;
                };

                $scope.aNewControl = function (deviceId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId });
                    $scope.$broadcast('message:new-control', device);
                };

                $scope.aEditControl = function (deviceId, controlId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId }),
                        control = _.find(device.controls, { 'id': controlId });
                    $scope.$broadcast('message:edit-control', device, control);
                };

                $scope.aRemoveControl = function (deviceId, controlId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId }),
                        control = _.find(device.controls, { 'id': controlId });
                    $scope.$broadcast('message:remove-control', device, control);
                };
                $scope.aCopyControl = function (deviceId, controlId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId }),
                        control = _.find(device.controls, { 'id': controlId });
                    $scope.$broadcast('message:copy-control', device, control);
                };

                $scope.aNewDevice = function () {
                    $scope.$broadcast('message:new-device');
                };

                $scope.aEditDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId });
                    $scope.$broadcast('message:edit-device', device);
                };

                $scope.aRemoveDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId });
                    $scope.$broadcast('message:remove-device', device);
                };

                $scope.aCopyDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId });
                    $scope.$broadcast('message:copy-device', device);
                };

                $scope.activateDevice = function (deviceId) {
                    var device = _.find($scope.installation.devices, { 'id': deviceId });
                    installationService.activateDevice($scope.installation._id, device).then(function (response) {
                        $rootScope.$broadcast('message:installation-changed', $scope.installation);
                    });
                    $ionicListDelegate.closeOptionButtons();
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
                };
                /*
                 var updateTime = function () {
                 $scope.date.raw = new Date();
                 $timeout(updateTime, 1000);
                 };

                 updateTime();
                 */
                // Execute action on hide popover
                $scope.$on('popover.hidden', function () {
                    $ionicListDelegate.closeOptionButtons();
                });

                // Execute action on remove popover
                $scope.$on('popover.removed', function () {
                    console.log('popover removed');
                });

                $scope.setTimer = function (timer) {

                    var device = _.find($scope.installation.devices, { 'id': $scope.currentDeviceId }),
                        control = _.find(device.controls, { 'id': $scope.currentControlId }),
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

                    $scope.popover.hide();
                    $ionicListDelegate.closeOptionButtons();

                };

//****** protoyping ********************


                $scope.sparkSettings = {dataSource: []};

                $scope.sparkSettings.dataSource = [
                    { month: 1, 2010: 1115, 2011: 1358, 2012: 1661 },
                    { month: 2, 2010: 1099, 2011: 1375, 2012: 1742 },
                    { month: 3, 2010: 1114, 2011: 1423, 2012: 1677 },
                    { month: 4, 2010: 1150, 2011: 1486, 2012: 1650 },
                    { month: 5, 2010: 1205, 2011: 1511, 2012: 1589 },
                    { month: 6, 2010: 1235, 2011: 1529, 2012: 1602 },
                    { month: 7, 2010: 1193, 2011: 1573, 2012: 1593 },
                    { month: 8, 2010: 1220, 2011: 1765, 2012: 1634 },
                    { month: 9, 2010: 1272, 2011: 1771, 2012: 1750 },
                    { month: 10, 2010: 1345, 2011: 1672, 2012: 1745 },
                    { month: 11, 2010: 1370, 2011: 1741, 2012: 1720 },
                    { month: 12, 2010: 1392, 2011: 1643, 2012: 1684 }
                ];

                var sparklineFeed = $interval(function () {
                    var source = $scope.sparkSettings.dataSource,
                        lastValue = source.shift();
                    lastValue.month = lastValue.month + 1;
                    $scope.sparkSettings.dataSource = null;
                    source.push(lastValue);
                    $scope.sparkSettings.dataSource = source;
                    //$scope.sparkSettings.dataSource.push(lastValue);
                }, 5000);

                $scope.hasTopPost = false;
                $scope.hasComment = false;
                $scope.post = '';
                $scope.topPost = '';
                $scope.newTopPost = '';
                $scope.newComment = function () {
                    $scope.hasComment = true;
                };

                $scope.newTopPost = function () {
                    console.log(this.topPost);
                    $scope.hasTopPost = true;
                    $scope.newTopPost = this.topPost;
                    this.topPost = "";
                    $cordovaKeyboard.close();
                };

                $scope.phoneTo = function (tel) {
                    $window.location.href = 'tel:' + tel;
                };

                $scope.emailTo = function (email) {
                    $window.location.href = 'mailto:' + email;
                };

                $scope.navigateTo = function (lat, lng) {
                    if (ionic.Platform.isAndroid()) {
                        $window.location.href = 'geo:' + lat + ',' + lng + ';u=35';
                    } else {
                        $window.location.href = 'maps://maps.apple.com/?q=' + lat + ',' + lng;
                    }
                };

//****** protoyping ********************

                $scope.toggleDevice = function (device) {
                    $scope.shownDevice[device] = !$scope.isDeviceShown(device);
                };

                $scope.isDeviceShown = function (device) {
                    return $scope.shownDevice[device];
                };

                $scope.selectAction = function (time) {

                    $scope.selectedScale = _.find($scope.timeScales, { 'value': time.value });

                    angular.forEach($scope.installation.devices, function (device) {
                        angular.forEach(device.controls, function (control) {
                            var controlColor = _.find($scope.chartColor, { 'control': device.id + control.id});
                            if (controlColor) {
                                bobby.setTimeScale($scope.selectedScale, device.id, control.id);
                            }
                        });
                    });
                };

                $scope.showData = function (device, stream, type) {

                    var filterItem = device + stream + '-' + type,
                        controlColor = _.find($scope.chartColor, { 'control': device + stream });

                    /*
                     $log.info('control color:' + controlColor);
                     $log.info('filter item:' + filterItem);
                     */
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

                    } else {

                        var color = colorScheme[$scope.chartColorNumber];

                        $scope.showChart = true;

                        $rootScope.datastreams[device + stream].color = color;

                        $scope.chartColor.push({ control: device + stream, color: color});

                        ($scope.chartColorNumber < 19) ? $scope.chartColorNumber++ : $scope.chartColorNumber = 0;

                        bobby.getStream(device, stream);
                    }
                };

                $rootScope.$on('message:new-reading', function (evt, data) {

                    if ($scope.chartSettings.dataSource.length > 0 && _.find($scope.chartColor, { 'control': data.device + data.control})) {
                        $scope.chartSettings.dataSource.push({ 'name': data.device + data.control + '-' + data.type , 'timestamp': data.timestamp, 'value': data.value});
                    }
                });

                $rootScope.$on('message:data', function (evt, data) {
                    if (angular.isDefined(data.data) && data.data.length > 0) {
                        if ($scope.selectedScale.value <= 86400) {
                            $scope.chartLabel.label = { format: 'H:mm'};
                        } else if ($scope.selectedScale.value <= 604800) {
                            $scope.chartLabel.label = { format: 'ddd'};
                        } else if ($scope.selectedScale.value <= 2592000) {
                            $scope.chartLabel.label = { format: 'dd-MM'};
                        } else {
                            $scope.chartLabel.label = { format: 'MMM'};
                        }

                        $scope.chartSettings.argumentAxis = $scope.chartLabel;

                        var stream = data.device + data.control + '-' + data.type;
                        seriesData = _.filter(seriesData, function (item) {
                            return item.name !== stream;
                        });

                        _.forEach(data.data, function (obs) {
                            seriesData.push({ 'name': stream, 'timestamp': obs.timestamp, 'value': obs.value});
                        });

                        $timeout(function () {
                            $scope.chartSettings.dataSource = seriesData;
                        }, 25);

                    } else {
                        $scope.chartSettings.dataSource = [];
                    }

                }, true);


                if ($scope.shownDevice.length === 0) {
                    angular.forEach($scope.installation.devices, function (item) {
                        $scope.shownDevice[item.id] = true;
                    });
                }

                bobby.setInstallation($scope.installation);

            }
        ])

        .controller('MapCtrl', ['GoogleMapApi'.ns(), 'IsReady'.ns(), '$cordovaSplashscreen', '$scope', '$location', '$rootScope', '$cordovaGeolocation', 'Settings', 'icons', 'styles', 'installations', '$state', '$ionicLoading', '$ionicPopover', 'auth', 'auth0Service',
            function (GoogleMapApi, IsReady, $cordovaSplashscreen, $scope, $location, $rootScope, $cordovaGeolocation, Settings, icons, styles, installations, $state, $ionicLoading, $ionicPopover, auth, auth0Service) {

                var mapStyles = {'Custom grey blue': 'GreyBlue', 'Custom grey': 'grey', 'Google map': 'default', 'Apple map': 'ios'},
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

                $ionicPopover.fromTemplateUrl('templates/selectMapType.html', {
                    scope: $scope
                }).then(function (popover) {
                    $scope.popover = popover;
                });

                $scope.setMapStyle = function (mapStyle) {

                    Settings.set('mapStyle', mapStyle);

                    var settings = Settings.getSettings();
                    auth0Service.updateUser(auth.profile.user_id, { app: settings});

                    $scope.map.options.styles = styles[mapStyle];
                    $scope.popover.hide();

                    $scope.map.control.refresh();
                };

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
                    _.remove(markers, function (marker) { return marker.id  === installation._id; });
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
                            gridSize: 60,
                            ignoreHidden: true,
                            minimumClusterSize: 2,
                            styles: [
                                {
                                    height: 53,
                                    url: './images/m1.png',
                                    width: 53
                                },
                                {
                                    height: 56,
                                    url: './images/m2.png',
                                    width: 56
                                },
                                {
                                    height: 66,
                                    url: './images/m3.png',
                                    width: 66
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
                            maxZoom: 20,
                            minZoom: 3,
                            scrollwheel: true,
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

                    marker.icon = icons.gear;

                    $location.path('/app/main/' + marker.id);
                    /*
                     var request = {
                     placeId: 'ChIJmaSKgPYySUYRKLlyaho0O6Y'
                     };

                     $scope.details = ngGPlacesAPI.placeDetails(request)
                     .then(function (data) {

                     var newCard = _.find(installations, { '_id': marker.id });
                     newCard.id = Math.random();

                     $scope.cards = [];

                     if (data.photos) {
                     newCard.image = data.photos[0].getUrl({'maxWidth': 200, 'maxHeight': 110});
                     } else {
                     newCard.image = 'images/default-map.jpg';
                     }

                     $scope.cards.push(angular.extend({}, newCard));

                     return data;
                     });
                     */
                };

                $scope.onMarkerClicked = onMarkerClicked;

                _.each(markers, function (marker) {
                    marker.onClicked = function () {
                        onMarkerClicked(marker);
                    };
                });

                $scope.$on("$destroy", function () {
                    $scope.popover.remove();
                    $rootScope.origCenter = {latitude: $scope.map.center.latitude, longitude: $scope.map.center.longitude};
                    $rootScope.origZoom = $scope.map.control.getGMap().getZoom();
                });


                var onSuccess = function (position) {
                    $ionicLoading.hide();
                    $scope.map.center = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    $scope.map.control.getGMap().setZoom(14);
                    $scope.$apply();
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

            }]);

}());
