(function () {
    'use strict';

    angular.module("map-styles", [])
        .constant("styles", {
            default: {},

            grey: [
                {
                    featureType: "all",
                    stylers: [
                        { saturation: -80 }
                    ]
                },
                {
                    featureType: "road",
                    elementType: "geometry",
                    stylers: [
                        { hue: "#00ffee" },
                        { saturation: 50 }
                    ]
                },
                {
                    featureType: "road",
                    elementType: "labels",
                    stylers: [
                        {"visibility": "off"}
                    ]
                },
                {
                    featureType: 'poi.school',
                    elementType: 'geometry',
                    stylers: [
                        {"visibility": "off"}
                    ]
                },
                {
                    featureType: 'poi.park',
                    elementType: 'geometry',
                    stylers: [
                        {"visibility": "off"}
                    ]
                },
                {
                    featureType: 'poi.park',
                    elementType: 'labels.icon',
                    stylers: [
                        {"visibility": "off"}
                    ]
                }
            ],
            ios: [
                {"featureType": "water", "elementType": "geometry", "stylers": [
                    {"color": "#a2daf2"}
                ]},
                {"featureType": "landscape.man_made", "elementType": "geometry", "stylers": [
                    {"color": "#f7f1df"}
                ]},
                {"featureType": "landscape.natural", "elementType": "geometry", "stylers": [
                    {"color": "#d0e3b4"}
                ]},
                {"featureType": "landscape.natural.terrain", "elementType": "geometry", "stylers": [
                    {"visibility": "off"}
                ]},
                {"featureType": "poi.park", "elementType": "geometry", "stylers": [
                    {"color": "#bde6ab"}
                ]},
                {"featureType": "poi", "elementType": "labels", "stylers": [
                    {"visibility": "off"}
                ]},
                {"featureType": "poi.medical", "elementType": "geometry", "stylers": [
                    {"visibility": "off"}
                ]},
                {"featureType": "poi.business", "stylers": [
                    {"visibility": "off"}
                ]},
                {"featureType": "road", "elementType": "geometry.stroke", "stylers": [
                    {"visibility": "off"}
                ]},
                {"featureType": "road", "elementType": "labels", "stylers": [
                    {"visibility": "off"}
                ]},
                {"featureType": "road.highway", "elementType": "geometry.fill", "stylers": [
                    {"color": "#ffe15f"}
                ]},
                {"featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [
                    {"color": "#efd151"}
                ]},
                {"featureType": "road.arterial", "elementType": "geometry.fill", "stylers": [
                    {"color": "#ffffff"}
                ]},
                {"featureType": "road.local", "elementType": "geometry.fill", "stylers": [
                    {"color": "black"}
                ]},
                {"featureType": "transit.station.airport", "elementType": "geometry.fill", "stylers": [
                    {"color": "#cfb2db"}
                ]}
            ]
        });
}());