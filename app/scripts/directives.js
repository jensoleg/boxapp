(function () {
    'use strict';
    angular.module('BobbyApp.directives', [])

        .directive('box', ['$timeout', function () {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/bobbybox.html'
            };
        }])

        .directive('focusOn', function () {
            return function (scope, elem, attr) {
                scope.$on('focusOn', function (name) {
                    if (name === attr.focusOn) {
                        elem[0].focus();
                    }
                });
            };
        })
        .directive('fadeBar', function ($timeout, $ionicSideMenuDelegate) {
            return {
                restrict: 'E',
                template: '<div class="fade-bar"></div>',
                replace: true,
                link: function ($scope, $element) {
                    // Run in the next scope digest
                    if (ionic.Platform.isIOS() || ionic.Platform.isIPad()) {
                        $timeout(function () {
                            // Watch for changes to the openRatio which is a value between 0 and 1 that says how "open" the side menu is
                            $scope.$watch(function () {
                                return $ionicSideMenuDelegate.getOpenRatio();
                            }, function (ratio) {
                                $element[0].style.opacity = Math.abs(ratio);
                            });
                        });
                    }
                }
            };
        });
}());