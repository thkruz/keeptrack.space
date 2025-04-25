/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference https://keeptrack.space/license/thingsinspace.txt
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

import {
  Celestial,
  DEG2RAD,
  Degrees,
  DetailedSatellite,
  DetailedSensor,
  EcfVec3,
  EciVec3,
  EpochUTC,
  GreenwichMeanSiderealTime,
  Kilometers,
  KilometersPerSecond,
  LandObject,
  Milliseconds,
  Minutes,
  PI,
  Radians,
  RaeVec3,
  Sgp4,
  SpaceObjectType,
  Sun,
  TAU,
  Vector3D,
  ecfRad2rae,
  eci2ecf,
  eci2lla,
  lla2eci,
  rae2eci,
} from 'ootk';
import { GROUND_BUFFER_DISTANCE, RADIUS_OF_EARTH, STAR_DISTANCE } from '../lib/constants';
import { PosCruncherCachedObject, PositionCruncherIncomingMsg, PositionCruncherOutgoingMsg } from './constants';
import { setupTimeVariables } from './positionCruncher/calculations';
import { resetPosition, resetVelocity } from './positionCruncher/satCache';

export interface CruncherSat {
  // Satellites
  tle1?: string;
  tle2?: string;
  active?: boolean;
  // Missiles
  latList?: Degrees[];
  lonList?: Degrees[];
  altList?: Kilometers[];
  // Sensors
  lat?: Degrees;
  lon?: Degrees;
  alt?: Kilometers;
  // Stars
  ra?: Radians;
  dec?: Radians;
  // Markers
  isMarker?: boolean;
}

// Ensure this matches SatMath.ts but don't import it because of dependencies
enum SunStatus {
  UNKNOWN = -1,
  UMBRAL = 0,
  PENUMBRAL = 1,
  SUN = 2,
}

export enum CruncerMessageTypes {
  OBJ_DATA = 'objData',
  OFFSET = 'OFFSET',
  SAT_EDIT = 'SAT_EDIT',
  NEW_MISSILE = 'NEW_MISSILE',
  SATELLITE_SELECTED = 'SATELLITE_SELECTED',
  SENSOR = 'SENSOR',
  UPDATE_MARKERS = 'UPDATE_MARKERS',
  SUNLIGHT_VIEW = 'SUNLIGHT_VIEW',
}

export enum MarkerMode {
  OFF,
}

const EMPTY_FLOAT32_ARRAY = new Float32Array(0);
const EMPTY_INT8_ARRAY = new Int8Array(0);
const STAR_LAT = <Degrees>0;
const STAR_LON = <Degrees>188; // TODO: This is a hack.

let isResponseCount = 0;

/** ARRAYS */
let objCache = <PosCruncherCachedObject[]>[]; // Cache of Satellite Data from TLE.json and Static Data from variable.js

let satPos = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Positions
let satVel = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Velocities
let satInView = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in view of Sensor
let satInSun = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in sunlight
const sensorMarkerArray = [0]; // Array of Markers used to show sensor fence and FOV

let satelliteSelected = [-1]; // Array used to determine which satellites are selected

let isInterupted = false; // Boolean used to determine if the worker is interupted

/** TIME VARIABLES */
const PROPAGATION_INTERVAL = 1000 as Milliseconds; // Limits how often the propagation loop runs
let propagationRunning = false; // Prevent Propagation From Running Twice
// let timeSyncRunning = false; // Prevent Time Sync Loop From Running Twice
let divisor = 1; // When running at high speeds, allow faster propagation
let dynamicOffsetEpoch = Date.now();
let staticOffset = 0;
let propRate = 1; // vars us run time faster (or slower) than normal
// let propChangeTime = Date.now(); // vars us run time faster (or slower) than normal

/** Settings */
let isSensor = false;
/** Do we have more than one sensor? */
let isSensors = false;
let isSunlightView = false;
let isLowPerf = false;
let markerMode = MarkerMode.OFF;

let isResetFOVBubble = false;
let isResetSatOverfly = false;
let isResetMarker = false;
let isResetInView = false;

let fieldOfViewSetLength = 0;
let len: number;
let MAX_DIFFERENCE_BETWEEN_POS = 50;

/** OBSERVER VARIABLES */
let sensors: DetailedSensor[] = [];

const isThisJest = typeof process !== 'undefined' && process?.release?.name;

// Handles Incomming Messages to sat-cruncher from main thread
try {
  onmessage = (m) => onmessageProcessing(m);
} catch (e) {
  // If Jest isn't running then throw the error
  if (!process) {
    throw e;
  }
}

