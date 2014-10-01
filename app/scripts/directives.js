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
        .directive('headerShrink', function ($document, $timeout) {
            var fadeAmt;

            var shrink = function (header, content, amt, max) {
                amt = Math.min(44, amt);
                fadeAmt = 1 - amt / 44;

                ionic.requestAnimationFrame(function () {
                    header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
                    for (var i = 0, j = header.children.length; i < j; i++) {
                        header.children[i].style.opacity = fadeAmt;
                    }
                });
            };

            return {
                restrict: 'A',
                link: function ($scope, $element, $attr) {
                    $timeout(function () {
                        var starty = $scope.$eval($attr.headerShrink) || 0;
                        var shrinkAmt;

                        var header = $document[0].body.querySelector('.bar-shrink');
                        var headerHeight = header.offsetHeight;

                        $element.bind('scroll', function (e) {
                            if (e.originalEvent && e.originalEvent.detail && e.originalEvent.detail.scrollTop && e.originalEvent.detail.scrollTop > starty) {
                                // Start shrinking
                                shrinkAmt = headerHeight - Math.max(0, (starty + headerHeight) - e.originalEvent.detail.scrollTop);
                                shrink(header, $element[0], shrinkAmt, headerHeight);
                            } else {
                                shrink(header, $element[0], 0, headerHeight);
                            }
                        });
                    }, 1000);
                }
            }
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
        })
        .directive('bobbyDevice', function () {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/bobbybox.chart.html',
                link: function ($scope, $element, $attr) {
                }
            }
        })
        .directive('bobbySocial', function () {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/bobbybox.social.html',
                link: function ($scope, $element, $attr) {
                }
            }
        })
        .directive('bobbySetup', function () {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/bobbybox.setup.html',
                link: function ($scope, $element, $attr) {
                }
            }
        });

}());