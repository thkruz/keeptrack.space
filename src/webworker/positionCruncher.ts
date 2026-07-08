/* eslint-disable max-lines */
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

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { interpolateMissileSample } from '@app/plugins/missile/missile-interpolation';
import {
  DEG2RAD,
  Degrees,
  EcefVec3,
  GreenwichMeanSiderealTime,
  Kilometers,
  KilometersPerSecond,
  LandObject,
  Milliseconds,
  Minutes,
  Radians,
  RaeVec3,
  Satellite,
  Sgp4,
  SpaceObjectType,
  Sun,
  TAU,
  TemeVec3,
  Vector3D,
  ecefRad2rae,
  eci2ecef,
  eci2lla,
  lla2eci,
} from '@ootk/src/main';
import { GROUND_BUFFER_DISTANCE, RADIUS_OF_EARTH, STAR_DISTANCE } from '../engine/utils/constants';
import { PosCruncherCachedObject, PositionCruncherIncomingMsg, PositionCruncherOutgoingMsg } from './constants';
import { MarkerMode, PosCruncherMsgType } from './position-cruncher-messages';
import { handleSgp4WasmBackendMsg, isSgp4WasmBackendMsg } from './shared/sgp4-wasm-backend-handler';
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
  CAMERA_DATA = 'CAMERA_DATA',
}


const EMPTY_FLOAT32_ARRAY = new Float32Array(0);
const EMPTY_INT8_ARRAY = new Int8Array(0);

/** ARRAYS */
let objCache = <PosCruncherCachedObject[]>[]; // Cache of Satellite Data from TLE.json and Static Data from variable.js

let satPos = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Positions
let satVel = EMPTY_FLOAT32_ARRAY; // Array of current Satellite and Static Velocities
let satInView = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in view of Sensor
let satInSun = EMPTY_INT8_ARRAY; // Array of booleans showing if current Satellite is in sunlight
const sensorMarkerArray = [0]; // Array of Markers used to show sensor fence and FOV


let isInterrupted = false; // Boolean used to determine if the worker is interupted

/** TIME VARIABLES */
const PROPAGATION_INTERVAL = 1000 as Milliseconds; // Limits how often the propagation loop runs
let propagationRunning = false; // Prevent Propagation From Running Twice
let divisor = 1; // When running at high speeds, allow faster propagation
let dynamicOffsetEpoch = Date.now();
let staticOffset = 0;
let propRate = 1;
let lastGmst = 0; // GMST used for the last position computation

/** Settings */
let isSensor = false;
/** Do we have more than one sensor? */
let isSensors = false;
let isSunlightView = false;
let isLowPerf = false;
let markerMode = MarkerMode.OFF;

let catalogSeqNum = 0; // Catalog version — echoed back in outgoing messages so main thread can discard stale data

let isResetFOVBubble = false;
let isResetSatOverfly = false;

let fieldOfViewSetLength = 0;
let len: number;

/** TIERED UPDATE SYSTEM */
let vpMatrix_: Float32Array | null = null;
let camPosEci_: Float32Array | null = null;
let isFrustumCullingEnabled_ = true;
let tierCycleCounter_ = 0;
let isOnScreen_ = new Uint8Array(0); // 1 = on-screen (update every cycle), 0 = off-screen or occluded
let lastTierUpdateCycle_ = -1;
let skipNextVisibilityUpdate_ = false; // Set on time change so fill(1) survives one full cycle
let lastPropSimTime_ = 0; // ms — simulation time of the last propagation cycle
const TIER_RECOMPUTE_INTERVAL_ = 5;
const OFF_SCREEN_UPDATE_INTERVAL_ = 10; // Off-screen/occluded satellites update every 10th cycle (~2s)
// Slightly larger than Earth radius to account for atmosphere and avoid popping
const EARTH_OCCLUSION_RADIUS_SQ_ = 6471 * 6471;

