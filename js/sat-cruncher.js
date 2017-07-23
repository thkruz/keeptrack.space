/* global

    satellite
    importScripts
    postMessage
    onmessage: true

*/
/* exported

    onmessage

*/
importScripts('satellite.min.js');

/** CONSTANTS */
var TAU = 2 * Math.PI;            // PI * 2 -- This makes understanding the formulas easier
var DEG2RAD = TAU / 360;          // Used to convert degrees to radians
var RAD2DEG = 360 / TAU;          // Used to convert radians to degrees
var RADIUS_OF_EARTH = 6371;       // Radius of Earth in kilometers

/** ARRAYS */
var satCache = [];                // Cache of Satellite Data from TLE.json and Static Data from variable.js
var satPos, satVel;               // Array of current Satellite and Static Positions and Velocities
var satInView;                    // Array of booleans showing if current Satellite is in view of Sensor

/** OBSERVER VARIABLES */
var latitude = 0;                 // latitude of Sensor
var longitude = 0;                // longitude of Sensor
var obshei = 0;                   // Height of Sensor
var observerGd = {};              // Latitude, Longitude, and Height in an Array for Satellite.js Calculations
var obsminaz = 0;                 // Minimum Azimuth of Sensor FOV
var obsmaxaz = 0;                 // Maximum Azimuth of Sensor FOV
var obsminel = 0;                 // Minimum Elevation of Sensor FOV
var obsmaxel = 0;                 // Maximum Elevation of Sensor FOV
var obsminrange = 0;              // Minimum Range of Sensor FOV
var obsmaxrange = 0;              // Maximum Range of Sensor FOV
var obsminaz2 = 0;                // Minimum Azimuth of Secondary Sensor FOV
var obsmaxaz2 = 0;                // Maximum Azimuth of Secondary Sensor FOV
var obsminel2 = 0;                // Minimum Elevation of Secondary Sensor FOV
var obsmaxel2 = 0;                // Maximum Elevation of Secondary Sensor FOV
var obsminrange2 = 0;              // Minimum Range of Secondary Sensor FOV
var obsmaxrange2 = 0;              // Maximum Range of Secondary Sensor FOV

/** TIME VARIABLES */
var propOffset = 0;                 // offset letting us propagate in the future (or past)
var propRate = 1;                   // lets us run time faster (or slower) than normal
var propRealTime = Date.now();      // lets us run time faster (or slower) than normal

