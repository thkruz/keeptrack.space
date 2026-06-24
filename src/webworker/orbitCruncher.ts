import { DEG2RAD, eci2ecef, GreenwichMeanSiderealTime, Kilometers, lla2eci, Radians, Sgp4, TemeVec3 } from '@ootk/src/main';
import { jday } from '../engine/utils/transforms';
import {
  OrbitCruncherCachedObject, OrbitCruncherInMsgChangeOrbitType, OrbitCruncherInMsgInit, OrbitCruncherInMsgMissileUpdate,
  OrbitCruncherInMsgs, OrbitCruncherInMsgSatelliteUpdate, OrbitCruncherInMsgSettingsUpdate,
  OrbitCruncherMissileObject,
  OrbitCruncherMsgType, OrbitCruncherOtherObject, OrbitCruncherSatelliteObject, OrbitDrawTypes,
} from './orbit-cruncher-messages';

const objCache = [] as OrbitCruncherCachedObject[];
let numberOfSegments: number;
let orbitType = OrbitDrawTypes.ORBIT;
let orbitFadeFactor = 1.0;
let numberOfOrbitsToDraw = 1;
/** Tracks the last catalog-swap seqNum; per-id update messages older than this are discarded as stale. */
let currentSeqNum = 0;

const isStaleUpdate_ = (seqNum?: number): boolean => typeof seqNum === 'number' && seqNum < currentSeqNum;

export const onMessage = (m: {
  data: OrbitCruncherInMsgs;
}) => {
  const msg = m.data;

  switch (msg.typ) {
    case OrbitCruncherMsgType.INIT:
      handleMsgInit_(msg);
      break;
    case OrbitCruncherMsgType.SATELLITE_UPDATE:
      if (isStaleUpdate_(msg.seqNum)) {
        break;
      }
      handleMsgSatelliteUpdate_(msg);
      updateOrbitData_(msg);
      break;
    case OrbitCruncherMsgType.MISSILE_UPDATE:
      if (isStaleUpdate_(msg.seqNum)) {
        break;
      }
      handleMsgMissileUpdate_(msg);
      updateOrbitData_(msg);
      break;
    case OrbitCruncherMsgType.SETTINGS_UPDATE:
      handleMsgSettingsUpdate_(msg);
      break;
    case OrbitCruncherMsgType.CHANGE_ORBIT_TYPE:
      handleMsgChangeOrbitType(msg);
      break;
    default:
      break;
  }
};

