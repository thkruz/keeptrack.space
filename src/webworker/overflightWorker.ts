/**
 * Overflight Web Worker
 *
 * Runs the pure overflight search (src/plugins-pro/overflight/overflight-search.ts)
 * off the main thread. Each satellite's TLE is turned into geodetic + ECI
 * samplers here - faithfully mirroring SatMath/Satellite.lla - and one
 * satellite's overflights are streamed back at a time so the UI stays responsive
 * and partial results appear progressively.
 */

/* eslint-disable no-await-in-loop, no-promise-executor-return */

import {
  eci2lla,
  GreenwichMeanSiderealTime,
  MILLISECONDS_TO_DAYS,
  MINUTES_PER_DAY,
  Sgp4,
  SatelliteRecord,
  TemeVec3,
} from '@ootk/src/main';
import { computeOverflightsForSat, OverflightSatSampler } from '@app/plugins-pro/overflight/overflight-search';
import { jday } from '../engine/utils/transforms';
import {
  OfSatData,
  OfWorkerMsgType,
  OfWorkerOutMsgType,
  type OfWorkerInMsg,
} from './overflight-messages';

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

/** Builds geodetic + ECI samplers for one satellite from its TLE. */
function makeSampler(sat: OfSatData): OverflightSatSampler {
  const satrec = Sgp4.createSatrec(sat.tle1, sat.tle2);

  const propPos = (time: Date): { eci: TemeVec3; gmst: GreenwichMeanSiderealTime } | null => {
    const { gmst, m } = timeVars(time, satrec);

    try {
      const sv = Sgp4.propagate(satrec, m);

      if (!sv.position) {
        return null;
      }

      return { eci: sv.position as TemeVec3, gmst };
    } catch {
      return null;
    }
  };

  return {
    sccNum: sat.sccNum,
    name: sat.name,
    lla: (time: Date) => {
      const p = propPos(time);

      if (!p) {
        return null;
      }

      const lla = eci2lla(p.eci, p.gmst);

      return { lat: lla.lat, lon: lla.lon, alt: lla.alt };
    },
    eci: (time: Date) => {
      const p = propPos(time);

      return p ? { x: p.eci.x, y: p.eci.y, z: p.eci.z } : null;
    },
  };
}

/** Handle incoming messages from the main thread. */
onmessage = async function onmessage(event: MessageEvent<OfWorkerInMsg>) {
  const msg = event.data;

  if (msg.typ === OfWorkerMsgType.CANCEL) {
    cancelledRunId = msg.runId;

    return;
  }

  if (msg.typ !== OfWorkerMsgType.START) {
    return;
  }

  const { runId } = msg;

  try {
    const total = msg.sats.length;

    for (let i = 0; i < total; i++) {
      if (cancelledRunId === runId) {
        return;
      }

      let results = [];

      try {
        const sampler = makeSampler(msg.sats[i]);

        results = computeOverflightsForSat(sampler, msg.zone, msg.startMs, msg.durationSec, msg.intervalSec);
      } catch {
        // Skip satellites that fail to propagate (bad TLE, decayed); keep going.
      }

      postMessage({ typ: OfWorkerOutMsgType.CHUNK, runId, results });
      postMessage({ typ: OfWorkerOutMsgType.PROGRESS, runId, processed: i + 1, total });

      // Yield so a CANCEL message can be received between satellites.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    if (cancelledRunId === runId) {
      return;
    }

    postMessage({ typ: OfWorkerOutMsgType.COMPLETE, runId });
  } catch (e) {
    postMessage({ typ: OfWorkerOutMsgType.ERROR, runId, message: e instanceof Error ? e.message : String(e) });
  }
};

// Signal ready
postMessage('ready');
