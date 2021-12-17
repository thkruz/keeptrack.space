/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SunCalc } from '@app/js/lib/suncalc.js';
import * as satellite from 'satellite.js';
import { SensorObjectCruncher } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { DEG2RAD, GROUND_BUFFER_DISTANCE, MILLISECONDS_PER_DAY, PI, RAD2DEG, RADIUS_OF_EARTH, RADIUS_OF_SUN, STAR_DISTANCE, TAU } from '../lib/constants';
import { numeric } from '../lib/external/numeric';
import { jday } from '../timeManager/transforms';
import { checkSunExclusion, lookAnglesToEcf, propTime } from './positionCalculations';

export interface SatCacheObject extends satellite.SatRec {
  id?: number;
  isimp: boolean;
  apogee: number;
  isRadarData: any;
  static: boolean;
  marker: any;
  type: SpaceObjectType;
  lat: number;
  lon: number;
  alt: number;
  missile: any;
  active: any;
  altList: any;
  startTime: number;
  lastTime: any;
  latList: any;
  lonList: any;
  skip?: boolean;
}

type PropagationMessage = {
  satInView?: Int8Array;
  satInSun?: Int8Array;
  sensorMarkerArray?: number[];
  satPos?: Float32Array;
  satVel?: Float32Array;
};

const EMPTY_FLOAT32_ARRAY = new Float32Array(0);
const EMPTY_INT8_ARRAY = new Int8Array(0);

/** ARRAYS */
let satCache = <SatCacheObject[]>[]; // Cache of Satellite Data from TLE.json and Static Data from variable.js

let satPos = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Positions
let satVel = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Velocities
let satInView = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in view of Sensor
let satInSun = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in sunlight
let sensorMarkerArray = [0]; // Array of Markers used to show sensor fence and FOV

var satelliteSelected = [-1]; // Array used to determine which satellites are selected

/** TIME VARIABLES */
let globalPropagationRate = 1000; // Limits how often the propagation loop runs
let globalPropagationRateMultiplier = 1; // Used to slow down propagation rate on slow computers
let propagationRunning = false; // Prevent Propagation From Running Twice
// let timeSyncRunning = false; // Prevent Time Sync Loop From Running Twice
var divisor = 1; // When running at high speeds, allow faster propagation
let dynamicOffsetEpoch = Date.now();
let staticOffset = 0;
var propRate = 1; // vars us run time faster (or slower) than normal
// var propChangeTime = Date.now(); // vars us run time faster (or slower) than normal

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
let fieldOfViewSetLength = 0;
let len;

/** OBSERVER VARIABLES */
var mSensor = <SensorObjectCruncher[]>[];
export const defaultGd = {
  latitude: <number | null>null,
  longitude: 0,
  height: 0,
};

const emptySensor: SensorObjectCruncher = {
  observerGd: {
    latitude: null,
    longitude: 0,
    height: 0,
  },
  alt: null,
  country: '',
  lat: null,
  lon: null,
  name: '',
  obsmaxaz: 0,
  obsmaxel: 0,
  obsmaxrange: 0,
  obsminaz: 0,
  obsminel: 0,
  obsminrange: 0,
  shortName: '',
  staticNum: 0,
  sun: '',
  volume: false,
  zoom: '',
};

let sensor = emptySensor;

// Handles Incomming Messages to sat-cruncher from main thread
try {
  onmessage = (m) => onmessageInject(m);
} catch (e) {
  if (!process) throw e;
}

