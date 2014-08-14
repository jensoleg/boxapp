'use strict';

angular.module('XivelyApp.directives', [])

    .directive('currentTime', function ($timeout, $filter) {
        return {
            restrict: 'E',
            replace: true,
            template: '<span class="current-time">{{currentTime}}</span>',
            link: function ($scope, $element, $attr) {
                $timeout(function checkTime() {
                    $scope.currentTime = moment().format('HH:mm');
                    $timeout(checkTime, 500);
                });
            }
        };
    })

    .directive('currentReadings', function ($timeout) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/current-readings.html',
            scope: true,
            link: function ($scope, $element, $attr) {

                $scope.$on('refreshComplete', function (v) {
                    /*
                     angular.element(document.querySelector('.scroll-content')).css('-webkit-overflow-scrolling', 'auto');
                     $timeout(function () {
                     var windowHeight = window.innerHeight;
                     var bobbyHeight = angular.element('#reading-content').height();
                     $element[0].style.paddingTop = (windowHeight - bobbyHeight - 44) + 'px';
                     console.log('padding readings: ', windowHeight - bobbyHeight - 44);
                     angular.element(document.querySelector('.scroll-content')).css('-webkit-overflow-scrolling', 'touch');
                     }, 300);
                     */
                });
            }
        };
    })

    .directive('xively', function ($timeout) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'templates/xively.html',
            link: function ($scope, $element, $attr) {
            }
        };
    })
/*
    .directive('orientationChange', function ($window, $timeout) {
        return {
            restrict: 'A',
            replace: true,
            scope: true,
            compile: function (element, attr) {
                return function ($scope, $element, $attr) {
                    $window.addEventListener("orientationchange", function () {
                        $timeout(function () {
                            var windowHeight = window.innerHeight;
                            var paddingTop = parseInt($element[0].style.paddingTop);
                            var offsetHeight = $element[0].offsetHeight;
                            $element[0].style.paddingTop = (windowHeight - offsetHeight + paddingTop - 25) + 'px';
                            $scope.$broadcast('orientation.changed');
                        }, 10);
                    }, false);
                };
            }
        };
    }).
*/
    .directive('focusOn', function () {
        return function (scope, elem, attr) {
            scope.$on('focusOn', function (e, name) {
                if (name === attr.focusOn) {
                    elem[0].focus();
                }
            });
        };
    });