onmessage = function (m) {
  propRealTime = Date.now();

  if (m.data.lat) { latitude = m.data.lat; }
  if (m.data.long) { longitude = m.data.long; }
  if (m.data.obshei) { obshei = m.data.obshei; } // string
  if (m.data.setlatlong) {
    observerGd = {
      longitude: longitude * DEG2RAD,
      latitude: latitude * DEG2RAD,
      obshei: obshei * 1 // Convert from string
    };
    if (m.data.obsminaz != null) { obsminaz = m.data.obsminaz * 1; }
    if (m.data.obsmaxaz != null) { obsmaxaz = m.data.obsmaxaz * 1; }
    if (m.data.obsminel != null) { obsminel = m.data.obsminel * 1; }
    if (m.data.obsmaxel != null) { obsmaxel = m.data.obsmaxel * 1; }
    if (m.data.obsminrange != null) { obsminrange = m.data.obsminrange * 1; }
    if (m.data.obsmaxrange != null) { obsmaxrange = m.data.obsmaxrange * 1; }
    if (m.data.obsminaz2 != null) { obsminaz2 = m.data.obsminaz * 1; }
    if (m.data.obsmaxaz2 != null) { obsmaxaz2 = m.data.obsmaxaz * 1; }
    if (m.data.obsminel2 != null) { obsminel2 = m.data.obsminel * 1; }
    if (m.data.obsmaxel2 != null) { obsmaxel2 = m.data.obsmaxel * 1; }
    if (m.data.obsminrange2 != null) { obsminrange2 = m.data.obsminrange * 1; }
    if (m.data.obsmaxrange2 != null) { obsmaxrange2 = m.data.obsmaxrange * 1; }
  }

  switch (m.data.typ) {
    case 'offset':
      propOffset = Number(m.data.dat.split(' ')[0]);
      propRate = Number(m.data.dat.split(' ')[1]);
      return;
    case 'satdata':
      var satData = JSON.parse(m.data.dat);
      var len = satData.length;

      var extraData = [];
      for (var i = 0; i < len; i++) {
        var satrec;
        var extra = {};
        if (satData[i].static) {
          satrec = satData[i];
          extra.name = 'test launch name';
        } else {
          satrec = satellite.twoline2satrec( // perform and store sat init calcs
            satData[i].TLE1, satData[i].TLE2);

          // extra.SCC_NUM = pad(satData[i].TLE1.substr(2, 5).trim(), 5);

          extra.inclination = satrec.inclo; // rads
          extra.eccentricity = satrec.ecco;
          extra.raan = satrec.nodeo;        // rads
          extra.argPe = satrec.argpo;       // rads
          extra.meanMotion = satrec.no * 60 * 24 / TAU; // convert rads/minute to rev/day
          extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2 / 3));
          extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
          extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH;
          extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH;
          extra.period = 1440.0 / extra.meanMotion;
        }

        extraData.push(extra);
        satCache.push(satrec);
      }

      satPos = new Float32Array(len * 3);
      satVel = new Float32Array(len * 3);
      satInView = new Float32Array(len);

      postMessage({
        extraData: JSON.stringify(extraData)
      });
      satData = null;
      break;
    case 'satEdit':
      // TODO: This code is not optimized yet. Making arrays for one object is unnecessary
      // and I am not sure if there is any reason to convert to JSON back and forth from the web workers.
      satCache[m.data.id] = satellite.twoline2satrec( // replace old TLEs
        m.data.TLE1, m.data.TLE2);
      satrec = satCache[m.data.id];
      extraData = [];
      extra = {};
      // keplerian elements
      extra.inclination = satrec.inclo; // rads
      extra.eccentricity = satrec.ecco;
      extra.raan = satrec.nodeo;        // rads
      extra.argPe = satrec.argpo;       // rads
      extra.meanMotion = satrec.no * 60 * 24 / (2 * Math.PI); // convert rads/minute to rev/day

      // fun other data
      extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2 / 3));
      extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
      extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH;
      extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH;
      extra.period = 1440.0 / extra.meanMotion;
      extra.TLE1 = m.data.TLE1;
      extra.TLE2 = m.data.TLE2;
      extraData.push(extra);
      postMessage({
        extraUpdate: true,
        extraData: JSON.stringify(extraData),
        satId: m.data.id
      });
      break;
  }
  propagate();
};

