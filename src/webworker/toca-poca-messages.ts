/**
 * Message protocol for the TOCA/POCA web worker.
 *
 * The worker propagates exactly two satellites over a forward window off the
 * main thread, finds their close approaches via the shared search core, and
 * returns the result in one COMPLETE message so the UI never blocks - even at
 * the 30-day maximum window (~86k SGP4 propagations).
 */

import type { TocaPocaEventRow } from '../plugins-pro/toca-poca-plugin/toca-poca-core';

// ─── Inbound message types (main -> worker) ─────────────────────────────────

export const enum TpWorkerMsgType {
  /** Start a close-approach search. */
  START = 0,
  /** Cancel the in-progress search. */
  CANCEL = 1,
}

/** Serializable satellite input: canonical sccNum/name plus its TLE lines. */
export interface TpSatData {
  sccNum: string;
  name: string;
  tle1: string;
  tle2: string;
}

export interface TpMsgStart {
  typ: TpWorkerMsgType.START;
  runId: number;
  primary: TpSatData;
  target: TpSatData;
  /** Search base epoch in ms; all offsets are added to this. */
  baseTimeMs: number;
  windowMinutes: number;
  stepSeconds: number;
  maxEvents: number;
  maxDistanceKm: number | null;
}

export interface TpMsgCancel {
  typ: TpWorkerMsgType.CANCEL;
  runId: number;
}

export type TpWorkerInMsg = TpMsgStart | TpMsgCancel;

// ─── Outbound message types (worker -> main) ────────────────────────────────

export const enum TpWorkerOutMsgType {
  /** Search finished - full result attached. */
  COMPLETE = 0,
  /** Fatal worker error. */
  ERROR = 1,
}

export interface TpOutComplete {
  typ: TpWorkerOutMsgType.COMPLETE;
  runId: number;
  /** Filtered, capped, time-sorted approaches (plain-number rows). */
  events: TocaPocaEventRow[];
  /** Closest approach distance found before the max-distance filter (km), or null. */
  closestDistanceKm: number | null;
  /** Total local minima detected before capping/filtering. */
  totalFound: number;
}

export interface TpOutError {
  typ: TpWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type TpWorkerOutMsg = TpOutComplete | TpOutError;
