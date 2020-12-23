// Used in UI.js

(function () {
    /*
  map.js was created by Theodore Kruczek using the work of
  Julius Tens' "projections" library (https://github.com/juliuste/projections).
  This file is exclusively released under the same license as the original author.
  The license only applies to map.js

  The MIT License
  Copyright (c) 2017, Julius Tens

  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
  to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included
  in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  */

    'use strict';
    var mapManager = {};
    var rad = function (deg) {
        return (deg * Math.PI) / 180;
    };
    var tan = function (deg) {
        return Math.tan(rad(deg));
    };
    var deg = function (rad) {
        return (rad * 180) / Math.PI;
    };

    var defaults = {
        meridian: 0,
        standardParallel: 0,
        latLimit: 90,
    };

    mapManager.options = function (opt) {
        // eslint-disable-next-line prefer-object-spread
        return Object.assign({}, defaults, opt || {});
    };
    mapManager.braun = function (point, opt) {
        point = _check(point);
        // opt = options(opt);
        if (point.wgs) {
            point = _addMeridian(point, opt.meridian);
            return {
                x: rad(point.lon) / (2 * Math.PI) + 0.5,
                y: (tan(opt.latLimit / 2) - tan(point.lat / 2)) / Math.PI,
            };
        } else {
            var result = {
                lon: deg((2 * point.x - 1) * Math.PI),
                lat: deg(
                    2 * Math.atan(tan(opt.latLimit / 2) - point.y * Math.PI)
                ),
            };
            return _addMeridian(result, opt.meridian * -1);
        }
    };

    var _check = (point) => {
        if (
            typeof point.x !== 'undefined' &&
            point.x >= 0 &&
            point.x <= 1 &&
            typeof point.y !== 'undefined' &&
            typeof point.lon === 'undefined' &&
            typeof point.lat === 'undefined'
        ) {
            return { x: +point.x, y: +point.y, wgs: false };
        }
        if (
            typeof point.lon !== 'undefined' &&
            typeof point.lat !== 'undefined' &&
            typeof point.x === 'undefined' &&
            typeof point.y === 'undefined'
        ) {
            return { lon: +point.lon, lat: +point.lat, wgs: true };
        }
        throw new Error('Invalid input point.');
    }
    var _addMeridian = (point, meridian) => {
        point = _check(point);
        if (meridian !== 0) {
            return _check({
                lon: ((point.lon + 180 + 360 - meridian) % 360) - 180,
                lat: point.lat,
            });
        }
        return point;
    }

    window.mapManager = mapManager;
})();
