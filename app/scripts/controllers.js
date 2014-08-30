(function () {
    'use strict';

    angular.module('BobbyApp.controllers', ['dx', 'ionic', 'BobbyApp.services', 'BobbyApp.filters', 'BobbyApp.directives'])

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

        .controller('BoxCtrl', ['$scope', '$rootScope', 'bobby', 'focus', function ($scope, $rootScope, bobby, focus) {

            var ts = bobby.getTimeScale();

            $scope.domainName = $rootScope.realm.charAt(0).toUpperCase() + $rootScope.realm.slice(1);

            $rootScope.installations = [];

            $scope.timescale = [
                {value: 300, interval: 1, text: '5 minutes', type: 'Raw datapoints'},
                {value: 1800, interval: 1, text: '30 minutes', type: 'Raw datapoints'},
                {value: 3600, interval: 1, text: '1 hours', type: 'Raw datapoints'},
                {value: 21600, interval: 1, text: '6 hours', type: 'Raw datapoints'},
                {value: 86400, interval: 60, text: '1 day', type: 'Averaged datapoints'},
                {value: 604800, interval: 3600, text: '7 days', type: 'Averaged datapoints'},
                {value: 2592000, interval: 3600, text: '1 month', type: 'Averaged datapoints'},
                {value: 7776000, interval: 3600, text: '3 months', type: 'Averaged datapoints'}
            ];

            /* get graf time scale form settings */
            $scope.timeScale = _.find($scope.timescale, { 'value': ts.value });

            $rootScope.currentDataStream = {};
            $rootScope.activeStream = null;
            $scope.activeStreamReady = false;

            $scope.viewXively = false;
            $scope.shownDevice = [];

            $scope.chartLabel = {
                argumentType: 'datetime',
                label: {
                    format: 'H:mm',
                    font: {
                        color: 'white'
                    }
                },
                valueMarginsEnabled: false,
                tick: {
                    visible: true
                }
            };

            $scope.series = [
                {
                    argumentField: 'timestamp',
                    valueField: 'value',
                    type: 'area',
                    point: { visible: false },
                    opacity: 1.00,
                    tick: {
                        visible: true,
                        color: 'white'
                    },
                    color: 'rgb(74, 135, 238)',
                    hoverStyle: { color: 'rgb(74, 135, 238)' }
                }
            ];

            $scope.chartData = [];

            $scope.chartSettings = {
                dataSource: $scope.chartData,
                argumentAxis: $scope.chartLabel,
                valueAxis: {
                    valueMarginsEnabled: false,
                    tick: {
                        visible: true,
                        color: 'white'
                    },
                    showZero: false,
                    type: 'continuous',
                    valueType: 'numeric',
                    grid: {visible: false},
                    label: { font: { color: 'white'}}
                },
                series: $scope.series,
                legend: {
                    visible: false
                },
                tooltip: {
                    enabled: true
                },
                crosshair: {
                    enabled: true,
                    horizontalLine: {
                        color: 'white',
                        dashStyle: 'longDash'
                    },
                    verticalLine: {
                        color: 'white',
                        dashStyle: 'dotdashdot'
                    },
                    opacity: 0.8
                }
            };

            $scope.toggleDevice = function (device) {
                $scope.shownDevice[device] = !$scope.isDeviceShown(device);
            };

            $scope.isDeviceShown = function (device) {
                return $scope.shownDevice[device];
            };

            $scope.selectDevice = function () {
                $scope.refreshData(true);
            };

            $scope.selectAction = function (time) {
                $scope.timeScale = _.find($scope.timescale, { 'value': time.value });
                bobby.setTimeScale($scope.timeScale);
                $scope.loadXively = true;
            };

            $scope.showData = function (device, stream) {
                if (!(angular.isUndefined($rootScope.activeStream) || $rootScope.activeStream === null) && $rootScope.activeStream.id === $rootScope.datastreams[device + stream].id && $rootScope.activeStream.deviceid === $rootScope.datastreams[device + stream].deviceid) {
                    $rootScope.activeStream = null;
                    $scope.activeStreamReady = false;
                    $scope.chartData = null;
                } else {
                    $scope.loadXively = true;
                    bobby.getStream(device, stream);
                    $rootScope.activeStream = $rootScope.datastreams[device + stream];
                    $rootScope.activeStream.id = $rootScope.datastreams[device + stream].id;
                    $rootScope.activeStream.deviceid = $rootScope.datastreams[device + stream].deviceid;
                }
            };

            $scope.showValueCtrl = function (device, stream) {
                $rootScope.datastreams[device + stream].isSelecting = true;
                $rootScope.datastreams[device + stream].newValue = $rootScope.datastreams[device + stream].current_value;
                focus('input-time');
            };

            $scope.setValueCtrl = function (device, stream) {
                $rootScope.datastreams[device + stream].isSelecting = false;
                $rootScope.datastreams[device + stream].current_value = $rootScope.datastreams[device + stream].newValue;
                bobby.publish(stream, $rootScope.datastreams[device + stream].current_value);
            };

            $scope.closeValueCtrl = function (device, stream) {
                $rootScope.datastreams[device + stream].isSelecting = false;
                $rootScope.datastreams[device + stream].newValue = $rootScope.datastreams[device + stream].current_value;
            };

            $scope.toggleCtrlSwitch = function (device, stream) {
                bobby.publish(stream, $rootScope.datastreams[device + stream].current_value);
            };

            $rootScope.$watchCollection('currentDataStream.data', function (data) {
                $scope.loadXively = false;
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
                    $scope.chartSettings.series = $scope.series;

                    $scope.chartData = data;
                    $scope.chartSettings.dataSource = $scope.chartData;
                } else {
                    $scope.chartData = [];
                    $scope.chartSettings.dataSource = $scope.chartData;
                }

                $scope.activeStreamReady = $rootScope.activeStream !== null;
            }, true);

            $scope.refreshData = function (init) {

                bobby.refresh(init).then(function () {
                    $scope.installation = $rootScope.installations[0];
                    $scope.$broadcast('refreshComplete');
                });

            };

            $scope.refreshData(true);

        }]);

}());