/* global

  timeManager

  DEG2RAD
  MILLISECONDS_PER_DAY

*/

(function () {
  var sun = {};
  sun.sunvar = {};

  sun.currentDirection = function () {
    sun.sunvar.now = timeManager.propTime();
    sun.sunvar.j = timeManager.jday(sun.sunvar.now.getUTCFullYear(),
                 sun.sunvar.now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 sun.sunvar.now.getUTCDate(),
                 sun.sunvar.now.getUTCHours(),
                 sun.sunvar.now.getUTCMinutes(),
                 sun.sunvar.now.getUTCSeconds());
    sun.sunvar.j += sun.sunvar.now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

    return sun.getDirection(sun.sunvar.j);
  };
  sun.getDirection = function (jd) {
    sun.sunvar.n = jd - 2451545;
    sun.sunvar.L = (280.460) + (0.9856474 * sun.sunvar.n); // mean longitude of sun
    sun.sunvar.g = (357.528) + (0.9856003 * sun.sunvar.n); // mean anomaly
    sun.sunvar.L = sun.sunvar.L % 360.0;
    sun.sunvar.g = sun.sunvar.g % 360.0;

    sun.sunvar.ecLon = sun.sunvar.L + 1.915 * Math.sin(sun.sunvar.g * DEG2RAD) + 0.020 * Math.sin(2 * sun.sunvar.g * DEG2RAD);
    sun.sunvar.ob = _getObliquity(jd);

    earth.lightDirection[0] = Math.cos(sun.sunvar.ecLon * DEG2RAD);
    earth.lightDirection[1] = Math.cos(sun.sunvar.ob * DEG2RAD) * Math.sin(sun.sunvar.ecLon * DEG2RAD);
    earth.lightDirection[2] = Math.sin(sun.sunvar.ob * DEG2RAD) * Math.sin(sun.sunvar.ecLon * DEG2RAD);

    // return [sun.sunvar.x, sun.sunvar.y, sun.sunvar.z];
  };

  function _getObliquity (jd) {
    sun.sunvar.t = (jd - 2451545) / 3652500;

    sun.sunvar.obliq = 84381.448 - 4680.93 * sun.sunvar.t - 1.55 * Math.pow(sun.sunvar.t, 2) + 1999.25 *
    Math.pow(sun.sunvar.t, 3) - 51.38 * Math.pow(sun.sunvar.t, 4) - 249.67 * Math.pow(sun.sunvar.t, 5) -
    39.05 * Math.pow(sun.sunvar.t, 6) + 7.12 * Math.pow(sun.sunvar.t, 7) + 27.87 * Math.pow(sun.sunvar.t, 8) +
    5.79 * Math.pow(sun.sunvar.t, 9) + 2.45 * Math.pow(sun.sunvar.t, 10);

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

    return sun.sunvar.obliq / 3600.0;
  }

  window.sun = sun;
})();
