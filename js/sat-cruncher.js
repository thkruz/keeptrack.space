/* global

    satellite
    importScripts
    postMessage
    onmessage: true

*/
/* exported

    onmessage

*/
importScripts('lib/satellite-1.3.min.js');

/** CONSTANTS */
var TAU = 2 * Math.PI;            // PI * 2 -- This makes understanding the formulas easier
var DEG2RAD = TAU / 360;          // Used to convert degrees to radians
var RAD2DEG = 360 / TAU;          // Used to convert radians to degrees
var RADIUS_OF_EARTH = 6371;       // Radius of Earth in kilometers

/** ARRAYS */
var satCache = [];                // Cache of Satellite Data from TLE.json and Static Data from variable.js
var satPos, satVel;               // Array of current Satellite and Static Positions and Velocities
var satInView;                    // Array of booleans showing if current Satellite is in view of Sensor
var satAbove;

/** OBSERVER VARIABLES */
var sensor = {};
var mSensor;
var multiSensor = false;
var planetariumView = false;
sensor.defaultGd = {
  longitude: 0,
  latitude: 0,
  height: 0
};
sensor.observerGd = sensor.defaultGd;
var propagationRunning = false;
var divisor = 1;

/** TIME VARIABLES */
var propOffset = 0;                 // offset letting us propagate in the future (or past)
var propRate = 1;                   // lets us run time faster (or slower) than normal
var propRealTime = Date.now();      // lets us run time faster (or slower) than normal

onmessage = function (m) {
  propRealTime = Date.now();

  if (m.data.planetariumView) {
    planetariumView = true;
  }
  if (m.data.nonPlanetariumView){
    planetariumView = false;
  }

  if (m.data.multiSensor) {
    multiSensor = true;
    mSensor = m.data.sensor;
  } else if (m.data.sensor) {
    sensor = m.data.sensor;
    if (m.data.setlatlong) {
      sensor.observerGd = {
        longitude: m.data.sensor.long * DEG2RAD,
        latitude: m.data.sensor.lat * DEG2RAD,
        height: m.data.sensor.obshei * 1 // Convert from string
      };
    }
    multiSensor = false;
  }

  switch (m.data.typ) {
    case 'offset':
      propOffset = Number(m.data.dat.split(' ')[0]);
      propRate = Number(m.data.dat.split(' ')[1]);
      divisor = Math.max(propRate, 0.1);
      return;
    case 'satdata':
      var satData = JSON.parse(m.data.dat);
      var len = satData.length;
      var i = 0;

      var extraData = [];
      var extra = {};
      var satrec;
      while (i < len) {
        extra = {};
        satrec = null;
        if ((satData[i].static) || (satData[i].missile)) {
          satrec = satData[i];
          extraData.push(extra);
          satCache.push(satrec);
          i++;
          continue;
        } else {
          satrec = satellite.twoline2satrec( // perform and store sat init calcs
            satData[i].TLE1, satData[i].TLE2);
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

          extraData.push(extra);
          satCache.push(satrec);
          i++;
        }
      }

      satPos = new Float32Array(len * 3);
      satVel = new Float32Array(len * 3);
      satInView = new Float32Array(len);
      satAbove = new Float32Array(len);

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
    case 'newMissile':
      satCache[m.data.id] = m.data;
      break;
  }
  if (!propagationRunning) propagateCruncher();
};

