import * as satellite from 'satellite.js';
import { DEG2RAD, RADIUS_OF_EARTH } from '../lib/constants';
import { jday } from '../timeManager/transforms';
import { propTime } from './positionCruncher/calculations';

let dynamicOffsetEpoch: number;
let staticOffset = 0;
let propRate = 1.0;

/** CONSTANTS */

const satCache = [];
let NUM_SEGS: number;
let orbitFadeFactor = 1.0;

onmessage = (m) => {
  if (m.data.isUpdate) {
    // Add Satellites
    if (!m.data.missile && m.data.satId < 99999) {
      satCache[m.data.satId] = satellite.twoline2satrec(m.data.TLE1, m.data.TLE2);
    }
    // Add Missiles
    if (m.data.missile) {
      satCache[m.data.satId] = m.data;
    }
    // Don't Add Anything Else
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
        satCache[i] = satellite.twoline2satrec(satData[i].TLE1, satData[i].TLE2);
      }
    }

    NUM_SEGS = m.data.numSegs;
  }

  // NOTE: Without "typeof" vanguard 1 is falsly
  if (typeof m.data.satId !== 'undefined') {
    // TODO: figure out how to calculate the orbit points on constant
    // position slices, not timeslices (ugly perigees on HEOs)

    const satId = m.data.satId;
    const pointsOut = new Float32Array((NUM_SEGS + 1) * 4);

    const nowDate = propTime(dynamicOffsetEpoch, staticOffset, propRate);
    const nowJ =
      jday(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds()) +
      nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    const now = (nowJ - satCache[satId].jdsatepoch) * 1440.0; // in minutes

    const len = NUM_SEGS + 1;
    let i = 0;
    if (satCache[satId].missile) {
      while (i < len) {
        const missile = satCache[satId];
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
        const gmst = satellite.gstime(j);

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
    } else {
      const period = (2 * Math.PI) / satCache[satId].no; // convert rads/min to min
      let timeslice = period / NUM_SEGS;

      while (i < len) {
        const t = now + i * timeslice;
        const p = <satellite.EciVec3<number>>satellite.sgp4(satCache[satId], t)?.position;
        if (p) {
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
    }

    // TODO: figure out how this transferable buffer works
    postMessage(
      {
        pointsOut: pointsOut.buffer,
        satId: satId,
      },
      <any>[pointsOut.buffer]
    );
  }
};
