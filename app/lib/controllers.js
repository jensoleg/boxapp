(function () {
    'use strict';

    angular.module('BobbyApp.controllers', ['dx', 'ionic', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives', 'chart', 'box', 'wu.staticGmap'])

        .filter('int', function () {
            return function (v) {
                return parseInt(v, 10) || '';
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

        .controller('InstallationsCtrl', ['bobby', '$scope', '$state', 'installations', 'installationService', '$ionicListDelegate', '$timeout', '$ionicModal', '$ionicPopup', function (bobby, $scope, $state, installations, installationService, $ionicListDelegate, $timeout, $ionicModal, $ionicPopup) {

            $scope.installations = installations;
            $scope.newInst = {location: {'lat': null, 'lng': null}};

            $scope.clearSearch = function () {
                this.data.searchQuery = '';
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
                        _.pull(installations, installation);
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
            };

            $scope.doneNew = function () {
                $scope.newModal.hide();
                $scope.saveNew();
            };

            $scope.newInstallation = function () {
                $scope.newModal.show();
            };

            $scope.saveNew = function () {
                installationService.newInstallation($scope.newInst).then(function (response) {
                    $scope.installations.push(response);
                }, function (response) {
                    console.log('error', response);
                });
            };

            /* Copy an installation */
            $scope.copyInstallation = function (i) {
                var copy = _.cloneDeep(i);
                bobby.objectIdDel(copy);
                delete copy.__v;
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;
                $scope.newInst = copy;
                /* save in database */
                installationService.newInstallation($scope.newInst).then(function (response) {
                    $scope.installations.push(response);
                }, function (response) {
                    console.log('error', response);
                });

                $ionicListDelegate.closeOptionButtons();
            };
        }
        ])

        .
        controller('InstallationCtrl', ['bobby', '$scope', '$state', '$window', 'installation', 'installationService', '$ionicModal', '$ionicPopup', '$ionicListDelegate', function (bobby, $scope, $state, $window, installation, installationService, $ionicModal, $ionicPopup, $ionicListDelegate) {

            $scope.installation = installation;
            $scope.newDevice = {};

            /* Edit device */

            $ionicModal.fromTemplateUrl('templates/installation.device.edit.html', {
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

            $scope.edit = function (d) {
                $scope.device = d;
                $scope.editModal.show();
            };

            $scope.update = function () {
                installationService.updateDevice($state.params.id, $scope.device);
            };

            /* Remove device */

            $scope.remove = function (device) {
                var confirmPopup = $ionicPopup.confirm({
                    title: '',
                    template: 'Are you sure you want to remove ' + device.name + ' ' + device.placement + '?',
                    cancelType: 'button-clear button-dark',
                    okType: 'button-clear button-positive'
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        installationService.removeDevice($state.params.id, device._id).then(function (response) {
                            _.pull($scope.installation.devices, device);
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

            $scope.closeNew = function () {
                $scope.newModal.hide();
            };

            $scope.doneNew = function () {
                $scope.newModal.hide();
                $scope.saveNew();
            };

            $scope.addDevice = function () {
                $scope.newModal.show();
            };

            $scope.saveNew = function () {
                installationService.newDevice($state.params.id, $scope.newDevice).then(function (response) {
                    $scope.installation = response;
                }, function (response) {
                    console.log('error', response);
                });
            };

            /* Copy a device */
            $scope.copy = function (i) {
                var copy = _.cloneDeep(i);
                bobby.objectIdDel(copy);
                delete copy.__v;
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                $scope.newDevice = copy;
                $scope.saveNew();

                $ionicListDelegate.closeOptionButtons();
            };

            $scope.$on('$destroy', function () {
                $scope.editModal.remove();
                $scope.newModal.remove();

            });

            $scope.phoneTo = function (tel) {
                $window.location.href = 'tel:' + tel;
            };

            $scope.emailTo = function (email) {
                $window.location.href = 'mailto:' + email;
            };

            $scope.navigateTo = function (lat, lng) {
                $window.location.href = 'maps://maps.apple.com/?q=' + lat + ',' + lng;
            };
        }])

        .controller('DeviceCtrl', ['$stateParams', '$scope', 'device', function ($stateParams, $scope, device) {

            $scope.installationId = $stateParams.id;
            $scope.device = device;

        }])

        .controller('SensorCtrl', ['bobby', '$scope', '$state', '$ionicModal', '$ionicPopup', '$ionicListDelegate', 'installationService', function (bobby, $scope, $state, $ionicModal, $ionicPopup, $ionicListDelegate, installationService) {

            $scope.newControl = {};

            /* Edit Control */

            $ionicModal.fromTemplateUrl('templates/installation.control.edit.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.editSensorModal = modal;
            });

            $scope.closeEdit = function () {
                $scope.editSensorModal.hide();
                $ionicListDelegate.closeOptionButtons();
            };

            $scope.doneEdit = function () {
                $scope.editSensorModal.hide();
                $ionicListDelegate.closeOptionButtons();
                $scope.update();
            };

            $scope.edit = function (c) {
                $scope.control = c;
                $scope.editSensorModal.show();
            };

            $scope.update = function () {
                installationService.updateControl($state.params.id, $state.params.deviceid, $scope.control);
            };

            /* Remove control */

            $scope.remove = function (control) {
                var confirmPopup = $ionicPopup.confirm({
                    title: '',
                    template: 'Are you sure you want to remove ' + control.name + '?',
                    cancelType: 'button-clear button-dark',
                    okType: 'button-clear button-positive'
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        installationService.removeControl($state.params.id, $state.params.deviceid, control._id).then(function (response) {
                            _.pull($scope.$parent.device.controls, control);
                        }, function (response) {
                            console.log('error', response);
                        });
                    }
                    $ionicListDelegate.closeOptionButtons();
                });
            };

            /* new control */
            $ionicModal.fromTemplateUrl('templates/installation.control.new.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.newSensorModal = modal;
            });

            $scope.closeNew = function () {
                $scope.newSensorModal.hide();
            };

            $scope.doneNew = function () {
                $scope.newSensorModal.hide();
                $scope.saveNew();
            };

            $scope.addControl = function () {
                $scope.newSensorModal.show();
            };

            $scope.saveNew = function () {
                installationService.newControl($state.params.id, $state.params.deviceid, $scope.newControl).then(function (response) {
                    $scope.$parent.installation = response;
                    $scope.$parent.device = _.find(response.devices, function (d) {
                        return d._id == $scope.$parent.device._id;
                    });

                }, function (response) {
                    console.log('error', response);
                });
            };

            /* Copy a control */
            $scope.copy = function (i) {
                var copy = _.cloneDeep(i);
                bobby.objectIdDel(copy);
                delete copy.__v;
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                $scope.newControl = copy;
                $scope.saveNew();

                $ionicListDelegate.closeOptionButtons();
            };

            $scope.$on('$destroy', function () {
                $scope.editSensorModal.remove();
                $scope.newSensorModal.remove();
            });

        }])

        .controller('TriggerCtrl', ['bobby', '$scope', '$state', '$ionicModal', '$ionicPopup', '$ionicListDelegate', 'installationService', function (bobby, $scope, $state, $ionicModal, $ionicPopup, $ionicListDelegate, installationService) {

            $scope.newTrigger = {};
            $scope.device = $scope.$parent.device;

            /* Edit Trigger */

            $ionicModal.fromTemplateUrl('templates/installation.trigger.edit.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.editTriggerModal = modal;
            });

            $scope.closeEdit = function () {
                $scope.editTriggerModal.hide();
                $ionicListDelegate.closeOptionButtons();
            };

            $scope.doneEdit = function () {
                $scope.editTriggerModal.hide();
                $ionicListDelegate.closeOptionButtons();
                $scope.update();
            };

            $scope.edit = function (t) {
                $scope.trigger = t;
                $scope.editTriggerModal.show();
            };

            $scope.update = function () {
                installationService.updateTrigger($state.params.id, $state.params.deviceid, $scope.trigger);
            };

            /* Remove Trigger */

            $scope.remove = function (trigger) {
                var confirmPopup = $ionicPopup.confirm({
                    title: '',
                    template: 'Are you sure you want to remove ' + trigger.name + '?',
                    cancelType: 'button-clear button-dark',
                    okType: 'button-clear button-positive'
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        installationService.removeTrigger($state.params.id, $state.params.deviceid, trigger._id).then(function (response) {
                            _.pull($scope.device.triggers, trigger);
                        }, function (response) {
                            console.log('error', response);
                        });
                    }
                    $ionicListDelegate.closeOptionButtons();
                });
            };

            /* new trigger */
            $ionicModal.fromTemplateUrl('templates/installation.trigger.new.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.newTriggerModal = modal;
            });

            $scope.closeNew = function () {
                $scope.newTriggerModal.hide();
            };

            $scope.doneNew = function () {
                $scope.newTriggerModal.hide();
                $scope.saveNew();
            };

            $scope.addTrigger = function () {
                $scope.newTriggerModal.show();
            };

            $scope.saveNew = function () {
                installationService.newTrigger($state.params.id, $state.params.deviceid, $scope.newTrigger).then(function (response) {
                    $scope.$parent.installation = response;
                    $scope.device = _.find(response.devices, function (d) {
                        return d._id == $scope.device._id;
                    });
                }, function (response) {
                    console.log('error', response);
                });
            };

            /* Copy a trigger */
            $scope.copy = function (i) {
                var copy = _.cloneDeep(i);
                bobby.objectIdDel(copy);
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                $scope.newTrigger = copy;
                $scope.saveNew();

                $ionicListDelegate.closeOptionButtons();
            };

            $scope.$on('$destroy', function () {
                $scope.newTriggerModal.remove();
                $scope.editTriggerModal.remove();
            });

        }])

        .controller('ControlDetailCtrl', ['$scope', 'control', function ($scope, control) {

            $scope.control = control;

            $scope.gaugeSettings =
            {
                subvalues: $scope.gaugeSubvalues,
                scale: $scope.gaugeScale,
                rangeContainer: $scope.gaugeRange,
                tooltip: { enabled: true },
                value: $scope.gaugeValue
            };

            $scope.gaugeValue = (control.maxCritical - control.minCritical) / 2;

            $scope.gaugeScale =
            {
                startValue: control.minValue, endValue: control.maxValue,
                majorTick: { tickInterval: 5 },
                minorTick: {
                    visible: true,
                    tickInterval: 1
                },
                label: {
                    customizeText: function (arg) {
                        return arg.valueText + ' ' + control.unit.symbol + control.unit.units;
                    }
                },
                valueType: "numeric"
            };

            $scope.gaugeRange =
            {
                ranges: [
                    { startValue: control.minValue, endValue: control.minCritical, color: '#0077BE'},
                    { startValue: control.minCritical, endValue: control.maxCritical, color: '#E6E200'},
                    { startValue: control.maxCritical, endValue: control.maxValue, color: '#77DD77'}
                ],
                offset: 5
            };

            $scope.gaugeSettings.value = $scope.gaugeValue;
            $scope.gaugeSubvalues = [(control.maxCritical - control.minCritical)/2 - control.minCritical , (control.maxValue - control.minValue)/2 ];

            $scope.gaugeSettings.subvalues = $scope.gaugeSubvalues;
            $scope.gaugeSettings.scale = $scope.gaugeScale;
            $scope.gaugeSettings.rangeContainer = $scope.gaugeRange;
            $scope.gaugeSettings.value = $scope.gaugeValue;

        }])

        .controller('TriggerDetailCtrl', ['bobby', '$scope', '$state', 'trigger', '$ionicModal', '$ionicPopup', '$ionicListDelegate', 'installationService', function (bobby, $scope, $state, trigger, $ionicModal, $ionicPopup, $ionicListDelegate, installationService) {

            $scope.trigger = trigger;
            $scope.newRequest = {};

            /* Edit Request */

            $ionicModal.fromTemplateUrl('templates/trigger.request.edit.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.editRequestModal = modal;
            });

            $scope.closeEdit = function () {
                $scope.editRequestModal.hide();
                $ionicListDelegate.closeOptionButtons();
            };

            $scope.doneEdit = function () {
                $scope.editRequestModal.hide();
                $ionicListDelegate.closeOptionButtons();
                $scope.update();
            };

            $scope.edit = function (t) {
                $scope.request = t;
                $scope.editRequestModal.show();
            };

            $scope.update = function () {
                installationService.updateRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, $scope.request);
            };

            /* Remove Request */

            $scope.remove = function (request) {
                var confirmPopup = $ionicPopup.confirm({
                    title: '',
                    template: 'Are you sure you want to remove ' + request.name + '?',
                    cancelType: 'button-clear button-dark',
                    okType: 'button-clear button-positive'
                });
                confirmPopup.then(function (res) {

                    if (res) {
                        installationService.removeRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, request._id).then(function (response) {
                            _.pull($scope.trigger.requests, request);
                        }, function (response) {
                            console.log('error', response);
                        });
                    }

                    $ionicListDelegate.closeOptionButtons();
                });
            };

            /* new request */
            $ionicModal.fromTemplateUrl('templates/trigger.request.new.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.newRequestModal = modal;
            });

            $scope.closeNew = function () {
                $scope.newRequestModal.hide();
            };

            $scope.doneNew = function () {
                $scope.newRequestModal.hide();
                $scope.saveNew();
            };

            $scope.addRequest = function () {
                $scope.newRequestModal.show();
            };

            $scope.saveNew = function () {

                installationService.newRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, $scope.newRequest).then(function (response) {

                    function findNested(obj, key, memo) {
                        _.isArray(memo) || (memo = []);
                        _.forOwn(obj, function (val, i) {
                            if (i === key) {
                                memo.push(val);
                            } else {
                                findNested(val, key, memo);
                            }
                        });
                        return memo;
                    }

                    var triggers = findNested(response, 'triggers');

                    $scope.trigger = _.find(triggers[0], function (d) {
                        return d._id == $state.params.triggerid;
                    });

                }, function (response) {
                    console.log('error', response);
                });

            };

            /* Copy a Request */
            $scope.copy = function (i) {
                var copy = _.cloneDeep(i);
                bobby.objectIdDel(copy);
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                $scope.newRequest = copy;
                $scope.saveNew();

                $ionicListDelegate.closeOptionButtons();
            };

            $scope.$on('$destroy', function () {
                $scope.newRequestModal.remove();
                $scope.editRequestModal.remove();
            });


        }])

        .controller('BoxCtrl', ['installations', '$scope', '$rootScope', 'bobby', 'chart', 'box', function (installations, $scope, $rootScope, bobby, chart, box) {

            var ts = bobby.getTimeScale();

            $scope.domainName = $rootScope.domain.charAt(0).toUpperCase() + $rootScope.domain.slice(1);

            if (box.installation === null) {
                $scope.installation = box.installation = installations[0];
            } else {
                $scope.installation = _.find(installations, { '_id': box.installation._id });
            }

            $scope.installations = installations;

            $scope.timescale = chart.timescale;
            /* get graf time scale form settings */
            $scope.timeScale = _.find($scope.timescale, { 'value': ts.value });

            $scope.activeStream = box.activeStream;

            $scope.showChart = box.showChart;
            $scope.shownDevice = box.shownDevice;

            $scope.chartLabel = chart.chartLabel;
            $scope.series = chart.series;
            $scope.chartSettings = chart.chartSettings;

            $scope.toggleDevice = function (device) {
                $scope.shownDevice[device] = !$scope.isDeviceShown(device);
            };

            $scope.isDeviceShown = function (device) {
                return $scope.shownDevice[device];
            };

            $scope.selectInstallation = function (installation) {
                $scope.installation = box.installation = installation;
                bobby.setInstallation(installation);
            };

            $scope.selectAction = function (time, deviceid, id) {
                $scope.timeScale = _.find($scope.timescale, { 'value': time.value });
                bobby.setTimeScale($scope.timeScale, deviceid, id);
                $scope.showChart = true;
            };

            $scope.showData = function (device, stream) {
                if (!(angular.isUndefined($scope.activeStream) || $scope.activeStream === null) && $scope.activeStream.id === stream && $scope.activeStream.deviceid === device) {
                    $scope.activeStream = box.activeStream = null;
                    $scope.chartSettings.dataSource = null;
                } else {
                    $scope.showChart = true;
                    bobby.getStream(device, stream);
                    $scope.activeStream = box.activeStream = $rootScope.datastreams[device + stream];
                }
            };

            $rootScope.$on('message:new-reading', function (evt, data) {
                if ($scope.activeStream !== null) {
                    $scope.chartSettings.dataSource.push(data);
                }
            });

            $rootScope.$on('message:data', function (evt, data) {
                $scope.showChart = false;
                if (angular.isDefined(data) && data.length > 0 && $scope.activeStream !== null) {
                    if ($scope.timeScale.value <= 86400) {
                        $scope.chartLabel.label = { format: 'H:mm', font: { color: 'white'}};
                    } else if ($scope.timeScale.value <= 604800) {
                        $scope.chartLabel.label = { format: 'ddd', font: { color: 'white'}};
                    } else if ($scope.timeScale.value <= 2592000) {
                        $scope.chartLabel.label = { format: 'dd-MM', font: { color: 'white'}};
                    } else {
                        $scope.chartLabel.label = { format: 'MMM', font: { color: 'white'}};
                    }
                    if ($scope.activeStream.id === 'online') {
                        $scope.series[0].type = 'stepLine';
                    } else {
                        $scope.series[0].type = 'area';
                    }
                    $scope.chartSettings.argumentAxis = $scope.chartLabel;
                    $scope.chartSettings.series = $scope.series;
                    $scope.chartSettings.dataSource = data;
                } else {
                    $scope.chartSettings.dataSource = [];
                }
            }, true);

            bobby.setInstallation($scope.installation);

        }]);

}());