function propagateCruncher () {
  // var pTime = Date.now();
  propagationRunning = true;
  var now = propTime();
  var j = jday(now.getUTCFullYear(),
               now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
               now.getUTCDate(),
               now.getUTCHours(),
               now.getUTCMinutes(),
               now.getUTCSeconds());
  j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
  var gmst = satellite.gstimeFromJday(j);
  // var gmst = satellite.gstime(j);
  var len = satCache.length - 1;
  var i = -1;

  var positionEcf, lookangles, azimuth, elevation, rangeSat;
  var x, y, z, vx, vy, vz;
  var cosLat, sinLat, cosLon, sinLon;
  var curMissileTime;
  var s, m, pv, tLen, t;

  while (i < len) {
    // TODO Redoing the gmst calculation is more accurate at but processor
    // intensive and should be an optional thing

    i++;

    if (satCache[i].static) {
      cosLat = Math.cos(satCache[i].lat * DEG2RAD);
      sinLat = Math.sin(satCache[i].lat * DEG2RAD);
      cosLon = Math.cos((satCache[i].lon * DEG2RAD) + gmst);
      sinLon = Math.sin((satCache[i].lon * DEG2RAD) + gmst);

      satPos[i * 3] = (RADIUS_OF_EARTH + 0.25) * cosLat * cosLon;
      satPos[i * 3 + 1] = (RADIUS_OF_EARTH + 0.25) * cosLat * sinLon;
      satPos[i * 3 + 2] = (RADIUS_OF_EARTH + 0.25) * sinLat;

      satVel[i * 3] = 0;
      satVel[i * 3 + 1] = 0;
      satVel[i * 3 + 2] = 0;

      cosLat = null;
      cosLon = null;
      sinLat = null;
      sinLon = null;
    } else if (satCache[i].missile) {
      if (!satCache[i].active) { continue; } // Skip inactive missiles
      tLen = satCache[i].altList.length;
      for (t = 0; t < tLen; t++) {
        if (satCache[i].startTime + t * 1000 > now) {
          curMissileTime = t;
          break;
        }
      }
      cosLat = Math.cos(satCache[i].latList[curMissileTime] * DEG2RAD);
      sinLat = Math.sin(satCache[i].latList[curMissileTime] * DEG2RAD);
      cosLon = Math.cos((satCache[i].lonList[curMissileTime] * DEG2RAD) + gmst);
      sinLon = Math.sin((satCache[i].lonList[curMissileTime] * DEG2RAD) + gmst);

      satPos[i * 3] = (RADIUS_OF_EARTH + satCache[i].altList[curMissileTime]) * cosLat * cosLon;
      satPos[i * 3 + 1] = (RADIUS_OF_EARTH + satCache[i].altList[curMissileTime]) * cosLat * sinLon;
      satPos[i * 3 + 2] = (RADIUS_OF_EARTH + satCache[i].altList[curMissileTime]) * sinLat;

      x = satPos[i * 3];
      y = satPos[i * 3 + 1];
      z = satPos[i * 3 + 2];

      satVel[i * 3] = 0;
      satVel[i * 3 + 1] = 0;
      satVel[i * 3 + 2] = 0;

      cosLat = null;
      cosLon = null;
      sinLat = null;
      sinLon = null;

      positionEcf = satellite.eciToEcf({x: x, y: y, z: z}, gmst); // pv.position is called positionEci originally
      lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);

      azimuth = lookangles.azimuth;
      elevation = lookangles.elevation;
      rangeSat = lookangles.rangeSat;

      azimuth *= RAD2DEG;
      elevation *= RAD2DEG;
      satInView[i] = false; // Default in case no sensor selected

      if (sensor.obsminaz > sensor.obsmaxaz) {
        if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
          satInView[i] = true;
        } else {
          satInView[i] = false;
        }
      } else {
        if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
          satInView[i] = true;
        } else {
          satInView[i] = false;
        }
      }
    } else {
      // Skip reentries
      if (satCache[i].skip) continue;
      m = (j - satCache[i].jdsatepoch) * 1440.0; // 1440 = minutes_per_day
      pv = satellite.sgp4(satCache[i], m);

      try {
        x = pv.position.x; // translation of axes from earth-centered inertial
        y = pv.position.y; // to OpenGL is done in shader with projection matrix
        z = pv.position.z; // so we don't have to worry about it
        vx = pv.velocity.x;
        vy = pv.velocity.y;
        vz = pv.velocity.z;


        if (sensor.observerGd !== sensor.defaultGd || multiSensor) {
          positionEcf = satellite.eciToEcf(pv.position, gmst); // pv.position is called positionEci originally
          lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
          azimuth = lookangles.azimuth;
          elevation = lookangles.elevation;
          rangeSat = lookangles.rangeSat;
        }
      } catch (e) {
        // This is probably a reentry and should be skipped from now on.
        satCache[i].skip = true;
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

      satInView[i] = false; // Default in case no sensor selected

      if (multiSensor) {
        for (s = 0; s < mSensor.length; s++) {
          if (satInView[i]) break;
          sensor = mSensor[s];
          sensor.observerGd = {
            longitude: sensor.long * DEG2RAD,
            latitude: sensor.lat * DEG2RAD,
            height: sensor.obshei * 1 // Convert from string
          };
          lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
          azimuth = lookangles.azimuth;
          elevation = lookangles.elevation;
          rangeSat = lookangles.rangeSat;
          azimuth *= RAD2DEG;
          elevation *= RAD2DEG;

          if (sensor.obsminaz > sensor.obsmaxaz) {
            if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
            ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
              satInView[i] = true;
            }
          } else {
            if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
            ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
              satInView[i] = true;
            }
          }
        }
      } else {
        if (sensor.observerGd !== sensor.defaultGd) {
          azimuth *= RAD2DEG;
          elevation *= RAD2DEG;

          if (sensor.obsminaz > sensor.obsmaxaz) {
            if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
               ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
              satInView[i] = true;
            }
          } else {
            if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
               ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
              satInView[i] = true;
            }
          }
        }
      }

      // Determine if satellite is within planetarium view
      if (elevation >= 32) {
        satAbove[i] = true;
      } else {
        satAbove[i] = false;
      }
    }
  }

  postMessage({
    satPos: satPos.buffer,
    satVel: satVel.buffer,
    satInView: satInView.buffer,
    satAbove: satAbove.buffer}
    // ,
    // [satPos.buffer, satVel.buffer, satInView.buffer]
  );

  satPos = new Float32Array(satCache.length * 3);
  satVel = new Float32Array(satCache.length * 3);
  satInView = new Float32Array(satCache.length);
  satAbove = new Float32Array(satCache.length);

  // NOTE The longer the delay the more jitter at higher speeds of propagation
  setTimeout(propagateCruncher, 1 * 1000 / divisor);
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