const updateOrbitData_ = (data: OrbitCruncherInMsgSatelliteUpdate | OrbitCruncherInMsgMissileUpdate) => {
  /*
  * TODO: figure out how to calculate the orbit points on constant
  * position slices, not timeslices (ugly perigees on HEOs)
  */

  const nowDate = new Date(data.simulationTime);
  const id = data.id;
  const isEcfOutput = data.isEcfOutput || false;
  const isPolarViewEcf = data.isPolarViewEcf || false;
  const pointsOut = new Float32Array((numberOfSegments + 1) * 4);

  // Defensive bounds check: a catalog swap can shrink objCache, but in-flight
  // update messages for old ids may still arrive. Reply with the zero buffer
  // so the consumer (orbit-cruncher-thread-manager) sees a normal response
  // and any waiting state (inProgress_, orbitCache) gets cleared.
  if (id >= objCache.length || !objCache[id]) {
    postMessage({
      typ: OrbitCruncherMsgType.RESPONSE_DATA,
      pointsOut,
      satId: id,
      seqNum: currentSeqNum,
    }, { transfer: [pointsOut.buffer as ArrayBuffer] });

    return;
  }

  const len = numberOfSegments + 1;
  let i = 0;
  // Calculate Missile Orbits

  if ((objCache[id] as OrbitCruncherMissileObject).missile) {
    const missile = objCache[id] as OrbitCruncherMissileObject;
    const hasTrajectory = missile.latList && missile.lonList && missile.altList && missile.altList.length > 0;

    if (!hasTrajectory) {
      // pointsOut is already zero-initialized; nothing to draw until the missile trajectory is populated
      postMessage({
        typ: OrbitCruncherMsgType.RESPONSE_DATA,
        pointsOut,
        satId: id,
        seqNum: currentSeqNum,
      }, { transfer: [pointsOut.buffer as ArrayBuffer] });

      return;
    }

    // Compute GMST once for all missile segments (same time for all points)
    const missileJ =
      jday(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds()) +
      nowDate.getUTCMilliseconds() * 1.15741e-8;
    const missileGmst = Sgp4.gstime(missileJ);

    while (i < len) {
      drawMissileSegment_(missile, i, pointsOut, len, missileGmst);
      i++;
    }
  } else if ((objCache[id] as OrbitCruncherOtherObject).ignore || !(objCache[id] as OrbitCruncherSatelliteObject).satrec) {
    // Invalid objects or OemSatellite with no TLEs
    postMessage({
      typ: OrbitCruncherMsgType.RESPONSE_DATA,
      pointsOut,
      satId: id,
      seqNum: currentSeqNum,
    }, { transfer: [pointsOut.buffer as ArrayBuffer] });

    return;
  } else {
    const nowJ =
      jday(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds()) +
      nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    const satelliteObject = objCache[id] as OrbitCruncherSatelliteObject;
    const satrec = satelliteObject.satrec;

    const now = (nowJ - satrec.jdsatepoch) * 1440.0; // in minutes

    // Calculate Satellite Orbits
    const period = (2 * Math.PI) / satrec.no; // convert rads/min to min
    let timeslice = period / numberOfSegments;

    // If ECF output and geostationary orbit, draw multiple orbits to show the figure-8 pattern
    const isGeo = period > 1420 && period < 1460 && satrec.ecco < 0.05;

    if (isEcfOutput && isGeo) {
      timeslice *= numberOfOrbitsToDraw;
    }

    // For polar view, center the orbit on the current position (±half period)
    const orbitStart = isPolarViewEcf ? now - period / 2 : now;

    if (orbitType === OrbitDrawTypes.ORBIT) {
      while (i < len) {
        drawTleOrbitSegment_(orbitStart, i, timeslice, id, isEcfOutput, pointsOut, len, isPolarViewEcf, satrec.jdsatepoch);
        i++;
      }
    } else if (orbitType === OrbitDrawTypes.TRAIL) {
      while (i < len) {
        drawTleOrbitSegmentTrail_(orbitStart, i, timeslice, id, isEcfOutput, pointsOut, len, isPolarViewEcf, satrec.jdsatepoch);
        i++;
      }
    }
  }

  postMessage({
    typ: OrbitCruncherMsgType.RESPONSE_DATA,
    pointsOut,
    satId: id,
    seqNum: currentSeqNum,
  }, { transfer: [pointsOut.buffer as ArrayBuffer] });
};

const drawMissileSegment_ = (missile: OrbitCruncherMissileObject, i: number, pointsOut: Float32Array, len: number, gmst: number) => {
  const x = Math.round(missile.altList.length * (i / numberOfSegments));

  // Use the ellipsoidal (WGS84) lat/lon/alt -> ECI conversion, the same one
  // MissileObject.eci() and every other object use. A spherical approximation
  // (geocentric, fixed 6371 km radius) drifts ~15-20 km from the true position at
  // high latitude, putting the line off the dot/model near a polar apogee.
  const eci = lla2eci(
    { lat: (missile.latList[x] * DEG2RAD) as Radians, lon: (missile.lonList[x] * DEG2RAD) as Radians, alt: missile.altList[x] as Kilometers },
    gmst as GreenwichMeanSiderealTime,
  );

  pointsOut[i * 4] = eci.x;
  pointsOut[i * 4 + 1] = eci.y;
  pointsOut[i * 4 + 2] = eci.z;
  pointsOut[i * 4 + 3] = Math.min(orbitFadeFactor * (len / (i + 1)), 1.0);
};

const drawTleOrbitSegmentTrail_ = (
  now: number, i: number, timeslice: number, id: number, isEcfOutput: boolean,
  pointsOut: Float32Array, len: number,
  isPolarViewEcf: boolean, jdsatepoch: number,
) => {
  const t = now + i * timeslice;
  const sv = Sgp4.propagate((objCache[id] as OrbitCruncherSatelliteObject).satrec, t);

  if (!sv) {
    pointsOut[i * 4] = 0;
    pointsOut[i * 4 + 1] = 0;
    pointsOut[i * 4 + 2] = 0;
    pointsOut[i * 4 + 3] = 0;

    return;
  }

  let pos = sv.position as TemeVec3;

  if (isPolarViewEcf || isEcfOutput) {
    const gmst = Sgp4.gstime(jdsatepoch + t / 1440.0);

    pos = eci2ecef(pos, gmst);
  }
  pointsOut[i * 4] = pos.x;
  pointsOut[i * 4 + 1] = pos.y;
  pointsOut[i * 4 + 2] = pos.z;
  pointsOut[i * 4 + 3] = i < len / 40 ? Math.min(orbitFadeFactor * (len / 40 / (2 * (i + 1))), 1.0) : 0.0;
};