/** OBSERVER VARIABLES */
let sensors: DetailedSensor[] = [];

const isThisJest = typeof process !== 'undefined' && process?.release?.name;

/**
 * Reset mutable state that can become stale during a catalog swap.
 * Called from the OBJ_DATA handler before the first propagation of the new catalog.
 */
const resetForCatalogSwap = (newLen: number, fovSetLength: number, seqNum: number) => {
  satPos = new Float32Array(newLen * 3);
  satVel = new Float32Array(newLen * 3);
  satInView = EMPTY_INT8_ARRAY;
  satInSun = EMPTY_INT8_ARRAY;
  catalogSeqNum = seqNum;
  fieldOfViewSetLength = fovSetLength;
  isInterrupted = false;
  isResetFOVBubble = false;
  isResetSatOverfly = false;
  // Reset tier state so all objects propagate on first cycle after swap
  tierCycleCounter_ = 0;
  lastTierUpdateCycle_ = -1;
  lastPropSimTime_ = 0;
  isOnScreen_ = new Uint8Array(0);
};

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

/**
 * Handles the OFFSET message: updates time variables and forces a full propagation on the next cycle.
 */
const handleOffsetMsg_ = (m: PositionCruncherIncomingMsg): void => {
  staticOffset = m.data.staticOffset ?? 0;
  dynamicOffsetEpoch = m.data.dynamicOffsetEpoch ?? Date.now();
  propRate = m.data.propRate ?? 1;
  isInterrupted = true;

  // Scale propagation frequency linearly with propRate
  divisor = Math.max(1, Math.abs(propRate));

  // Force all satellites to propagate on next cycle (time jump invalidates extrapolated positions)
  if (isOnScreen_.length > 0) {
    isOnScreen_.fill(1);
  }
  skipNextVisibilityUpdate_ = true;
  lastPropSimTime_ = 0;
};

/**
 * Builds and pushes a single objCache entry from one incoming satData record.
 * Satellites (with tle1+tle2) get a satrec plus derived apogee/perigee; everything else
 * (sensors, missiles, markers) is stored with its active flag normalized.
 */
const buildCacheEntry_ = (obj: CruncherSat): void => {
  const tle1 = obj?.tle1;
  const tle2 = obj?.tle2;

  // Sensors, Missiles, and Markers don't have TLEs
  if (!tle1 || !tle2) {
    // Sensors Start Active; Markers and Missiles Start Inactive
    obj.active = Boolean(obj.lat);
    objCache.push({ ...obj, ...{ active: obj.active } });

    return;
  }

  // perform and store sat init calcs
  const satrec = Sgp4.createSatrec(tle1, tle2);
  const meanMotion = (satrec.no * 60 * 24) / TAU; // convert rads/minute to rev/day
  const semiMajorAxis = (8681663.653 / meanMotion) ** (2 / 3);
  const apogee = <Kilometers>(semiMajorAxis * (1 + satrec.ecco) - RADIUS_OF_EARTH);
  const perigee = <Kilometers>(semiMajorAxis * (1 - satrec.ecco) - RADIUS_OF_EARTH);

  objCache.push({
    active: obj.active ?? true,
    satrec,
    apogee,
    perigee,
  });
};

/**
 * Handles the OBJ_DATA message: parses the new catalog, rebuilds objCache, and resets swap state.
 */
const handleObjDataMsg_ = (m: PositionCruncherIncomingMsg): void => {
  const satData: CruncherSat[] = JSON.parse(m.data.dat);

  len = satData.length;

  // Clear previous catalog data for catalog swap support
  objCache = [];

  for (let i = 0; i < len; i++) {
    buildCacheEntry_(satData[i]);
  }

  resetForCatalogSwap(len, m.data.fieldOfViewSetLength ?? 0, m.data.seqNum ?? 0);

  if (m.data.isLowPerf) {
    isLowPerf = true;
  }
};

