/**
 * Time2Lon (Waterfall) Web Worker
 *
 * Re-runs SGP4 off the main thread for each already-filtered GEO-regime
 * satellite, samples its sub-longitude across the requested multi-orbit window,
 * and streams one satellite's plot line back at a time so the UI stays
 * responsive and partial results appear progressively. The geodetic sampling
 * faithfully mirrors SatMath.getLlaOfCurrentOrbit; line assembly + the
 * [0, maxTimeMin] clip reuse the shared time2lon-core helpers.
 */

/* eslint-disable no-await-in-loop, no-promise-executor-return */

import {
  eci2lla,
  GreenwichMeanSiderealTime,
  MILLISECONDS_TO_DAYS,
  MINUTES_PER_DAY,
  SatelliteRecord,
  Sgp4,
  TemeVec3,
} from '@ootk/src/main';
import { buildSatLine, computeOrbits, Time2LonLlaSample } from '@app/plugins/plot-analysis/time2lon-core';
import { jday } from '../engine/utils/transforms';
import {
  T2lSatData,
  T2lWorkerMsgType,
  T2lWorkerOutMsgType,
  type T2lWorkerInMsg,
} from './time2lon-messages';

const MS_PER_MIN = 60_000;

let cancelledRunId = -1;

/** GMST + minutes-since-epoch for a time, mirroring SatMath.calculateTimeVariables. */
function timeVars(now: Date, satrec: SatelliteRecord): { gmst: GreenwichMeanSiderealTime; m: number } {
  const j =
    jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()) +
    now.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;

  return {
    gmst: Sgp4.gstime(j),
    m: (j - satrec.jdsatepoch) * MINUTES_PER_DAY,
  };
}

/** Returns the geodetic longitude (deg) at an absolute time, or null on propagation failure. */
function lonAt(satrec: SatelliteRecord, timeMs: number): number | null {
  const { gmst, m } = timeVars(new Date(timeMs), satrec);

  try {
    const sv = Sgp4.propagate(satrec, m);

    if (!sv.position) {
      return null;
    }

    return eci2lla(sv.position as TemeVec3, gmst).lon;
  } catch {
    return null;
  }
}

/** Samples one satellite's sub-longitude across the window and assembles its line. */
function computeLine(sat: T2lSatData, nowMs: number, samplePoints: number, maxTimeMin: number) {
  const satrec = Sgp4.createSatrec(sat.tle1, sat.tle2);
  const orbits = computeOrbits(maxTimeMin, sat.periodMin);
  const totalPoints = samplePoints * orbits;
  const stepMin = sat.periodMin / samplePoints;
  const samples: Time2LonLlaSample[] = [];

  for (let i = 0; i < totalPoints; i++) {
    const offsetMin = i * stepMin;

    // Offsets increase monotonically, so once past the window the rest are too.
    if (offsetMin > maxTimeMin) {
      break;
    }

    const timeMs = nowMs + offsetMin * MS_PER_MIN;
    const lon = lonAt(satrec, timeMs);

    if (lon === null) {
      continue;
    }

    samples.push({ lon, time: timeMs });
  }

  return buildSatLine({ satId: sat.satId, satName: sat.satName, country: sat.country }, samples, nowMs, maxTimeMin);
}

/** Handle incoming messages from the main thread. */
onmessage = async function onmessage(event: MessageEvent<T2lWorkerInMsg>) {
  const msg = event.data;

  if (msg.typ === T2lWorkerMsgType.CANCEL) {
    cancelledRunId = msg.runId;

    return;
  }

  if (msg.typ !== T2lWorkerMsgType.START) {
    return;
  }

  const { runId } = msg;

  try {
    const total = msg.sats.length;

    for (let i = 0; i < total; i++) {
      if (cancelledRunId === runId) {
        return;
      }

      let line = null;

      try {
        line = computeLine(msg.sats[i], msg.nowMs, msg.samplePoints, msg.maxTimeMin);
      } catch {
        // Skip satellites that fail to propagate (bad TLE, decayed); keep going.
      }

      postMessage({ typ: T2lWorkerOutMsgType.CHUNK, runId, line });
      postMessage({ typ: T2lWorkerOutMsgType.PROGRESS, runId, processed: i + 1, total });

      // Yield so a CANCEL message can be received between satellites.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    if (cancelledRunId === runId) {
      return;
    }

    postMessage({ typ: T2lWorkerOutMsgType.COMPLETE, runId });
  } catch (e) {
    postMessage({ typ: T2lWorkerOutMsgType.ERROR, runId, message: e instanceof Error ? e.message : String(e) });
  }
};

// Signal ready
postMessage('ready');
