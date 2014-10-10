(function () {
    'use strict';

    angular.module("chart", [])
        .constant("chart", {
            chartLabel: {
                argumentType: 'datetime'
            },
            chartSettings: {
                commonSeriesSettings: {
                    argumentField: 'timestamp',
                    valueField: 'value',
                    point: { visible: false },
                    opacity: 0.2,
                    label: { visible: false },
                    border: {
                        width: 3,
                        visible: true,
                        dashStyle: 'solid'
                    }
                },
                seriesTemplate: {
                    nameField: "name"
                },
                commonAxisSettings: {
                    valueMarginsEnabled: false,
                    grid: {
                        color: 'white',
                        visible: true
                    },
                    label: {
                        font: {
                            color: '#7f7f7f'
                        }
                    },
                    tick: {
                        visible: false
                    }
                },
                animation: {
                    enabled: true
                   // duration: 250,
                   // easing: 'linear'
                },
                dataSource: [],
                valueAxis: {
                    showZero: false,
                    type: 'continuous',
                    valueType: 'numeric'
                },
                legend: {
                    visible: false
                },
                commonPaneSettings: {
                    border: {
                        visible: false,
                        color: '#e9e9e9',
                        opacity: 0.5
                    }
                },
                tooltip: {
                    enabled: true
                },
                crosshair: {
                    enabled: true,
                    horizontalLine: {
                        dashStyle: 'longDash'
                    },
                    verticalLine: {
                        dashStyle: 'longDash'
                    }
                }
            },
            timeScales: [
                {value: 300, interval: 1, text: '5 minutes', type: 'Raw datapoints'},
                {value: 1800, interval: 1, text: '30 minutes', type: 'Raw datapoints'},
                {value: 3600, interval: 1, text: '1 hours', type: 'Raw datapoints'},
                {value: 21600, interval: 1, text: '6 hours', type: 'Raw datapoints'},
                {value: 86400, interval: 60, text: '1 day', type: 'Averaged datapoints'},
                {value: 604800, interval: 3600, text: '7 days', type: 'Averaged datapoints'},
                {value: 2592000, interval: 3600, text: '1 month', type: 'Averaged datapoints'},
                {value: 7776000, interval: 3600, text: '3 months', type: 'Averaged datapoints'}
            ]
        });

}());
