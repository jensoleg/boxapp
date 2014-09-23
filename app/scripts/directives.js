(function () {
    'use strict';
    angular.module('BobbyApp.directives', [])

        .directive('noScroll', function ($document) {

            return {
                restrict: 'A',
                link: function ($scope, $element, $attr) {

                    $document.on('touchmove', function (e) {
                        e.preventDefault();
                    });
                }
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
        })
        .directive('ngEnter', function () {
            return function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if (event.which === 13) {
                        scope.$apply(function () {
                            scope.$eval(attrs.ngEnter);
                        });

                        event.preventDefault();
                    }
                });
            };
        })
        /*
         .directive('input', function ($timeout) {
         return {
         restrict: 'E',
         scope: {
         'returnClose': '=',
         'onReturn': '&',
         'onFocus': '&',
         'onBlur': '&'
         },
         link: function (scope, element, attr) {
         element.bind('focus', function (e) {
         if (scope.onFocus) {
         $timeout(function () {
         scope.onFocus();
         });
         }
         });
         element.bind('blur', function (e) {
         if (scope.onBlur) {
         $timeout(function () {
         scope.onBlur();
         });
         }
         });
         element.bind('keydown', function (e) {
         if (e.which == 13) {
         if (scope.returnClose) element[0].blur();
         if (scope.onReturn) {
         $timeout(function () {
         scope.onReturn();
         });
         }
         }
         });
         }
         }
         })
         */
        .directive('googlePlaces', function () {
            return {
                restrict: 'E',
                replace: true,
                scope: {
                    location: '=',
                    address: '='
                },
                template: '<input type="text" placeholder="Address" ng-model="address"/>',
                link: function ($scope, elm, attrs) {
                    var options = {
                        componentRestrictions: { country: 'dk' },
                        types: ['geocode']
                    };
                    var autocomplete = new google.maps.places.Autocomplete(elm[0], options);
                    google.maps.event.addListener(autocomplete, 'place_changed', function () {
                        var place = autocomplete.getPlace();
                        $scope.address = place.formatted_address;
                        $scope.location.lat = place.geometry.location.lat();
                        $scope.location.lng = place.geometry.location.lng();
                        $scope.$apply();
                    });
                }
            };
        });

}());