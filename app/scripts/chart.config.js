(function () {
    'use strict';

    angular.module("chart", [])
        .constant("chart", {
            chartLabel: {
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
            },
            series: [
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
            ],
            chartSettings: {
                dataSource: [],
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
            },
            timescale: [
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
