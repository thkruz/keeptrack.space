/**
 * Web worker for TOCA/POCA close-approach search.
 *
 * Reconstructs the primary and target satellites from their TLEs and runs the
 * shared findCloseApproaches() core off the main thread, returning the full
 * result in a single COMPLETE message. Keeping the heavy SGP4 scan here means
 * even a 30-day window never freezes the UI.
 */

import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { eventToRow, findCloseApproaches } from '../plugins-pro/toca-poca-plugin/toca-poca-core';
import {
  TpWorkerMsgType,
  TpWorkerOutMsgType,
  type TpMsgStart,
  type TpSatData,
  type TpWorkerInMsg,
} from './toca-poca-messages';

// ─── Module-level state ─────────────────────────────────────────────────────

let cancelledRunId = -1;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Reconstruct an ootk Satellite from the serializable worker input. */
function toSatellite_(data: TpSatData): Satellite {
  return new Satellite({
    sccNum: data.sccNum,
    name: data.name,
    tle1: data.tle1 as TleLine1,
    tle2: data.tle2 as TleLine2,
  });
}

// ─── Message handler ────────────────────────────────────────────────────────

/**
 * Run the close-approach search for a START message and post the result back,
 * unless a later CANCEL has already superseded this run.
 * @param msg The START message with both satellites and the search parameters.
 */
function handleStart_(msg: TpMsgStart): void {
  const { runId, primary, target, baseTimeMs, windowMinutes, stepSeconds, maxEvents, maxDistanceKm } = msg;

  try {
    const result = findCloseApproaches(toSatellite_(primary), toSatellite_(target), {
      baseDate: new Date(baseTimeMs),
      windowMinutes,
      stepSeconds,
      maxEvents,
      maxDistanceKm,
    });

    // A cancel that arrived mid-scan supersedes this stale result.
    if (cancelledRunId >= runId) {
      return;
    }

    postMessage({
      typ: TpWorkerOutMsgType.COMPLETE,
      runId,
      events: result.events.map(eventToRow),
      closestDistanceKm: result.closest ? result.closest.distance : null,
      totalFound: result.totalFound,
    });
  } catch (error) {
    postMessage({
      typ: TpWorkerOutMsgType.ERROR,
      runId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Worker message router: dispatches START to the search and records CANCEL.
 * @param m The incoming message event from the main thread.
 */
function onmessageProcessing_(m: MessageEvent<TpWorkerInMsg>): void {
  const msg = m.data;

  switch (msg.typ) {
    case TpWorkerMsgType.START:
      handleStart_(msg);
      break;
    case TpWorkerMsgType.CANCEL:
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
  // Node.js environment (testing) - onmessage not available.
}

postMessage('ready');
