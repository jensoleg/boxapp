(function () {
    'use strict';

    angular.module('config.box', [])
        .constant('box', {
            chartColorNumber: null,
            chartColor: [],
            shownDevice: [],
            selectedScale: null,
            installation: null
        });

}());
