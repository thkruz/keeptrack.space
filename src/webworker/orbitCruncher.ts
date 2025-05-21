import { ObjDataJson } from '@app/singletons/orbitManager';
import { DEG2RAD, Degrees, EciVec3, Kilometers, Sgp4, TAU, eci2ecf } from 'ootk';
import { RADIUS_OF_EARTH } from '../lib/constants';
import { jday } from '../lib/transforms';
import { OrbitCruncherCachedObject } from './constants';
import { propTime } from './positionCruncher/calculations';

let dynamicOffsetEpoch: number;
let staticOffset = 0;
let propRate = 1.0;

export enum OrbitCruncherType {
  INIT,
  UPDATE,
  CHANGE_ORBIT_TYPE,
  MISSILE_UPDATE,
  SATELLITE_UPDATE,
  SETTINGS_UPDATE,
}

export enum OrbitDrawTypes {
  ORBIT,
  TRAIL,
}

/** CONSTANTS */

const objCache = [] as OrbitCruncherCachedObject[];
let numberOfSegments: number;
let orbitType = OrbitDrawTypes.ORBIT;
let orbitFadeFactor = 1.0;
let numberOfOrbitsToDraw = 1;

// Handles Incomming Messages to sat-cruncher from main thread
try {
  onmessage = (m) => onmessageProcessing(m);
} catch (e) {
  // If Jest isn't running then throw the error
  if (!process) {
    throw e;
  }
}

export const onmessageProcessing = (m: {
  data: {
    typ: OrbitCruncherType;
    id?: number;
    // Init Only
    objData?: string;
    numSegs: number;
    orbitFadeFactor?: number;
    numberOfOrbitsToDraw?: number;
    // Change Orbit Type Only
    orbitType?: OrbitDrawTypes.ORBIT;
    // Satellite Update Only
    tle1?: string;
    tle2?: string;
    // Missile Update Only
    latList: Degrees[];
    lonList: Degrees[];
    altList: Kilometers[];
    // Both Updates
    dynamicOffsetEpoch?: number;
    staticOffset?: number;
    propRate?: number;
    isEcfOutput?: boolean;
  };
}) => {
  switch (m.data.typ) {
    case OrbitCruncherType.INIT:
      orbitFadeFactor = m.data.orbitFadeFactor ?? 1.0;
      numberOfOrbitsToDraw = m.data.numberOfOrbitsToDraw ?? 1;
      numberOfSegments = m.data.numSegs;
      break;
    case OrbitCruncherType.SATELLITE_UPDATE:
      // If new orbit
      if (m.data.tle1) {
        objCache[m.data.id].satrec = Sgp4.createSatrec(m.data.tle1, m.data.tle2);
      }
      break;
    case OrbitCruncherType.MISSILE_UPDATE:
      // If new orbit
      if (m.data.latList) {
        objCache[m.data.id].latList = m.data.latList;
        objCache[m.data.id].lonList = m.data.lonList;
        objCache[m.data.id].altList = m.data.altList;
      }
      // Don't Add Anything Else
      break;
    case OrbitCruncherType.SETTINGS_UPDATE:
      numberOfOrbitsToDraw = m.data.numberOfOrbitsToDraw ?? numberOfOrbitsToDraw;
      break;
    case OrbitCruncherType.CHANGE_ORBIT_TYPE:
      orbitType = m.data.orbitType;

      return;
    default:
      return;
  }

  if (m.data.typ === OrbitCruncherType.INIT) {
    const objData = JSON.parse(m.data.objData) as ObjDataJson[];
    const sLen = objData.length - 1;
    let i = -1;

    while (i < sLen) {
      i++;
      if (objData[i].missile) {
        objCache[i] = objData[i];
      } else if (objData[i].ignore) {
        objCache[i] = { ignore: true };
      } else if (objData[i].tle1) {
        objCache[i] = {
          satrec: Sgp4.createSatrec(objData[i].tle1, objData[i].tle2),
        };
      } else {
        throw new Error('Invalid Object Data');
      }
    }
  }

  if (m.data.typ === OrbitCruncherType.SATELLITE_UPDATE || m.data.typ === OrbitCruncherType.MISSILE_UPDATE) {
    /*
     * TODO: figure out how to calculate the orbit points on constant
     * position slices, not timeslices (ugly perigees on HEOs)
     */

    dynamicOffsetEpoch = m.data.dynamicOffsetEpoch;
    staticOffset = m.data.staticOffset;
    propRate = m.data.propRate;

    const id = m.data.id;
    let isEcfOutput = m.data.isEcfOutput || false;
    const pointsOut = new Float32Array((numberOfSegments + 1) * 4);

    const len = numberOfSegments + 1;
    let i = 0;
    // Calculate Missile Orbits

    if (objCache[id].missile) {
      while (i < len) {
        const missile = objCache[id];

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
    } else {
      const nowDate = propTime(dynamicOffsetEpoch, staticOffset, propRate);
      const nowJ =
        jday(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds()) +
        nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
      const now = (nowJ - objCache[id].satrec.jdsatepoch) * 1440.0; // in minutes

      // Calculate Satellite Orbits
      const period = (2 * Math.PI) / objCache[id].satrec.no; // convert rads/min to min
      let timeslice = period / numberOfSegments;

      // If a ECF output and  Geostationary orbit, then we can draw multiple orbits
      if (isEcfOutput && objCache[id].satrec.no < 0.01) {
        timeslice *= numberOfOrbitsToDraw;
      } else {
        isEcfOutput = false;
      }

      if (orbitType === OrbitDrawTypes.ORBIT) {
        while (i < len) {
          drawOrbitSegment_(now, i, timeslice, id, isEcfOutput, period, pointsOut, len);
          i++;
        }
      } else if (orbitType === OrbitDrawTypes.TRAIL) {
        while (i < len) {
          drawOrbitSegmentTrail_(now, i, timeslice, id, isEcfOutput, period, pointsOut, len);
          i++;
        }
      }
    }

    postMessageProcessing({ pointsOut, satId: id });
  }
};

interface OrbitCruncherMessageWorker {
  pointsOut: Float32Array;
  satId: number;
}
export const postMessageProcessing = ({ pointsOut, satId }: OrbitCruncherMessageWorker) => {
  try {
    // TODO: Explore SharedArrayBuffer Options
    postMessage({
      pointsOut,
      satId,
    } as OrbitCruncherMessageWorker);
  } catch (e) {
    // If Jest isn't running then throw the error
    if (!process) {
      throw e;
    }
  }
};

const drawMissileSegment_ = (missile: OrbitCruncherCachedObject, i: number, pointsOut: Float32Array, len: number) => {
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

const drawOrbitSegmentTrail_ = (now: number, i: number, timeslice: number, id: number, isEcfOutput: boolean, period: number, pointsOut: Float32Array, len: number) => {
  const t = now + i * timeslice;
  const sv = Sgp4.propagate(objCache[id].satrec, t);

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

const drawOrbitSegment_ = (now: number, i: number, timeslice: number, id: number, isEcfOutput: boolean, period: number, pointsOut: Float32Array, len: number) => {
  const t = now + i * timeslice;
  const sv = Sgp4.propagate(objCache[id].satrec, t);

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