export const onmessageInject = function (m) {
  if (m.data.isSunlightView) {
    isSunlightView = m.data.isSunlightView;
  }

  if (m.data.satelliteSelected) {
    satelliteSelected = m.data.satelliteSelected;
    if (satelliteSelected[0] === -1) {
      isResetSatOverfly = true;
      if (!isResetMarker) isResetMarker = true;
    }
  }

  if (m.data.isSlowCPUModeEnabled) {
    globalPropagationRate = 2000;
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
    if (!isResetMarker) isResetMarker = true;
  }

  if (m.data.isShowFOVBubble === 'enable') {
    isShowFOVBubble = true;
  }
  if (m.data.isShowFOVBubble === 'reset') {
    isResetFOVBubble = true;
    isShowFOVBubble = false;
    if (!isResetMarker) isResetMarker = true;
  }

  if (m.data.isShowSurvFence === 'enable') {
    isShowSurvFence = true;
    if (!isResetMarker) isResetMarker = true;
  }
  if (m.data.isShowSurvFence === 'disable') {
    isShowSurvFence = false;
    if (!isResetMarker) isResetMarker = true;
  }

  // ////////////////////////////////

  if (m.data.multiSensor) {
    isMultiSensor = true;
    mSensor = m.data.sensor;
    sensor = m.data.sensor;
    globalPropagationRateMultiplier = 2;
    if (!isResetInView) isResetInView = true;
  } else if (m.data.sensor) {
    sensor = m.data.sensor[0];
    if (m.data.setlatlong) {
      if (m.data.resetObserverGd) {
        globalPropagationRateMultiplier = 1;
        sensor.observerGd = defaultGd;
        mSensor = [];
        if (!isResetInView) isResetInView = true;
      } else {
        globalPropagationRateMultiplier = 2;
        // satellite.js requires this format - DONT use lat,lon,alt
        // and we MUST do it (for now) because main thread is in lat,lon,alt
        sensor.observerGd = {
          longitude: m.data.sensor[0].lon * DEG2RAD,
          latitude: m.data.sensor[0].lat * DEG2RAD,
          height: parseFloat(m.data.sensor[0].alt),
        };
        if (!isResetInView) isResetInView = true;
      }
    }
    isMultiSensor = false;
  }

  switch (m.data.typ) {
    case 'offset':
      staticOffset = m.data.staticOffset;
      dynamicOffsetEpoch = m.data.dynamicOffsetEpoch;
      propRate = m.data.propRate;

      // Changing this to 0.1 caused issues...
      divisor = 1;
      return;
    case 'satdata':
      var satData = JSON.parse(m.data.dat);
      len = satData.length;
      var i = 0;

      var extraData = [];
      var satrec: SatCacheObject;
      while (i < len) {
        const extra = {
          lowAlt: <boolean>null,
          inclination: <number>null,
          eccentricity: <number>null,
          raan: <number>null,
          argPe: <number>null,
          meanMotion: <number>null,
          semiMajorAxis: <number>null,
          semiMinorAxis: <number>null,
          apogee: <number>null,
          perigee: <number>null,
          period: <number>null,
        };
        satrec = null;
        if (satData[i].static || satData[i].missile || satData[i].isRadarData) {
          satrec = satData[i];
          delete satrec['id'];
          extraData.push(extra);
          satCache.push(satrec);
          i++;
        } else {
          satrec = <SatCacheObject>satellite.twoline2satrec(
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

      try {
        postMessage({
          extraData: JSON.stringify(extraData),
        });
      } catch (e) {
        if (!process) throw e;
      }
      break;
    case 'satEdit':
      satrec = <SatCacheObject>satellite.twoline2satrec(
        // replace old TLEs
        m.data.TLE1,
        m.data.TLE2
      );
      satCache[m.data.id] = { ...satCache[m.data.id], ...satrec };
      extraData = [];
      // eslint-disable-next-line no-case-declarations
      const extra = {
        lowAlt: <boolean>null,
        inclination: <number>null,
        eccentricity: <number>null,
        raan: <number>null,
        argPe: <number>null,
        meanMotion: <number>null,
        semiMajorAxis: <number>null,
        semiMinorAxis: <number>null,
        apogee: <number>null,
        perigee: <number>null,
        period: <number>null,
        TLE1: <number>null,
        TLE2: <number>null,
      };
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
    default:
      console.warn('Unknown message typ: ' + m.data.typ);
      break;
  }

  // Don't start before getting satData!
  if (!propagationRunning && m.data.typ === 'satdata') {
    len = -1; // propagteCruncher needs to start at -1 not 0
    propagateCruncher();
    propagationRunning = true;
  }
};

// Prevent Memory Leak by declaring variables outside of function

export const propagateCruncher = (mockSatCache?: SatCacheObject[]) => {
  if (mockSatCache) {
    satCache = mockSatCache;
  }
  const now = propTime(dynamicOffsetEpoch, staticOffset, propRate);

  const j =
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ) +
    now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

  const gmst = satellite.gstime(j);

  let isSunExclusion = false;
  let sunECI = { x: 0, y: 0, z: 0 };
  if (isSunlightView && !isMultiSensor) {
    [isSunExclusion, sunECI] = checkSunExclusion(sensor, j, gmst, now);
  }

  const j2 =
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds() + 1
    ) +
    now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

  const gmstNext = satellite.gstime(j2);

  len = satCache.length - 1;

  if ((!isResetSatOverfly && !isShowSatOverfly && !isResetFOVBubble && !isShowFOVBubble) || isLowPerf) {
    len -= fieldOfViewSetLength;
  }

  let i = -1;

  let positionEcf, lookangles, azimuth, elevation, rangeSat;
  let x, y, z;
  let cosLat, sinLat, cosLon, sinLon;
  let curMissivarTime;
  let s, m, tLen, t;
  let pv: { position: satellite.EciVec3<number>; velocity: satellite.EciVec3<number> };
  let sat: SatCacheObject;
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

    sat = satCache[i];
    if (sat.satnum) {
      // Skip reentries
      if (sat.skip) continue;
      m = (j - sat.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
      pv = satellite.sgp4(sat, m) as { position: satellite.EciVec3<number>; velocity: satellite.EciVec3<number> };

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
          lat = Math.atan2(pv.position.z, Math.sqrt(pv.position.x * pv.position.x + pv.position.y * pv.position.y));
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

      satInView[i] = 0; // 0 = FALSE - Default in case no sensor selected
      satInSun[i] = 2; // Default in case

      if (isSunlightView) {
        semiDiamEarth = Math.asin(RADIUS_OF_EARTH / Math.sqrt(Math.pow(-satPos[i * 3], 2) + Math.pow(-satPos[i * 3 + 1], 2) + Math.pow(-satPos[i * 3 + 2], 2))) * RAD2DEG;
        semiDiamSun =
          Math.asin(RADIUS_OF_SUN / Math.sqrt(Math.pow(-satPos[i * 3] + sunECI.x, 2) + Math.pow(-satPos[i * 3 + 1] + sunECI.y, 2) + Math.pow(-satPos[i * 3 + 2] + sunECI.z, 2))) *
          RAD2DEG;

        // Angle between earth and sun
        theta =
          Math.acos(
            numeric.dot([-satPos[i * 3], -satPos[i * 3 + 1], -satPos[i * 3 + 2]], [-satPos[i * 3] + sunECI.x, -satPos[i * 3 + 1] + sunECI.y, -satPos[i * 3 + 2] + sunECI.z]) /
              (Math.sqrt(Math.pow(-satPos[i * 3], 2) + Math.pow(-satPos[i * 3 + 1], 2) + Math.pow(-satPos[i * 3 + 2], 2)) *
                Math.sqrt(Math.pow(-satPos[i * 3] + sunECI.x, 2) + Math.pow(-satPos[i * 3 + 1] + sunECI.y, 2) + Math.pow(-satPos[i * 3 + 2] + sunECI.z, 2)))
          ) * RAD2DEG;
        if (semiDiamEarth > semiDiamSun && theta < semiDiamEarth - semiDiamSun) {
          satInSun[i] = 0; // Umbral
        }

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
            // Skip satellites in the sun if you are an optical sensor
            if (!(sensor.type == SpaceObjectType.OPTICAL && satInSun[i] == 0)) {
              if (satInView[i]) break;
              sensor = mSensor[s];
              // satellite.js requires this format - DONT use lon,lat,alt
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
                  ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) &&
                    elevation >= sensor.obsminel &&
                    elevation <= sensor.obsmaxel &&
                    rangeSat <= sensor.obsmaxrange &&
                    rangeSat >= sensor.obsminrange) ||
                  ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) &&
                    elevation >= sensor.obsminel2 &&
                    elevation <= sensor.obsmaxel2 &&
                    rangeSat <= sensor.obsmaxrange2 &&
                    rangeSat >= sensor.obsminrange2)
                ) {
                  satInView[i] = 1; // 1 = TRUE
                }
              } else {
                if (
                  (azimuth >= sensor.obsminaz &&
                    azimuth <= sensor.obsmaxaz &&
                    elevation >= sensor.obsminel &&
                    elevation <= sensor.obsmaxel &&
                    rangeSat <= sensor.obsmaxrange &&
                    rangeSat >= sensor.obsminrange) ||
                  (azimuth >= sensor.obsminaz2 &&
                    azimuth <= sensor.obsmaxaz2 &&
                    elevation >= sensor.obsminel2 &&
                    elevation <= sensor.obsmaxel2 &&
                    rangeSat <= sensor.obsmaxrange2 &&
                    rangeSat >= sensor.obsminrange2)
                ) {
                  satInView[i] = 1; // 1 = TRUE
                }
              }
            }
          }
        } else {
          if (!(sensor.type === SpaceObjectType.OPTICAL && satInSun[i] == 0)) {
            azimuth *= RAD2DEG;
            elevation *= RAD2DEG;

            if (sensor.obsminaz > sensor.obsmaxaz) {
              if (
                ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) &&
                  elevation >= sensor.obsminel &&
                  elevation <= sensor.obsmaxel &&
                  rangeSat <= sensor.obsmaxrange &&
                  rangeSat >= sensor.obsminrange) ||
                ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) &&
                  elevation >= sensor.obsminel2 &&
                  elevation <= sensor.obsmaxel2 &&
                  rangeSat <= sensor.obsmaxrange2 &&
                  rangeSat >= sensor.obsminrange2)
              ) {
                satInView[i] = 1; // 1 = TRUE
              }
            } else {
              if (
                (azimuth >= sensor.obsminaz &&
                  azimuth <= sensor.obsmaxaz &&
                  elevation >= sensor.obsminel &&
                  elevation <= sensor.obsmaxel &&
                  rangeSat <= sensor.obsmaxrange &&
                  rangeSat >= sensor.obsminrange) ||
                (azimuth >= sensor.obsminaz2 &&
                  azimuth <= sensor.obsmaxaz2 &&
                  elevation >= sensor.obsminel2 &&
                  elevation <= sensor.obsmaxel2 &&
                  rangeSat <= sensor.obsmaxrange2 &&
                  rangeSat >= sensor.obsminrange2)
              ) {
                satInView[i] = 1; // 1 = TRUE
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
      if (satCache[i].type === SpaceObjectType.STAR) {
        // INFO: 0 Latitude returns upside down results. Using 180 looks right, but more verification needed.
        // WARNING: 180 and 0 really matter...unclear why
        starPosition = SunCalc.getStarPosition(now, 180, 0, satCache[i]);
        starPosition = lookAnglesToEcf(starPosition.azimuth * RAD2DEG, starPosition.altitude * RAD2DEG, STAR_DISTANCE, 0, 0, 0);

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
        if (satCache[i].startTime * 1 + t * 1000 >= now.getTime()) {
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
        console.error(i);
        satCache[i].skip = true;
      }
      lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);

      azimuth = lookangles.azimuth * RAD2DEG;
      elevation = lookangles.elevation * RAD2DEG;
      rangeSat = lookangles.rangeSat;

      satInView[i] = 0; // 0 = FALSE - Default in case no sensor selected

      if (sensor.obsminaz > sensor.obsmaxaz) {
        if (
          ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) &&
            elevation >= sensor.obsminel &&
            elevation <= sensor.obsmaxel &&
            rangeSat <= sensor.obsmaxrange &&
            rangeSat >= sensor.obsminrange) ||
          ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) &&
            elevation >= sensor.obsminel2 &&
            elevation <= sensor.obsmaxel2 &&
            rangeSat <= sensor.obsmaxrange2 &&
            rangeSat >= sensor.obsminrange2)
        ) {
          satInView[i] = 1; // 1 = TRUE
        }
      } else {
        if (
          (azimuth >= sensor.obsminaz &&
            azimuth <= sensor.obsmaxaz &&
            elevation >= sensor.obsminel &&
            elevation <= sensor.obsmaxel &&
            rangeSat <= sensor.obsmaxrange &&
            rangeSat >= sensor.obsminrange) ||
          (azimuth >= sensor.obsminaz2 &&
            azimuth <= sensor.obsmaxaz2 &&
            elevation >= sensor.obsminel2 &&
            elevation <= sensor.obsmaxel2 &&
            rangeSat <= sensor.obsmaxrange2 &&
            rangeSat >= sensor.obsminrange2)
        ) {
          satInView[i] = 1; // 1 = TRUE
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
        // satellite.js requires this format - DONT use lon,lat,alt
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
            if (mSensor.length > 1 && sensor.type === SpaceObjectType.OPTICAL) continue;
            if (mSensor.length > 1 && sensor.type === SpaceObjectType.OBSERVER) continue;
            if (mSensor.length > 1 && sensor.type === SpaceObjectType.MECHANICAL) continue;
          }

          // az, el, rng, pos;
          q = Math.abs(sensor.obsmaxaz - sensor.obsminaz) < 30 ? 0.5 : 3;
          q2 = sensor.obsmaxrange - sensor.obsminrange < 720 ? 125 : 30;

          // Don't show anything but the floor if in surveillance only mode
          // Unless it is a volume search radar
          if (!isShowSurvFence) {
            // Only on non-360 FOV
            if (sensor.obsminaz !== 0 && sensor.obsmaxaz !== 360) {
              // //////////////////////////////////
              // Min AZ FOV
              // //////////////////////////////////
              for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
                az = sensor.obsminaz;
                for (el = sensor.obsminel; el < sensor.obsmaxel; el += q) {
                  pos = satellite.ecfToEci(lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
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
                  pos = satellite.ecfToEci(lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
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
                for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
                  az = sensor.obsminaz2;
                  for (el = sensor.obsminel2; el < sensor.obsmaxel2; el += q) {
                    pos = satellite.ecfToEci(lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
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
                for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
                  az = sensor.obsmaxaz2;
                  for (el = sensor.obsminel2; el < sensor.obsmaxel2; el += q) {
                    pos = satellite.ecfToEci(lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
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
                  pos = satellite.ecfToEci(lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
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
                pos = satellite.ecfToEci(lookAnglesToEcf(az, sensor.obsmaxel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.debug('No More Markers');
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
                pos = satellite.ecfToEci(lookAnglesToEcf(az, sensor.obsminel2, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.debug('No More Markers');
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
          if (!isShowSurvFence) {
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
                pos = satellite.ecfToEci(lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.debug('No More Markers');
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
                  pos = satellite.ecfToEci(lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                  if (i === len) {
                    console.debug('No More Markers');
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

          // //////////////////////////////////
          // Floor of FOV
          // //////////////////////////////////
          q = 0.25;
          for (rng = sensor.obsmaxrange; rng === sensor.obsmaxrange; rng += 1) {
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
              pos = satellite.ecfToEci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
              if (i === len) {
                console.debug('No More Markers');
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

          for (rng = sensor.obsminrange; rng === sensor.obsminrange; rng += 1) {
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
              pos = satellite.ecfToEci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
              if (i === len) {
                console.debug('No More Markers');
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

          if (sensor.obsmaxrange - sensor.obsminrange < 720) {
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
                pos = satellite.ecfToEci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.debug('No More Markers');
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

          if (sensor.obsminaz !== sensor.obsmaxaz && sensor.obsminaz !== sensor.obsmaxaz - 360) {
            for (az = sensor.obsmaxaz; az === sensor.obsmaxaz; az += 1) {
              for (rng = sensor.obsminrange; rng < sensor.obsmaxrange; rng += q) {
                pos = satellite.ecfToEci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.debug('No More Markers');
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

            for (az = sensor.obsminaz; az === sensor.obsminaz; az += 1) {
              for (rng = sensor.obsminrange; rng < sensor.obsmaxrange; rng += q) {
                pos = satellite.ecfToEci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
                if (i === len) {
                  console.debug('No More Markers');
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
                elevation = lookangles.elevation;

                if (elevation * RAD2DEG > 0 && 90 - elevation * RAD2DEG < selectedSatFOV) {
                  satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                  if (i === len) {
                    console.debug('Ran out of Markers');
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
                elevation = lookangles.elevation;

                if (elevation * RAD2DEG > 0 && 90 - elevation * RAD2DEG < selectedSatFOV) {
                  satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                  if (i === len) {
                    console.debug('Ran out of Markers');
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

  sendDataToSatSet();

  // The longer the delay the more jitter at higher speeds of propagation
  setTimeout(() => {
    propagateCruncher();
  }, (globalPropagationRate * globalPropagationRateMultiplier) / divisor);
};

export const sendDataToSatSet = () => {
  let postMessageArray = <PropagationMessage>{
    satPos: satPos,
    satVel: satVel,
  };
  // Add In View Data if Sensor Selected
  if (sensor.observerGd !== defaultGd) {
    postMessageArray.satInView = satInView;
  } else {
    postMessageArray.satInView = EMPTY_INT8_ARRAY;
  }
  // Add Sun View Data if Enabled
  if (isSunlightView) {
    postMessageArray.satInSun = satInSun;
  } else {
    postMessageArray.satInSun = EMPTY_INT8_ARRAY;
  }
  // If there is at least one sensor showing markers
  if (sensorMarkerArray.length >= 1) {
    postMessageArray.sensorMarkerArray = sensorMarkerArray;
  } else {
    postMessageArray.sensorMarkerArray = [];
  }

  try {
    postMessage(postMessageArray);
  } catch (e) {
    if (!process) throw e;
  }
};
