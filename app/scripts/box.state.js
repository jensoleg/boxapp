(function () {
    'use strict';

    angular.module('config.box', [])
        .constant('box', {
            activeStream: null,
            showChart: false,
            shownDevice: [],
            installation: null
        });

}());
