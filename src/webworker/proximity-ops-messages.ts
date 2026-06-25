/**
 * Message protocol for the Proximity Ops web worker.
 *
 * The worker reconstructs the candidate satellites from their TLEs and runs the
 * all-vs-all RPO survey (the heavy part: hundreds of orbit bins, each screening
 * many pairs with an SGP4 TCA search) off the main thread, streaming progress so
 * the UI never freezes and the submit button can double as Cancel.
 */

import type { ProximityOpsEvent, ProxSatData, RpoSearchMode, RpoSearchParams } from '../plugins/proximity-ops/proximity-ops-core';

// ─── Inbound message types (main -> worker) ─────────────────────────────────

export const enum RpoWorkerMsgType {
  /** Start an all-vs-all RPO survey. */
  START = 0,
  /** Cancel the in-progress survey. */
  CANCEL = 1,
}

export interface RpoMsgStart {
  typ: RpoWorkerMsgType.START;
  runId: number;
  /** Which search to run (GEO/LEO all-vs-all, or single-satellite). */
  mode: RpoSearchMode;
  /**
   * Candidate satellites, already payload/VIMPEL filtered on the main thread.
   * For all-vs-all this is the full regime; for single it is the primary (first)
   * plus its pre-gathered neighborhood.
   */
  sats: ProxSatData[];
  params: RpoSearchParams;
}

export interface RpoMsgCancel {
  typ: RpoWorkerMsgType.CANCEL;
  runId: number;
}

export type RpoWorkerInMsg = RpoMsgStart | RpoMsgCancel;

// ─── Outbound message types (worker -> main) ────────────────────────────────

export const enum RpoWorkerOutMsgType {
  /** A bin batch finished; progress fraction attached. */
  PROGRESS = 0,
  /** Survey finished - full result attached. */
  COMPLETE = 1,
  /** Fatal worker error. */
  ERROR = 2,
}

export interface RpoOutProgress {
  typ: RpoWorkerOutMsgType.PROGRESS;
  runId: number;
  done: number;
  total: number;
}

export interface RpoOutComplete {
  typ: RpoWorkerOutMsgType.COMPLETE;
  runId: number;
  /** Unsorted approaches (the main thread sorts/caps for display). */
  events: ProximityOpsEvent[];
}

export interface RpoOutError {
  typ: RpoWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type RpoWorkerOutMsg = RpoOutProgress | RpoOutComplete | RpoOutError;