export interface ExtraDataMessage {
  isLowAlt: boolean;
  inclination: Radians;
  eccentricity: number;
  raan: Radians;
  argOfPerigee: Radians;
  meanMotion: number;
  semiMajorAxis: number;
  semiMinorAxis: number;
  apogee: Kilometers;
  perigee: Kilometers;
  period: Minutes;
  tle1?: string;
  tle2?: string;
}

export const onmessageProcessing = (m: PositionCruncherIncomingMsg) => {
  let satData: CruncherSat[];
  let i = 0;
  let extraData = [] as ExtraDataMessage[];
  const extra = {
    isLowAlt: <boolean>null,
    inclination: <Radians>null,
    eccentricity: <number>null,
    raan: <Radians>null,
    argOfPerigee: <Radians>null,
    meanMotion: <number>null,
    semiMajorAxis: <Kilometers>null,
    semiMinorAxis: <Kilometers>null,
    apogee: <Kilometers>null,
    perigee: <Kilometers>null,
    period: <Minutes>null,
    tle1: <string>null,
    tle2: <string>null,
  };

  switch (m.data.typ) {
    case CruncerMessageTypes.OFFSET:
      staticOffset = m.data.staticOffset;
      dynamicOffsetEpoch = m.data.dynamicOffsetEpoch;
      propRate = m.data.propRate;
      isInterupted = true;

      // Changing this to 0.1 caused issues...
      divisor = 1;

      return;
    case CruncerMessageTypes.OBJ_DATA:
      satData = JSON.parse(m.data.dat);
      len = satData.length;

      while (i < len) {
        const extraRec = {
          isLowAlt: <boolean>null,
          inclination: <Radians>null,
          eccentricity: <number>null,
          raan: <Radians>null,
          argOfPerigee: <Radians>null,
          meanMotion: <number>null,
          semiMajorAxis: <number>null,
          semiMinorAxis: <number>null,
          apogee: <Kilometers>null,
          perigee: <Kilometers>null,
          period: <Minutes>null,
        };
        // Satellites always have a tle1

        if (satData[i]?.tle1) {
          // perform and store sat init calcs
          const satrec = Sgp4.createSatrec(satData[i].tle1, satData[i].tle2);

          extraRec.isLowAlt = satrec.isimp;
          extraRec.inclination = <Radians>satrec.inclo;
          extraRec.eccentricity = satrec.ecco;
          extraRec.raan = <Radians>satrec.nodeo;
          extraRec.argOfPerigee = <Radians>satrec.argpo;
          extraRec.meanMotion = (satrec.no * 60 * 24) / TAU; // convert rads/minute to rev/day
          extraRec.semiMajorAxis = (8681663.653 / extraRec.meanMotion) ** (2 / 3);
          extraRec.semiMinorAxis = extraRec.semiMajorAxis * Math.sqrt(1 - extraRec.eccentricity ** 2);
          extraRec.apogee = <Kilometers>(extraRec.semiMajorAxis * (1 + extraRec.eccentricity) - RADIUS_OF_EARTH);
          extraRec.perigee = <Kilometers>(extraRec.semiMajorAxis * (1 - extraRec.eccentricity) - RADIUS_OF_EARTH);
          extraRec.period = <Minutes>(1440.0 / extraRec.meanMotion);

          objCache.push({
            active: satData[i].active ?? true,
            satrec,
            apogee: extraRec.apogee,
            perigee: extraRec.perigee,
          });
          i++;
        } else {
          // Sensors, Missiles, and Markers
          const obj = satData[i];
          // Sensors Start Active

          if (obj.lat) {
            obj.active = true;
          } else {
            // Markers and Missiles Start Inactive
            obj.active = false;
          }
          objCache.push({ ...obj, ...{ active: obj.active } });
          i++;
        }
      }

      satPos = new Float32Array(len * 3);
      satVel = new Float32Array(len * 3);

      if (m.data.isLowPerf) {
        isLowPerf = true;
      }
      break;
    case CruncerMessageTypes.SAT_EDIT:
      {
        // replace old TLEs
        const satrec = Sgp4.createSatrec(m.data.tle1, m.data.tle2);

        extraData = [];

        // keplerian elements
        extra.inclination = satrec.inclo as Radians;
        extra.eccentricity = satrec.ecco;
        extra.raan = satrec.nodeo as Radians;
        extra.argOfPerigee = satrec.argpo as Radians;
        extra.meanMotion = (satrec.no * 60 * 24) / TAU; // convert rads/minute to rev/day

        // fun other data
        extra.semiMajorAxis = ((8681663.653 / extra.meanMotion) ** (2 / 3)) as Kilometers;
        extra.semiMinorAxis = (extra.semiMajorAxis * Math.sqrt(1 - extra.eccentricity ** 2)) as Kilometers;
        extra.apogee = (extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH) as Kilometers;
        extra.perigee = (extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH) as Kilometers;
        extra.period = (1440.0 / extra.meanMotion) as Minutes;
        extra.tle1 = m.data.tle1;
        extra.tle2 = m.data.tle2;
        extraData.push(extra);

        // Update the object cache
        objCache[m.data.id].satrec = satrec;
        objCache[m.data.id].active = true;
        objCache[m.data.id].apogee = extra.apogee;
        objCache[m.data.id].perigee = extra.perigee;
        objCache[i].isUpdated = true;

        if (isThisJest) {
          return;
        }
        // istanbul ignore next
        postMessage({
          extraUpdate: true,
          extraData: JSON.stringify(extraData),
          satId: m.data.id,
        });
        isInterupted = true;
      }
      break;
    case CruncerMessageTypes.NEW_MISSILE:
      objCache[m.data.id] = <PosCruncherCachedObject>(<unknown>m.data);
      break;
    case CruncerMessageTypes.SATELLITE_SELECTED:
      satelliteSelected = m.data.satelliteSelected;
      if (satelliteSelected[0] === -1) {
        isResetSatOverfly = true;
        if (!isResetMarker) {
          isResetMarker = true;
        }
      }
      break;
    case CruncerMessageTypes.SENSOR:
      sensors = m.data.sensor.filter((s) => s).map((s) => new DetailedSensor(s));
      isSensor = sensors.length > 0;
      isSensors = sensors.length > 1;
      if (!isResetInView) {
        isResetInView = true;
      }
      break;
    case CruncerMessageTypes.UPDATE_MARKERS:
      if (m.data.fieldOfViewSetLength) {
        fieldOfViewSetLength = m.data.fieldOfViewSetLength;
      }

      if (typeof m.data.markerMode !== 'undefined') {
        markerMode = m.data.markerMode;
      }

      break;
    case CruncerMessageTypes.SUNLIGHT_VIEW:
      if (m.data.isSunlightView) {
        isSunlightView = m.data.isSunlightView;
      }
      break;
    default:
      // NOTE: For debugging turn this on

      // console.warn(`Unknown message typ: ${m.data.typ}`);

      break;
  }

  // Don't start before getting satData!
  if (!propagationRunning && m.data.typ === CruncerMessageTypes.OBJ_DATA) {
    len = -1; // propagteCruncher needs to start at -1 not 0
    propagationLoop();
    propagationRunning = true;
  }
};