/**
 * Handles the SAT_EDIT message: replaces a single satellite's TLE/satrec and posts derived
 * keplerian/extra data back to the main thread.
 */
const handleSatEditMsg_ = (m: PositionCruncherIncomingMsg): void => {
  if (m.data.id === undefined) {
    return;
  }
  // Discard edits for ids outside the current catalog (e.g. in-flight after a swap to a smaller catalog).
  if (m.data.id >= objCache.length || !objCache[m.data.id]) {
    return;
  }
  // replace old TLEs
  const satrec = Sgp4.createSatrec(m.data.tle1, m.data.tle2);
  const meanMotion = (satrec.no * 60 * 24) / TAU; // convert rads/minute to rev/day
  const semiMajorAxis = ((8681663.653 / meanMotion) ** (2 / 3)) as Kilometers;
  const eccentricity = satrec.ecco;

  const extra: ExtraDataMessage = {
    isLowAlt: satrec.isimp,
    // keplerian elements
    inclination: satrec.inclo as Radians,
    eccentricity,
    raan: satrec.nodeo as Radians,
    argOfPerigee: satrec.argpo as Radians,
    meanMotion,
    // fun other data
    semiMajorAxis,
    semiMinorAxis: (semiMajorAxis * Math.sqrt(1 - eccentricity ** 2)) as Kilometers,
    apogee: (semiMajorAxis * (1 + eccentricity) - RADIUS_OF_EARTH) as Kilometers,
    perigee: (semiMajorAxis * (1 - eccentricity) - RADIUS_OF_EARTH) as Kilometers,
    period: (1440.0 / meanMotion) as Minutes,
    tle1: m.data.tle1,
    tle2: m.data.tle2,
  };

  // Update the object cache
  objCache[m.data.id].satrec = satrec;
  objCache[m.data.id].active = true;
  objCache[m.data.id].apogee = extra.apogee;
  objCache[m.data.id].perigee = extra.perigee;
  objCache[m.data.id].isUpdated = true;

  if (isThisJest) {
    return;
  }
  // istanbul ignore next
  postMessage({
    extraUpdate: true,
    extraData: JSON.stringify([extra]),
    satId: m.data.id,
  });
  isInterrupted = true;
};

export const onmessageProcessing = (m: PositionCruncherIncomingMsg) => {
  if (isSgp4WasmBackendMsg(m.data)) {
    handleSgp4WasmBackendMsg(m.data);

    return;
  }

  switch (m.data.typ) {
    case PosCruncherMsgType.OFFSET:
      handleOffsetMsg_(m);

      return;
    case PosCruncherMsgType.OBJ_DATA:
      handleObjDataMsg_(m);
      break;
    case PosCruncherMsgType.SAT_EDIT:
      handleSatEditMsg_(m);
      break;
    case PosCruncherMsgType.NEW_MISSILE:
      if (m.data.id !== undefined && m.data.id < objCache.length) {
        objCache[m.data.id] = <PosCruncherCachedObject>(<unknown>m.data);
      }
      break;
    case PosCruncherMsgType.SATELLITE_SELECTED:
      {
        const ids = m.data.satelliteSelected ?? [-1];

        if (ids[0] === -1) {
          isResetSatOverfly = true;
        }
      }
      break;
    case PosCruncherMsgType.SENSOR:
      sensors = (m.data.sensor ?? []).filter((s) => s).map((s) => new DetailedSensor(s));
      isSensor = sensors.length > 0;
      isSensors = sensors.length > 1;
      break;
    case PosCruncherMsgType.UPDATE_MARKERS:
      if (m.data.fieldOfViewSetLength) {
        fieldOfViewSetLength = m.data.fieldOfViewSetLength;
      }

      if (typeof m.data.markerMode !== 'undefined') {
        markerMode = m.data.markerMode;
      }

      break;
    case PosCruncherMsgType.SUNLIGHT_VIEW:
      // Assign both states — the old truthy guard latched sunlight view on forever
      if (typeof m.data.isSunlightView === 'boolean') {
        isSunlightView = m.data.isSunlightView;
      }
      break;
    case PosCruncherMsgType.CAMERA_DATA:
      if (m.data.vpMatrix) {
        vpMatrix_ = m.data.vpMatrix;
      }
      if (m.data.camPosEci) {
        camPosEci_ = m.data.camPosEci;
      }
      if (typeof m.data.isFrustumCullingEnabled === 'boolean') {
        isFrustumCullingEnabled_ = m.data.isFrustumCullingEnabled;
      }

return;
    default:
      // NOTE: For debugging turn this on

      // console.warn(`Unknown message typ: ${m.data.typ}`);

      break;
  }

  // Don't start before getting satData!
  if (!propagationRunning && m.data.typ === PosCruncherMsgType.OBJ_DATA) {
    len = -1; // propagteCruncher needs to start at -1 not 0
    propagationLoop();
    propagationRunning = true;
  }
};

