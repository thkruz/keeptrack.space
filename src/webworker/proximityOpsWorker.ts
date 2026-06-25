/**
 * Web worker for the Proximity Ops all-vs-all RPO survey.
 *
 * Reconstructs the candidate satellites from their TLEs and walks the orbit
 * bins (GEO longitude, or LEO inclination x RAAN) off the main thread, calling
 * the shared, unit-tested core (findSatsAvAGeo/findSatsAvALeo + findRpoPairs)
 * per bin. Progress is streamed after each bin and the loop yields so a CANCEL
 * message can interrupt a long survey - the same pattern the overflight worker
 * uses. The single-satellite mode is fast and stays on the main thread.
 */

/* eslint-disable no-await-in-loop, no-promise-executor-return */

import {
  dataToSat,
  findRpoPairs,
  findSatsAvAGeo,
  findSatsAvALeo,
  ProximityOpsEvent,
  ProxSatData,
  RpoSearchParams,
} from '../plugins/proximity-ops/proximity-ops-core';
import { Satellite } from '@ootk/src/main';
import {
  RpoWorkerMsgType,
  RpoWorkerOutMsgType,
  type RpoMsgStart,
  type RpoWorkerInMsg,
} from './proximity-ops-messages';

let cancelledRunId = -1;

/** Yield to the event loop so a queued CANCEL message can be processed. */
const yieldToLoop_ = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** GEO all-vs-all longitude-bin width (deg) - mirrors the core's GEO step. */
const GEO_LON_STEP_DEG = 1.5;
/** LEO all-vs-all inclination/RAAN bin width (deg) - mirrors the core's LEO step. */
const LEO_PLANE_STEP_DEG = 5;

/** Walk the GEO belt; one progress tick per longitude bin. */
async function surveyGeo_(runId: number, sats: Satellite[], params: RpoSearchParams): Promise<ProximityOpsEvent[] | null> {
  const baseDate = new Date(params.baseTimeMs);
  const satPairs: number[][] = [];
  const lons: number[] = [];

  for (let lon = -180; lon <= 180; lon += GEO_LON_STEP_DEG) {
    lons.push(lon);
  }

  let RPOs: ProximityOpsEvent[] = [];

  for (let idx = 0; idx < lons.length; idx++) {
    if (cancelledRunId >= runId) {
      return null;
    }

    const binSats = findSatsAvAGeo(sats, lons[idx], baseDate);

    RPOs = RPOs.concat(findRpoPairs(binSats, params, baseDate, true, satPairs));
    postMessage({ typ: RpoWorkerOutMsgType.PROGRESS, runId, done: idx + 1, total: lons.length });
    await yieldToLoop_();
  }

  return RPOs;
}

/** Walk LEO inclination/RAAN bins; one progress tick per inclination row. */
async function surveyLeo_(runId: number, sats: Satellite[], params: RpoSearchParams): Promise<ProximityOpsEvent[] | null> {
  const baseDate = new Date(params.baseTimeMs);
  const satPairs: number[][] = [];
  const incs: number[] = [];

  for (let inc = 0; inc <= 180; inc += LEO_PLANE_STEP_DEG) {
    incs.push(inc);
  }

  let RPOs: ProximityOpsEvent[] = [];

  for (let idx = 0; idx < incs.length; idx++) {
    if (cancelledRunId >= runId) {
      return null;
    }

    for (let raan = 0; raan <= 360; raan += LEO_PLANE_STEP_DEG) {
      const binSats = findSatsAvALeo(sats, incs[idx], raan);

      if (binSats.length === 0) {
        continue;
      }

      RPOs = RPOs.concat(findRpoPairs(binSats, params, baseDate, true, satPairs));
    }

    postMessage({ typ: RpoWorkerOutMsgType.PROGRESS, runId, done: idx + 1, total: incs.length });
    await yieldToLoop_();
  }

  return RPOs;
}

/** Screen a single primary (sats[0]) against its pre-gathered neighborhood. */
function surveySingle_(runId: number, sats: Satellite[], params: RpoSearchParams): ProximityOpsEvent[] | null {
  if (cancelledRunId >= runId) {
    return null;
  }

  // Stream progress per screened neighbor, throttled to whole-percent changes so
  // a dense plane does not flood the main thread with postMessage calls.
  let lastPct = -1;
  const events = findRpoPairs(sats, params, new Date(params.baseTimeMs), false, undefined, (done, total) => {
    const pct = total > 0 ? Math.floor((done / total) * 100) : 100;

    if (pct !== lastPct) {
      lastPct = pct;
      postMessage({ typ: RpoWorkerOutMsgType.PROGRESS, runId, done, total });
    }
  });

  return events;
}

/** Run the requested search and post the result (or an error) back. */
async function handleStart_(msg: RpoMsgStart): Promise<void> {
  const { runId, mode, params } = msg;

  try {
    const sats = msg.sats.map((data: ProxSatData) => dataToSat(data));
    let events: ProximityOpsEvent[] | null;

    switch (mode) {
      case 'ava-leo':
        events = await surveyLeo_(runId, sats, params);
        break;
      case 'ava-geo':
        events = await surveyGeo_(runId, sats, params);
        break;
      default:
        events = surveySingle_(runId, sats, params);
        break;
    }

    // A cancel that arrived mid-survey supersedes this stale result.
    if (events === null || cancelledRunId >= runId) {
      return;
    }

    postMessage({ typ: RpoWorkerOutMsgType.COMPLETE, runId, events });
  } catch (error) {
    postMessage({
      typ: RpoWorkerOutMsgType.ERROR,
      runId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Worker message router: dispatches START to the survey and records CANCEL. */
onmessage = async function onmessage(event: MessageEvent<RpoWorkerInMsg>) {
  const msg = event.data;

  switch (msg.typ) {
    case RpoWorkerMsgType.START:
      await handleStart_(msg);
      break;
    case RpoWorkerMsgType.CANCEL:
      cancelledRunId = msg.runId;
      break;
    default:
      break;
  }
};

// Signal ready
postMessage('ready');
