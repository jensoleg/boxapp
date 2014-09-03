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

        .controller('InstallationsCtrl', ['$scope', 'installations', '$ionicScrollDelegate', '$timeout', function ($scope, installations, $ionicScrollDelegate, $timeout) {

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

        }])
        .controller('InstallationCtrl', ['$scope', 'installation', function ($scope, installation) {

            $scope.installation = installation;

        }])

        .controller('DeviceCtrl', ['$stateParams', '$scope', 'device', function ($stateParams, $scope, device) {

            $scope.installationId = $stateParams.id;
            $scope.device = device;

        }])

        .controller('ControlCtrl', ['$scope', 'control', function ($scope, control) {

            $scope.control = control;

        }])

        .controller('TriggerCtrl', ['$scope', 'trigger', function ($scope, trigger) {

            $scope.trigger = trigger;

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