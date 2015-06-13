(function () {
    'use strict';

    angular.module('BobbyApp.alarms.controllers', ['ionic', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])


        .controller('TriggerCtrl', ['bobby', '$scope', '$rootScope', '$state', '$ionicModal', '$ionicPopup', 'installationService', function (bobby, $scope, $rootScope, $state, $ionicModal, $ionicPopup, installationService) {

            $scope.newTrigger = {};

            $rootScope.$on('message:control-removed', function (evt, control) {
                $scope.device = $scope.$parent.device;
            });

            $scope.operators = ['lt', 'lte', 'gt', 'gte', 'eq'];

            $scope.$on('message:edit-alarms', function (evt, installation, device, control) {
                $scope.installation = installation;
                $scope.device = device;
                $scope.control = control;
                $scope.editTriggersModal.show();
            });


            $scope.addRequest = function (trigger) {
                if (angular.isDefined(trigger)) {
                    $rootScope.$broadcast('message:add-request', $scope.control, trigger);
                } else {
                    $rootScope.$broadcast('message:add-request', $scope.control, $scope.newTrigger);
                }
            };

            $scope.editRequest = function (trigger, request) {
                $rootScope.$broadcast('message:edit-request', $scope.trigger, request);
            };

            /* Edit Trigger list*/

            $ionicModal.fromTemplateUrl('templates/installation.triggers.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                $scope.editTriggersModal = modal;
            });

            $scope.closeEditTriggers = function () {
                $scope.editTriggersModal.hide();
            };

            /* Edit Trigger */

            $ionicModal.fromTemplateUrl('templates/installation.trigger.edit.html', {
                scope: $scope,
                animation: 'slide-in-right'
            }).then(function (modal) {
                $scope.editTriggerModal = modal;
            });

            $scope.closeEdit = function () {
                $scope.editTriggerModal.hide();
            };

            $scope.doneEdit = function () {
                $scope.editTriggerModal.hide();
                $scope.update();
            };

            $scope.editTrigger = function (t) {
                $scope.trigger = t;
                $scope.editTriggerModal.show();
            };

            $scope.update = function () {
                installationService.updateTrigger($scope.installation._id, $scope.device._id,  $scope.trigger)
                    .then(function (response) {
                        console.log('update success :', response);
                    }, function (response) {
                        console.log('update error :', response);
                    });
            };

            /* Remove Trigger */

            $scope.removeTrigger = function (trigger) {
                var confirmPopup = $ionicPopup.confirm({
                    title: '',
                    template: 'Are you sure you want to remove ' + trigger.name + '?',
                    cancelType: 'button-clear button-dark',
                    okType: 'button-clear button-positive'
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        installationService.removeTrigger($scope.installation._id, $scope.device._id, trigger._id)
                            .then(function (response) {
                                _.pull($scope.device.triggers, trigger);
                            }, function (response) {
                                console.log('error', response);
                            });
                    }
                });
            };

            /* new trigger */
            $ionicModal.fromTemplateUrl('templates/installation.trigger.new.html', {
                scope: $scope,
                animation: 'slide-in-right'
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
                //$scope.device = $scope.$parent.device;
                $scope.newTrigger = {requests: []};
                $scope.newTriggerModal.show();
            };

            $scope.saveNew = function () {
                installationService.newTrigger($scope.installation._id, $scope.device._id, $scope.newTrigger)
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
            };

            $scope.$on('$destroy', function () {
                $scope.newTriggerModal.remove();
                $scope.editTriggerModal.remove();
                $scope.editTriggersModal.remove();
            });

        }])

        .controller('RequestCtrl', ['bobby', '$scope', '$rootScope', '$state', 'util', '$ionicModal', '$ionicPopup', 'installationService', function (bobby, $scope, $rootScope, $state, util, $ionicModal, $ionicPopup, installationService) {

            var responseColor;

            $scope.newRequest = {};

            $rootScope.$on('message:add-request', function (evt, control, trigger) {
                $scope.control = control;
                $scope.trigger = trigger;
                $scope.addRequest();
            });

            $rootScope.$on('message:edit-request', function (evt, trigger, request) {
                $scope.trigger = trigger;
                $scope.request = request;
                $scope.edit();
            });

            $scope.getColor = function () {
                return responseColor;
            };

            $scope.formatRequest = function (r) {
                $scope.request.request_options = $scope.newRequest.request_options = JSON.stringify(JSON.parse(r), null, '\t');
            };

            $scope.sendRequest = function (request) {
                if (!request) {
                    return;
                }

                installationService.requester(JSON.stringify(JSON.parse(request), null, 3))
                    .then(function (response) {
                        $scope.requestResponse = response;
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
                animation: 'slide-in-right'
            }).then(function (modal) {
                $scope.editRequestModal = modal;
            });

            $scope.closeEdit = function () {
                $scope.request.request_options = JSON.parse($scope.request.request_options);
                $scope.editRequestModal.hide();
            };

            $scope.doneEdit = function () {
                $scope.editRequestModal.hide();
                $scope.request.request_options = JSON.parse($scope.request.request_options);
//                $scope.update();
            };

            $scope.edit = function (r) {
                responseColor = null;
                $scope.requestResponse = null;
//                $scope.request = r;
                $scope.request.request_options = JSON.stringify($scope.request.request_options, null, '\t');
                $scope.editRequestModal.show();
            };

            $scope.update = function () {
//                installationService.updateRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, $scope.request);
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

                    _.pull($scope.device.triggers[XXXXX], request);
                    /* remove trigger form device object
                     if (res) {
                     installationService.removeRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, request._id)
                     .then(function (response) {
                     _.pull($scope.trigger.requests, request);
                     }, function (response) {
                     console.log('error', response);
                     });
                     }
                     */
                });
            };

            /* new request */

            $ionicModal.fromTemplateUrl('templates/trigger.request.new.html', {
                scope: $scope,
                animation: 'slide-in-right'
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
                $scope.newRequest.stream_id = $scope.control.id;
                $scope.requestResponse = null;
                $scope.newRequestModal.show();
            };

            $scope.saveNew = function () {

                // link new request on trigger
                $scope.newRequest.request_options =  JSON.parse($scope.newRequest.request_options);
                $scope.trigger.requests.push($scope.newRequest);

                /*
                 installationService.newRequest($state.params.id, $state.params.deviceid, $state.params.triggerid, $scope.newRequest)
                 .then(function (response) {

                 var triggers = util.findNested(response, 'triggers');

                 $scope.trigger = _.find(triggers[0], function (d) {
                 return d._id === $state.params.triggerid;
                 });

                 }, function (response) {
                 console.log('error', response);
                 });
                 */
            };

            /* Copy a Request */

            $scope.copy = function (i) {
                var copy = _.cloneDeep(i);
                bobby.objectIdDel(copy);
                delete copy.$$hashKey;
                copy.name = 'Copy of ' + i.name;

                $scope.newRequest = copy;
                $scope.saveNew();
            };

            $scope.$on('$destroy', function () {
                $scope.newRequestModal.remove();
                $scope.editRequestModal.remove();
            });


        }])

}());