export const propagationLoop = (mockSatCache?: PosCruncherCachedObject[]) => {
  // Use mock satCache if we have one
  objCache = mockSatCache || objCache;

  const { now, j, gmst, gmstNext, isSunExclusion } = setupTimeVariables(dynamicOffsetEpoch, staticOffset, propRate, isSunlightView, sensors);

  len = isCanSkipMarkers() ? objCache.length - 1 - fieldOfViewSetLength : objCache.length - 1;

  // Setup optional arrays
  if (satInView.length !== objCache.length) {
    satInView = isSensor && (!satInView || satInView === EMPTY_INT8_ARRAY) ? new Int8Array(objCache.length) : EMPTY_INT8_ARRAY;
  }

  if (satInSun.length !== objCache.length) {
    satInSun = isSunlightView && (!satInSun || satInSun === EMPTY_INT8_ARRAY) ? new Int8Array(objCache.length) : EMPTY_INT8_ARRAY;
  }

  updateSatCache(now, j, gmst, gmstNext, isSunExclusion);
  if (isResetFOVBubble) {
    isResetFOVBubble = false;
    len -= fieldOfViewSetLength;
  }

  checkForNaN(satPos, satVel);

  if (!isInterupted) {
    sendDataToSatSet();
  }
  isInterupted = false;

  // Allow more time for propagation if there are multiple sensors
  const delay = isSensors ? 2 : 1;

  // The longer the delay the more jitter at higher speeds of propagation
  setTimeout(
    () => {
      propagationLoop();
    },
    (PROPAGATION_INTERVAL * delay) / divisor,
  );
};