const drawTleOrbitSegment_ = (
  now: number, i: number, timeslice: number, id: number, isEcfOutput: boolean,
  pointsOut: Float32Array, len: number,
  isPolarViewEcf: boolean, jdsatepoch: number,
) => {
  const t = now + i * timeslice;
  const sv = Sgp4.propagate((objCache[id] as OrbitCruncherSatelliteObject).satrec, t);

  if (!sv) {
    pointsOut[i * 4] = 0;
    pointsOut[i * 4 + 1] = 0;
    pointsOut[i * 4 + 2] = 0;
    pointsOut[i * 4 + 3] = 0;

    return;
  }

  let pos = sv.position as TemeVec3;

  if (isPolarViewEcf || isEcfOutput) {
    const gmst = Sgp4.gstime(jdsatepoch + t / 1440.0);

    pos = eci2ecef(pos, gmst);
  }
  pointsOut[i * 4] = pos.x;
  pointsOut[i * 4 + 1] = pos.y;
  pointsOut[i * 4 + 2] = pos.z;
  pointsOut[i * 4 + 3] = Math.min(orbitFadeFactor * (len / (i + 1)), 1.0);
};

const handleMsgInit_ = (data: OrbitCruncherInMsgInit) => {
  orbitFadeFactor = data.orbitFadeFactor ?? 1.0;
  numberOfOrbitsToDraw = data.numberOfOrbitsToDraw ?? 1;
  numberOfSegments = data.numSegs;
  if (typeof data.seqNum === 'number') {
    currentSeqNum = data.seqNum;
  }

  const objData = JSON.parse(data.objData) as OrbitCruncherCachedObject[];
  const sLen = objData.length - 1;
  let i = -1;

  while (i < sLen) {
    i++;
    if ((objData[i] as OrbitCruncherMissileObject).missile) {
      objCache[i] = objData[i];
    } else if ((objData[i] as OrbitCruncherOtherObject).ignore) {
      objCache[i] = { ignore: true };
    } else if ((objData[i] as OrbitCruncherSatelliteObject).tle1 && (objData[i] as OrbitCruncherSatelliteObject).tle2) {
      objCache[i] = {
        satrec: Sgp4.createSatrec((objData[i] as OrbitCruncherSatelliteObject).tle1, (objData[i] as OrbitCruncherSatelliteObject).tle2),
      } as OrbitCruncherSatelliteObject;
    } else {
      throw new Error('Invalid Object Data');
    }
  }

  // Drop residual entries from the previous (larger) catalog so SATELLITE_UPDATE
  // for an id beyond the new range can't mutate a stale object.
  objCache.length = objData.length;

  postMessage('ready');
};

const handleMsgSatelliteUpdate_ = (data: OrbitCruncherInMsgSatelliteUpdate) => {
  if (data.id >= objCache.length || !objCache[data.id]) {
    return;
  }
  // If new orbit
  if (data.tle1 && data.tle2) {
    const satelliteCacheEntry = objCache[data.id] as OrbitCruncherSatelliteObject;

    satelliteCacheEntry.satrec = Sgp4.createSatrec(data.tle1, data.tle2);
  }
};

const handleMsgMissileUpdate_ = (data: OrbitCruncherInMsgMissileUpdate) => {
  if (data.id >= objCache.length || !objCache[data.id]) {
    return;
  }
  if (data.latList && data.lonList && data.altList) {
    const missileCacheEntry = objCache[data.id] as OrbitCruncherMissileObject;

    missileCacheEntry.latList = data.latList;
    missileCacheEntry.lonList = data.lonList;
    missileCacheEntry.altList = data.altList;
  }
};

const handleMsgSettingsUpdate_ = (data: OrbitCruncherInMsgSettingsUpdate) => {
  numberOfOrbitsToDraw = data.numberOfOrbitsToDraw ?? numberOfOrbitsToDraw;
};

const handleMsgChangeOrbitType = (data: OrbitCruncherInMsgChangeOrbitType) => {
  orbitType = data.orbitType;
};

// Set up the web worker
onmessage = onMessage;
