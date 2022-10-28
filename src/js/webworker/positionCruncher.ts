/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import numeric from 'numeric';
import { EciVec3, LlaVec3, SatelliteRecord, Sgp4, Transforms, Utils } from 'ootk';
import { SensorObjectCruncher } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { DEG2RAD, GROUND_BUFFER_DISTANCE, PI, RAD2DEG, RADIUS_OF_EARTH, RADIUS_OF_SUN, STAR_DISTANCE, TAU } from '../lib/constants';
import { defaultGd, emptySensor, PositionCruncherIncomingMsg, PositionCruncherOutgoingMsg, SatCacheObject } from './constants';
import { createLatLonHei, isInFov, isInValidElevation, isSensorDeepSpace, lookAnglesToEcf, setupTimeVariables } from './positionCruncher/calculations';
import { resetPosition, resetVelocity, setPosition } from './positionCruncher/satCache';

const SunMath = Utils.SunMath;

const EMPTY_FLOAT32_ARRAY = new Float32Array(0);
const EMPTY_INT8_ARRAY = new Int8Array(0);

/** ARRAYS */
let satCache = <SatCacheObject[]>[]; // Cache of Satellite Data from TLE.json and Static Data from variable.js

let cruncherStarLat = 0;
let cruncherStarLon = 188; // TODO: This is a hack.

let satPos = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Positions
let satVel = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Velocities
let satInView = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in view of Sensor
let satInSun = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in sunlight
let sensorMarkerArray = [0]; // Array of Markers used to show sensor fence and FOV

let satelliteSelected = [-1]; // Array used to determine which satellites are selected

let isInterupted = false; // Boolean used to determine if the worker is interupted

/** TIME VARIABLES */
let globalPropagationRate = 1000; // Limits how often the propagation loop runs
let globalPropagationRateMultiplier = 1; // Used to slow down propagation rate on slow computers
let propagationRunning = false; // Prevent Propagation From Running Twice
// let timeSyncRunning = false; // Prevent Time Sync Loop From Running Twice
let divisor = 1; // When running at high speeds, allow faster propagation
let dynamicOffsetEpoch = Date.now();
let staticOffset = 0;
let propRate = 1; // vars us run time faster (or slower) than normal
// let propChangeTime = Date.now(); // vars us run time faster (or slower) than normal

/** Settings */
let selectedSatFOV = 90; // FOV in Degrees
let isShowFOVBubble = false; // Flag for if FOV bubble is shown
let isShowSurvFence = false; // Flag for if fence markers are shown
let isResetFOVBubble = false;
let isShowSatOverfly = false;
let isResetSatOverfly = false;
let isMultiSensor = false;
const isIgnoreNonRadar = true;
let isSunlightView = false;
let isLowPerf = false;
let isResetMarker = false;
let isResetInView = false;
let fieldOfViewSetLength = 0;
let len: number;

/** OBSERVER VARIABLES */
let mSensor = <SensorObjectCruncher[]>[];
let sensor = emptySensor;

const isThisJest = typeof process !== 'undefined' && process?.release?.name;

// Handles Incomming Messages to sat-cruncher from main thread
try {
  onmessage = (m) => onmessageProcessing(m);
} catch (e) {
  // If Jest isn't running then throw the error
  if (!process) throw e;
}

