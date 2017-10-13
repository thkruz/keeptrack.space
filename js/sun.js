/* global

  timeManager

  DEG2RAD
  MILLISECONDS_PER_DAY

*/

(function () {
  var sun = {};
  var j, n, L, g, ecLon, ob, x, y, z, obliq, t;

  sun.currentDirection = function () {
    timeManager.now = timeManager.propTime();
    j = timeManager.jday(timeManager.now.getUTCFullYear(),
                 timeManager.now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 timeManager.now.getUTCDate(),
                 timeManager.now.getUTCHours(),
                 timeManager.now.getUTCMinutes(),
                 timeManager.now.getUTCSeconds());
    j += timeManager.now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

    return sun.getDirection(j);
  };
  sun.getDirection = function (jd) {
    n = jd - 2451545;
    L = (280.460) + (0.9856474 * n); // mean longitude of sun
    g = (357.528) + (0.9856003 * n); // mean anomaly
    L = L % 360.0;
    g = g % 360.0;

    ecLon = L + 1.915 * Math.sin(g * DEG2RAD) + 0.020 * Math.sin(2 * g * DEG2RAD);
    ob = _getObliquity(jd);

    x = Math.cos(ecLon * DEG2RAD);
    y = Math.cos(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);
    z = Math.sin(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);

    return [x, y, z];
  };

  function _getObliquity (jd) {
    t = (jd - 2451545) / 3652500;

    obliq = 84381.448 - 4680.93 * t - 1.55 * Math.pow(t, 2) + 1999.25 *
    Math.pow(t, 3) - 51.38 * Math.pow(t, 4) - 249.67 * Math.pow(t, 5) -
    39.05 * Math.pow(t, 6) + 7.12 * Math.pow(t, 7) + 27.87 * Math.pow(t, 8) +
    5.79 * Math.pow(t, 9) + 2.45 * Math.pow(t, 10);

    /* Human Readable Version
    var ob =  // arcseconds
      84381.448
     - 4680.93  * t
     -    1.55  * Math.pow(t, 2)
     + 1999.25  * Math.pow(t, 3)
     -   51.38  * Math.pow(t, 4)
     -  249.67  * Math.pow(t, 5)
     -   39.05  * Math.pow(t, 6)
     +    7.12  * Math.pow(t, 7)
     +   27.87  * Math.pow(t, 8)
     +    5.79  * Math.pow(t, 9)
     +    2.45  * Math.pow(t, 10);
     */

    return obliq / 3600.0;
  }

  window.sun = sun;
})();
