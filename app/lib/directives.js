(function () {
    'use strict';
    angular.module('BobbyApp.directives', [])

        .directive('box', ['$timeout', function () {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: '../templates/bobbybox.html'
            };
        }])

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
        }).

        directive('googlePlaces', function () {
            return {
                restrict: 'E',
                replace: true,
                //transclude: true,
                scope: {location: '='},
                template: '<input id="google_places_ac" name="google_places_ac" type="text" placeholder="Address" ng-model="newInstallation.address"/>',
                link: function ($scope, elm, attrs) {
                    var autocomplete = new google.maps.places.Autocomplete(elm[0], {});
                    google.maps.event.addListener(autocomplete, 'place_changed', function () {
                        var place = autocomplete.getPlace();
                        $scope.location.lat = place.geometry.location.lat();
                        $scope.location.lng = place.geometry.location.lng();
                        $scope.$apply();
                    });
                }
            };
        });
}());