function propagate () {
  var now = propTime();
  // console.log('sat-cruncher propagate: ' + now);
  var j = jday(now.getUTCFullYear(),
               now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
               now.getUTCDate(),
               now.getUTCHours(),
               now.getUTCMinutes(),
               now.getUTCSeconds());
  j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
  var gmst = satellite.gstime_from_jday(j);

  for (var i = 0; i < satCache.length; i++) {
    if (satCache[i].static) {
      var cosLat = Math.cos(satCache[i].lat * DEG2RAD);
      var sinLat = Math.sin(satCache[i].lat * DEG2RAD);
      var cosLon = Math.cos((satCache[i].lon * DEG2RAD) + gmst);
      var sinLon = Math.sin((satCache[i].lon * DEG2RAD) + gmst);

      satPos[i * 3] = (RADIUS_OF_EARTH + 3) * cosLat * cosLon;
      satPos[i * 3 + 1] = (RADIUS_OF_EARTH + 3) * cosLat * sinLon;
      satPos[i * 3 + 2] = (RADIUS_OF_EARTH + 3) * sinLat;

      satVel[i * 3] = 0;
      satVel[i * 3 + 1] = 0;
      satVel[i * 3 + 2] = 0;
    } else {
      var m = (j - satCache[i].jdsatepoch) * 1440.0; // 1440 = minutes_per_day
      var pv = satellite.sgp4(satCache[i], m);
      var x, y, z, vx, vy, vz;
      var positionEcf, lookangles, azimuth, elevation, rangeSat;

      try {
        x = pv.position.x; // translation of axes from earth-centered inertial
        y = pv.position.y; // to OpenGL is done in shader with projection matrix
        z = pv.position.z; // so we don't have to worry about it
        vx = pv.velocity.x;
        vy = pv.velocity.y;
        vz = pv.velocity.z;

        positionEcf = satellite.eci_to_ecf(pv.position, gmst); // pv.position is called positionEci originally
        lookangles = satellite.ecf_to_look_angles(observerGd, positionEcf);
        // TODO: Might add dopplerFactor back in or to lookangles for HAM Radio use
        // dopplerFactor = satellite.dopplerFactor(observerCoordsEcf, positionEcf, velocityEcf);

        azimuth = lookangles.azimuth;
        elevation = lookangles.elevation;
        rangeSat = lookangles.range_sat;
      } catch (e) {
        x = 0;
        y = 0;
        z = 0;
        vx = 0;
        vy = 0;
        vz = 0;
        positionEcf = 0;
        lookangles = 0;
        azimuth = 0;
        elevation = 0;
        rangeSat = 0;
      }
      satPos[i * 3] = x;
      satPos[i * 3 + 1] = y;
      satPos[i * 3 + 2] = z;

      satVel[i * 3] = vx;
      satVel[i * 3 + 1] = vy;
      satVel[i * 3 + 2] = vz;

      azimuth *= RAD2DEG;
      elevation *= RAD2DEG;

      if (obsminaz > obsmaxaz) {
        if ((azimuth >= obsminaz || azimuth <= obsmaxaz) && (elevation >= obsminel && elevation <= obsmaxel) && (rangeSat <= obsmaxrange && rangeSat >= obsminrange) || (azimuth >= obsminaz2 || azimuth <= obsmaxaz2) && (elevation >= obsminel2 && elevation <= obsmaxel2) && (rangeSat <= obsmaxrange2 && rangeSat >= obsminrange2)) {
          satInView[i] = true;
        } else {
          satInView[i] = false;
        }
      } else {
        if ((azimuth >= obsminaz && azimuth <= obsmaxaz) && (elevation >= obsminel && elevation <= obsmaxel) && (rangeSat <= obsmaxrange && rangeSat >= obsminrange) || (azimuth >= obsminaz2 && azimuth <= obsmaxaz2) && (elevation >= obsminel2 && elevation <= obsmaxel2) && (rangeSat <= obsmaxrange2 && rangeSat >= obsminrange2)) {
          satInView[i] = true;
        } else {
          satInView[i] = false;
        }
      }
    }
  }

  postMessage({
    satPos: satPos.buffer,
    satVel: satVel.buffer,
    satInView: satInView.buffer},
              [satPos.buffer, satVel.buffer, satInView.buffer]
  );

  satPos = new Float32Array(satCache.length * 3);
  satVel = new Float32Array(satCache.length * 3);
  satInView = new Float32Array(satCache.length);

  var divisor = Math.max(propRate, 0.1);
  setTimeout(propagate, 500 / divisor);
}

/** Returns number with 0s in front */
function pad (num, size) {
  var s = '00000' + num;
  return s.substr(s.length - size);
}

/** Returns Ordinal Day (Commonly Called J Day) */
function jday (year, mon, day, hr, minute, sec) {
  'use strict';
  return (367.0 * year -
        Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
        Math.floor(275 * mon / 9.0) +
        day + 1721013.5 +
        ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
        );
}

/** Returns Current Propagation Time */
function propTime () {
  'use strict';

  var now = new Date();
  var realElapsedMsec = Number(now) - Number(propRealTime);
  var scaledMsec = realElapsedMsec * propRate;
  now.setTime(Number(propRealTime) + propOffset + scaledMsec);
  return now;
}
