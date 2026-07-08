/**
 * Web worker for the Close Objects (conjunction) search.
 *
 * The main thread runs the cheap broad-phase sweep (it already has positions
 * from the position cruncher) and sends the candidate pairs here as TLE data.
 * This worker reconstructs each satellite once, verifies the broad-phase hit by
 * re-propagating, then runs the SGP4-heavy time-of-closest-approach (TCA) search
 * for the closest pairs - all off the main thread so the UI never freezes.
 */

import { RADIUS_OF_EARTH, Satellite, type TemeVec3 } from '@ootk/src/main';
import { findTca } from '@app/engine/math/tca-search';
import {
  CoWorkerMsgType,
  CoWorkerOutMsgType,
  type CoMsgStartSearch,
  type CoResultRow,
  type CoSatelliteData,
  type CoWorkerInMsg,
} from './close-objects-messages';
import { handleSgp4WasmBackendMsg, isSgp4WasmBackendMsg } from './shared/sgp4-wasm-backend-handler';

// ─── Module-level state ─────────────────────────────────────────────────────

let cancelledRunId = -1;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Reconstruct a Satellite from serialized TLE data, returning null when the
 * TLE cannot be parsed (decayed / malformed element set).
 */
function buildSatellite_(data: CoSatelliteData): Satellite | null {
  try {
    return new Satellite({ tle1: data.tle1 as never, tle2: data.tle2 as never });
  } catch {
    return null;
  }
}

/**
 * Propagate a satellite to the given time, returning the TEME position or null
 * when the propagation fails (no position or origin sentinel).
 */
function propagateToTime_(sat: Satellite, time: Date): TemeVec3 | null {
  let pv: { position?: unknown } | null;

  try {
    pv = sat.eci(time);
  } catch {
    return null;
  }

  if (!pv?.position || typeof pv.position === 'boolean') {
    return null;
  }

  const pos = pv.position as TemeVec3;

  if (pos.x === 0 && pos.y === 0 && pos.z === 0) {
    return null;
  }

  return pos;
}

/** Euclidean distance (km) between two TEME positions. */
function distance_(a: TemeVec3, b: TemeVec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Altitude (km) of a TEME position above the spherical Earth. */
function altitude_(p: TemeVec3): number {
  return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) - RADIUS_OF_EARTH;
}

interface VerifiedPair {
  row: CoResultRow;
  sat1: Satellite;
  sat2: Satellite;
}

// ─── Message handler ────────────────────────────────────────────────────────

/**
 * Runs the verification + TCA search for the candidate pairs and streams the
 * results back: first the verified rows (no TCA) for an immediate paint, then
 * the final rows with TCA filled in for the closest pairs.
 * @param msg The START_SEARCH message with candidate pairs and search params.
 */