/**
 * Tests if a point is inside the view frustum by multiplying by the VP matrix
 * and checking if NDC coordinates are in range.
 * Uses a generous margin to account for satellite movement between tier recomputations.
 *
 * VP matrix is column-major (gl-matrix convention):
 *   vp[0..3] = column 0, vp[4..7] = column 1, vp[8..11] = column 2, vp[12..15] = column 3
 * For row-dot-column: clip.x = vp[0]*x + vp[4]*y + vp[8]*z + vp[12]
 */
const isInFrustum_ = (x: number, y: number, z: number, vp: Float32Array): boolean => {
  const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];

  if (w <= 0) {
    return false; // Behind camera
  }

  const invW = 1.0 / w;
  const ndcX = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) * invW;
  const ndcY = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) * invW;

  // 1.3 margin accounts for satellites drifting into view between recomputation cycles
  return ndcX >= -1.3 && ndcX <= 1.3 && ndcY >= -1.3 && ndcY <= 1.3;
};

/**
 * Checks if a satellite is occluded by Earth from the camera's perspective.
 * Uses closest-point-on-segment test: project Earth center (origin) onto
 * the camera→satellite segment and check distance to Earth surface.
 */
const isOccludedByEarth_ = (
  satX: number, satY: number, satZ: number,
  camX: number, camY: number, camZ: number,
): boolean => {
  const dx = satX - camX;
  const dy = satY - camY;
  const dz = satZ - camZ;

  const lenSq = dx * dx + dy * dy + dz * dz;

  if (lenSq === 0) {
    return false;
  }

  const dot = -(camX * dx + camY * dy + camZ * dz);
  const t = dot / lenSq;

  // Earth must be between camera and satellite (0 < t < 1)
  if (t <= 0 || t >= 1) {
    return false;
  }

  const closestX = camX + t * dx;
  const closestY = camY + t * dy;
  const closestZ = camZ + t * dz;

  const distSq = closestX * closestX + closestY * closestY + closestZ * closestZ;

  return distSq < EARTH_OCCLUSION_RADIUS_SQ_;
};

/**
 * Marks each satellite as on-screen (1) or off-screen/occluded (0).
 *
 * On-screen satellites are propagated every cycle.
 * Off-screen and occluded satellites are propagated every Nth cycle
 * (staggered by index) and linearly extrapolated in between.
 *
 * Only TLE satellites are throttled; stars, land objects, and missiles are always on-screen.
 */