// prettier-ignore
export const onmessageProcessing = (m: PositionCruncherIncomingMsg) => { // NOSONAR
  let satData;
  let i;
  let extraData = [];
  let satrec: SatCacheObject;

  switch (m.data.typ) {
    case 'offset':
      staticOffset = m.data.staticOffset;
      dynamicOffsetEpoch = m.data.dynamicOffsetEpoch;
      propRate = m.data.propRate;
      isInterupted = true;

      // Changing this to 0.1 caused issues...
      divisor = 1;
      return;
    case 'satdata':
      satData = JSON.parse(m.data.dat);
      len = satData.length;
      i = 0;

      while (i < len) {
        const extraRec = {
          lowAlt: <number>null,
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
          extraData.push(extraRec);
          satCache.push(satrec);
          i++;
        } else {
          // perform and store sat init calcs
          satrec = <SatelliteRecord & SatCacheObject><unknown>Sgp4.createSatrec(
            satData[i].TLE1,
            satData[i].TLE2
          );
          extraRec.lowAlt = satrec.isimp;
          extraRec.inclination = satrec.inclo; // rads
          extraRec.eccentricity = satrec.ecco;
          extraRec.raan = satrec.nodeo; // rads
          extraRec.argPe = satrec.argpo; // rads
          extraRec.meanMotion = (satrec.no * 60 * 24) / TAU; // convert rads/minute to rev/day
          extraRec.semiMajorAxis = Math.pow(8681663.653 / extraRec.meanMotion, 2 / 3);
          extraRec.semiMinorAxis = extraRec.semiMajorAxis * Math.sqrt(1 - Math.pow(extraRec.eccentricity, 2));
          extraRec.apogee = extraRec.semiMajorAxis * (1 + extraRec.eccentricity) - RADIUS_OF_EARTH;
          satrec.apogee = extraRec.apogee;
          extraRec.perigee = extraRec.semiMajorAxis * (1 - extraRec.eccentricity) - RADIUS_OF_EARTH;
          extraRec.period = 1440.0 / extraRec.meanMotion;

          extraData.push(extraRec);
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
      // replace old TLEs
      satrec = <SatelliteRecord & SatCacheObject><unknown>Sgp4.createSatrec(
        m.data.TLE1,
        m.data.TLE2
      );
      satCache[m.data.id] = { ...satCache[m.data.id], ...satrec };
      satCache[m.data.id].skip = false;
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
      extra.meanMotion = (satrec.no * 60 * 24) / TAU; // convert rads/minute to rev/day

      // fun other data
      extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, 2 / 3);
      extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
      extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH;
      satCache[m.data.id].apogee = extra.apogee; // This has to be updated or analyst satellites will fail automatically
      extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH;
      extra.period = 1440.0 / extra.meanMotion;
      extra.TLE1 = m.data.TLE1;
      extra.TLE2 = m.data.TLE2;
      extraData.push(extra);      
      if (isThisJest) return;
      // istanbul ignore next
      postMessage({
        extraUpdate: true,
        extraData: JSON.stringify(extraData),
        satId: m.data.id,
      });
      isInterupted = true;
      break;
    case 'newMissile':
      satCache[m.data.id] = m.data;
      break;
    case 'satelliteSelected':
      satelliteSelected = m.data.satelliteSelected;
      if (satelliteSelected[0] === -1) {
        isResetSatOverfly = true;
        if (!isResetMarker) isResetMarker = true;
      }
      break;
    case 'sensor':
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
            sensor.observerGd = {
              lon: m.data.sensor[0].lon * DEG2RAD,
              lat: m.data.sensor[0].lat * DEG2RAD,
              alt: parseFloat(m.data.sensor[0].alt),
            };
            if (!isResetInView) isResetInView = true;
          }
        }
        isMultiSensor = false;
      } else {
        // Intentionally left blank
      }
      break;
    case 'isShowSatOverfly':
      selectedSatFOV = m.data.selectedSatFOV ? m.data.selectedSatFOV : selectedSatFOV;

      if (m.data.isShowSatOverfly === 'enable') {
        isShowSatOverfly = true;
      }
      if (m.data.isShowSatOverfly === 'reset') {
        isResetSatOverfly = true;
        isShowSatOverfly = false;
        if (!isResetMarker) isResetMarker = true;
      }
      break;
    default:
      // NOTE: For debugging turn this on
      // console.warn('Unknown message typ: ' + m.data.typ);
      if (m.data.isSunlightView) {
        isSunlightView = m.data.isSunlightView;
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
      break;
  }

  // Don't start before getting satData!
  if (!propagationRunning && m.data.typ === 'satdata') {
    len = -1; // propagteCruncher needs to start at -1 not 0
    propagationLoop();
    propagationRunning = true;
  }
};

export const propagationLoop = (mockSatCache?: SatCacheObject[]) => {
  // Use mock satCache if we have one
  satCache = mockSatCache || satCache;

  const { now, j, gmst, gmstNext, isSunExclusion, sunEci } = setupTimeVariables(dynamicOffsetEpoch, staticOffset, propRate, isSunlightView, isMultiSensor, sensor);
  len = isMarkersNeeded() ? satCache.length - 1 - fieldOfViewSetLength : satCache.length - 1;

  updateSatCache(now, j, gmst, gmstNext, isSunExclusion, sunEci);
  if (isResetFOVBubble) {
    isResetFOVBubble = false;
    len -= fieldOfViewSetLength;
  }

  if (!isInterupted) sendDataToSatSet();
  isInterupted = false;

  // The longer the delay the more jitter at higher speeds of propagation
  setTimeout(() => {
    propagationLoop();
  }, (globalPropagationRate * globalPropagationRateMultiplier) / divisor);
};

