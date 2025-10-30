import { DEG2RAD, eci2ecf, EciVec3, Sgp4, TAU } from '@ootk/src/main';
import { RADIUS_OF_EARTH } from '../engine/utils/constants';
import { jday } from '../engine/utils/transforms';
import {
  OrbitCruncherCachedObject, OrbitCruncherInMsgChangeOrbitType, OrbitCruncherInMsgInit, OrbitCruncherInMsgMissileUpdate,
  OrbitCruncherInMsgs, OrbitCruncherInMsgSatelliteUpdate, OrbitCruncherInMsgSettingsUpdate,
  OrbitCruncherMissileObject,
  OrbitCruncherMsgType, OrbitCruncherOtherObject, OrbitCruncherSatelliteObject, OrbitDrawTypes,
} from './orbit-cruncher-interfaces';
import { propTime } from './positionCruncher/calculations';

let dynamicOffsetEpoch: number;
let staticOffset = 0;
let propRate = 1.0;


/** CONSTANTS */

const objCache = [] as OrbitCruncherCachedObject[];
let numberOfSegments: number;
let orbitType = OrbitDrawTypes.ORBIT;
let orbitFadeFactor = 1.0;
let numberOfOrbitsToDraw = 1;

const trapIfJest_ = (cb: () => void) => {
  try {
    cb();
  } catch (e) {
    // If Jest isn't running then throw the error
    if (!process) {
      throw e;
    }
  }
};

export const onMessage = (m: {
  data: OrbitCruncherInMsgs;
}) => {
  switch (m.data.type) {
    case OrbitCruncherMsgType.INIT:
      handleMsgInit_(m.data);

      return;
    case OrbitCruncherMsgType.SATELLITE_UPDATE:
      handleMsgSatelliteUpdate_(m.data);
      break;
    case OrbitCruncherMsgType.MISSILE_UPDATE:
      handleMsgMissileUpdate_(m.data);
      break;
    case OrbitCruncherMsgType.SETTINGS_UPDATE:
      handleMsgSettingsUpdate_(m.data);
      break;
    case OrbitCruncherMsgType.CHANGE_ORBIT_TYPE:
      handleMsgChangeOrbitType(m.data);

      return;
    default:
      return;
  }

  if (m.data.type === OrbitCruncherMsgType.SATELLITE_UPDATE || m.data.type === OrbitCruncherMsgType.MISSILE_UPDATE) {
    updateOrbitData_(m.data);
  }
};

const updateOrbitData_ = (data: OrbitCruncherInMsgSatelliteUpdate | OrbitCruncherInMsgMissileUpdate) => {
  /*
  * TODO: figure out how to calculate the orbit points on constant
  * position slices, not timeslices (ugly perigees on HEOs)
  */

  dynamicOffsetEpoch = data.dynamicOffsetEpoch;
  staticOffset = data.staticOffset;
  propRate = data.propRate;

  const id = data.id;
  let isEcfOutput = data.isEcfOutput || false;
  const pointsOut = new Float32Array((numberOfSegments + 1) * 4);

  const len = numberOfSegments + 1;
  let i = 0;
  // Calculate Missile Orbits

  if ((objCache[id] as OrbitCruncherMissileObject).missile) {
    while (i < len) {
      const missile = objCache[id] as OrbitCruncherMissileObject;

      if (missile.latList?.length === 0) {
        pointsOut[i * 4] = 0;
        pointsOut[i * 4 + 1] = 0;
        pointsOut[i * 4 + 2] = 0;
        pointsOut[i * 4 + 3] = 0;
        i++;
      } else {
        drawMissileSegment_(missile, i, pointsOut, len);
        i++;
      }
    }
  } else if ((objCache[id] as OrbitCruncherOtherObject).ignore || !(objCache[id] as OrbitCruncherSatelliteObject).satrec) {
    // Invalid objects or OemSatellite with no TLEs
    trapIfJest_(() => {
      postMessage({
        type: OrbitCruncherMsgType.RESPONSE_DATA,
        pointsOut,
        satId: id,
      });
    });

    return;
  } else {
    const nowDate = propTime(dynamicOffsetEpoch, staticOffset, propRate);
    const nowJ =
      jday(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds()) +
      nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    const satelliteObject = objCache[id] as OrbitCruncherSatelliteObject;
    const satrec = satelliteObject.satrec;

    const now = (nowJ - satrec.jdsatepoch) * 1440.0; // in minutes

    // Calculate Satellite Orbits
    const period = (2 * Math.PI) / satrec.no; // convert rads/min to min
    let timeslice = period / numberOfSegments;

    // If a ECF output and  Geostationary orbit, then we can draw multiple orbits
    if (isEcfOutput && period > 1420 && period < 1460 && satrec.ecco < 0.05) {
      timeslice *= numberOfOrbitsToDraw;
    } else {
      isEcfOutput = false;
    }

    if (orbitType === OrbitDrawTypes.ORBIT) {
      while (i < len) {
        drawTleOrbitSegment_(now, i, timeslice, id, isEcfOutput, period, pointsOut, len);
        i++;
      }
    } else if (orbitType === OrbitDrawTypes.TRAIL) {
      while (i < len) {
        drawTleOrbitSegmentTrail_(now, i, timeslice, id, isEcfOutput, period, pointsOut, len);
        i++;
      }
    }
  }

  // TODO: Explore SharedArrayBuffer Options
  trapIfJest_(() => {
    postMessage({
      type: OrbitCruncherMsgType.RESPONSE_DATA,
      pointsOut,
      satId: id,
    });
  });
};