const computeScreenVisibility_ = (): void => {
  if (isOnScreen_.length !== objCache.length) {
    isOnScreen_ = new Uint8Array(objCache.length);
    isOnScreen_.fill(1);
  }

  // If culling is disabled (flat map, polar view) or no camera data yet, mark everything on-screen
  if (!isFrustumCullingEnabled_ || !vpMatrix_ || !camPosEci_) {
    isOnScreen_.fill(1);

    return;
  }

  const cx = camPosEci_[0];
  const cy = camPosEci_[1];
  const cz = camPosEci_[2];

  for (let i = 0; i <= len; i++) {
    // Non-TLE objects are cheap — always on-screen
    if (!objCache[i]?.satrec) {
      isOnScreen_[i] = 1;
      continue;
    }

    const px = satPos[i * 3];
    const py = satPos[i * 3 + 1];
    const pz = satPos[i * 3 + 2];

    // Objects at origin haven't been propagated yet — need initial propagation
    if (px === 0 && py === 0 && pz === 0) {
      isOnScreen_[i] = 1;
      continue;
    }

    // Occluded by Earth or outside frustum → off-screen
    // Skip occlusion at high prop rates — satellites move too fast for stale occlusion to be accurate
    if (propRate <= 60 && isOccludedByEarth_(px, py, pz, cx, cy, cz)) {
      isOnScreen_[i] = 0;
    } else {
      isOnScreen_[i] = isInFrustum_(px, py, pz, vpMatrix_) ? 1 : 0;
    }
  }
};