// prettier-ignore
export const updateSatCache = (now: Date, j: number, gmst: number, gmstNext: number, isSunExclusion: boolean, sunEci: { x: number; y: number; z: number }) => { // NOSONAR
  // TODO: When this was created chrome was faster doing a reverse while loop - that may not be true anymore
  let i = -1;
  while (i < len) {
    if (isInterupted) break;
    i++; // At the beginning so i starts at 0
    let isContinue = false;

    if (satCache[i].satnum) {
      isContinue = !updateSatellite(i, gmst, sunEci, j, isSunExclusion);
    } else if (satCache[i].isRadarData) {
      isContinue = !updateRadarData(i);
    } else if (satCache[i].static && !satCache[i].marker && satCache[i].type === SpaceObjectType.STAR) {
      updateStar(i, now);
      resetVelocity(satVel, i);
    } else if (satCache[i].static && !satCache[i].marker) {
      updateLandObject(i, gmst);
      resetVelocity(satVel, i);
    } else if (satCache[i].missile) {
      isContinue = !updateMissile(i, now, gmstNext, gmst);
    } else if (satCache[i].marker && (isShowFOVBubble || isResetFOVBubble)) {
      i = updateMarkerFov(i, gmst);
    } else if (satCache[i].marker && (isShowSatOverfly || isResetSatOverfly)) {
      i = updateSatOverfly(i, gmst);
    } else {
      // Intentionally left blank
    }

    if (!isContinue) {
      isResetSatOverfly = false;

      // Markers always come last, if we are at this part of the code
      // then it is time to reset every non-active marker back to 0,0,0
      // if this isnt a marker then they must be turned off
      if (satCache[i].marker) {
        resetInactiveMarkers(i);
        break;
      }
    }
  }
};
/* istanbul ignore next */
export const updateRadarData = (i: number): boolean => {
  if (satCache[i].skip) return false;

  satCache[i].skip = true;
  resetPosition(satPos, i);
  resetVelocity(satVel, i);
  return true;
};

