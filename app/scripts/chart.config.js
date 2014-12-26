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
                    opacity: 0.2,
                    border: {
                        width: 2,
                        visible: true,
                        dashStyle: 'solid'
                    },
                    point: {
                        visible: false,
                        hoverMode: 'allArgumentPoints',
                        selectionMode: 'allArgumentPoints'
                    },
                    label: {
                        visible: true,
                        connector: { visible: true }
                    },
                    maxLabelCount: 15
            },
                seriesTemplate: {
                    nameField: "name"
                },
                commonAxisSettings: {
                    valueMarginsEnabled: false,
                    grid: {
                        color: '#7f7f7f',
                        visible: true,
                        opacity: 0.1
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
                    min: 0,
                    showZero: false,
                    type: 'continuous',
                    valueType: 'numeric'
                },
                legend: {
                    visible: false
                },
                /*
                 commonPaneSettings: {
                 border: {
                 visible: false,
                 color: '#e9e9e9',
                 opacity: 0.5
                 }
                 },
                 */
                tooltip: {
                    enabled: false,
                    shared: false,
                    argumentFormat: 'd/M H.mm',
                    customizeTooltip: function () {
                        return {
                            text: this.valueText + ' on ' + this.argumentText
                        };
                    }

                },
                crosshair: {
                    enabled: true,
                    dashStyle: 'longDash',
                    label: {
                        visible: true,
                        backgroundColor: "#949494",
                        font: {
                            color: "#fff",
                            size: 12
                        }
                    }
                },
                seriesSelectionMode: 'multiple',
                scrollingMode: 'all',
                zoomingMode: 'all'
            },
            timeScales: [
                {value: 300, interval: 60, text: '5 minutes', type: 'Raw datapoints'},
                {value: 1800, interval: 60, text: '30 minutes', type: 'Raw datapoints'},
                {value: 3600, interval: 60, text: '1 hours', type: 'Raw datapoints'},
                {value: 21600, interval: 60, text: '6 hours', type: 'Raw datapoints'},
                {value: 86400, interval: 60, text: '1 day', type: 'Raw datapoints'},
                {value: 604800, interval: 3600, text: '7 days', type: 'Averaged datapoints'},
                {value: 2592000, interval: 3600, text: '1 month', type: 'Averaged datapoints'},
                {value: 7776000, interval: 3600, text: '3 months', type: 'Averaged datapoints'}
            ]
        });

}());
