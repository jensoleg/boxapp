(function () {
    'use strict';

    angular.module("box", [])

        .constant("box", {
            activeStream: null,
            showChart: false,
            shownDevice: [],
            installation: null
        });
}());
