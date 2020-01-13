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

  sun.getXYZ = function () {
    var now = timeManager.propTime();
    j = timeManager.jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds());
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);
    var jdo = new A.JulianDay(j); // now

    //var observerGd = satellite.currentSensor.observerGd;
    //var coord = A.EclCoord.fromWgs84(observerGd.latitude * RAD2DEG, observerGd.longitude * RAD2DEG, observerGd.height);

    var coord = A.EclCoord.fromWgs84(0,0,0);

    // AZ / EL Calculation
    var tp = A.Solar.topocentricPosition(jdo, coord, false);
    azimuth = tp.hz.az * RAD2DEG + 180 % 360;
    elevation = tp.hz.alt * RAD2DEG % 360;

    // Range Calculation
    var T = (new A.JulianDay(A.JulianDay.dateToJD(timeManager.propTime()))).jdJ2000Century();
	  sun.sunvar.g = A.Solar.meanAnomaly(T)*180/Math.PI;
    sun.sunvar.g = sun.sunvar.g % 360.0;
    sun.sunvar.R = 1.00014 - (0.01671 * Math.cos(sun.sunvar.g)) - (0.00014 * Math.cos(2 * sun.sunvar.g));
    range = sun.sunvar.R * 149597870700 / 1000; // au to km conversion

    // RAE to ECI
    sun.eci = satellite.ecfToEci(_lookAnglesToEcf(azimuth, elevation, range, 0,0,0), gmst);

    return {'x': sun.eci.x, 'y': sun.eci.y, 'z': sun.eci.z};
  };

  function _lookAnglesToEcf(azimuthDeg, elevationDeg, slantRange, obs_lat, obs_long, obs_alt) {

      // site ecef in meters
      var geodeticCoords = {};
      geodeticCoords.latitude = obs_lat;
      geodeticCoords.longitude = obs_long;
      geodeticCoords.height = obs_alt;

      var siteXYZ = satellite.geodeticToEcf(geodeticCoords);
      var sitex, sitey, sitez;
      sitex = siteXYZ.x;
      sitey = siteXYZ.y;
      sitez = siteXYZ.z;

      // some needed calculations
      var slat = Math.sin(obs_lat);
      var slon = Math.sin(obs_long);
      var clat = Math.cos(obs_lat);
      var clon = Math.cos(obs_long);

      var azRad = DEG2RAD * azimuthDeg;
      var elRad = DEG2RAD * elevationDeg;

      // az,el,range to sez convertion
      var south  = -slantRange * Math.cos(elRad) * Math.cos(azRad);
      var east   =  slantRange * Math.cos(elRad) * Math.sin(azRad);
      var zenith =  slantRange * Math.sin(elRad);

      var x = ( slat * clon * south) + (-slon * east) + (clat * clon * zenith) + sitex;
      var y = ( slat * slon * south) + ( clon * east) + (clat * slon * zenith) + sitey;
      var z = (-clat *        south) + ( slat * zenith) + sitez;

    return {'x': x, 'y': y, 'z': z};
  }

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
