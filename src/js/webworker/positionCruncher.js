/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
(c) 2015-2016, James Yoder

http://keeptrack.space

Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt

All additions and modifications of original code is Copyright © 2016-2020 by
Theodore Kruczek. All rights reserved. No part of this web site may be reproduced,
published, distributed, displayed, performed, copied or stored for public or private
use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

'use strict';
import '@app/js/lib/external/numeric.js';
import * as satellite from 'satellite.js';
import { A } from '@app/js/lib/external/meuusjs.js';
import { SunCalc } from '@app/js/lib/suncalc.js';

/** CONSTANTS */
const PI = Math.PI;
const TAU = 2 * PI; // PI * 2 -- This makes understanding the formulas easier
const DEG2RAD = TAU / 360; // Used to convert degrees to radians
const RAD2DEG = 360 / TAU; // Used to convert radians to degrees
const RADIUS_OF_EARTH = 6371; // Radius of Earth in kilometers
const GROUND_BUFFER_DISTANCE = 1; // Distance objects are placed above earth to avoid z-buffer fighting
const RADIUS_OF_SUN = 695700; // Radius of the Sun in kilometers
const STAR_DISTANCE = 250000; // Artificial Star Distance - Lower numberrReduces webgl depth buffer
// const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/** ARRAYS */
var satCache = []; // Cache of Satellite Data from TLE.json and Static Data from variable.js
var sensorMarkerArray = [0]; // Array of Markers used to show sensor fence and FOV
var satPos, satVel; // Array of current Satellite and Static Positions and Velocities
var satInView; // Array of booleans showing if current Satellite is in view of Sensor
var satInSun; // Array of booleans showing if current Satellite is in sunlight
var satelliteSelected = [-1]; // Array used to determine which satellites are selected

/** TIME VARIABLES */
let globalPropagationRate = 1000; // Limits how often the propagation loop runs
let globalPropagationRateMultiplier = 1; // Used to slow down propagation rate on slow computers
var propagationRunning = false; // Prevent Propagation From Running Twice
var divisor = 1; // When running at high speeds, allow faster propagation
var propOffset = 0; // offset varting us propagate in the future (or past)
var propRate = 1; // vars us run time faster (or slower) than normal
var propRealTime = Date.now(); // vars us run time faster (or slower) than normal

/** Settings */
var selectedSatFOV = 90; // FOV in Degrees
var isShowFOVBubble = false; // Flag for if FOV bubble is shown
var isShowSurvFence = false; // Flag for if fence markers are shown
var isResetFOVBubble = false;
var isShowSatOverfly = false;
var isResetSatOverfly = false;
var isMultiSensor = false;
var isIgnoreNonRadar = true;
var isSunlightView = false;
var isLowPerf = false;
var isResetMarker = false;
var isResetInView = false;
let fieldOfViewSetLength;
let len;

let postMessageArray = {};

/** OBSERVER VARIABLES */
var sensor = {};
var mSensor = {};
var defaultGd = {
  lat: null,
  longitude: 0,
  latitude: 0,
  height: 0,
};
sensor.defaultGd = defaultGd;
sensor.observerGd = defaultGd;

