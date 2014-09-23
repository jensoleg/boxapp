(function () {
    'use strict';

    angular.module('BobbyApp.controllers', ['dx', 'ionic', 'ionic.contrib.ui.cards', 'google-maps', 'ngGPlaces', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives', 'chart', 'config.box', 'map-icons', 'map-styles'])

        .config(function (ngGPlacesAPIProvider) {
            ngGPlacesAPIProvider.setDefaults({
                radius: 1000,
                sensor: false,
                latitude: null,
                longitude: null,
                types: ['food'],
                map: null,
                elem: null,
                nearbySearchKeys: ['name', 'reference', 'vicinity'],
                placeDetailsKeys: ['formatted_address', 'formatted_phone_number', 'reference', 'website', 'photos'],
                nearbySearchErr: 'Unable to find nearby places',
                placeDetailsErr: 'Unable to find place details'
            });
        })

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

        .controller('InstallationsCtrl', ['bobby', '$scope', '$state', 'installations', 'installationService', '$ionicListDelegate', '$ionicModal', '$ionicPopup', function (bobby, $scope, $state, installations, installationService, $ionicListDelegate, $ionicModal, $ionicPopup) {

            $scope.installations = installations;
            $scope.newInst = {location: {'lat': null, 'lng': null}};
            $scope.$state = $state;

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
                $scope.newInst = {location: {'lat': null, 'lng': null}};
                $scope.newModal.show();
            };

            $scope.saveNew = function () {
                installationService.newInstallation($scope.newInst)
                    .then(function (response) {
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

        .controller('InstallationCtrl', ['bobby', 'icons', '$scope', '$state', '$window', 'installation', 'installationService', '$ionicModal', '$ionicPopup', '$ionicListDelegate', '$ionicSlideBoxDelegate', '$interval', function (bobby, icons, $scope, $state, $window, installation, installationService, $ionicModal, $ionicPopup, $ionicListDelegate, $ionicSlideBoxDelegate, $interval) {

            google.maps.visualRefresh = true;

            var marker = {
                id: installation._id,
                latitude: installation.location.lat,
                longitude: installation.location.lng,
                icon: icons.cube,
                options: {
                    visible: false
                }
            };


            angular.extend($scope, {
                map: {
                    control: {},
                    center: {
                        latitude: installation.location.lat,
                        longitude: installation.location.lng
                    },
                    marker: marker,
                    zoom: 12,
                    options: {
                        disableDefaultUI: true,
                        panControl: false,
                        navigationControl: false,
                        scrollwheel: false,
                        scaleControl: false
                    },
                    refresh: function () {
                        $scope.map.control.refresh(origCenter);
                    },
                    onMarkerClick: function (m) {
                        //$location.path('/app/installations/' + m.id);
                        $state.go('app.main', {id: m.id});
                    }
                }
            });

            $scope.installation = installation;
            $scope.newDevice = {};
            $scope.currentSlideIndex = 0;
            /*
             $scope.nextSlide = function () {
             $ionicSlideBoxDelegate.next();
             $scope.currentSlideIndex = $ionicSlideBoxDelegate.currentIndex();
             };

             $scope.previousSlide = function () {
             $ionicSlideBoxDelegate.previous();
             $scope.currentSlideIndex = $ionicSlideBoxDelegate.currentIndex();
             };

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

             $interval(function () {
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
             };
             */
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

            $scope.activate = function (device) {
                installationService.activateDevice(device);
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
                        installationService.removeDevice($state.params.id, device._id)
                            .then(function (response) {
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
                $scope.newDevice = {};
                $scope.newModal.show();
            };

            $scope.saveNew = function () {
                installationService.newDevice($state.params.id, $scope.newDevice)
                    .then(function (response) {
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
                copy.id = null;

                $scope.newDevice = copy;
                $scope.saveNew();

                $ionicListDelegate.closeOptionButtons();
            };

            $scope.$on('$destroy', function () {
                $scope.editModal.remove();
                $scope.newModal.remove();

            });
            /*
             $scope.phoneTo = function (tel) {
             $window.location.href = 'tel:' + tel;
             };

             $scope.emailTo = function (email) {
             $window.location.href = 'mailto:' + email;
             };

             $scope.navigateTo = function (lat, lng) {
             $window.location.href = 'maps://maps.apple.com/?q=' + lat + ',' + lng;
             };
             */
        }])

        .controller('DeviceCtrl', ['$stateParams', '$scope', 'device', function ($stateParams, $scope, device) {

            $scope.installationId = $stateParams.id;
            $scope.device = device;

        }])

        .controller('SensorCtrl', ['bobby', '$scope', '$rootScope', '$state', '$ionicModal', '$ionicPopup', '$ionicListDelegate', 'installationService', function (bobby, $scope, $rootScope, $state, $ionicModal, $ionicPopup, $ionicListDelegate, installationService) {

            $scope.newControl = {};
            $scope.types = ['data', 'status'];

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
                        installationService.removeControl($state.params.id, $state.params.deviceid, control._id)
                            .then(function (response) {
                                $scope.$parent.installation = response;
                                $scope.$parent.device = _.find(response.devices, function (d) {
                                    return d._id === $scope.$parent.device._id;
                                });
                                $rootScope.$broadcast('message:control-removed', control);

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
                $scope.newControl = {};
                $scope.newSensorModal.show();
            };

            $scope.saveNew = function () {
                installationService.newControl($state.params.id, $state.params.deviceid, $scope.newControl)
                    .then(function (response) {
                        $scope.$parent.installation = response;
                        $scope.$parent.device = _.find(response.devices, function (d) {
                            return d._id === $scope.$parent.device._id;
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

        .controller('TriggerCtrl', ['bobby', '$scope', '$rootScope', '$state', '$ionicModal', '$ionicPopup', '$ionicListDelegate', 'installationService', function (bobby, $scope, $rootScope, $state, $ionicModal, $ionicPopup, $ionicListDelegate, installationService) {

            $scope.newTrigger = {};

            $rootScope.$on('message:control-removed', function (evt, control) {
                $scope.device = $scope.$parent.device;
            });

            $scope.operators = ['lt', 'lte', 'gt', 'gte', 'eq'];

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
                $scope.device = $scope.$parent.device;
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
                        installationService.removeTrigger($state.params.id, $state.params.deviceid, trigger._id)
                            .then(function (response) {
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
                $scope.device = $scope.$parent.device;
                $scope.newTrigger = {};
                $scope.newTriggerModal.show();
            };

            $scope.saveNew = function () {
                installationService.newTrigger($state.params.id, $state.params.deviceid, $scope.newTrigger)
                    .then(function (response) {
                        $scope.$parent.installation = response;
                        $scope.device = _.find(response.devices, function (d) {
                            return d._id === $scope.device._id;
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

            $scope.gaugeSettings = {
                subvalues: $scope.gaugeSubvalues,
                scale: $scope.gaugeScale,
                rangeContainer: $scope.gaugeRange,
                tooltip: { enabled: true },
                value: $scope.gaugeValue
            };

            $scope.gaugeValue = (control.maxCritical - control.minCritical) / 2;

            $scope.gaugeScale = {
                startValue: control.minValue,
                endValue: control.maxValue,
                majorTick: { tickInterval: 5 },
                minorTick: {
                    visible: true,
                    tickInterval: 1
                },
                label: {
                    customizeText: function (arg) {
                        if (control.unit && control.unit.symbol && control.unit.units) {
                            return arg.valueText + ' ' + control.unit.symbol + control.unit.units;
                        }

                        if (control.unit && control.unit.symbol) {
                            return arg.valueText + ' ' + control.unit.symbol;
                        }

                        if (control.unit && control.unit.units) {
                            return arg.valueText + ' ' + control.unit.units;
                        }
                    },
                    valueType: "numeric"
                }
            };

            $scope.gaugeRange = {
                ranges: [
                    { startValue: control.minValue, endValue: control.minCritical, color: '#0077BE'},
                    { startValue: control.minCritical, endValue: control.maxCritical, color: '#E6E200'},
                    { startValue: control.maxCritical, endValue: control.maxValue, color: '#77DD77'}
                ],
                offset: 5
            };

            $scope.gaugeSettings.value = $scope.gaugeValue;
            $scope.gaugeSubvalues = [(control.maxCritical - control.minCritical) / 2 - control.minCritical, (control.maxValue - control.minValue) / 2 ];

            $scope.gaugeSettings.subvalues = $scope.gaugeSubvalues;
            $scope.gaugeSettings.scale = $scope.gaugeScale;
            $scope.gaugeSettings.rangeContainer = $scope.gaugeRange;
            $scope.gaugeSettings.value = $scope.gaugeValue;

        }])

        .controller('TriggerDetailCtrl', ['bobby', '$scope', '$state', 'trigger', 'device', 'util', '$ionicModal', '$ionicPopup', '$ionicListDelegate', 'installationService', function (bobby, $scope, $state, trigger, device, util, $ionicModal, $ionicPopup, $ionicListDelegate, installationService) {

            var responseColor;

            $scope.trigger = trigger;
            $scope.newRequest = {};

            $scope.myControl = _.find(device.controls, function (c) {
                return c.id === trigger.stream_id;
            });

            $scope.getColor = function () {
                return responseColor;
            };

            $scope.formatRequest = function (r) {
                $scope.newRequest.request_options = JSON.stringify(JSON.parse(r), null, 3);
            };

            $scope.sendRequest = function (request) {
                if (!request) {
                    return;
                }

                installationService.requester(JSON.stringify(JSON.parse(request), null, 3))
                    .then(function (response) {
                        $scope.requestResponse = JSON.parse(response);
                        responseColor = '#66cc33';
                    }, function (response) {
                        $scope.requestResponse = response;
                        responseColor = '#ef4e3a';
                    });
            };

            $scope.clearResponse = function () {
                $scope.requestResponse = null;
                responseColor = null;
            };

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
                responseColor = null;
                $scope.requestResponse = null;

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
                        installationService.removeRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, request._id)
                            .then(function (response) {
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
                responseColor = null;
                $scope.newRequest = {};
                $scope.requestResponse = null;
                $scope.newRequestModal.show();
            };

            $scope.saveNew = function () {

                installationService.newRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, $scope.newRequest)
                    .then(function (response) {

                        var triggers = util.findNested(response, 'triggers');

                        $scope.trigger = _.find(triggers[0], function (d) {
                            return d._id === $state.params.triggerid;
                        });

                        console.log($scope.trigger);

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

        .controller('BoxCtrl', ['installations', '$scope', '$state', '$rootScope', '$window', 'bobby', 'chart', 'box', '$interval', 'icons', function (installations, $scope, $state, $rootScope, $window, bobby, chart, box, $interval, icons) {

            var ts = bobby.getTimeScale();

            $scope.domainName = $rootScope.domain.charAt(0).toUpperCase() + $rootScope.domain.slice(1);

            if ($state.params.id && box.installation && box.installation._id === $state.params.id) {
                $scope.installation = box.installation;
            } else if ($state.params.id) {
                box.activeStream = null;
                box.showChart = false;
                box.shownDevice = [];
                $scope.installation = box.installation = _.find(installations, { '_id': $state.params.id });
            } else if (box.installation === null) {
                $scope.installation = box.installation = installations[0];
            } else {
                $scope.installation = _.find(installations, { '_id': box.installation._id });
            }


            /****** protoyping ********************/

            google.maps.visualRefresh = true;

            var marker = {
                id: $scope.installation._id,
                latitude: $scope.installation.location.lat,
                longitude: $scope.installation.location.lng,
                icon: icons.cube,
                options: {
                    visible: false
                }
            };


            angular.extend($scope, {
                map: {
                    control: {},
                    center: {
                        latitude: $scope.installation.location.lat,
                        longitude: $scope.installation.location.lng
                    },
                    marker: marker,
                    zoom: 12,
                    options: {
                        disableDefaultUI: true,
                        panControl: false,
                        navigationControl: false,
                        scrollwheel: false,
                        scaleControl: false
                    },
                    refresh: function () {
                        $scope.map.control.refresh(origCenter);
                    },
                    onMarkerClick: function (m) {
                        //$location.path('/app/installations/' + m.id);
                        $state.go('app.main', {id: m.id});
                    }
                }
            });

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

            $interval(function () {
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
            };

            $scope.phoneTo = function (tel) {
                $window.location.href = 'tel:' + tel;
            };

            $scope.emailTo = function (email) {
                $window.location.href = 'mailto:' + email;
            };

            $scope.navigateTo = function (lat, lng) {
                $window.location.href = 'maps://maps.apple.com/?q=' + lat + ',' + lng;
            };

            /****** protoyping ********************/



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


            $scope.controlDetails = function (deviceId, controlId) {

                var device = _.find($scope.installation.devices, { 'id': deviceId }),
                    control = _.find(device.controls, { 'id': controlId });

                $state.go('app.control', {id: $state.params.id, deviceid: device._id, controlid: control._id});
            };

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
                        $scope.chartLabel.label = { format: 'H:mm'};
                    } else if ($scope.timeScale.value <= 604800) {
                        $scope.chartLabel.label = { format: 'ddd'};
                    } else if ($scope.timeScale.value <= 2592000) {
                        $scope.chartLabel.label = { format: 'dd-MM'};
                    } else {
                        $scope.chartLabel.label = { format: 'MMM'};
                    }
                    /*
                     if ($scope.activeStream.id === 'online') {
                     $scope.series[0].type = 'stepLine';
                     } else {
                     $scope.series[0].type = 'area';
                     }
                     */
                    $scope.chartSettings.argumentAxis = $scope.chartLabel;
                    $scope.chartSettings.series = $scope.series;
                    $scope.chartSettings.dataSource = data;
                } else {
                    $scope.chartSettings.dataSource = [];
                }
            }, true);

            if ($scope.shownDevice.length == 0) {
                angular.forEach($scope.installation.devices, function (item) {
                    $scope.shownDevice[item.id] = true;
                });
            }

            bobby.setInstallation($scope.installation);

            $scope.doRefresh = function () {

                bobby.refreshInstallation($scope.installation);

                $scope.$broadcast('scroll.refreshComplete');
                /*
                 $http.get('/new-items')
                 .success(function(newItems) {
                 $scope.items = newItems;
                 })
                 .finally(function() {
                 // Stop the ion-refresher from spinning
                 $scope.$broadcast('scroll.refreshComplete');
                 });
                 */
            };

        }])

        .controller('MapCtrl', ['$scope', '$location', '$rootScope', 'ngGPlacesAPI', 'Settings', 'icons', 'styles', 'installations', '$state', '$ionicLoading', function ($scope, $location, $rootScope, ngGPlacesAPI, Settings, icons, styles, installations, $state, $ionicLoading) {

            var mapStyles = {'Custom grey blue': 'GreyBlue', 'Custom grey': 'grey', 'Google map': 'default', 'Apple map': 'ios'},
                markers = [];

            $scope.$state = $state;

            // Enable the new Google Maps visuals until it gets enabled by default.
            // See http://googlegeodevelopers.blogspot.ca/2013/05/a-fresh-new-look-for-maps-api-for-all.html
            google.maps.visualRefresh = true;

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
                        styles: styles[mapStyles[Settings.get('mapStyle')]]
                    },
                    zoom: $rootScope.origZoom ? $rootScope.origZoom : 7,
                    dragging: true,
                    bounds: {},
                    markers: markers,
                    events: {
                        tilesloaded: function (map, eventName, originalEventArgs) {
                        }
                    },
                    getGMap: function () {
                    }
                }
            });

            $scope.map.markers = markers;

            var onMarkerClicked = function (marker) {

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
                navigator.geolocation.getCurrentPosition(onSuccess, onError);
            };

            /*
             $scope.refreshMap = function () {
             //optional param if you want to refresh you can pass null undefined or false or empty arg
             $scope.map.control.refresh({latitude: 32.779680, longitude: -79.935493});
             $scope.map.control.getGMap().setZoom(11);
             };

             var origCenter = {latitude: $scope.map.center.latitude, longitude: $scope.map.center.longitude};
             */
        }])

        .controller('CardCtrl', ['$scope', '$location', '$window', '$ionicSwipeCardDelegate', function ($scope, $location, $window, $ionicSwipeCardDelegate) {
            $scope.status = function () {
                var card = $ionicSwipeCardDelegate.getSwipebleCard($scope);
                card.swipe();
                $location.path('/app/main/' + $scope.$parent.card._id);
            };
            $scope.setup = function () {
                var card = $ionicSwipeCardDelegate.getSwipebleCard($scope);
                card.swipe();
                $location.path('/app/installations/' + $scope.$parent.card._id);
            };

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

        .controller('NotesCtrl', ['$scope', '$timeout', '$ionicScrollDelegate', function ($scope, $timeout, $ionicScrollDelegate) {

            var alternate,
                isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

            $scope.sendMessage = function () {
                alternate = !alternate;
                $scope.messages.push({
                    userId: alternate ? '12345' : '54321',
                    text: $scope.data.message
                });
                delete $scope.data.message;
                $ionicScrollDelegate.scrollBottom(true);
            };

            $scope.inputUp = function () {
                if (isIOS) $scope.data.keyboardHeight = 216;
                $timeout(function () {
                    $ionicScrollDelegate.scrollBottom(true);
                }, 300);

            };
            $scope.inputDown = function () {
                if (isIOS) $scope.data.keyboardHeight = 0;
                $ionicScrollDelegate.resize();
            };

            $scope.data = {};
            $scope.myId = '1';
            $scope.messages = [
                {userid: '1', text: 'Hej dfsd dsf dsfs dfsdf sdfdsf dsfsd fdsfdsf sdfdsf '},
                {userid: '2', text: 'Hej dfsd dsf dsfs dfsdf sdfdsf dsfsd fdsfdsf sdfdsf'},
                {userid: '1', text: 'Hej dfsd dsf dsfs dfsdf sdfdsf dsfsd fdsfdsf sdfdsf Hej dfsd dsf dsfs dfsdf sdfdsf dsfsd fdsfdsf sdfdsf'},
                {userid: '2', text: 'Hej dfsd dsf dsfs dfsdf sdfdsf dsfsd fdsfdsf sdfdsf Hej dfsd dsf dsfs dfsdf sdfdsf dsfsd fdsfdsf sdfdsf Hej dfsd dsf dsfs dfsdf sdfdsf dsfsd fdsfdsf sdfdsf'}
            ];

        }]);

}());