export const checkForNaN = (satPos: Float32Array, satVel: Float32Array): void => {
  for (let i = 0; i < len; i++) {
    if (isNaN(satPos[i * 3]) || isNaN(satPos[i * 3 + 1]) || isNaN(satPos[i * 3 + 2])) {
      resetPosition(satPos, i);
      resetVelocity(satVel, i);
    }
  }
};

export const updateSatCache = (now: Date, j: number, gmst: GreenwichMeanSiderealTime, gmstNext: number, isSunExclusion: boolean) => {
  let i = -1;
  // Using a while loop since some methods may update multiple cache objects

  while (i < len) {
    if (isInterupted) {
      break;
    }
    i++; // At the beginning so i starts at 0
    let isContinue = false;

    // Don't use satnum because of VIMPEL objects
    if (objCache[i].satrec) {
      isContinue = !updateSatellite(now, i, gmst, j, isSunExclusion);
    } else if (objCache[i].ra) {
      updateStar(i, now, gmst);
      resetVelocity(satVel, i);
    } else if (objCache[i].lat) {
      updateLandObject(i, gmst);
      resetVelocity(satVel, i);
    } else if (objCache[i].latList) {
      isContinue = !updateMissile(i, now, gmstNext, gmst);
    }

    if (!isContinue) {
      isResetSatOverfly = false;

      /*
       * Markers always come last, if we are at this part of the code
       * then it is time to reset every non-active marker back to 0,0,0
       * if this isnt a marker then they must be turned off
       */
      if (objCache[i].isMarker) {
        resetInactiveMarkers(i);
        break;
      }
    }
  }
};