// Handles Incomming Messages to sat-cruncher from main thread
onmessage = function (m) {
  // Set propRealTime Once
  if (typeof propRealTime == 'undefined') {
    propRealTime = Date.now();
  }

  if (m.data.isSunlightView) {
    isSunlightView = m.data.isSunlightView;
    // if (isSunlightView == false) isResetSunlight = true;
  }

  if (m.data.satelliteSelected) {
    satelliteSelected = m.data.satelliteSelected;
    if (satelliteSelected[0] === -1) {
      isResetSatOverfly = true;
      if (isResetMarker == false) isResetMarker = true;
    }
  }

  if (m.data.isSlowCPUModeEnabled) {
    globalPropagationRateMultiplier *= 2;
  }

  if (m.data.isLowPerf) {
    isLowPerf = true;
  }

  // //////////////////////////////
  // SAT OVERFLY AND FOV BUBBLE
  // /////////////////////////////
  if (m.data.fieldOfViewSetLength) {
    fieldOfViewSetLength = m.data.fieldOfViewSetLength;
  }

  if (m.data.isShowSatOverfly === 'enable') {
    isShowSatOverfly = true;
    selectedSatFOV = m.data.selectedSatFOV;
  }
  if (m.data.isShowSatOverfly === 'reset') {
    isResetSatOverfly = true;
    isShowSatOverfly = false;
    if (isResetMarker == false) isResetMarker = true;
  }

  if (m.data.isShowFOVBubble === 'enable') {
    isShowFOVBubble = true;
  }
  if (m.data.isShowFOVBubble === 'reset') {
    isResetFOVBubble = true;
    isShowFOVBubble = false;
    if (isResetMarker == false) isResetMarker = true;
  }

  if (m.data.isShowSurvFence === 'enable') {
    isShowSurvFence = true;
    if (isResetMarker == false) isResetMarker = true;
  }
  if (m.data.isShowSurvFence === 'disable') {
    isShowSurvFence = false;
    if (isResetMarker == false) isResetMarker = true;
  }

  // ////////////////////////////////

  if (m.data.multiSensor) {
    isMultiSensor = true;
    mSensor = m.data.sensor;
    sensor = m.data.sensor;
    globalPropagationRate = 2000;
    if (isResetInView == false) isResetInView = true;
  } else if (m.data.sensor) {
    sensor = m.data.sensor;
    if (m.data.setlatlong) {
      if (m.data.resetObserverGd) {
        globalPropagationRate = 1000;
        sensor.observerGd = defaultGd;
        mSensor = {};
        if (isResetInView == false) isResetInView = true;
      } else {
        globalPropagationRate = 2000;
        sensor.observerGd = {
          longitude: m.data.sensor.lon * DEG2RAD,
          latitude: m.data.sensor.lat * DEG2RAD,
          height: m.data.sensor.alt * 1, // Convert from string
        };
        if (isResetInView == false) isResetInView = true;
      }
    }
    isMultiSensor = false;
  }

  const oldPropRate = propRate;

  switch (m.data.typ) {
    case 'offset':
      propOffset = Number(m.data.dat.split(' ')[0]);
      propRate = Number(m.data.dat.split(' ')[1]);

      if (!(oldPropRate == 0 && propRate == 0)) {
        // Update propRealTime only if updating propOffset
        propRealTime = Date.now();
      }

      // Changing this to 0.1 caused issues...
      divisor = 1;
      return;
    case 'satdata':
      var satData = JSON.parse(m.data.dat);
      len = satData.length;
      var i = 0;

      var extraData = [];
      var extra = {};
      var satrec;
      while (i < len) {
        extra = {};
        satrec = null;
        if (satData[i].static || satData[i].missile || satData[i].isRadarData) {
          satrec = satData[i];
          delete satrec['id'];
          extraData.push(extra);
          satCache.push(satrec);
          i++;
          continue;
        } else {
          satrec = satellite.twoline2satrec(
            // perform and store sat init calcs
            satData[i].TLE1,
            satData[i].TLE2
          );
          extra.lowAlt = satrec.isimp;
          extra.inclination = satrec.inclo; // rads
          extra.eccentricity = satrec.ecco;
          extra.raan = satrec.nodeo; // rads
          extra.argPe = satrec.argpo; // rads
          extra.meanMotion = (satrec.no * 60 * 24) / TAU; // convert rads/minute to rev/day
          extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, 2 / 3);
          extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
          extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH;
          satrec.apogee = extra.apogee;
          extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH;
          extra.period = 1440.0 / extra.meanMotion;

          extraData.push(extra);
          delete satrec['id'];
          satCache.push(satrec);
          i++;
        }
      }

      satPos = new Float32Array(len * 3);
      satVel = new Float32Array(len * 3);
      satInView = new Int8Array(len);
      satInSun = new Int8Array(len);

      postMessage({
        extraData: JSON.stringify(extraData),
      });
      satData = null;
      break;
    case 'satEdit':
      satCache[m.data.id] = satellite.twoline2satrec(
        // replace old TLEs
        m.data.TLE1,
        m.data.TLE2
      );
      satrec = satCache[m.data.id];
      extraData = [];
      extra = {};
      // keplerian elements
      extra.inclination = satrec.inclo; // rads
      extra.eccentricity = satrec.ecco;
      extra.raan = satrec.nodeo; // rads
      extra.argPe = satrec.argpo; // rads
      extra.meanMotion = (satrec.no * 60 * 24) / (2 * PI); // convert rads/minute to rev/day

      // fun other data
      extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, 2 / 3);
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
        satId: m.data.id,
      });
      break;
    case 'newMissile':
      satCache[m.data.id] = m.data;
      break;
  }
  if (!propagationRunning) {
    len = -1; // propagteCruncher needs to start at -1 not 0
    propagateCruncher();
  }
};

// Prevent Memory Leak by declaring variables outside of function
var geodeticCoords;
var siteXYZ;
var sitex, sitey, sitez;
var slat, slon, clat, clon;
var azRad, elRad;
var south, east, zenith;
var x, y, z;
var sunAz, sunEl, sunRange, sunElRel, sunR, sunECI, sunG;
var _lookAnglesToEcf = (azimuthDeg, elevationDeg, slantRange, obsLat, obsLong, obsAlt) => {
  // site ecef in meters
  geodeticCoords = {};
  geodeticCoords.latitude = obsLat;
  geodeticCoords.longitude = obsLong;
  geodeticCoords.height = obsAlt;

  siteXYZ = satellite.geodeticToEcf(geodeticCoords);
  sitex = siteXYZ.x;
  sitey = siteXYZ.y;
  sitez = siteXYZ.z;

  // some needed calculations
  slat = Math.sin(obsLat);
  slon = Math.sin(obsLong);
  clat = Math.cos(obsLat);
  clon = Math.cos(obsLong);

  azRad = DEG2RAD * azimuthDeg;
  elRad = DEG2RAD * elevationDeg;

  // az,el,range to sez convertion
  south = -slantRange * Math.cos(elRad) * Math.cos(azRad);
  east = slantRange * Math.cos(elRad) * Math.sin(azRad);
  zenith = slantRange * Math.sin(elRad);

  x = slat * clon * south + -slon * east + clat * clon * zenith + sitex;
  y = slat * slon * south + clon * east + clat * slon * zenith + sitey;
  z = -clat * south + slat * zenith + sitez;

  return { x: x, y: y, z: z };
};