// prettier-ignore
export const updateSatOverfly = (i: number, gmst: number): number => { // NOSONAR
  if (isResetSatOverfly && satCache[i].active === true) {
    // Let the main loop know what i we ended on
    return i;
  }

  let lookangles;
  let lat, lon;
  let pos;
  let satSelPosEcf, satSelPos, satSelGeodetic: LlaVec3, satHeight, satSelPosEarth, deltaLat, deltaLatInt, deltaLon, deltaLonInt;

  for (let snum = 0; snum < satelliteSelected.length + 1; snum++) {
    if (snum === satelliteSelected.length) {
      sensorMarkerArray.push(i);
      break;
    }
    if (satelliteSelected[snum] !== -1) {
      if (!isShowSatOverfly) continue;
      // Find the ECI position of the Selected Satellite
      satSelPosEcf = {
        x: satPos[satelliteSelected[snum] * 3],
        y: satPos[satelliteSelected[snum] * 3 + 1],
        z: satPos[satelliteSelected[snum] * 3 + 2],
      };
      satSelPos = Transforms.ecf2eci(satSelPosEcf, gmst);

      // Find the Lat/Long of the Selected Satellite
      satSelGeodetic = Transforms.eci2lla(satSelPos, gmst); // pv.position is called positionEci originally
      satHeight = satSelGeodetic.alt;
      satSelPosEarth = createLatLonHei(satSelGeodetic.lat, satSelGeodetic.lon, 1);

      deltaLatInt = 1;
      if (satHeight < 2500 && selectedSatFOV <= 60) deltaLatInt = 0.5;
      if (satHeight > 7000 || selectedSatFOV >= 90) deltaLatInt = 2;
      if (satelliteSelected.length > 1) deltaLatInt = 2;
      for (deltaLat = -60; deltaLat < 60; deltaLat += deltaLatInt) {
        lat = Math.max(Math.min(Math.round(satSelGeodetic.lat * RAD2DEG) + deltaLat, 90), -90) * DEG2RAD;
        if (lat > 90) continue;

        if (satHeight < 2500 && selectedSatFOV <= 60) {
          deltaLonInt = 0.5;
        } else if (satHeight > 7000 || selectedSatFOV >= 90) {
          deltaLonInt = 2;
        } else {
          deltaLonInt = 1;
        }

        if (satelliteSelected.length > 1) deltaLonInt = 2;
        for (deltaLon = 0; deltaLon < 181; deltaLon += deltaLonInt) {
          // //////////
          // Add Long
          // //////////
          lon = satSelGeodetic.lon + deltaLon * DEG2RAD;
          satSelPosEarth = createLatLonHei(lat, lon, 15);
          // Find the Az/El of the position on the earth
          lookangles = Transforms.ecf2rae(satSelPosEarth, satSelPosEcf);

          if (isInValidElevation(lookangles, selectedSatFOV)) {
            pos = Transforms.lla2ecf(satSelPosEarth);

            if (i === len) {
              continue; // Only get so many markers.
            }
            satCache[i].active = true;

            satPos = setPosition(satPos, i, pos);
            resetVelocity(satVel, i);
            i++;
          }
          // //////////
          // Minus Long
          // //////////
          if (deltaLon === 0 || deltaLon === 180) continue; // Don't Draw Two Dots On the Center Line
          lon = satSelGeodetic.lon - deltaLon * DEG2RAD;
          satSelPosEarth = createLatLonHei(lat, lon, 15);
          // Find the Az/El of the position on the earth
          lookangles = Transforms.ecf2rae(satSelPosEarth, satSelPosEcf);

          if (isInValidElevation(lookangles, selectedSatFOV)) {
            pos = Transforms.lla2ecf(satSelPosEarth);

            if (i === len) {
              continue; // Only get so many markers.
            }
            satCache[i].active = true;

            satPos = setPosition(satPos, i, pos);
            resetVelocity(satVel, i);
            i++;
          }

          if (lat === 90 || lat === -90) break; // One Dot for the Poles
        }
      }
    }
  }

  // Let the main loop know what i we ended on
  return i;
};
export const updateStar = (i: number, now: Date): void => {
  // INFO: 0 Latitude returns upside down results. Using 180 looks right, but more verification needed.
  // WARNING: 180 and 0 really matter...unclear why
  const starPosition = SunMath.getStarAzEl(now, cruncherStarLat, cruncherStarLon, satCache[i].ra, satCache[i].dec);
  const pos = lookAnglesToEcf(starPosition.az * RAD2DEG, starPosition.el * RAD2DEG, STAR_DISTANCE, 0, 0, 0);

  // Reduce Random Jitter by Requiring New Positions to be Similar to Old
  // THIS MIGHT BE A HORRIBLE
  satPos[i * 3] = pos.x;
  satPos[i * 3 + 1] = pos.y;
  satPos[i * 3 + 2] = pos.z;
  // if (satPos[i * 3] === 0 || (satPos[i * 3] - pos.x < 0.1 && satPos[i * 3] - pos.x > -0.1)) satPos[i * 3] = pos.x;
  // if (satPos[i * 3 + 1] === 0 || (satPos[i * 3 + 1] - pos.y < 0.1 && satPos[i * 3 + 1] - pos.y > -0.1)) satPos[i * 3 + 1] = pos.y;
  // if (satPos[i * 3 + 2] === 0 || (satPos[i * 3 + 2] - pos.z < 0.1 && satPos[i * 3 + 2] - pos.z > -0.1)) satPos[i * 3 + 2] = pos.z;
};
export const updateMissile = (i: number, now: Date, gmstNext: number, gmst: number): boolean => {
  if (!satCache[i].active) {
    satPos[i * 3] = 0;
    satPos[i * 3 + 1] = 0;
    satPos[i * 3 + 2] = 0;
    return false; // Skip inactive missiles
  }
  let cosLat: number, sinLat: number, cosLon: number, sinLon: number;

  const tLen = satCache[i].altList.length;
  let curMissivarTime: number;
  for (let t = 0; t < tLen; t++) {
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

  if (satCache[i].lastTime === 0) {
    resetVelocity(satVel, i);
  } else if (satVel[i * 3] === 0 && satVel[i * 3 + 1] === 0 && satVel[i * 3 + 2] === 0) {
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

  const x = satPos[i * 3];
  const y = satPos[i * 3 + 1];
  const z = satPos[i * 3 + 2];

  const positionEcf = Transforms.eci2ecf({ x, y, z }, gmst);
  if (Transforms.eci2lla({ x, y, z }, gmst).alt <= 150 && satCache[i].missile === false) {
    // DEBUG:
    // console.error(i);
    satCache[i].skip = true;
  }
  const rae = Transforms.ecf2rae(sensor.observerGd, positionEcf);
  satInView[i] = isInFov(rae, sensor);
  return true;
};
export const updateLandObject = (i: number, gmst: number): void => {
  const cosLat = Math.cos(satCache[i].lat * DEG2RAD);
  const sinLat = Math.sin(satCache[i].lat * DEG2RAD);
  const cosLon = Math.cos(satCache[i].lon * DEG2RAD + gmst);
  const sinLon = Math.sin(satCache[i].lon * DEG2RAD + gmst);
  satPos[i * 3] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + satCache[i].alt) * cosLat * cosLon; // 6371 is radius of earth
  satPos[i * 3 + 1] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + satCache[i].alt) * cosLat * sinLon;
  satPos[i * 3 + 2] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + satCache[i].alt) * sinLat;
};