function handleStartSearch_(msg: CoMsgStartSearch): void {
  const {
    runId, sats, pairs, searchRadiusKm, minMissDistanceKm, simEpochMs, verifyOffsetMs,
    tcaWindowMs, coarseStepMs, tolMs, maxTcaPairs,
  } = msg;

  try {
    // Build each Satellite at most once, then reuse across every pair and every
    // TCA sample (the TCA search re-propagates the same satellite hundreds of times).
    const satCache: (Satellite | null | undefined)[] = new Array(sats.length).fill(undefined);
    const getSat = (i: number): Satellite | null => {
      if (typeof satCache[i] === 'undefined') {
        satCache[i] = buildSatellite_(sats[i]);
      }

      return satCache[i] as Satellite | null;
    };

    const verifyTime = new Date(simEpochMs + verifyOffsetMs);
    const verified: VerifiedPair[] = [];

    for (const [i1, i2] of pairs) {
      if (cancelledRunId >= runId) {
        return;
      }

      // Same NORAD id => two data sources for the same satellite, not two
      // distinct objects. Skip before doing any propagation work.
      if (sats[i1].sccNum === sats[i2].sccNum) {
        continue;
      }

      const sat1 = getSat(i1);
      const sat2 = getSat(i2);

      if (!sat1 || !sat2) {
        continue;
      }

      const pos1 = propagateToTime_(sat1, verifyTime);
      const pos2 = propagateToTime_(sat2, verifyTime);

      if (!pos1 || !pos2) {
        continue;
      }

      const dist = distance_(pos1, pos2);

      // A near-zero miss means the two TLEs describe the same object (duplicate
      // catalog entries), not a genuine conjunction - drop it.
      if (dist > searchRadiusKm || dist < minMissDistanceKm) {
        continue;
      }

      const d1 = sats[i1];
      const d2 = sats[i2];

      verified.push({
        sat1,
        sat2,
        row: {
          sat1Scc: d1.sccNum,
          sat1Name: d1.name,
          sat2Scc: d2.sccNum,
          sat2Name: d2.name,
          missDistanceKm: dist,
          avgAltitudeKm: (altitude_(pos1) + altitude_(pos2)) / 2,
          sat1Perigee: d1.perigee,
          sat1Apogee: d1.apogee,
          sat2Perigee: d2.perigee,
          sat2Apogee: d2.apogee,
          tcaEpochMs: null,
          missAtTcaKm: null,
        },
      });
    }

    verified.sort((a, b) => a.row.missDistanceKm - b.row.missDistanceKm);

    // First paint: verified rows without TCA so the table populates immediately.
    postMessage({
      typ: CoWorkerOutMsgType.VERIFIED,
      runId,
      results: verified.map((v) => v.row),
    });

    if (cancelledRunId >= runId) {
      return;
    }

    // TCA phase. Each pair costs hundreds of SGP4 props, but this runs off the
    // main thread and the results stream back in batches, so we cover every
    // verified pair up to a generous backstop rather than an arbitrary handful.
    const count = Math.min(verified.length, maxTcaPairs);
    const BATCH = 25;
    let batch: { i: number; tcaEpochMs: number; missAtTcaKm: number }[] = [];

    const flush = (processed: number): void => {
      postMessage({ typ: CoWorkerOutMsgType.TCA_CHUNK, runId, updates: batch, processed, total: count });
      batch = [];
    };

    for (let k = 0; k < count; k++) {
      if (cancelledRunId >= runId) {
        return;
      }

      const { sat1, sat2 } = verified[k];
      const distFn = (tMs: number): number => {
        const time = new Date(simEpochMs + tMs);
        const p1 = propagateToTime_(sat1, time);
        const p2 = propagateToTime_(sat2, time);

        if (!p1 || !p2) {
          return NaN;
        }

        return distance_(p1, p2);
      };

      const tca = findTca(distFn, 0, tcaWindowMs, coarseStepMs, tolMs);

      if (tca) {
        batch.push({ i: k, tcaEpochMs: simEpochMs + tca.tcaMs, missAtTcaKm: tca.missKm });
      }

      if (batch.length >= BATCH) {
        flush(k + 1);
      }
    }

    if (batch.length > 0) {
      flush(count);
    }

    postMessage({ typ: CoWorkerOutMsgType.COMPLETE, runId, tcaCount: count });
  } catch (error) {
    postMessage({
      typ: CoWorkerOutMsgType.ERROR,
      runId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main message handler for the worker. Routes messages to the right handler.
 * @param m The incoming message event containing a CoWorkerInMsg.
 */
function onmessageProcessing_(m: MessageEvent<CoWorkerInMsg>): void {
  const msg = m.data;

  if (isSgp4WasmBackendMsg(msg)) {
    handleSgp4WasmBackendMsg(msg);

    return;
  }

  switch (msg.typ) {
    case CoWorkerMsgType.START_SEARCH:
      handleStartSearch_(msg);
      break;
    case CoWorkerMsgType.CANCEL:
      cancelledRunId = msg.runId;
      break;
    default:
      break;
  }
}

// ─── Worker initialization ──────────────────────────────────────────────────

try {
  onmessage = onmessageProcessing_;
} catch {
  // Node.js environment (testing) - onmessage not available
}

postMessage('ready');
