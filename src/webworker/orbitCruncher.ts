import { DEG2RAD, eci2ecef, GreenwichMeanSiderealTime, Kilometers, lla2eci, Radians, Sgp4, TemeVec3 } from '@ootk/src/main';
import { rebaseToAnchor } from '../engine/math/orbit-anchor-math';
import { jday } from '../engine/utils/transforms';
import {
  OrbitCruncherCachedObject, OrbitCruncherInMsgChangeOrbitType, OrbitCruncherInMsgInit, OrbitCruncherInMsgMissileUpdate,
  OrbitCruncherInMsgs, OrbitCruncherInMsgSatelliteUpdate, OrbitCruncherInMsgSettingsUpdate,
  OrbitCruncherMissileObject,
  OrbitCruncherMsgType, OrbitCruncherOtherObject, OrbitCruncherSatelliteObject, OrbitDrawTypes,
} from './orbit-cruncher-messages';
import { handleSgp4WasmBackendMsg, isSgp4WasmBackendMsg } from './shared/sgp4-wasm-backend-handler';

/** Earth's sidereal rotation rate (rad/s) — the rate GMST advances. */
const EARTH_ROTATION_RAD_PER_SEC = 7.2921159e-5;

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

  if (isSgp4WasmBackendMsg(msg)) {
    handleSgp4WasmBackendMsg(msg);

    return;
  }

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
  // Float64 scratch: quantized to float32 only AFTER the anchor rebase below.
  const points = new Float64Array((numberOfSegments + 1) * 4);

  // Defensive bounds check: a catalog swap can shrink objCache, but in-flight
  // update messages for old ids may still arrive. Reply with the zero buffer
  // so the consumer (orbit-cruncher-thread-manager) sees a normal response
  // and any waiting state (inProgress_, orbitCache) gets cleared.
  if (id >= objCache.length || !objCache[id]) {
    const pointsOut = new Float32Array((numberOfSegments + 1) * 4);

    postMessage({
      typ: OrbitCruncherMsgType.RESPONSE_DATA,
      pointsOut,
      anchor: [0, 0, 0],
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
      // Nothing to draw until the missile trajectory is populated
      const pointsOut = new Float32Array((numberOfSegments + 1) * 4);

      postMessage({
        typ: OrbitCruncherMsgType.RESPONSE_DATA,
        pointsOut,
        anchor: [0, 0, 0],
        satId: id,
        seqNum: currentSeqNum,
      }, { transfer: [pointsOut.buffer as ArrayBuffer] });

      return;
    }

    // Each sample is a ground-referenced point captured at launch + x seconds, so it
    // must be rotated to ECI by the GMST at *its* time. When the launch epoch is known
    // we derive a per-sample GMST from it (essential for multi-hour trajectories such
    // as a GEO intercept, which spans ~78° of Earth rotation); otherwise we fall back
    // to a single GMST at the current time (accurate enough for short ballistic arcs).
    const startMs = missile.startTime;
    const usePerSampleGmst = typeof startMs === 'number';
    const gmstAnchorDate = typeof startMs === 'number' ? new Date(startMs) : nowDate;
    const gmstAnchorJ =
      jday(
        gmstAnchorDate.getUTCFullYear(), gmstAnchorDate.getUTCMonth() + 1, gmstAnchorDate.getUTCDate(),
        gmstAnchorDate.getUTCHours(), gmstAnchorDate.getUTCMinutes(), gmstAnchorDate.getUTCSeconds(),
      ) +
      gmstAnchorDate.getUTCMilliseconds() * 1.15741e-8;
    const gmstAnchor = Sgp4.gstime(gmstAnchorJ);

    while (i < len) {
      drawMissileSegment_(missile, i, points, len, gmstAnchor, usePerSampleGmst);
      i++;
    }
  } else if ((objCache[id] as OrbitCruncherOtherObject).ignore || !(objCache[id] as OrbitCruncherSatelliteObject).satrec) {
    // Invalid objects or OemSatellite with no TLEs
    const pointsOut = new Float32Array((numberOfSegments + 1) * 4);

    postMessage({
      typ: OrbitCruncherMsgType.RESPONSE_DATA,
      pointsOut,
      anchor: [0, 0, 0],
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

    /*
     * Quantize the sampling start to the timeslice grid so constant-redraw
     * resamples reuse IDENTICAL sample times until sim time crosses the next
     * slice boundary. Sampling from the raw `now` slid every vertex along the
     * track each frame, and the coarse polyline's chords swayed laterally
     * within the curve's sagitta - a visible shimmer on zoomed-in ECF lines
     * (ECI hides it because the slide is along-track near the satellite). The
     * per-frame head-vertex patch (OrbitManager.writePathToGpu_) keeps the
     * line glued to the dot between boundary crossings.
     */
    const quantizedNow = Math.floor(now / timeslice) * timeslice;

    // For polar view, center the orbit on the current position (±half period)
    const orbitStart = isPolarViewEcf ? quantizedNow - period / 2 : quantizedNow;

    if (orbitType === OrbitDrawTypes.ORBIT) {
      while (i < len) {
        drawTleOrbitSegment_(orbitStart, i, timeslice, id, isEcfOutput, points, len, isPolarViewEcf, satrec.jdsatepoch);
        i++;
      }
    } else if (orbitType === OrbitDrawTypes.TRAIL) {
      while (i < len) {
        drawTleOrbitSegmentTrail_(orbitStart, i, timeslice, id, isEcfOutput, points, len, isPolarViewEcf, satrec.jdsatepoch);
        i++;
      }
    }
  }

  const { pointsOut, anchor } = rebaseToAnchor(points);

  postMessage({
    typ: OrbitCruncherMsgType.RESPONSE_DATA,
    pointsOut,
    anchor,
    satId: id,
    seqNum: currentSeqNum,
  }, { transfer: [pointsOut.buffer as ArrayBuffer] });
};

const drawMissileSegment_ = (
  missile: OrbitCruncherMissileObject, i: number, pointsOut: Float64Array, len: number,
  gmstAnchor: number, usePerSampleGmst: boolean,
) => {
  // Clamp so the final segment (i === numberOfSegments) does not read one past the
  // end of the lists (which produced a NaN vertex).
  const x = Math.min(missile.altList.length - 1, Math.round(missile.altList.length * (i / numberOfSegments)));
  // Sample x is captured at launch + x seconds (1 Hz cadence). With a known launch
  // epoch, rotate it to ECI by the GMST at that time (anchor + Earth rotation over x
  // seconds); a single GMST for the whole arc spins a multi-hour trajectory off its
  // dots. Without a launch epoch, gmstAnchor is already the current-time GMST.
  const gmst = usePerSampleGmst ? gmstAnchor + EARTH_ROTATION_RAD_PER_SEC * x : gmstAnchor;

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
  pointsOut: Float64Array, len: number,
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
  pointsOut: Float64Array, len: number,
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
  const missileCacheEntry = objCache[data.id] as OrbitCruncherMissileObject;

  if (data.latList && data.lonList && data.altList) {
    missileCacheEntry.latList = data.latList;
    missileCacheEntry.lonList = data.lonList;
    missileCacheEntry.altList = data.altList;
  }
  // Sent every redraw once known; cache it so per-frame updates (which omit the
  // heavy lists) still have the launch epoch for per-sample GMST.
  if (typeof data.startTime === 'number') {
    missileCacheEntry.startTime = data.startTime;
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