export const updateStar = (i: number, now: Date, gmst: GreenwichMeanSiderealTime): void => {
  /*
   * INFO: 0 Latitude returns upside down results. Using 180 looks right, but more verification needed.
   * WARNING: 180 and 0 really matter...unclear why
   */
  const starPosition = Celestial.azEl(now, STAR_LAT, STAR_LON, objCache[i].ra, objCache[i].dec);
  const rae = { az: starPosition.az, el: starPosition.el, rng: STAR_DISTANCE };
  const pos = rae2eci(rae, { lat: <Degrees>0, lon: <Degrees>0, alt: <Kilometers>0 }, gmst);

  /*
   * Reduce Random Jitter by Requiring New Positions to be Similar to Old
   * THIS MIGHT BE A HORRIBLE
   */
  satPos[i * 3] = pos.x;
  satPos[i * 3 + 1] = pos.y;
  satPos[i * 3 + 2] = pos.z;
  /*
   * if (satPos[i * 3] === 0 || (satPos[i * 3] - pos.x < 0.1 && satPos[i * 3] - pos.x > -0.1)) satPos[i * 3] = pos.x;
   * if (satPos[i * 3 + 1] === 0 || (satPos[i * 3 + 1] - pos.y < 0.1 && satPos[i * 3 + 1] - pos.y > -0.1)) satPos[i * 3 + 1] = pos.y;
   * if (satPos[i * 3 + 2] === 0 || (satPos[i * 3 + 2] - pos.z < 0.1 && satPos[i * 3 + 2] - pos.z > -0.1)) satPos[i * 3 + 2] = pos.z;
   */
};
export const updateMissile = (i: number, now: Date, gmstNext: number, gmst: GreenwichMeanSiderealTime): boolean => {
  if (!objCache[i].active) {
    satPos[i * 3] = 0;
    satPos[i * 3 + 1] = 0;
    satPos[i * 3 + 2] = 0;

    return false; // Skip inactive missiles
  }
  let cosLat: number, cosLon: number, sinLat: number, sinLon: number;

  const tLen = objCache[i].altList.length;
  let curMissivarTime: number;

  for (let t = 0; t < tLen; t++) {
    if (objCache[i].startTime * 1 + t * 1000 >= now.getTime()) {
      curMissivarTime = t;
      break;
    }
  }

  objCache[i].lastTime = objCache[i].lastTime >= 0 ? objCache[i].lastTime : 0;

  const timeIndex = objCache[i].lastTime + 1;
  const lat = objCache[i].latList[timeIndex];
  const lon = objCache[i].lonList[timeIndex];
  const alt = objCache[i].altList[timeIndex];

  cosLat = Math.cos(lat * DEG2RAD);
  sinLat = Math.sin(lat * DEG2RAD);
  cosLon = Math.cos(lon * DEG2RAD + gmstNext);
  sinLon = Math.sin(lon * DEG2RAD + gmstNext);

  if (objCache[i].lastTime === 0) {
    resetVelocity(satVel, i);
  } else if (satVel[i * 3] === 0 && satVel[i * 3 + 1] === 0 && satVel[i * 3 + 2] === 0) {
    satVel[i * 3] = (6371 + alt) * cosLat * cosLon - satPos[i * 3];
    satVel[i * 3 + 1] = (6371 + alt) * cosLat * sinLon - satPos[i * 3 + 1];
    satVel[i * 3 + 2] = (6371 + alt) * sinLat - satPos[i * 3 + 2];
  } else {
    satVel[i * 3] += (6371 + alt) * cosLat * cosLon - satPos[i * 3];
    satVel[i * 3 + 1] += (6371 + alt) * cosLat * sinLon - satPos[i * 3 + 1];
    satVel[i * 3 + 2] += (6371 + alt) * sinLat - satPos[i * 3 + 2];
    satVel[i * 3] *= 0.5;
    satVel[i * 3 + 1] *= 0.5;
    satVel[i * 3 + 2] *= 0.5;
  }

  cosLat = Math.cos(objCache[i].latList[curMissivarTime] * DEG2RAD);
  sinLat = Math.sin(objCache[i].latList[curMissivarTime] * DEG2RAD);
  cosLon = Math.cos(objCache[i].lonList[curMissivarTime] * DEG2RAD + gmst);
  sinLon = Math.sin(objCache[i].lonList[curMissivarTime] * DEG2RAD + gmst);

  satPos[i * 3] = (6371 + objCache[i].altList[curMissivarTime]) * cosLat * cosLon;
  satPos[i * 3 + 1] = (6371 + objCache[i].altList[curMissivarTime]) * cosLat * sinLon;
  satPos[i * 3 + 2] = (6371 + objCache[i].altList[curMissivarTime]) * sinLat;

  objCache[i].lastTime = curMissivarTime;

  const x = <Kilometers>satPos[i * 3];
  const y = <Kilometers>satPos[i * 3 + 1];
  const z = <Kilometers>satPos[i * 3 + 2];

  const positionEcf = eci2ecf({ x, y, z }, gmst);

  if (eci2lla({ x, y, z }, gmst).alt <= 150 && !objCache[i].latList) {
    objCache[i].active = false;
  }

  if (sensors.length > 0) {
    for (const sensor of sensors) {
      if (satInView[i] === 1) {
        break;
      }
      const rae = ecfRad2rae(sensor.llaRad(), positionEcf);

      satInView[i] = sensor.isRaeInFov(rae) ? 1 : 0;
    }
  } else {
    satInView[i] = 0;
  }

  return true;
};
export const updateLandObject = (i: number, gmst: GreenwichMeanSiderealTime): void => {
  const landObject = objCache[i] as unknown as LandObject;

  const lla = {
    lat: (landObject.lat * DEG2RAD) as Radians,
    lon: (landObject.lon * DEG2RAD) as Radians,
    alt: (landObject.alt + GROUND_BUFFER_DISTANCE) as Kilometers,
  };
  const eci = lla2eci(lla, gmst);

  satPos[i * 3] = eci.x;
  satPos[i * 3 + 1] = eci.y;
  satPos[i * 3 + 2] = eci.z;
};