// prettier-ignore
export const updateSatellite = (i: number, gmst: number, sunEci: any, j: number, isSunExclusion: boolean): boolean => { // NOSONAR
  let semiDiamEarth, semiDiamSun, theta;
  let positionEcf, lookangles;

  // Skip reentries
  if (satCache[i].skip) return false;
  const m = (j - satCache[i].jdsatepoch) * 1440.0; // 1440 = minutes_per_day
  const pv = Sgp4.propagate(<any>satCache[i], m) as {position:EciVec3, velocity: EciVec3};

  try {
    satPos[i * 3] = pv.position.x;
    satPos[i * 3 + 1] = pv.position.y;
    satPos[i * 3 + 2] = pv.position.z;

    satVel[i * 3] = pv.velocity.x;
    satVel[i * 3 + 1] = pv.velocity.y;
    satVel[i * 3 + 2] = pv.velocity.z;

    // Make sure that objects with an imprecise orbit or an old elset
    // are not failing to propagate
    if (satCache[i].isimp || m / 1440 > 20) {
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
      let C: number;
      while (k < kmax) {
        C = 1 / Math.sqrt(1 - e2 * (Math.sin(lat) * Math.sin(lat)));
        lat = Math.atan2(pv.position.z + a * C * e2 * Math.sin(lat), R);
        k += 1;
      }
      const alt = R / Math.cos(lat) - a * C;
      if (alt > satCache[i].apogee + 1000) {
        throw new Error('Impossible orbit');
      }
    }

    if (satCache[i].apogee < 350 && Math.sqrt(pv.velocity.x * pv.velocity.x + pv.velocity.y * pv.velocity.y) < 5.5) {
      throw new Error('Impossible orbit');
    }

    // Skip Calculating Lookangles if No Sensor is Selected
    if (sensor.observerGd !== defaultGd && !isMultiSensor) {
      lookangles = Transforms.ecf2rae(sensor.observerGd, Transforms.eci2ecf(pv.position, gmst));
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
  }

  satInView[i] = 0; // 0 = FALSE - Default in case no sensor selected
  satInSun[i] = 2; // Default in case

  if (isSunlightView) {
    semiDiamEarth = Math.asin(RADIUS_OF_EARTH / Math.sqrt(Math.pow(-satPos[i * 3], 2) + Math.pow(-satPos[i * 3 + 1], 2) + Math.pow(-satPos[i * 3 + 2], 2))) * RAD2DEG;
    semiDiamSun =
      Math.asin(RADIUS_OF_SUN / Math.sqrt(Math.pow(-satPos[i * 3] + sunEci.x, 2) + Math.pow(-satPos[i * 3 + 1] + sunEci.y, 2) + Math.pow(-satPos[i * 3 + 2] + sunEci.z, 2))) *
      RAD2DEG;

    // Angle between earth and sun
    theta =
      Math.acos(
        <number>numeric.dot([-satPos[i * 3], -satPos[i * 3 + 1], -satPos[i * 3 + 2]], [-satPos[i * 3] + sunEci.x, -satPos[i * 3 + 1] + sunEci.y, -satPos[i * 3 + 2] + sunEci.z]) /
          (Math.sqrt(Math.pow(-satPos[i * 3], 2) + Math.pow(-satPos[i * 3 + 1], 2) + Math.pow(-satPos[i * 3 + 2], 2)) *
            Math.sqrt(Math.pow(-satPos[i * 3] + sunEci.x, 2) + Math.pow(-satPos[i * 3 + 1] + sunEci.y, 2) + Math.pow(-satPos[i * 3 + 2] + sunEci.z, 2)))
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
      for (let s = 0; s < mSensor.length; s++) {
        // Skip satellites in the sun if you are an optical sensor
        if (!(sensor.type === SpaceObjectType.OPTICAL && satInSun[i] === 0)) {
          if (satInView[i]) break;
          sensor = mSensor[s];
          sensor.observerGd = {
            lon: sensor.lon * DEG2RAD,
            lat: sensor.lat * DEG2RAD,
            alt: sensor.alt * 1, // Convert from string
          };
          try {
            positionEcf = Transforms.eci2ecf(<EciVec3>pv.position, gmst); // pv.position is called positionEci originally
            lookangles = Transforms.ecf2rae(sensor.observerGd, positionEcf);
          } catch (e) {
            continue;
          }
          satInView[i] = isInFov(lookangles, sensor);
        }
      }
    } else {
      if (!(sensor.type === SpaceObjectType.OPTICAL && satInSun[i] === 0)) {
        satInView[i] = isInFov(lookangles, sensor);
      }
    }
  }

  return true;
};
export const isMarkersNeeded = () => (!isResetSatOverfly && !isShowSatOverfly && !isResetFOVBubble && !isShowFOVBubble) || isLowPerf;
export const resetInactiveMarkers = (i: number) => {
  for (; i < len; i++) {
    if (!satCache[i].active) {
      len -= fieldOfViewSetLength;
      break;
    }
    resetPosition(satPos, i);
    resetVelocity(satVel, i);
    satCache[i].active = false;
  }
};

// prettier-ignore
export const updateMarkerFov = (i: number, gmst: number): number => { // NOSONAR
  let az: number, el: number, rng: number;
  let pos;
  let q: number, q2: number;
  if (!isMultiSensor && sensor.observerGd !== defaultGd) {
    mSensor[0] = sensor;
    mSensor.length = 1;
  }
  sensorMarkerArray = [];
  for (let s = 0; s < mSensor.length + 1; s++) {
    sensorMarkerArray.push(i);
    // We intentionally go past the last sensor so we can record the last marker's id
    if (s === mSensor.length) break;
    sensor = mSensor[s];
    sensor.observerGd = createLatLonHei(sensor.lat * DEG2RAD, sensor.lon * DEG2RAD, sensor.alt);
    resetPosition(satPos, i);
    resetVelocity(satVel, i);

    if (isResetFOVBubble) continue;
    if (!isShowFOVBubble) continue;
    if (sensor.observerGd === defaultGd) continue;

    // Ignore Optical and Mechanical Sensors When showing Many
    if (isIgnoreNonRadar && isSensorDeepSpace(mSensor, sensor)) continue;

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
            pos = Transforms.ecf2eci(lookAnglesToEcf(az, el, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
            try {
              satCache[i].active = true;
              satPos = setPosition(satPos, i, pos);
              resetVelocity(satVel, i);
              i++;
            } catch (e) {
              // DEBUG:
              // console.log(e);
            }
          }
        }

        // //////////////////////////////////
        // Max AZ FOV
        // //////////////////////////////////
        for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
          az = sensor.obsmaxaz;
          for (el = sensor.obsminel; el < sensor.obsmaxel; el += q) {
            pos = Transforms.ecf2eci(lookAnglesToEcf(az, el, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
            try {
              satCache[i].active = true;
            } catch (e) {
              // DEBUG:
              // console.log(e);
            }
            satPos = setPosition(satPos, i, pos);
            resetVelocity(satVel, i);
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
              pos = Transforms.ecf2eci(lookAnglesToEcf(az, el, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
              satCache[i].active = true;
              satPos = setPosition(satPos, i, pos);
              resetVelocity(satVel, i);
              i++;
            }
          }

          // //////////////////////////////////
          // Max AZ 2 FOV
          // //////////////////////////////////
          for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
            az = sensor.obsmaxaz2;
            for (el = sensor.obsminel2; el < sensor.obsmaxel2; el += q) {
              pos = Transforms.ecf2eci(lookAnglesToEcf(az, el, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
              satCache[i].active = true;
              satPos = setPosition(satPos, i, pos);
              resetVelocity(satVel, i);
              i++;
            }
          }
        }

        // Only on 360 FOV
      } else {
        for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng += Math.min(sensor.obsmaxrange, 60000) / q2) {
          el = sensor.obsmaxel;
          for (az = sensor.obsminaz; az < sensor.obsmaxaz; az += q) {
            pos = Transforms.ecf2eci(lookAnglesToEcf(az, el, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
            try {
              satCache[i].active = true;
            } catch (e) {
              // DEBUG:
              // console.log(e);
            }
            satPos = setPosition(satPos, i, pos);
            resetVelocity(satVel, i);
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
          pos = Transforms.ecf2eci(lookAnglesToEcf(az, sensor.obsmaxel, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
          if (i === len) {
            break;
          }
          satCache[i].active = true;
          satPos = setPosition(satPos, i, pos);
          resetVelocity(satVel, i);
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
          pos = Transforms.ecf2eci(lookAnglesToEcf(az, sensor.obsminel2, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
          if (i === len) {
            
            break;
          }
          satCache[i].active = true;
          satPos = setPosition(satPos, i, pos);
          resetVelocity(satVel, i);
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
          pos = Transforms.ecf2eci(lookAnglesToEcf(az, el, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
          if (i === len) {
            
            break;
          }
          satCache[i].active = true;
          satPos = setPosition(satPos, i, pos);
          resetVelocity(satVel, i);
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
            pos = Transforms.ecf2eci(lookAnglesToEcf(az, el, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
            if (i === len) {
              
              break;
            }
            satCache[i].active = true;
            satPos = setPosition(satPos, i, pos);
            resetVelocity(satVel, i);
            i++;
          }
        }
      }
    }

    // //////////////////////////////////
    // Floor of FOV
    // //////////////////////////////////
    q = 0.25;
    
    // Calculate minimum range circle
    rng = sensor.obsmaxrange
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
      pos = Transforms.ecf2eci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
      if (i === len) {
        
        break;
      }
      satCache[i].active = true;
      satPos = setPosition(satPos, i, pos);
      resetVelocity(satVel, i);
      i++;
    }

    // Calculate maximum range cirlce
    rng = sensor.obsminrange;
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
      pos = Transforms.ecf2eci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
      if (i === len) {
        
        break;
      }
      satCache[i].active = true;
      satPos = setPosition(satPos, i, pos);
      resetVelocity(satVel, i);
      i++;
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
          pos = Transforms.ecf2eci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
          if (i === len) {
            
            break;
          }
          satCache[i].active = true;
          satPos = setPosition(satPos, i, pos);
          resetVelocity(satVel, i);
          i++;
        }
      }
    }

    if (sensor.obsminaz !== sensor.obsmaxaz && sensor.obsminaz !== sensor.obsmaxaz - 360) {
      q = (sensor.obsmaxrange - sensor.obsminrange) / 5555; // Space the left and right edge out equally between LEO and GEO sensors
      for (az = sensor.obsmaxaz; az === sensor.obsmaxaz; az += 1) {
        for (rng = sensor.obsminrange; rng < sensor.obsmaxrange; rng += q) {
          pos = Transforms.ecf2eci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
          if (i === len) {
            
            break;
          }
          satCache[i].active = true;
          satPos = setPosition(satPos, i, pos);
          resetVelocity(satVel, i);
          i++;
        }
      }

      for (az = sensor.obsminaz; az === sensor.obsminaz; az += 1) {
        for (rng = sensor.obsminrange; rng < sensor.obsmaxrange; rng += q) {
          pos = Transforms.ecf2eci(lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.lat, sensor.observerGd.lon, sensor.observerGd.alt), gmst);
          if (i === len) {
            
            break;
          }
          satCache[i].active = true;
          satPos = setPosition(satPos, i, pos);
          resetVelocity(satVel, i);
          i++;
        }
      }
    }
  }

  // Let the main loop know what i we ended on
  return i;
};
export const sendDataToSatSet = () => {
  const postMessageArray = <PositionCruncherOutgoingMsg>{
    satPos: satPos,
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
    // Send Velocity Separate to avoid CPU Overload on Main Thread
    postMessage(<PositionCruncherOutgoingMsg>{
      satVel: satVel,
    });
  } catch (e) {
    if (!process) throw e;
  }
};