const drawMissileSegment_ = (missile: OrbitCruncherMissileObject, i: number, pointsOut: Float32Array, len: number) => {
  const x = Math.round(missile.altList.length * (i / numberOfSegments));

  const missileTime = propTime(dynamicOffsetEpoch, staticOffset, propRate);
  const j =
    jday(
      missileTime.getUTCFullYear(),
      missileTime.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      missileTime.getUTCDate(),
      missileTime.getUTCHours(),
      missileTime.getUTCMinutes(),
      missileTime.getUTCSeconds(),
    ) +
    missileTime.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
  const gmst = Sgp4.gstime(j);

  const cosLat = Math.cos(missile.latList[x] * DEG2RAD);
  const sinLat = Math.sin(missile.latList[x] * DEG2RAD);
  const cosLon = Math.cos(missile.lonList[x] * DEG2RAD + gmst);
  const sinLon = Math.sin(missile.lonList[x] * DEG2RAD + gmst);

  pointsOut[i * 4] = (RADIUS_OF_EARTH + missile.altList[x]) * cosLat * cosLon;
  pointsOut[i * 4 + 1] = (RADIUS_OF_EARTH + missile.altList[x]) * cosLat * sinLon;
  pointsOut[i * 4 + 2] = (RADIUS_OF_EARTH + missile.altList[x]) * sinLat;
  pointsOut[i * 4 + 3] = Math.min(orbitFadeFactor * (len / (i + 1)), 1.0);
};

const drawTleOrbitSegmentTrail_ = (now: number, i: number, timeslice: number, id: number, isEcfOutput: boolean, period: number, pointsOut: Float32Array, len: number) => {
  const t = now + i * timeslice;
  const sv = Sgp4.propagate((objCache[id] as OrbitCruncherSatelliteObject).satrec, t);

  if (!sv) {
    pointsOut[i * 4] = 0;
    pointsOut[i * 4 + 1] = 0;
    pointsOut[i * 4 + 2] = 0;
    pointsOut[i * 4 + 3] = 0;

    return;
  }

  let pos = sv.position as EciVec3;

  if (isEcfOutput) {
    pos = eci2ecf(pos, (i * timeslice * TAU) / period);
  }
  pointsOut[i * 4] = pos.x;
  pointsOut[i * 4 + 1] = pos.y;
  pointsOut[i * 4 + 2] = pos.z;
  pointsOut[i * 4 + 3] = i < len / 40 ? Math.min(orbitFadeFactor * (len / 40 / (2 * (i + 1))), 1.0) : 0.0;
};

const drawTleOrbitSegment_ = (now: number, i: number, timeslice: number, id: number, isEcfOutput: boolean, period: number, pointsOut: Float32Array, len: number) => {
  const t = now + i * timeslice;
  const sv = Sgp4.propagate((objCache[id] as OrbitCruncherSatelliteObject).satrec, t);

  if (!sv) {
    pointsOut[i * 4] = 0;
    pointsOut[i * 4 + 1] = 0;
    pointsOut[i * 4 + 2] = 0;
    pointsOut[i * 4 + 3] = 0;

    return;
  }

  let pos = sv.position as EciVec3;

  if (isEcfOutput) {
    pos = eci2ecf(pos, (i * timeslice * TAU) / period);
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

  postMessage({
    type: OrbitCruncherMsgType.RESPONSE_READY,
  });
};

const handleMsgSatelliteUpdate_ = (data: OrbitCruncherInMsgSatelliteUpdate) => {
  // If new orbit
  if (data.tle1 && data.tle2) {
    const satelliteCacheEntry = objCache[data.id] as OrbitCruncherSatelliteObject;

    satelliteCacheEntry.satrec = Sgp4.createSatrec(data.tle1, data.tle2);
  }
};

const handleMsgMissileUpdate_ = (data: OrbitCruncherInMsgMissileUpdate) => {
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
onmessage = (m) => {
  trapIfJest_(() => onMessage(m));
};
