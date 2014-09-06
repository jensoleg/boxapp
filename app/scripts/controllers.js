(function () {
    'use strict';

    angular.module('BobbyApp.controllers', ['dx', 'ionic', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives', 'chart', 'box'])

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

        .controller('InstallationsCtrl', ['$scope', 'installations', 'installationService', '$ionicScrollDelegate', '$ionicListDelegate', '$timeout', '$ionicModal', '$ionicPopup', function ($scope, installations, installationService, $ionicScrollDelegate, $ionicListDelegate, $timeout, $ionicModal, $ionicPopup) {

            var adjustScroll = function () {
                var scrollView = $ionicScrollDelegate.getScrollView();

                if (scrollView.__contentHeight < scrollView.__clientHeight) {
                    $scope.showSearch = false;
                } else {
                    $scope.showSearch = true;
                    $ionicScrollDelegate.scrollTo(0, 44, false);
                }

            };

            $timeout(function () {
                adjustScroll();
            }, 300);


            $scope.installations = installations;
            $scope.showSearch = false;
            $scope.data = {};
            $scope.clearSearch = function () {
                $scope.data.searchQuery = '';
            };

            /* Edit installation */

            $ionicModal.fromTemplateUrl('/templates/installation.edit.html', {
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

                        installationService.removeInstallation(installation);
                        _.pull(installations, installation);

                        console.log('You are sure');
                    }
                    $ionicListDelegate.closeOptionButtons();
                });

                $scope.installation = null;

            };

            /* Add new installation */

            $ionicModal.fromTemplateUrl('/templates/installation.new.html', {
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

            $scope.$on('$destroy', function () {
                $scope.newModal.remove();
            });

            $scope.newInstallation = function () {
                $scope.newInstallation = {"name": "", "placement": ""};
                $scope.newModal.show();
            };

            $scope.saveNew = function () {

                /* save in database */
                installationService.newInstallation($scope.newInstallation).then(function (response) {
                    $scope.installations.push(response);
                }, function (response) {
                    console.log('error', response);
                });
            };

            var objectIdDel = function (copiedObjectWithId) {
                if (copiedObjectWithId !== null && typeof copiedObjectWithId !== 'string' &&
                    typeof copiedObjectWithId !== 'number' && typeof copiedObjectWithId !== 'boolean') {
                    //for array length is defined however for objects length is undefined
                    if (typeof copiedObjectWithId.length === 'undefined') {
                        delete copiedObjectWithId._id;
                        for (var key in copiedObjectWithId) {
                            objectIdDel(copiedObjectWithId[key]); //recursive del calls on object elements
                        }
                    }
                    else {
                        for (var i = 0; i < copiedObjectWithId.length; i++) {
                            objectIdDel(copiedObjectWithId[i]);  //recursive del calls on array elements
                        }
                    }
                }
            };

            /* Copy an installation */
            $scope.copyInstallation = function (i) {
                var copy = _.cloneDeep(i);
                objectIdDel(copy);
                delete copy.__v;
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                /* save in database */
                installationService.newInstallation(copy).then(function (response) {
                    $scope.installations.push(response);
                }, function (response) {
                    console.log('error', response);
                });

                $ionicListDelegate.closeOptionButtons();
            };
        }
        ])

        .
        controller('InstallationCtrl', ['$scope', 'installation', 'installationService', '$ionicModal', '$ionicPopup', '$ionicListDelegate', function ($scope, installation, installationService, $ionicModal, $ionicPopup, $ionicListDelegate) {

            $scope.installation = installation;

            /* Edit device */

            $ionicModal.fromTemplateUrl('/templates/installation.device.edit.html', {
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
            });

            $scope.edit = function (d) {
                $scope.device = d;
                $scope.editModal.show();
            };

            $scope.update = function () {
                installationService.updateDevice($scope.device);
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
                        installationService.removeDevice(device._id).then(function (response) {
                            _.pull($scope.installation.devices, device);
                        }, function (response) {
                            console.log('error', response);
                        });
                    }
                    $ionicListDelegate.closeOptionButtons();
                });

            };

            /* new device */
            $ionicModal.fromTemplateUrl('/templates/installation.device.new.html', {
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

            $scope.$on('$destroy', function () {
                $scope.newModal.remove();
            });

            $scope.addDevice = function () {
                $scope.newDevice = {"id": "", "name": "", "placement": ""};
                $scope.newModal.show();
            };

            $scope.saveNew = function () {
                installationService.newDevice($scope.installation._id, $scope.newDevice).then(function (response) {
                    $scope.installation = response;
                }, function (response) {
                    console.log('error', response);
                });
            };

            var objectIdDel = function (copiedObjectWithId) {
                if (copiedObjectWithId !== null && typeof copiedObjectWithId !== 'string' &&
                    typeof copiedObjectWithId !== 'number' && typeof copiedObjectWithId !== 'boolean') {
                    //for array length is defined however for objects length is undefined
                    if (typeof copiedObjectWithId.length === 'undefined') {
                        delete copiedObjectWithId._id;
                        for (var key in copiedObjectWithId) {
                            objectIdDel(copiedObjectWithId[key]); //recursive del calls on object elements
                        }
                    }
                    else {
                        for (var i = 0; i < copiedObjectWithId.length; i++) {
                            objectIdDel(copiedObjectWithId[i]);  //recursive del calls on array elements
                        }
                    }
                }
            };

            /* Copy a device */
            $scope.copy = function (i) {
                var copy = _.cloneDeep(i);
                objectIdDel(copy);
                delete copy.__v;
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                $scope.newDevice = copy;
                $scope.saveNew();

                $ionicListDelegate.closeOptionButtons();
            };

        }])

        .controller('DeviceCtrl', ['$stateParams', '$scope', 'device', function ($stateParams, $scope, device) {

            $scope.installationId = $stateParams.id;
            $scope.device = device;

        }])

        .controller('SensorCtrl', ['$scope', '$ionicModal', '$ionicPopup', '$ionicListDelegate', 'installationService', function ($scope, $ionicModal, $ionicPopup, $ionicListDelegate, installationService) {

            /* Edit Control */

            $ionicModal.fromTemplateUrl('/templates/installation.control.edit.html', {
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

            $scope.$on('$destroy', function () {
                $scope.editSensorModal.remove();
            });

            $scope.edit = function (c) {
                $scope.control = c;
                $scope.editSensorModal.show();
            };

            $scope.update = function () {
                installationService.updateControl($scope.control);
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
                        installationService.removeControl(control._id).then(function (response) {
                            _.pull($scope.$parent.device.controls, control);
                        }, function (response) {
                            console.log('error', response);
                        });
                    }
                    $ionicListDelegate.closeOptionButtons();
                });
            };

            /* new device */
            $ionicModal.fromTemplateUrl('/templates/installation.control.new.html', {
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

            $scope.$on('$destroy', function () {
                $scope.newSensorModal.remove();
            });

            $scope.addControl = function () {
                $scope.newControl = {"name": ""};
                $scope.newSensorModal.show();
            };

            $scope.saveNew = function () {
                installationService.newControl($scope.device._id, $scope.newControl).then(function (response) {
                    $scope.$parent.installation = response;

                    $scope.$parent.device = _.find(response.devices, function (d) {
                        return d._id == $scope.$parent.device._id;
                    });

                }, function (response) {
                    console.log('error', response);
                });
            };


            var objectIdDel = function (copiedObjectWithId) {
                if (copiedObjectWithId !== null && typeof copiedObjectWithId !== 'string' &&
                    typeof copiedObjectWithId !== 'number' && typeof copiedObjectWithId !== 'boolean') {
                    //for array length is defined however for objects length is undefined
                    if (typeof copiedObjectWithId.length === 'undefined') {
                        delete copiedObjectWithId._id;
                        for (var key in copiedObjectWithId) {
                            objectIdDel(copiedObjectWithId[key]); //recursive del calls on object elements
                        }
                    }
                    else {
                        for (var i = 0; i < copiedObjectWithId.length; i++) {
                            objectIdDel(copiedObjectWithId[i]);  //recursive del calls on array elements
                        }
                    }
                }
            };

            /* Copy a device */
            $scope.copy = function (i) {
                var copy = _.cloneDeep(i);
                objectIdDel(copy);
                delete copy.__v;
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                $scope.newControl = copy;
                $scope.saveNew();

                $ionicListDelegate.closeOptionButtons();
            };

        }])

        .controller('TriggerCtrl', ['$stateParams', '$scope', 'device', function ($stateParams, $scope, device) {

            $scope.installationId = $stateParams.id;
            $scope.device = device;


            $scope.editControl = function (control) {
                window.alert('Edit control' + control.name);
            };

            $scope.removeControl = function (control) {
                window.alert('remove control' + control.name);
            };

            $scope.newControl = function () {
                window.alert('new control');
            };

            $scope.editTrigger = function (trigger) {
                window.alert('Edit trigger' + trigger.stream_id);
            };

            $scope.removeTrigger = function (trigger) {
                window.alert('remove trigger' + trigger.stream_id);
            };

            $scope.newTrigger = function () {
                window.alert('new trigger');
            };

        }])

        .controller('ControlCtrl', ['$scope', 'control', function ($scope, control) {

            $scope.control = control;

        }])

        .controller('TriggerCtrl', ['$scope', function ($scope) {

           // $scope.trigger = trigger;

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