export const propagationLoop = (mockSatCache?: PosCruncherCachedObject[]) => {
  // Use mock satCache if we have one
  objCache = mockSatCache || objCache;

  const { now, j, gmst, gmstNext, isSunExclusion } = setupTimeVariables(dynamicOffsetEpoch, staticOffset, propRate, isSunlightView, sensors);

  // Compute simulation-time delta for velocity extrapolation of tier-skipped satellites
  const nowMs = now.getTime();
  const cycleDtSec = lastPropSimTime_ > 0 ? (nowMs - lastPropSimTime_) / 1000 : 0;

  lastPropSimTime_ = nowMs;
  lastGmst = gmst;

  len = isCanSkipMarkers() ? objCache.length - 1 - fieldOfViewSetLength : objCache.length - 1;

  // Setup optional arrays
  if (satInView.length !== objCache.length) {
    satInView = isSensor && (!satInView || satInView === EMPTY_INT8_ARRAY) ? new Int8Array(objCache.length) : EMPTY_INT8_ARRAY;
  }

  if (satInSun.length !== objCache.length) {
    satInSun = isSunlightView && (!satInSun || satInSun === EMPTY_INT8_ARRAY) ? new Int8Array(objCache.length) : EMPTY_INT8_ARRAY;
  }

  // Recompute screen visibility periodically (not every cycle to save CPU)
  // Skip one cycle after a time change so the fill(1) survives and all sats get propagated
  if (skipNextVisibilityUpdate_) {
    skipNextVisibilityUpdate_ = false;
    lastTierUpdateCycle_ = tierCycleCounter_;
  } else if (tierCycleCounter_ - lastTierUpdateCycle_ >= TIER_RECOMPUTE_INTERVAL_ || lastTierUpdateCycle_ < 0) {
    computeScreenVisibility_();
    lastTierUpdateCycle_ = tierCycleCounter_;
  }

  updateSatCache(now, j, gmst, gmstNext, isSunExclusion, cycleDtSec);
  if (isResetFOVBubble) {
    isResetFOVBubble = false;
    len -= fieldOfViewSetLength;
  }

  checkForNaN(satPos, satVel);

  if (!isInterrupted) {
    sendDataToSatSet();
  }
  isInterrupted = false;

  tierCycleCounter_++;

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

export const updateSatCache = (now: Date, j: number, gmst: GreenwichMeanSiderealTime, gmstNext: number, isSunExclusion: boolean, cycleDtSec = 0) => {
  // Recomputed lazily once per cycle; the previous per-satellite Sun.eci() calls
  // cost tens of milliseconds per cycle in sunlight view
  cycleSunEci_ = null;

  let i = -1;
  // Using a while loop since some methods may update multiple cache objects

  while (i < len) {
    if (isInterrupted) {
      break;
    }
    i++; // At the beginning so i starts at 0
    let isContinue = false;

    // Don't use satnum because of VIMPEL objects
    if (objCache[i].satrec) {
      // Off-screen satellites: skip SGP4 most cycles, extrapolate with velocity instead
      // Stagger by satellite index so SGP4 corrections are spread across cycles
      if (isOnScreen_.length > i && !isOnScreen_[i] && ((tierCycleCounter_ + i) % OFF_SCREEN_UPDATE_INTERVAL_) !== 0) {
        if (cycleDtSec > 0) {
          const i3 = i * 3;

          satPos[i3] += satVel[i3] * cycleDtSec;
          satPos[i3 + 1] += satVel[i3 + 1] * cycleDtSec;
          satPos[i3 + 2] += satVel[i3 + 2] * cycleDtSec;
        }
        continue;
      }
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

export const updateStar = (i: number, _now: Date, _gmst: GreenwichMeanSiderealTime): void => {
  const ra = objCache[i].ra!;
  const dec = objCache[i].dec!;

  // J2000 RA/Dec → cartesian (already in the inertial frame, no GMST rotation needed)
  const cosDec = Math.cos(dec);

  satPos[i * 3] = STAR_DISTANCE * cosDec * Math.cos(ra);
  satPos[i * 3 + 1] = STAR_DISTANCE * cosDec * Math.sin(ra);
  satPos[i * 3 + 2] = STAR_DISTANCE * Math.sin(dec);
};
export const updateMissile = (i: number, now: Date, gmstNext: number, gmst: GreenwichMeanSiderealTime): boolean => {
  const missile = objCache[i];

  if (!missile.active) {
    satPos[i * 3] = 0;
    satPos[i * 3 + 1] = 0;
    satPos[i * 3 + 2] = 0;

    return false; // Skip inactive missiles
  }

  // Guard: Ensure missile has required properties
  if (!missile.altList || !missile.latList || !missile.lonList || missile.startTime === undefined) {
    return false;
  }

  const tLen = missile.altList.length;

  // Map sim time to a trajectory index (each point is 1 second). Clamp to the trajectory: before
  // launch hold at the pad (index 0); after the final point hold at the impact point (tLen-1).
  // The previous "first t where startTime+t*1000 >= now" loop left the index at 0 when sim time
  // ran past the trajectory end, snapping impacted missiles back to their launch site.
  const curMissivarTime = Math.max(0, Math.min(Math.ceil((now.getTime() - missile.startTime) / 1000), tLen - 1));

  missile.lastTime = missile.lastTime !== undefined && missile.lastTime >= 0 ? missile.lastTime : 0;

  // Look one point ahead for the velocity estimate, but never past the last point (avoids reading
  // undefined lat/lon/alt — which produced NaN velocity — once the missile reaches impact).
  const timeIndex = Math.min(missile.lastTime + 1, tLen - 1);
  const lat = missile.latList[timeIndex];
  const lon = missile.lonList[timeIndex];
  const alt = missile.altList[timeIndex];

  const cosLat = Math.cos(lat * DEG2RAD);
  const sinLat = Math.sin(lat * DEG2RAD);
  const cosLon = Math.cos(lon * DEG2RAD + gmstNext);
  const sinLon = Math.sin(lon * DEG2RAD + gmstNext);

  if (missile.lastTime === 0) {
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

  // Interpolate between the two bounding 1-second samples by the fractional elapsed time so the
  // value glides instead of stair-stepping once per second, and convert with the ellipsoidal
  // lla2eci (matching the rendered dot, the trajectory line, and MissileObject.eci()) rather than
  // a spherical approximation. (The rendered dot is recomputed on the main thread every frame; this
  // worker value feeds the 1 Hz sensor in-view check below.)
  const sample = interpolateMissileSample(missile.latList, missile.lonList, missile.altList, missile.startTime, now.getTime());
  const missileEci = lla2eci(
    { lat: (sample.lat * DEG2RAD) as Radians, lon: (sample.lon * DEG2RAD) as Radians, alt: sample.alt as Kilometers },
    gmst,
  );

  satPos[i * 3] = missileEci.x;
  satPos[i * 3 + 1] = missileEci.y;
  satPos[i * 3 + 2] = missileEci.z;

  missile.lastTime = curMissivarTime;

  const x = <Kilometers>satPos[i * 3];
  const y = <Kilometers>satPos[i * 3 + 1];
  const z = <Kilometers>satPos[i * 3 + 2];

  const positionEcf = eci2ecef({ x, y, z }, gmst);

  if (eci2lla({ x, y, z }, gmst).alt <= 150 && !missile.latList) {
    missile.active = false;
  }

  if (sensors.length > 0) {
    for (const sensor of sensors) {
      if (satInView[i] === 1) {
        break;
      }
      const rae = ecefRad2rae(sensor.llaRad(), positionEcf);

      satInView[i] = sensor.isRaeInFov(rae.az, rae.el, rae.rng) ? 1 : 0;
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

/**
 * Validates an imprecise/old-elset satellite's altitude against its apogee/perigee band;
 * throws 'Impossible orbit' when out of band.
 *
 * Uses the geocentric radius the caller already computed instead of an iterative geodetic
 * conversion: the spherical approximation is within ~30 km of geodetic height, absorbed by
 * widening the band margins. The old 20-iteration trig loop cost ~28 ms per cycle for a
 * full catalog of stale elsets (every satellite takes this path when elsets are >20 days old).
 */
const validateImpreciseOrbitAltitude_ = (i: number, rMag: number): void => {
  const alt = rMag - RADIUS_OF_EARTH;

  const apogee = objCache[i].apogee ?? Infinity;
  const perigee = objCache[i].perigee ?? 0;

  if (alt > apogee + 1030 || alt < perigee - 130) {
    throw new Error('Impossible orbit');
  }
};

/** Writes a satellite's validated TEME position/velocity into the shared arrays. Returns false on NaN propagation; throws 'Impossible orbit' for unbound/sub-surface/out-of-band orbits. */
const writeValidatedSatState_ = (i: number, m: number, pv: { position: TemeVec3; velocity: TemeVec3<KilometersPerSecond> }): boolean => {
  if (isNaN(pv.position.x) || isNaN(pv.position.y) || isNaN(pv.position.z)) {
    return false;
  }

  // Specific orbital energy: E = v²/2 - μ/r. Positive = unbound (impossible for cataloged satellite).
  // Also reject positions inside Earth (rMag < 6350 km, below polar radius).
  const rMag = Math.sqrt(pv.position.x * pv.position.x + pv.position.y * pv.position.y + pv.position.z * pv.position.z);
  const vMagSq = pv.velocity.x * pv.velocity.x + pv.velocity.y * pv.velocity.y + pv.velocity.z * pv.velocity.z;

  if (0.5 * vMagSq - 398600.4418 / rMag > 0 || rMag < 6350) {
    throw new Error('Impossible orbit');
  }

  satPos[i * 3] = pv.position.x;
  satPos[i * 3 + 1] = pv.position.y;
  satPos[i * 3 + 2] = pv.position.z;

  satVel[i * 3] = pv.velocity.x;
  satVel[i * 3 + 1] = pv.velocity.y;
  satVel[i * 3 + 2] = pv.velocity.z;

  /*
   * Make sure that objects with an imprecise orbit or an old elset
   * are not failing to propagate
   */
  if (objCache[i].satrec.isimp || m / 1440 > 20) {
    validateImpreciseOrbitAltitude_(i, rMag);
  }

  return true;
};

/**
 * Marks a satellite as a reentry: deactivates it, zeroes its position/velocity, and notifies
 * the main thread so it stops being rendered.
 */
const markSatelliteAsBad_ = (i: number): void => {
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
};

/** Sun ECI position computed once per propagation cycle (identical for every satellite). */
let cycleSunEci_: ReturnType<typeof Sun.eci> | null = null;

/**
 * Updates a satellite's sunlight status (umbral/penumbral/sun) into the satInSun array.
 */
const updateSatelliteSunStatus_ = (i: number, now: Date, position: TemeVec3): void => {
  cycleSunEci_ ??= Sun.eci(now);
  const lighting = Sun.lightingRatio(new Vector3D(position.x, position.y, position.z), cycleSunEci_);

  satInSun[i] = SunStatus.SUN;

  if (lighting < 0.05) {
    satInSun[i] = SunStatus.UMBRAL;
  } else if (lighting < 1.0) {
    satInSun[i] = SunStatus.PENUMBRAL;
  }
};

/**
 * Updates the satInView flag for a satellite against every active sensor (multi-sensor case).
 */
const updateSatelliteInViewMulti_ = (i: number, position: TemeVec3, gmst: GreenwichMeanSiderealTime): void => {
  for (const sensor of sensors) {
    // Skip satellites in the dark if you are an optical sensor
    if (sensor.type === SpaceObjectType.OPTICAL && satInSun[i] === SunStatus.UMBRAL) {
      continue;
    }
    if (satInView[i] === 1) {
      // If the satellite is already in view, skip the rest of the sensors
      break;
    }

    let rae: RaeVec3<Kilometers, Degrees>;

    try {
      const positionEcf: EcefVec3 = eci2ecef(position, gmst); // pv.position is called positionEci originally

      rae = ecefRad2rae(sensor.llaRad(), positionEcf);
    } catch {
      continue;
    }
    satInView[i] = sensor.isRaeInFov(rae.az, rae.el, rae.rng) ? 1 : 0;
  }
};

/**
 * Updates the satInView flag for a satellite against the single selected sensor.
 */
const updateSatelliteInViewSingle_ = (i: number, position: TemeVec3, gmst: GreenwichMeanSiderealTime): void => {
  const rae = ecefRad2rae(sensors[0].llaRad(), eci2ecef(position, gmst));

  // If it is an optical sensor and the satellite is in the dark, skip it
  if (!(sensors[0].type === SpaceObjectType.OPTICAL && satInSun[i] === SunStatus.UMBRAL)) {
    satInView[i] = sensors[0].isRaeInFov(rae.az, rae.el, rae.rng) ? 1 : 0;
  }
};

export const updateSatellite = (now: Date, i: number, gmst: GreenwichMeanSiderealTime, j: number, isSunExclusion: boolean): boolean => {
  const satelliteData = objCache[i] as unknown as Satellite; // This is checked in updateSatCache

  // Skip reentries
  if (!satelliteData.active) {
    return false;
  }
  const m = (j - satelliteData.satrec.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
  const pv = Sgp4.propagate(satelliteData.satrec, m) as { position: TemeVec3; velocity: TemeVec3<KilometersPerSecond> };

  try {
    if (!writeValidatedSatState_(i, m, pv)) {
      return false;
    }
  } catch {
    markSatelliteAsBad_(i);

    return false;
  }

  if (isSunlightView) {
    updateSatelliteSunStatus_(i, now, pv.position);
  }

  if (isSensor && !isSunExclusion) {
    satInView[i] = 0; // 0 = FALSE - Default in case no sensor selected
    if (isSensors) {
      updateSatelliteInViewMulti_(i, pv.position, gmst);
      // Skip Calculating Lookangles if No Sensor is Selected
    } else if (isSensor) {
      updateSatelliteInViewSingle_(i, pv.position, gmst);
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
  const postMessageArray = <PositionCruncherOutgoingMsg>{
    satPos,
    gmst: lastGmst,
    seqNum: catalogSeqNum,
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
