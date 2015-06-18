(function () {
    'use strict';

    angular.module('BobbyApp.alarms.controllers', ['BobbyApp.services'])


        .controller('TriggerCtrl', ['$scope', '$rootScope', '$ionicModal', '$ionicPopup', 'installationService', function ($scope, $rootScope, $ionicModal, $ionicPopup, installationService) {

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
                console.log('clicked edit rqst');
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
                $rootScope.$broadcast('message:installation-changed', $scope.installation);
                $scope.editTriggersModal.hide();
            };

            /* Edit Trigger */

            $ionicModal.fromTemplateUrl('templates/installation.trigger.edit.html', {
                scope: $scope,
                animation: 'slide-in-right'
            }).then(function (modal) {
                $scope.editTriggerModal = modal;
            });

            $scope.closeEditTrigger = function () {
                $scope.editTriggerModal.hide();
            };

            $scope.doneEditTrigger = function () {
                $scope.editTriggerModal.hide();
                $scope.update();
            };

            $scope.editTrigger = function (t) {
                $scope.trigger = t;
                $scope.editTriggerModal.show();
            };

            $scope.update = function () {
                installationService.updateTrigger($scope.installation._id, $scope.device._id, $scope.trigger)
                    .then(function (response) {
                        $scope.installation = response;
                        $scope.device = _.find(response.devices, function (d) {
                            return d._id === $scope.device._id;
                        });
                        console.log('update success :', response);
                    }, function (response) {
                        console.log('trigger update error :', response);
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
                                $scope.installation = response;
                                _.pull($scope.device.triggers, trigger);
                            }, function (response) {
                                console.log('error', response);
                            });
                    }
                });
            };

            $scope.removeRequest = function (request) {
                var confirmPopup = $ionicPopup.confirm({
                    title: '',
                    template: 'Are you sure you want to remove ' + request.name + '?',
                    cancelType: 'button-clear button-dark',
                    okType: 'button-clear button-positive'
                });
                confirmPopup.then(function (res) {
                    _.pull($scope.trigger.requests, request);
                });
            };


            /* new trigger */
            $ionicModal.fromTemplateUrl('templates/installation.trigger.new.html', {
                scope: $scope,
                animation: 'slide-in-right'
            }).then(function (modal) {
                $scope.newTriggerModal = modal;
            });

            $scope.closeNewTrigger = function () {
                $scope.newTriggerModal.hide();
            };

            $scope.doneNewTrigger = function () {
                $scope.newTriggerModal.hide();
                $scope.saveNew();
            };

            $scope.addTrigger = function () {
                $scope.newTrigger = {enabled: true, stream_id: $scope.control.id, requests: []};
                $scope.newTriggerModal.show();
            };

            $scope.saveNew = function () {
                installationService.newTrigger($scope.installation._id, $scope.device._id, $scope.newTrigger)
                    .then(function (response) {
                        $scope.installation = response;
                        $scope.device = _.find(response.devices, function (d) {
                            return d._id === $scope.device._id;
                        });
                    }, function (response) {
                        console.log('error', response);
                    });
            };

            /* Copy a trigger */

            /*
             $scope.copy = function (i) {
             var copy = _.cloneDeep(i);
             bobby.objectIdDel(copy);
             delete copy.$$hashKey;
             copy.name = 'Copy of ' + i.name;

             $scope.newTrigger = copy;
             $scope.saveNew();
             };
             */

            $scope.$on('$destroy', function () {
                $scope.newTriggerModal.remove();
                $scope.editTriggerModal.remove();
                $scope.editTriggersModal.remove();

                console.log('remove trigger modals')

            });

        }])

        .controller('RequestCtrl', ['$scope', '$rootScope', '$ionicModal', '$ionicPopup', 'installationService', function ($scope, $rootScope, $ionicModal, $ionicPopup, installationService) {

            $scope.responseColor = null;

            $scope.newRequest = {};

            $rootScope.$on('message:add-request', function (evt, control, trigger) {
                $scope.control = control;
                $scope.trigger = trigger;
                $scope.addRequest();
            });

            $rootScope.$on('message:edit-request', function (evt, trigger, request) {
                console.log('got message rqst', evt);

                $scope.trigger = trigger;
                $scope.request = request;
                $scope.editaRequest();
            });

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
                        $scope.responseColor = '#66cc33';
                    }, function (response) {
                        $scope.requestResponse = response;
                        $scope.responseColor = '#ef4e3a';
                    });
            };

            $scope.clearResponse = function () {
                $scope.requestResponse = null;
                $scope.responseColor = null;
            };

            /* Edit Request */

            $ionicModal.fromTemplateUrl('templates/trigger.request.edit.html', {
                scope: $scope,
                animation: 'slide-in-right'
            }).then(function (modal) {
                console.log('instantiate edit modals')

                $scope.editRequestModal = modal;
            });

            $scope.closeEditRequest = function () {
                $scope.request.request_options = JSON.parse($scope.request.request_options);
                $scope.editRequestModal.hide();
            };

            $scope.doneEditRequest = function () {
                $scope.editRequestModal.hide();
                $scope.request.request_options = JSON.parse($scope.request.request_options);
            };

            $scope.editaRequest = function (r) {
                $scope.responseColor = null;
                $scope.requestResponse = null;
                $scope.request.request_options = JSON.stringify($scope.request.request_options, null, '\t');
                $scope.editRequestModal.show();
            };

            /* new request */

            $ionicModal.fromTemplateUrl('templates/trigger.request.new.html', {
                scope: $scope,
                animation: 'slide-in-right'
            }).then(function (modal) {
                console.log('instantiate new modals');

                $scope.newRequestModal = modal;
            });

            $scope.closeNewRequest = function () {
                $scope.newRequestModal.hide();
            };

            $scope.doneNewRequest = function () {
                $scope.newRequestModal.hide();
                $scope.saveNewRequest();
            };

            $scope.addRequest = function () {
                $scope.responseColor = null;
                $scope.newRequest = {};
                $scope.requestResponse = null;
                $scope.newRequestModal.show();
            };

            $scope.saveNewRequest = function () {
                $scope.newRequest.request_options = JSON.parse($scope.newRequest.request_options);
                $scope.trigger.requests.push($scope.newRequest);
            };

            /* Copy a Request */

            /*
             $scope.copy = function (i) {
             var copy = _.cloneDeep(i);
             bobby.objectIdDel(copy);
             delete copy.$$hashKey;
             copy.name = 'Copy of ' + i.name;

             $scope.newRequest = copy;
             $scope.saveNew();
             };
             */

            $scope.$on('$destroy', function () {
                $scope.newRequestModal.remove();
                $scope.editRequestModal.remove();

                console.log('remove request modals')
            });

        }])

}());
