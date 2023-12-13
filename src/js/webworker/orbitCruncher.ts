import * as Ootk from 'ootk';
import { DEG2RAD, RADIUS_OF_EARTH, TAU } from '../lib/constants';
import { jday } from '../lib/transforms';
import { propTime } from './positionCruncher/calculations';

let dynamicOffsetEpoch: number;
let staticOffset = 0;
let propRate = 1.0;

/** CONSTANTS */

const satCache = [];
let NUM_SEGS: number;
let orbitType = 1;
let orbitFadeFactor = 1.0;

// Handles Incomming Messages to sat-cruncher from main thread
try {
  onmessage = (m) => onmessageProcessing(m);
} catch (e) {
  // If Jest isn't running then throw the error
  if (!process) throw e;
}

// prettier-ignore
export const onmessageProcessing = (m: {
  data: {
    missile?: any;
    catalogManagerInstance?: any;
    satId?: number;
    isUpdate?: boolean;
    orbitType?: number;
    dynamicOffsetEpoch?: number;
    staticOffset?: number;
    propRate?: number;
    isInit?: boolean;
    satData?: string;
    TLE1?: string;
    TLE2?: string;
    isEcfOutput?: boolean;
    numSegs: number;
    orbitFadeFactor?: string;
  };
}) => { // NOSONAR
  if (m.data.isUpdate) {
    // Add Satellites
    if (!m.data.missile && m.data.satId < 99999) {
      satCache[m.data.satId] = Ootk.Sgp4.createSatrec(m.data.TLE1, m.data.TLE2);
    }
    // Add Missiles
    if (m.data.missile) {
      satCache[m.data.satId] = m.data;
    }
    // Don't Add Anything Else
  }

  if (m.data.orbitType) {
    orbitType = m.data.orbitType;
  }

  dynamicOffsetEpoch = typeof m.data.dynamicOffsetEpoch !== 'undefined' ? m.data.dynamicOffsetEpoch : dynamicOffsetEpoch;
  staticOffset = typeof m.data.staticOffset !== 'undefined' ? m.data.staticOffset : staticOffset;
  propRate = typeof m.data.propRate !== 'undefined' ? m.data.propRate : propRate;

  if (m.data.isInit) {
    const satData = JSON.parse(m.data.satData);
    orbitFadeFactor = JSON.parse(m.data.orbitFadeFactor);
    const sLen = satData.length - 1;
    let i = -1;
    while (i < sLen) {
      i++;
      delete satData[i]['id'];
      if (satData[i].static || satData[i].missile) {
        satCache[i] = satData[i];
      } else {
        satCache[i] = Ootk.Sgp4.createSatrec(satData[i].TLE1, satData[i].TLE2);
      }
    }

    NUM_SEGS = m.data.numSegs;
  }

  // NOTE: Without "typeof" vanguard 1 is falsly
  if (typeof m.data.satId !== 'undefined') {
    // TODO: figure out how to calculate the orbit points on constant
    // position slices, not timeslices (ugly perigees on HEOs)

    const satId = m.data.satId;
    const isEcfOutput = m.data.isEcfOutput || false;
    const pointsOut = new Float32Array((NUM_SEGS + 1) * 4);

    const nowDate = propTime(dynamicOffsetEpoch, staticOffset, propRate);
    const nowJ =
      jday(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds()) +
      nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    const now = (nowJ - satCache[satId].jdsatepoch) * 1440.0; // in minutes

    const len = NUM_SEGS + 1;
    let i = 0;
    // Calculate Missile Orbits
    if (satCache[satId].missile) {
      while (i < len) {
        const missile = satCache[satId];

        if (missile.latList?.length === 0) {
          pointsOut[i * 4] = 0;
          pointsOut[i * 4 + 1] = 0;
          pointsOut[i * 4 + 2] = 0;
          pointsOut[i * 4 + 3] = 0;
          i++;
        } else {
          const x = Math.round(missile.altList.length * (i / NUM_SEGS));

          const missileTime = propTime(dynamicOffsetEpoch, staticOffset, propRate);
          const j =
            jday(
              missileTime.getUTCFullYear(),
              missileTime.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
              missileTime.getUTCDate(),
              missileTime.getUTCHours(),
              missileTime.getUTCMinutes(),
              missileTime.getUTCSeconds()
            ) +
            missileTime.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
          const gmst = Ootk.Sgp4.gstime(j);

          const cosLat = Math.cos(missile.latList[x] * DEG2RAD);
          const sinLat = Math.sin(missile.latList[x] * DEG2RAD);
          const cosLon = Math.cos(missile.lonList[x] * DEG2RAD + gmst);
          const sinLon = Math.sin(missile.lonList[x] * DEG2RAD + gmst);

          pointsOut[i * 4] = (RADIUS_OF_EARTH + missile.altList[x]) * cosLat * cosLon;
          pointsOut[i * 4 + 1] = (RADIUS_OF_EARTH + missile.altList[x]) * cosLat * sinLon;
          pointsOut[i * 4 + 2] = (RADIUS_OF_EARTH + missile.altList[x]) * sinLat;
          pointsOut[i * 4 + 3] = Math.min(orbitFadeFactor * (len / (i + 1)), 1.0);
          i++;
        }
      }
    } else {
      // Calculate Satellite Orbits
      const period = (2 * Math.PI) / satCache[satId].no; // convert rads/min to min
      const timeslice = period / NUM_SEGS;
      let p: any;

      if (orbitType === 1) {
        while (i < len) {
          const t = now + i * timeslice;
          p = Ootk.Sgp4.propagate(satCache[satId], t)?.position;
          // eslint-disable-next-line no-constant-condition
          if (isEcfOutput) {
            p = Ootk.Transforms.ecf2eci(p, (-i * timeslice * TAU) / period);
          }
          if (p?.x && p?.y && p?.z) {
            pointsOut[i * 4] = p.x;
            pointsOut[i * 4 + 1] = p.y;
            pointsOut[i * 4 + 2] = p.z;
            pointsOut[i * 4 + 3] = Math.min(orbitFadeFactor * (len / (i + 1)), 1.0);
          } else {
            pointsOut[i * 4] = 0;
            pointsOut[i * 4 + 1] = 0;
            pointsOut[i * 4 + 2] = 0;
            pointsOut[i * 4 + 3] = 0;
          }
          i++;
        }
      } else if (orbitType === 2) {
        while (i < len) {
          const t = now - i * timeslice;
          p = Ootk.Sgp4.propagate(satCache[satId], t)?.position;
          // eslint-disable-next-line no-constant-condition
          if (isEcfOutput) {
            p = Ootk.Transforms.ecf2eci(p, (-i * timeslice * TAU) / period);
          }
          if (p?.x && p?.y && p?.z) {
            pointsOut[i * 4] = p.x;
            pointsOut[i * 4 + 1] = p.y;
            pointsOut[i * 4 + 2] = p.z;
            pointsOut[i * 4 + 3] = (i < len / 40) ? Math.min(orbitFadeFactor * ((len / 40) / (2 * (i + 1))), 1.0) : 0.0;
          } else {
            pointsOut[i * 4] = 0;
            pointsOut[i * 4 + 1] = 0;
            pointsOut[i * 4 + 2] = 0;
            pointsOut[i * 4 + 3] = 0;
          }
          i++;
        }
      }
    }

    postMessageProcessing({ pointsOut, satId });
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
      pointsOut: pointsOut,
      satId,
    } as OrbitCruncherMessageWorker);
  } catch (e) {
    // If Jest isn't running then throw the error
    if (!process) throw e;
  }
};
