(function () {
    'use strict';
    angular.module('BobbyApp.directives', [])
        /*
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
         */
        /*
         .directive('headerShrink', function ($document, $timeout) {
         var fadeAmt;

         var shrink = function (header, buttons, content, amt, max) {
         amt = Math.min(44, amt);
         fadeAmt = 1 - amt / 44;

         ionic.requestAnimationFrame(function () {
         header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
         buttons.style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
         for (var i = 0, j = header.children.length; i < j; i++) {
         header.children[i].style.opacity = fadeAmt;
         }
         for (var i = 0, j = buttons.children.length; i < j; i++) {
         buttons.children[i].style.opacity = fadeAmt;
         }
         });
         };
         return {
         restrict: 'A',
         link: function ($scope, $element, $attr) {
         $timeout(function () {
         var starty = $scope.$eval($attr.headerShrink) || 0;
         var shrinkAmt;

         var header = $document[0].body.querySelectorAll('.bar-shrink');
         var headerHeight = header[0].offsetHeight;

         $element.bind('scroll', function (e) {
         if (e.originalEvent && e.originalEvent.detail && e.originalEvent.detail.scrollTop && e.originalEvent.detail.scrollTop > starty) {
         // Start shrinking
         shrinkAmt = headerHeight - Math.max(0, (starty + headerHeight) - e.originalEvent.detail.scrollTop);
         shrink(header[0], header[0], $element[0], shrinkAmt, headerHeight);
         } else {
         shrink(header[0], header[0], $element[0], 0, headerHeight);
         }
         });
         }, 1500);
         }
         }
         })
         */
        /*
         .directive('headerShrinkDetail', function ($document, $timeout) {
         var fadeAmt;

         var shrink = function (header, buttons, content, amt, max) {
         amt = Math.min(44, amt);
         fadeAmt = 1 - amt / 44;

         ionic.requestAnimationFrame(function () {
         header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
         buttons.style[ionic.CSS.TRANSFORM] = 'translate3d(0, -' + amt + 'px, 0)';
         for (var i = 0, j = header.children.length; i < j; i++) {
         header.children[i].style.opacity = fadeAmt;
         }
         for (var i = 0, j = buttons.children.length; i < j; i++) {
         buttons.children[i].style.opacity = fadeAmt;
         }
         });
         };
         return {
         restrict: 'A',
         link: function ($scope, $element, $attr) {
         $timeout(function () {
         var starty = $scope.$eval($attr.headerShrink) || 0;
         var shrinkAmt;

         var header = $document[0].body.querySelectorAll('.bar-shrink');
         var headerHeight = header[4].offsetHeight;

         $element.bind('scroll', function (e) {
         if (e.originalEvent && e.originalEvent.detail && e.originalEvent.detail.scrollTop && e.originalEvent.detail.scrollTop > starty) {
         // Start shrinking
         shrinkAmt = headerHeight - Math.max(0, (starty + headerHeight) - e.originalEvent.detail.scrollTop);
         shrink(header[4], header[5], $element[0], shrinkAmt, headerHeight);
         } else {
         shrink(header[4], header[5], $element[0], 0, headerHeight);
         }
         });
         }, 1500);
         }
         }
         })
         */
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

        .directive('googlePlaces', function ($timeout) {
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
                        componentRestrictions: {country: 'dk'},
                        types: ['geocode']
                    };

                    var autocomplete = new google.maps.places.Autocomplete(elm[0], options);

                    $timeout(function () {
                        var container = document.getElementsByClassName('pac-container');
                        // disable ionic data tap
                        angular.element(container).attr('data-tap-disabled', 'true');
                        // leave input field if google-address-entry is selected
                        container.onclick = function () {
                            document.getElementById('autocomplete').blur();

                            /*
                            if (cordova && cordova.plugins) {
                                if (cordova.plugins.Keyboard) {
                                    cordova.plugins.Keyboard.close();
                                }
                            }
                            */
                        };
                    }, 500);

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
            };
        })

        .directive('bobbySetup', function () {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/bobbybox.setup.html',
                link: function ($scope, $element, $attr) {
                }
            };
        })

        .directive('installationList', function () {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/installations.list.html',
                link: function ($scope, $element, $attr) {
                }
            };
        })
        /*
         .directive('uiBlur', function () {
         return function (scope, elem, attrs) {
         elem.bind('blur', function () {
         scope.$apply(attrs.uiBlur);
         });
         };
         })
         */
        .directive('timerTime', function ($compile) {
            return {
                restrict: 'E',
                scope: {
                    timer: '=',
                    timerTime: '='
                },
                template: '<input type="time" ng-model="timerTime" min="00:00:00" max="23:59:00">',
                replace: 'true',
                link: function (scope, elem, attr) {

                    elem.bind('blur', function () {
                        if (elem.data('old-value') != elem.val()) {
                            scope.$apply(function () {

                                var now = new Date(),
                                    timeStr = scope.timer.time.split(":"),
                                    hour = timeStr[0],
                                    min = timeStr[1],
                                    time = moment.utc([now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(min)]);

                                scope.timer.timestamp = time.format('X');

                            });
                        }
                    });
                }
            };
        })
        /*
         .directive('contactShrink', function ($document) {

         return {
         restrict: 'A',
         link: function ($scope, $element, $attr) {
         var resizeFactor, scrollFactor, blurFactor;
         var header = $document[0].body.querySelector('.contact');

         $element.bind('scroll', function (e) {
         if (e.originalEvent.detail.scrollTop >= 0) {
         scrollFactor = e.originalEvent.detail.scrollTop / 2;
         header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, +' + scrollFactor + 'px, 0)';
         } else {
         // shrink(header, $element[0], 0, headerHeight);
         resizeFactor = -e.originalEvent.detail.scrollTop / 100 + 0.99;
         blurFactor = -e.originalEvent.detail.scrollTop / 10;
         header.style[ionic.CSS.TRANSFORM] = 'scale(' + resizeFactor + ',' + resizeFactor + ')';
         header.style.webkitFilter = 'blur(' + blurFactor + 'px)';
         }
         });
         }
         }
         })
         */
        .directive('mapShrink', function ($document) {
            return {
                restrict: 'A',
                link: function ($scope, $element, $attr) {
                    var resizeFactor, scrollFactor, blurFactor;
                    var header = $document[0].body.querySelector('.uimap');

                    $element.bind('scroll', function (e) {
                        if (e.originalEvent.detail.scrollTop >= 0) {
                            scrollFactor = e.originalEvent.detail.scrollTop / 3;
                            header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, +' + scrollFactor + 'px, 0)';
                        } else {
                            resizeFactor = -e.originalEvent.detail.scrollTop / 100 + 0.99;
                            blurFactor = -e.originalEvent.detail.scrollTop / 10;
                            header.style[ionic.CSS.TRANSFORM] = 'scale(' + resizeFactor + ',' + resizeFactor + ')';
                            header.style.webkitFilter = 'blur(' + blurFactor + 'px)';
                        }
                    });
                }
            };
        });

}());
