(function () {
    'use strict';

    angular.module('BobbyApp.controllers', ['dx', 'ionic', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives', 'chart'])

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

        .controller('InstallationsCtrl', ['$scope', '$rootScope', function ($scope) {

            $scope.data = {};

            $scope.clearSearch = function () {
                $scope.data.searchQuery = '';
            };

        }])

        .controller('BoxCtrl', ['$scope', '$rootScope', 'bobby', 'chart', function ($scope, $rootScope, bobby, chart) {

            var ts = bobby.getTimeScale();

            $scope.domainName = $rootScope.domain.charAt(0).toUpperCase() + $rootScope.domain.slice(1);

            $rootScope.installations = [];

            $scope.timescale = chart.timescale;

            /* get graf time scale form settings */
            $scope.timeScale = _.find($scope.timescale, { 'value': ts.value });

            $rootScope.currentDataStream = {};
            $rootScope.activeStream = null;

            $scope.showChart = false;
            $scope.shownDevice = [];

            $scope.chartLabel = chart.chartLabel;
            $scope.series = chart.series;
            $scope.chartSettings = chart.chartSettings;

            $scope.toggleDevice = function (device) {
                $scope.shownDevice[device] = !$scope.isDeviceShown(device);
            };

            $scope.isDeviceShown = function (device) {
                return $scope.shownDevice[device];
            };

            $scope.selectDevice = function () {
                $scope.refreshData();
            };

            $scope.selectAction = function (time) {
                $scope.timeScale = _.find($scope.timescale, { 'value': time.value });
                bobby.setTimeScale($scope.timeScale);
                $scope.showChart = true;
            };

            $scope.showData = function (device, stream) {
                if (!(angular.isUndefined($rootScope.activeStream) || $rootScope.activeStream === null) && $rootScope.activeStream.id === $rootScope.datastreams[device + stream].id && $rootScope.activeStream.deviceid === $rootScope.datastreams[device + stream].deviceid) {
                    $rootScope.activeStream = null;
                    $scope.chartSettings.dataSource = null;
                } else {
                    $scope.showChart = true;
                    bobby.getStream(device, stream);
                    $rootScope.activeStream = $rootScope.datastreams[device + stream];
                    $rootScope.activeStream.id = $rootScope.datastreams[device + stream].id;
                    $rootScope.activeStream.deviceid = $rootScope.datastreams[device + stream].deviceid;
                }
            };

            $rootScope.$watchCollection('currentDataStream.data', function (data) {
                $scope.showChart = false;
                if (angular.isDefined(data) && data.length > 0 && $rootScope.activeStream !== null) {

                    if ($scope.timeScale.value <= 86400) {
                        $scope.chartLabel.label = { format: 'H:mm', font: { color: 'white'}};
                    } else if ($scope.timeScale.value <= 604800) {
                        $scope.chartLabel.label = { format: 'ddd', font: { color: 'white'}};
                    } else if ($scope.timeScale.value <= 2592000) {
                        $scope.chartLabel.label = { format: 'dd-MM', font: { color: 'white'}};
                    } else {
                        $scope.chartLabel.label = { format: 'MMM', font: { color: 'white'}};
                    }
                    if ($rootScope.activeStream.id === 'online') {
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

            $scope.refreshData = function () {

                bobby.refresh().then(function () {
                    $scope.installation = $rootScope.installations[0];
                });

            };

            $scope.refreshData(true);

        }]);

}());