// //////////////////////////////////////////////////////////////////////////
// Benchmarking
// var averageTimeForCrunchLoop = 0;
// var totalCrunchTime1 = 0;
// var averageTimeForPropagate = 0;
// var totalCrunchTime2 = 0;
// var numOfCrunches = 0;
// //////////////////////////////////////////////////////////////////////////
var propagateCruncher = () => {
  // OPTIMIZE: 25.9ms
  // var startTime1 = performance.now();
  // numOfCrunches++;
  propagationRunning = true;

  var now = propTime();

  var j = jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  );
  j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond

  var gmst = satellite.gstime(j);

  var isSunExclusion = false;
  if (isSunlightView && !isMultiSensor) {
    var jdo = new A.JulianDay(j); // now
    var coord = A.EclCoord.fromWgs84(0, 0, 0);
    var coord2 = A.EclCoord.fromWgs84(sensor.observerGd.latitude * RAD2DEG, sensor.observerGd.longitude * RAD2DEG, sensor.observerGd.height);

    // AZ / EL Calculation
    var tp = A.Solar.topocentricPosition(jdo, coord, false);
    var tpRel = A.Solar.topocentricPosition(jdo, coord2, false);
    sunAz = tp.hz.az * RAD2DEG + (180 % 360);
    sunEl = (tp.hz.alt * RAD2DEG) % 360;
    sunElRel = (tpRel.hz.alt * RAD2DEG) % 360;

    // Range Calculation
    var T = new A.JulianDay(A.JulianDay.dateToJD(now)).jdJ2000Century();
    sunG = (A.Solar.meanAnomaly(T) * 180) / PI;
    sunG = sunG % 360.0;
    sunR = 1.00014 - 0.01671 * Math.cos(sunG) - 0.00014 * Math.cos(2 * sunG);
    sunRange = (sunR * 149597870700) / 1000; // au to km conversion

    // RAE to ECI
    sunECI = satellite.ecfToEci(_lookAnglesToEcf(sunAz, sunEl, sunRange, 0, 0, 0), gmst);
    if (sensor.observerGd !== defaultGd && (sensor.type === 'Optical' || sensor.type === 'Observer') && sunElRel > -6) {
      isSunExclusion = true;
    } else {
      isSunExclusion = false;
    }
  }

  var j2 = j;
  j2 = jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds() + 1
  );
  j2 += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
  var gmstNext = satellite.gstime(j2);
  len = satCache.length - 1;

  if ((!isResetSatOverfly && !isShowSatOverfly && !isResetFOVBubble && !isShowFOVBubble) || isLowPerf) {
    len -= fieldOfViewSetLength;
  }

  var i = -1;

  // var startTime2 = 0;
  // var stopTime2 = 0;

  let positionEcf, lookangles, azimuth, elevation, rangeSat;
  let x, y, z;
  let cosLat, sinLat, cosLon, sinLon;
  let curMissivarTime;
  let s, m, pv, tLen, t;
  let sat;
  let isSensorChecked = false;
  let az, el, rng, pos;
  let q, q2;
  let semiDiamEarth, semiDiamSun, theta;
  let starPosition;
  let snum;
  let lat, long;
  let satSelPosX, satSelPosY, satSelPosZ, satSelPosEcf, satSelPos, satSelGeodetic, satHeight, satSelPosEarth, deltaLat, deltaLatInt, deltaLon, deltaLonInt;
  while (i < len) {
    i++; // At the beginning so i starts at 0
    // totalCrunchTime2 += (stopTime2 - startTime2);
    sat = satCache[i];
    if (sat.satnum) {
      // Skip reentries
      if (sat.skip) continue;
      m = (j - sat.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
      // startTime2 = performance.now();
      pv = satellite.sgp4(sat, m);
      // stopTime2 = performance.now();

      try {
        satPos[i * 3] = pv.position.x;
        satPos[i * 3 + 1] = pv.position.y;
        satPos[i * 3 + 2] = pv.position.z;

        satVel[i * 3] = pv.velocity.x;
        satVel[i * 3 + 1] = pv.velocity.y;
        satVel[i * 3 + 2] = pv.velocity.z;

        // Make sure that objects with an imprecise orbit or an old elset
        // are not failing to propagate
        if (sat.isimp || m / 1440 > 30) {
          const a = 6378.137;
          const b = 6356.7523142;
          const R = Math.sqrt(pv.position.x * pv.position.x + pv.position.y * pv.position.y);
          const f = (a - b) / a;
          const e2 = 2 * f - f * f;

          let lon = Math.atan2(pv.position.y, pv.position.x) - gmst;
          while (lon < -PI) {
            lon += TAU;
          }
          while (lon > PI) {
            lon -= TAU;
          }

          const kmax = 20;
          let k = 0;
          let lat = Math.atan2(pv.position.z, Math.sqrt(pv.position.x * pv.position.x + pv.position.y * pv.position.y));
          let C;
          while (k < kmax) {
            C = 1 / Math.sqrt(1 - e2 * (Math.sin(lat) * Math.sin(lat)));
            lat = Math.atan2(pv.position.z + a * C * e2 * Math.sin(lat), R);
            k += 1;
          }
          const alt = R / Math.cos(lat) - a * C;
          if (alt > sat.apogee + 1000) {
            throw new Error('Impossible orbit');
          }
        }

        // Skip Calculating Lookangles if No Sensor is Selected
        if (!isSensorChecked) {
          if (sensor.observerGd !== defaultGd && !isMultiSensor) {
            positionEcf = satellite.eciToEcf(pv.position, gmst); // pv.position is called positionEci originally
            lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
            azimuth = lookangles.azimuth;
            elevation = lookangles.elevation;
            rangeSat = lookangles.rangeSat;
          } else {
            isSensorChecked = true;
          }
        }
      } catch (e) {
        // This is probably a reentry and should be skipped from now on.
        satCache[i].skip = true;
        satPos[i * 3] = 0;
        satPos[i * 3 + 1] = 0;
        satPos[i * 3 + 2] = 0;

        satVel[i * 3] = 0;
        satVel[i * 3 + 1] = 0;
        satVel[i * 3 + 2] = 0;

        positionEcf = 0;
        lookangles = 0;
        azimuth = 0;
        elevation = 0;
        rangeSat = 0;
      }

      satInView[i] = false; // Default in case no sensor selected
      satInSun[i] = 2; // Default in case

      if (isSunlightView) {
        semiDiamEarth = Math.asin(RADIUS_OF_EARTH / Math.sqrt(Math.pow(-satPos[i * 3], 2) + Math.pow(-satPos[i * 3 + 1], 2) + Math.pow(-satPos[i * 3 + 2], 2))) * RAD2DEG;
        semiDiamSun = Math.asin(RADIUS_OF_SUN / Math.sqrt(Math.pow(-satPos[i * 3] + sunECI.x, 2) + Math.pow(-satPos[i * 3 + 1] + sunECI.y, 2) + Math.pow(-satPos[i * 3 + 2] + sunECI.z, 2))) * RAD2DEG;

        // Angle between earth and sun
        theta =
          Math.acos(
            self.numeric.dot([-satPos[i * 3], -satPos[i * 3 + 1], -satPos[i * 3 + 2]], [-satPos[i * 3] + sunECI.x, -satPos[i * 3 + 1] + sunECI.y, -satPos[i * 3 + 2] + sunECI.z]) /
              (Math.sqrt(Math.pow(-satPos[i * 3], 2) + Math.pow(-satPos[i * 3 + 1], 2) + Math.pow(-satPos[i * 3 + 2], 2)) *
                Math.sqrt(Math.pow(-satPos[i * 3] + sunECI.x, 2) + Math.pow(-satPos[i * 3 + 1] + sunECI.y, 2) + Math.pow(-satPos[i * 3 + 2] + sunECI.z, 2)))
          ) * RAD2DEG;
        if (semiDiamEarth > semiDiamSun && theta < semiDiamEarth - semiDiamSun) {
          satInSun[i] = 0; // Umbral
        }

        // var isPenumbral = false;
        if (Math.abs(semiDiamEarth - semiDiamSun) < theta && theta < semiDiamEarth + semiDiamSun) {
          satInSun[i] = 1; // Penumbral
        }

        if (semiDiamSun > semiDiamEarth) {
          satInSun[i] = 1; // Penumbral
        }

        if (theta < semiDiamSun - semiDiamEarth) {
          satInSun[i] = 1; // Penumbral
        }
      }

      if (sensor.observerGd !== defaultGd && !isSunExclusion) {
        if (isMultiSensor) {
          for (s = 0; s < mSensor.length; s++) {
            if (!(sensor.type == 'Optical' && satInSun[i] == 0)) {
              if (satInView[i]) break;
              sensor = mSensor[s];
              sensor.observerGd = {
                longitude: sensor.lon * DEG2RAD,
                latitude: sensor.lat * DEG2RAD,
                height: sensor.alt * 1, // Convert from string
              };
              try {
                positionEcf = satellite.eciToEcf(pv.position, gmst); // pv.position is called positionEci originally
                lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
              } catch (e) {
                continue;
              }
              azimuth = lookangles.azimuth;
              elevation = lookangles.elevation;
              rangeSat = lookangles.rangeSat;
              azimuth *= RAD2DEG;
              elevation *= RAD2DEG;

              if (sensor.obsminaz > sensor.obsmaxaz) {
                if (
                  ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange) ||
                  ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2)
                ) {
                  satInView[i] = true;
                }
              } else {
                if (
                  (azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange) ||
                  (azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2 && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2)
                ) {
                  satInView[i] = true;
                }
              }
            }
          }
        } else {
          if (!(sensor.type == 'Optical' && satInSun[i] == 0)) {
            azimuth *= RAD2DEG;
            elevation *= RAD2DEG;

            if (sensor.obsminaz > sensor.obsmaxaz) {
              if (
                ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange) ||
                ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2)
              ) {
                satInView[i] = true;
              }
            } else {
              if (
                (azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange) ||
                (azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2 && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2)
              ) {
                satInView[i] = true;
              }
            }
          }
        }
      }
    } else if (satCache[i].isRadarData) {
      if (satCache[i].skip) continue;
      satCache[i].skip = true;
      satPos[i * 3] = 0;
      satPos[i * 3 + 1] = 0;
      satPos[i * 3 + 2] = 0;

      satVel[i * 3] = 0;
      satVel[i * 3 + 1] = 0;
      satVel[i * 3 + 2] = 0;
    } else if (satCache[i].static && !satCache[i].marker) {
      if (satCache[i].type == 'Star') {
        // INFO: 0 Latitude returns upside down results. Using 180 looks right, but more verification needed.
        // WARNING: 180 and 0 really matter...unclear why
        starPosition = SunCalc.getStarPosition(now, 180, 0, satCache[i]);
        starPosition = _lookAnglesToEcf(starPosition.azimuth * RAD2DEG, starPosition.altitude * RAD2DEG, STAR_DISTANCE, 0, 0, 0);

        // Reduce Random Jitter by Requiring New Positions to be Similar to Old
        // THIS MIGHT BE A HORRIBLE
        if (satPos[i * 3] == 0 || (satPos[i * 3] - starPosition.x < 0.1 && satPos[i * 3] - starPosition.x > -0.1)) satPos[i * 3] = starPosition.x;
        if (satPos[i * 3 + 1] == 0 || (satPos[i * 3 + 1] - starPosition.y < 0.1 && satPos[i * 3 + 1] - starPosition.y > -0.1)) satPos[i * 3 + 1] = starPosition.y;
        if (satPos[i * 3 + 2] == 0 || (satPos[i * 3 + 2] - starPosition.z < 0.1 && satPos[i * 3 + 2] - starPosition.z > -0.1)) satPos[i * 3 + 2] = starPosition.z;
      } else {
        cosLat = Math.cos(satCache[i].lat * DEG2RAD);
        sinLat = Math.sin(satCache[i].lat * DEG2RAD);
        cosLon = Math.cos(satCache[i].lon * DEG2RAD + gmst);
        sinLon = Math.sin(satCache[i].lon * DEG2RAD + gmst);
        satPos[i * 3] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + satCache[i].alt) * cosLat * cosLon; // 6371 is radius of earth
        satPos[i * 3 + 1] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + satCache[i].alt) * cosLat * sinLon;
        satPos[i * 3 + 2] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + satCache[i].alt) * sinLat;
      }

      satVel[i * 3] = 0;
      satVel[i * 3 + 1] = 0;
      satVel[i * 3 + 2] = 0;
    } else if (satCache[i].missile) {
      if (!satCache[i].active) {
        continue;
      } // Skip inactive missiles
      tLen = satCache[i].altList.length;
      for (t = 0; t < tLen; t++) {
        if (satCache[i].startTime * 1 + t * 1000 >= now * 1) {
          curMissivarTime = t;
          break;
        }
      }

      satCache[i].lastTime = satCache[i].lastTime >= 0 ? satCache[i].lastTime : 0;

      cosLat = Math.cos(satCache[i].latList[satCache[i].lastTime + 1] * DEG2RAD);
      sinLat = Math.sin(satCache[i].latList[satCache[i].lastTime + 1] * DEG2RAD);
      cosLon = Math.cos(satCache[i].lonList[satCache[i].lastTime + 1] * DEG2RAD + gmstNext);
      sinLon = Math.sin(satCache[i].lonList[satCache[i].lastTime + 1] * DEG2RAD + gmstNext);

      if (satCache[i].lastTime == 0) {
        satVel[i * 3] = 0;
        satVel[i * 3 + 1] = 0;
        satVel[i * 3 + 2] = 0;
      } else if (satVel[i * 3] == 0 && satVel[i * 3 + 1] == 0 && satVel[i * 3 + 2] == 0) {
        satVel[i * 3] = (6371 + satCache[i].altList[satCache[i].lastTime + 1]) * cosLat * cosLon - satPos[i * 3];
        satVel[i * 3 + 1] = (6371 + satCache[i].altList[satCache[i].lastTime + 1]) * cosLat * sinLon - satPos[i * 3 + 1];
        satVel[i * 3 + 2] = (6371 + satCache[i].altList[satCache[i].lastTime + 1]) * sinLat - satPos[i * 3 + 2];
      } else {
        satVel[i * 3] += (6371 + satCache[i].altList[satCache[i].lastTime + 1]) * cosLat * cosLon - satPos[i * 3];
        satVel[i * 3 + 1] += (6371 + satCache[i].altList[satCache[i].lastTime + 1]) * cosLat * sinLon - satPos[i * 3 + 1];
        satVel[i * 3 + 2] += (6371 + satCache[i].altList[satCache[i].lastTime + 1]) * sinLat - satPos[i * 3 + 2];
        satVel[i * 3] *= 0.5;
        satVel[i * 3 + 1] *= 0.5;
        satVel[i * 3 + 2] *= 0.5;
      }

      cosLat = Math.cos(satCache[i].latList[curMissivarTime] * DEG2RAD);
      sinLat = Math.sin(satCache[i].latList[curMissivarTime] * DEG2RAD);
      cosLon = Math.cos(satCache[i].lonList[curMissivarTime] * DEG2RAD + gmst);
      sinLon = Math.sin(satCache[i].lonList[curMissivarTime] * DEG2RAD + gmst);

      satPos[i * 3] = (6371 + satCache[i].altList[curMissivarTime]) * cosLat * cosLon;
      satPos[i * 3 + 1] = (6371 + satCache[i].altList[curMissivarTime]) * cosLat * sinLon;
      satPos[i * 3 + 2] = (6371 + satCache[i].altList[curMissivarTime]) * sinLat;

      satCache[i].lastTime = curMissivarTime;

      x = satPos[i * 3];
      y = satPos[i * 3 + 1];
      z = satPos[i * 3 + 2];

      positionEcf = satellite.eciToEcf({ x: x, y: y, z: z }, gmst);
      if (satellite.eciToGeodetic({ x: x, y: y, z: z }, gmst).height <= 150 && satCache[i].missile === false) {
        console.error(satCache[i].SCC_NUM);
        satCache[i].skip = true;
      }
      lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);

      azimuth = lookangles.azimuth * RAD2DEG;
      elevation = lookangles.elevation * RAD2DEG;
      rangeSat = lookangles.rangeSat;

      satInView[i] = false; // Default in case no sensor selected

      if (sensor.obsminaz > sensor.obsmaxaz) {
        if (
          ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange) ||
          ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2)
        ) {
          satInView[i] = true;
        } else {
          satInView[i] = false;
        }
      } else {
        if (
          (azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange) ||
          (azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2 && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2)
        ) {
          satInView[i] = true;
        } else {
          satInView[i] = false;
        }
      }
    } else if (isShowFOVBubble || isResetFOVBubble) {
      // //////////////////////////////////
      // FOV Bubble Drawing Code - START
      // //////////////////////////////////
      if (!isMultiSensor && sensor.observerGd !== defaultGd) {
        mSensor[0] = sensor;
        mSensor.length = 1;
      }
      sensorMarkerArray = [];
      for (s = 0; s < mSensor.length + 1; s++) {
        sensorMarkerArray.push(i);
        // We intentionally go past the last sensor so we can record the last marker's id
        if (s == mSensor.length) break;
        sensor = mSensor[s];
        sensor.observerGd = {
          longitude: sensor.lon * DEG2RAD,
          latitude: sensor.lat * DEG2RAD,
          height: sensor.alt * 1, // Convert from string
        };
        if (satCache[i].marker) {
          satPos[i * 3] = 0;
          satPos[i * 3 + 1] = 0;
          satPos[i * 3 + 2] = 0;

          satVel[i * 3] = 0;
          satVel[i * 3 + 1] = 0;
          satVel[i * 3 + 2] = 0;
          if (isResetFOVBubble) {
            continue;
          }

          if (!isShowFOVBubble) continue;
          if (sensor.observerGd === defaultGd) continue;

          // Ignore Optical and Mechanical Sensors When showing Many
          if (isIgnoreNonRadar) {
            if (mSensor.length > 1 && sensor.type === 'Optical') continue;
            if (mSensor.length > 1 && sensor.type === 'Observer') continue;
            if (mSensor.length > 1 && sensor.type === 'Mechanical') continue;
          }

          // az, el, rng, pos;
          q = Math.abs(sensor.obsmaxaz - sensor.obsminaz) < 30 ? 0.25 : 2;
          q2 = sensor.obsmaxrange - sensor.obsminrange < 500 ? 1000 : 30;

          // Don't show anything but the floor if in surveillance only mode
          // Unless it is a volume search radar
          if (!isShowSurvFence || sensor.volume) {
            // Only on non-360 FOV
            if (sensor.obsminaz !== 0 && sensor.obsmaxaz !== 360) {
              // //////////////////////////////////
              // Min AZ FOV
              // //////////////////////////////////
              for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
                az = sensor.obsminaz;
                for (el = sensor.obsminel; el < sensor.obsmaxel; el += q) {
                  pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                  try {
                    satCache[i].active = true;
                    satPos[i * 3] = pos.x;
                    satPos[i * 3 + 1] = pos.y;
                    satPos[i * 3 + 2] = pos.z;

                    satVel[i * 3] = 0;
                    satVel[i * 3 + 1] = 0;
                    satVel[i * 3 + 2] = 0;
                    i++;
                  } catch (e) {
                    console.log(e);
                  }
                }
              }

              // //////////////////////////////////
              // Max AZ FOV
              // //////////////////////////////////
              for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
                az = sensor.obsmaxaz;
                for (el = sensor.obsminel; el < sensor.obsmaxel; el += q) {
                  pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                  satCache[i].active = true;
                  satPos[i * 3] = pos.x;
                  satPos[i * 3 + 1] = pos.y;
                  satPos[i * 3 + 2] = pos.z;

                  satVel[i * 3] = 0;
                  satVel[i * 3 + 1] = 0;
                  satVel[i * 3 + 2] = 0;
                  i++;
                }
              }

              if (typeof sensor.obsminaz2 != 'undefined') {
                ////////////////////////////////
                // Cobra DANE Types
                ////////////////////////////////

                // //////////////////////////////////
                // Min AZ 2 FOV
                // //////////////////////////////////
                for (rng = Math.max(sensor.obsminrange2, 100); rng < Math.min(sensor.obsmaxrange2, 60000); rng += Math.min(sensor.obsmaxrange2, 60000) / q2) {
                  az = sensor.obsminaz2;
                  for (el = sensor.obsminel2; el < sensor.obsmaxel2; el += q) {
                    pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                    satCache[i].active = true;
                    satPos[i * 3] = pos.x;
                    satPos[i * 3 + 1] = pos.y;
                    satPos[i * 3 + 2] = pos.z;

                    satVel[i * 3] = 0;
                    satVel[i * 3 + 1] = 0;
                    satVel[i * 3 + 2] = 0;
                    i++;
                  }
                }

                // //////////////////////////////////
                // Max AZ 2 FOV
                // //////////////////////////////////
                for (rng = Math.max(sensor.obsminrange2, 100); rng < Math.min(sensor.obsmaxrange2, 60000); rng += Math.min(sensor.obsmaxrange2, 60000) / q2) {
                  az = sensor.obsmaxaz2;
                  for (el = sensor.obsminel2; el < sensor.obsmaxel2; el += q) {
                    pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                    satCache[i].active = true;
                    satPos[i * 3] = pos.x;
                    satPos[i * 3 + 1] = pos.y;
                    satPos[i * 3 + 2] = pos.z;

                    satVel[i * 3] = 0;
                    satVel[i * 3 + 1] = 0;
                    satVel[i * 3 + 2] = 0;
                    i++;
                  }
                }
              }

              // Only on 360 FOV
            } else {
              for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
                el = sensor.obsmaxel;
                for (az = sensor.obsminaz; az < sensor.obsmaxaz; az += q) {
                  pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                  satCache[i].active = true;
                  satPos[i * 3] = pos.x;
                  satPos[i * 3 + 1] = pos.y;
                  satPos[i * 3 + 2] = pos.z;

                  satVel[i * 3] = 0;
                  satVel[i * 3 + 1] = 0;
                  satVel[i * 3 + 2] = 0;
                  i++;
                }
              }
            }
          }

          // //////////////////////////////////
          // Floor of FOV
          // //////////////////////////////////
          for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
            for (az = 0; az < Math.max(360, sensor.obsmaxaz); az += q) {
              if (sensor.obsminaz > sensor.obsmaxaz) {
                if (az >= sensor.obsminaz || az <= sensor.obsmaxaz) {
                  // Intentional
                } else {
                  continue;
                }
              } else {
                if (az >= sensor.obsminaz && az <= sensor.obsmaxaz) {
                  // Intentional
                } else {
                  continue;
                }
              }
              pos = satellite.ecfToEci(_lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
              if (i === len) {
                console.error('No More Markers');
                break;
              }
              satCache[i].active = true;
              satPos[i * 3] = pos.x;
              satPos[i * 3 + 1] = pos.y;
              satPos[i * 3 + 2] = pos.z;

              satVel[i * 3] = 0;
              satVel[i * 3 + 1] = 0;
              satVel[i * 3 + 2] = 0;
              i++;
            }
          }

          // //////////////////////////////////
          // Top of FOV for Small FOV
          // //////////////////////////////////
          if (sensor.obsmaxel - sensor.obsminel < 20) {
            for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
              for (az = 0; az < Math.max(360, sensor.obsmaxaz); az += q) {
                if (sensor.obsminaz > sensor.obsmaxaz) {
                  if (az >= sensor.obsminaz || az <= sensor.obsmaxaz) {
                    // Intentional
                  } else {
                    continue;
                  }
                } else {
                  if (az >= sensor.obsminaz && az <= sensor.obsmaxaz) {
                    // Intentional
                  } else {
                    continue;
                  }
                }
                pos = satellite.ecfToEci(_lookAnglesToEcf(az, sensor.obsmaxel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.error('No More Markers');
                  break;
                }
                satCache[i].active = true;
                satPos[i * 3] = pos.x;
                satPos[i * 3 + 1] = pos.y;
                satPos[i * 3 + 2] = pos.z;

                satVel[i * 3] = 0;
                satVel[i * 3 + 1] = 0;
                satVel[i * 3 + 2] = 0;
                i++;
              }
            }
          }

          if (typeof sensor.obsminaz2 != 'undefined') {
            ////////////////////////////////
            // Cobra DANE Types
            ////////////////////////////////

            // //////////////////////////////////
            // Floor of FOV
            // //////////////////////////////////
            q = 2;
            for (rng = Math.max(sensor.obsminrange2, 100); rng < Math.min(sensor.obsmaxrange2, 60000); rng += Math.min(sensor.obsmaxrange2, 60000) / q2) {
              for (az = 0; az < 360; az += 1 * q) {
                if (sensor.obsminaz2 > sensor.obsmaxaz2) {
                  if (az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) {
                    // Intentional
                  } else {
                    continue;
                  }
                } else {
                  if (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2) {
                    // Intentional
                  } else {
                    continue;
                  }
                }
                pos = satellite.ecfToEci(_lookAnglesToEcf(az, sensor.obsminel2, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.error('No More Markers');
                  break;
                }
                satCache[i].active = true;
                satPos[i * 3] = pos.x;
                satPos[i * 3 + 1] = pos.y;
                satPos[i * 3 + 2] = pos.z;

                satVel[i * 3] = 0;
                satVel[i * 3 + 1] = 0;
                satVel[i * 3 + 2] = 0;
                i++;
              }
            }
          }

          // Don't show anything but the floor if in surveillance only mode
          // Unless it is a volume search radar
          if (!isShowSurvFence || sensor.volume) {
            // //////////////////////////////////
            // Outside Edge of FOV
            // //////////////////////////////////
            rng = Math.min(sensor.obsmaxrange, 60000);
            for (az = 0; az < Math.max(360, sensor.obsmaxaz); az += q) {
              if (sensor.obsminaz > sensor.obsmaxaz) {
                if (az >= sensor.obsminaz || az <= sensor.obsmaxaz) {
                  // Intentional
                } else {
                  continue;
                }
              } else {
                if (az >= sensor.obsminaz && az <= sensor.obsmaxaz) {
                  // Intentional
                } else {
                  continue;
                }
              }
              for (el = sensor.obsminel; el < sensor.obsmaxel; el += q) {
                pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.error('No More Markers');
                  break;
                }
                satCache[i].active = true;
                satPos[i * 3] = pos.x;
                satPos[i * 3 + 1] = pos.y;
                satPos[i * 3 + 2] = pos.z;

                satVel[i * 3] = 0;
                satVel[i * 3 + 1] = 0;
                satVel[i * 3 + 2] = 0;
                i++;
              }
            }

            if (typeof sensor.obsminaz2 != 'undefined') {
              ////////////////////////////////
              // Cobra DANE Types
              ////////////////////////////////
              // //////////////////////////////////
              // Outside of FOV
              // //////////////////////////////////
              rng = Math.min(sensor.obsmaxrange2, 60000);
              for (az = 0; az < Math.max(360, sensor.obsmaxaz2); az += q) {
                if (sensor.obsminaz2 > sensor.obsmaxaz2) {
                  if (az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) {
                    // Intentional
                  } else {
                    continue;
                  }
                } else {
                  if (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2) {
                    // Intentional
                  } else {
                    continue;
                  }
                }
                for (el = sensor.obsminel2; el < sensor.obsmaxel2; el += q) {
                  pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                  if (i === len) {
                    console.error('No More Markers');
                    break;
                  }
                  satCache[i].active = true;
                  satPos[i * 3] = pos.x;
                  satPos[i * 3 + 1] = pos.y;
                  satPos[i * 3 + 2] = pos.z;

                  satVel[i * 3] = 0;
                  satVel[i * 3 + 1] = 0;
                  satVel[i * 3 + 2] = 0;
                  i++;
                }
              }
            }
          }
        }
      }
      // //////////////////////////////////
      // FOV Bubble Drawing Code - STOP
      // //////////////////////////////////
    } else if (isShowSatOverfly || isResetSatOverfly) {
      // //////////////////////////////////
      // Satellite Overfly Drawing Code - START
      // //////////////////////////////////
      if (satCache[i].marker) {
        if (isResetSatOverfly && satCache[i].active === true) {
          satCache[i].active = false;

          satPos[i * 3] = 0;
          satPos[i * 3 + 1] = 0;
          satPos[i * 3 + 2] = 0;

          satVel[i * 3] = 0;
          satVel[i * 3 + 1] = 0;
          satVel[i * 3 + 2] = 0;
          continue;
        }
        for (snum = 0; snum < satelliteSelected.length + 1; snum++) {
          if (snum === satelliteSelected.length) {
            sensorMarkerArray.push(i);
            break;
          }
          if (satelliteSelected[snum] !== -1) {
            if (!isShowSatOverfly) continue;
            // Find the ECI position of the Selected Satellite
            satSelPosX = satPos[satelliteSelected[snum] * 3];
            satSelPosY = satPos[satelliteSelected[snum] * 3 + 1];
            satSelPosZ = satPos[satelliteSelected[snum] * 3 + 2];
            satSelPosEcf = {
              x: satSelPosX,
              y: satSelPosY,
              z: satSelPosZ,
            };
            satSelPos = satellite.ecfToEci(satSelPosEcf, gmst);

            // Find the Lat/Long of the Selected Satellite
            satSelGeodetic = satellite.eciToGeodetic(satSelPos, gmst); // pv.position is called positionEci originally
            satHeight = satSelGeodetic.height;
            satSelPosEarth = {
              longitude: satSelGeodetic.longitude,
              latitude: satSelGeodetic.latitude,
              height: 1,
            };

            deltaLatInt = 1;
            if (satHeight < 2500 && selectedSatFOV <= 60) deltaLatInt = 0.5;
            if (satHeight > 7000 || selectedSatFOV >= 90) deltaLatInt = 2;
            if (satelliteSelected.length > 1) deltaLatInt = 2;
            for (deltaLat = -60; deltaLat < 60; deltaLat += deltaLatInt) {
              lat = Math.max(Math.min(Math.round(satSelGeodetic.latitude * RAD2DEG) + deltaLat, 90), -90) * DEG2RAD;
              if (lat > 90) continue;
              deltaLonInt = 1; // Math.max((Math.abs(lat)*RAD2DEG/15),1);
              if (satHeight < 2500 && selectedSatFOV <= 60) deltaLonInt = 0.5;
              if (satHeight > 7000 || selectedSatFOV >= 90) deltaLonInt = 2;
              if (satelliteSelected.length > 1) deltaLonInt = 2;
              for (deltaLon = 0; deltaLon < 181; deltaLon += deltaLonInt) {
                // //////////
                // Add Long
                // //////////
                long = satSelGeodetic.longitude + deltaLon * DEG2RAD;
                satSelPosEarth = {
                  longitude: long,
                  latitude: lat,
                  height: 15,
                };
                // Find the Az/El of the position on the earth
                lookangles = satellite.ecfToLookAngles(satSelPosEarth, satSelPosEcf);
                // azimuth = lookangles.azimuth;
                elevation = lookangles.elevation;
                // rangeSat = lookangles.rangeSat;

                if (elevation * RAD2DEG > 0 && 90 - elevation * RAD2DEG < selectedSatFOV) {
                  satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                  if (i === len) {
                    console.error('Ran out of Markers');
                    continue; // Only get so many markers.
                  }
                  satCache[i].active = true;

                  satPos[i * 3] = satSelPosEarth.x;
                  satPos[i * 3 + 1] = satSelPosEarth.y;
                  satPos[i * 3 + 2] = satSelPosEarth.z;

                  satVel[i * 3] = 0;
                  satVel[i * 3 + 1] = 0;
                  satVel[i * 3 + 2] = 0;
                  i++;
                }
                // //////////
                // Minus Long
                // //////////
                if (deltaLon === 0 || deltaLon === 180) continue; // Don't Draw Two Dots On the Center Line
                long = satSelGeodetic.longitude - deltaLon * DEG2RAD;
                satSelPosEarth = {
                  longitude: long,
                  latitude: lat,
                  height: 15,
                };
                // Find the Az/El of the position on the earth
                lookangles = satellite.ecfToLookAngles(satSelPosEarth, satSelPosEcf);
                // azimuth = lookangles.azimuth;
                elevation = lookangles.elevation;
                // rangeSat = lookangles.rangeSat;

                if (elevation * RAD2DEG > 0 && 90 - elevation * RAD2DEG < selectedSatFOV) {
                  satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                  if (i === len) {
                    console.error('Ran out of Markers');
                    continue; // Only get so many markers.
                  }
                  satCache[i].active = true;

                  satPos[i * 3] = satSelPosEarth.x;
                  satPos[i * 3 + 1] = satSelPosEarth.y;
                  satPos[i * 3 + 2] = satSelPosEarth.z;

                  satVel[i * 3] = 0;
                  satVel[i * 3 + 1] = 0;
                  satVel[i * 3 + 2] = 0;
                  i++;
                }

                if (lat === 90 || lat === -90) break; // One Dot for the Poles
              }
            }
          }
        }
      }
      // //////////////////////////////////
      // Satellite Overfly Drawing Code - STOP
      // //////////////////////////////////
    }
    isResetSatOverfly = false;
    if (satCache[i].marker) {
      for (; i < len; i++) {
        if (!satCache[i].active) {
          len -= fieldOfViewSetLength;
          break;
        }
        satPos[i * 3] = 0;
        satPos[i * 3 + 1] = 0;
        satPos[i * 3 + 2] = 0;

        satVel[i * 3] = 0;
        satVel[i * 3 + 1] = 0;
        satVel[i * 3 + 2] = 0;
        satCache[i].active = false;
      }
    }
  }
  if (isResetFOVBubble) {
    isResetFOVBubble = false;
    len -= fieldOfViewSetLength;
  }

  postMessageArray = {
    satPos: satPos,
    satVel: satVel,
  };
  // Add In View Data if Sensor Selected
  if (sensor.observerGd !== defaultGd) {
    postMessageArray.satInView = satInView;
  } else {
    postMessageArray.satInView = [];
  }
  // Add Sun View Data if Enabled
  if (isSunlightView) {
    postMessageArray.satInSun = satInSun;
  } else {
    postMessageArray.satInSun = [];
  }
  // If there is at least one sensor showing markers
  if (sensorMarkerArray.length >= 1) {
    postMessageArray.sensorMarkerArray = sensorMarkerArray;
  } else {
    postMessageArray.sensorMarkerArray = [];
  }

  postMessage(postMessageArray);

  // The longer the delay the more jitter at higher speeds of propagation
  setTimeout(() => {
    propagateCruncher();
  }, (1 * globalPropagationRate * globalPropagationRateMultiplier) / divisor);
  // //////////////////////////////////////////////////////////////////////////
  // Benchmarking
  //
  // var stopTime1 = performance.now();
  // if (numOfCrunches > 5) {
  // totalCrunchTime1 += (stopTime1 - startTime1);
  // averageTimeForCrunchLoop = totalCrunchTime1 / (numOfCrunches - 5);

  // averageTimeForPropagate = totalCrunchTime2 / (numOfCrunches - 5);
  // }
  // //////////////////////////////////////////////////////////////////////////
};

/* Returns Ordinal Day (Commonly Called J Day) */
var jday = (year, mon, day, hr, minute, sec) => {
  'use strict';
  return (
    367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
  );
};

/* Returns Current Propagation Time */
var propTime = () => {
  'use strict';

  var now = new Date();
  var realElapsedMsec = Number(now) - Number(propRealTime);
  var scaledMsec = realElapsedMsec * propRate;
  now.setTime(Number(propRealTime) + propOffset + scaledMsec);
  return now;
};