export const updateSatellite = (now: Date, i: number, gmst: GreenwichMeanSiderealTime, j: number, isSunExclusion: boolean): boolean => {
  let positionEcf: EcfVec3;
  let rae: RaeVec3<Kilometers, Degrees>;
  const satelliteData = objCache[i] as unknown as DetailedSatellite; // This is checked in updateSatCache

  // Skip reentries
  if (!satelliteData.active) {
    return false;
  }
  const m = (j - satelliteData.satrec.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
  const pv = Sgp4.propagate(satelliteData.satrec, m) as { position: EciVec3; velocity: EciVec3<KilometersPerSecond> };

  try {
    if (isResponseCount < 5 && isResponseCount > 1 && !objCache[i].isUpdated) {
      MAX_DIFFERENCE_BETWEEN_POS = Math.max(MAX_DIFFERENCE_BETWEEN_POS, MAX_DIFFERENCE_BETWEEN_POS * propRate);
      if (
        Math.abs(pv.position.x - satPos[i * 3]) > MAX_DIFFERENCE_BETWEEN_POS ||
        Math.abs(pv.position.y - satPos[i * 3 + 1]) > MAX_DIFFERENCE_BETWEEN_POS ||
        Math.abs(pv.position.z - satPos[i * 3 + 2]) > MAX_DIFFERENCE_BETWEEN_POS
      ) {
        throw new Error('Impossible orbit');
      }
    }

    if (isNaN(pv.position.x) || isNaN(pv.position.y) || isNaN(pv.position.z)) {
      return false;
    }

    satPos[i * 3] = pv.position.x;
    satPos[i * 3 + 1] = pv.position.y;
    satPos[i * 3 + 2] = pv.position.z;

    satVel[i * 3] = pv.velocity.x;
    satVel[i * 3 + 1] = pv.velocity.y;
    satVel[i * 3 + 2] = pv.velocity.z;

    if (objCache[i].isUpdated) {
      objCache[i].isUpdated = false;
    }

    /*
     * Make sure that objects with an imprecise orbit or an old elset
     * are not failing to propagate
     */
    if (objCache[i].isimp || m / 1440 > 20) {
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

      if (alt > objCache[i].apogee + 1000 || alt < objCache[i].perigee - 100) {
        throw new Error('Impossible orbit');
      }
    }
  } catch (e) {
    // This is probably a reentry and should be skipped from now on.
    objCache[i].active = false;

    postMessage({
      badObjectId: i,
    });

    satPos[i * 3] = 0;
    satPos[i * 3 + 1] = 0;
    satPos[i * 3 + 2] = 0;

    satVel[i * 3] = 0;
    satVel[i * 3 + 1] = 0;
    satVel[i * 3 + 2] = 0;

    positionEcf = null;
    rae = null;
  }

  if (isSunlightView) {
    const sunPos = Sun.position(EpochUTC.fromDateTime(now));
    const lighting = Sun.lightingRatio(new Vector3D(pv.position.x, pv.position.y, pv.position.z), sunPos);

    satInSun[i] = SunStatus.SUN;

    if (lighting < 0.05) {
      satInSun[i] = SunStatus.UMBRAL;
    } else if (lighting < 1.0) {
      satInSun[i] = SunStatus.PENUMBRAL;
    }
  }

  if (isSensor && !isSunExclusion) {
    satInView[i] = 0; // 0 = FALSE - Default in case no sensor selected
    if (isSensors) {
      for (const sensor of sensors) {
        // Skip satellites in the dark if you are an optical sensor
        if (!(sensor.type === SpaceObjectType.OPTICAL && satInSun[i] === SunStatus.UMBRAL)) {
          if (satInView[i] === 1) {
            // If the satellite is already in view, skip the rest of the sensors
            break;
          }
          try {
            positionEcf = eci2ecf(pv.position, gmst); // pv.position is called positionEci originally
            rae = ecfRad2rae(sensor.llaRad(), positionEcf);
          } catch (e) {
            continue;
          }
          satInView[i] = sensor.isRaeInFov(rae) ? 1 : 0;
        }
      }
      // Skip Calculating Lookangles if No Sensor is Selected
    } else if (isSensor) {
      rae = ecfRad2rae(sensors[0].llaRad(), eci2ecf(pv.position, gmst));
      // If it is an optical sensor and the satellite is in the dark, skip it
      if (!(sensors[0].type === SpaceObjectType.OPTICAL && satInSun[i] === SunStatus.UMBRAL)) {
        satInView[i] = sensors[0].isRaeInFov(rae) ? 1 : 0;
      }
    }
  }

  return true;
};
export const isCanSkipMarkers = () => (!isResetSatOverfly && !isResetFOVBubble && markerMode === MarkerMode.OFF) || isLowPerf;
export const resetInactiveMarkers = (i: number) => {
  for (; i < len; i++) {
    if (!objCache[i].active) {
      len -= fieldOfViewSetLength;
      break;
    }
    resetPosition(satPos, i);
    resetVelocity(satVel, i);
    objCache[i].active = false;
  }
};

export const sendDataToSatSet = () => {
  if (isResponseCount < 5) {
    isResponseCount++;
  }

  const postMessageArray = <PositionCruncherOutgoingMsg>{
    satPos,
  };
  // Add In View Data if Sensor Selected

  if (isSensor) {
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
    // TODO: Explore SharedArrayBuffer Options
    postMessage(postMessageArray);
    // Send Velocity Separate to avoid CPU Overload on Main Thread
    postMessage(<PositionCruncherOutgoingMsg>{
      satVel,
    });
  } catch (e) {
    if (!process) {
      throw e;
    }
  }
};
