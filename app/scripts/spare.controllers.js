(function () {
    'use strict';

    angular.module('BobbyApp.spare.controllers', ['ionic', 'google-maps', 'ngGPlaces', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives', 'chart', 'config.box', 'map-icons', 'map-styles'])


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

}());