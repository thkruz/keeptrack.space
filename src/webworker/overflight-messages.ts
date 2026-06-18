/**
 * Message protocol for the Overflight Web Worker.
 *
 * The worker screens a list of watchlist satellites for passes through a
 * lat/lon zone off the main thread, streaming results back per satellite so a
 * large watchlist x multi-day window never blocks the render loop. Mirrors the
 * best-pass worker's request/response pattern.
 */

import type { OverflightResult } from '../plugins-pro/overflight/overflight-search';
import type { ZoneDefinition } from '../plugins-pro/overflight/overflight-pass-math';

// ─── Inbound Message Types ──────────────────────────────────────────────────

export const enum OfWorkerMsgType {
  /** Start an overflight search. */
  START = 0,
  /** Cancel the in-progress search. */
  CANCEL = 1,
}

/** Serializable satellite input: canonical sccNum + display name + its TLE lines. */
export interface OfSatData {
  sccNum: string;
  name: string;
  tle1: string;
  tle2: string;
}

export interface OfMsgStart {
  typ: OfWorkerMsgType.START;
  runId: number;
  sats: OfSatData[];
  zone: ZoneDefinition;
  /** Search-window start in ms since epoch (seconds/millis already zeroed by the caller). */
  startMs: number;
  durationSec: number;
  intervalSec: number;
}

export interface OfMsgCancel {
  typ: OfWorkerMsgType.CANCEL;
  runId: number;
}

export type OfWorkerInMsg = OfMsgStart | OfMsgCancel;

// ─── Outbound Message Types ─────────────────────────────────────────────────

export const enum OfWorkerOutMsgType {
  /** A batch of overflights (one satellite's worth). */
  CHUNK = 0,
  /** Progress update (satellites processed of total). */
  PROGRESS = 1,
  /** Search finished. */
  COMPLETE = 2,
  /** Fatal worker error. */
  ERROR = 3,
}

export interface OfOutChunk {
  typ: OfWorkerOutMsgType.CHUNK;
  runId: number;
  results: OverflightResult[];
}

export interface OfOutProgress {
  typ: OfWorkerOutMsgType.PROGRESS;
  runId: number;
  processed: number;
  total: number;
}

export interface OfOutComplete {
  typ: OfWorkerOutMsgType.COMPLETE;
  runId: number;
}

export interface OfOutError {
  typ: OfWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type OfWorkerOutMsg = OfOutChunk | OfOutProgress | OfOutComplete | OfOutError;
