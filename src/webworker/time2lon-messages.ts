/**
 * Message protocol for the Time2Lon (Waterfall) Web Worker.
 *
 * The worker re-runs SGP4 for a list of already-filtered GEO-regime satellites,
 * samples each one's sub-longitude across the requested time window, and streams
 * one satellite's plot line back at a time so propagating the whole belt never
 * blocks the render loop. Mirrors the overflight worker's request/response
 * pattern, including the runId used to discard stale/cancelled runs.
 */

import type { Time2LonSatLine } from '../plugins/plot-analysis/time2lon-core';

// ─── Inbound Message Types ──────────────────────────────────────────────────

export const enum T2lWorkerMsgType {
  /** Start a waterfall computation. */
  START = 0,
  /** Cancel the in-progress computation. */
  CANCEL = 1,
}

/** Serializable satellite input: identity + display country + TLE + orbital period. */
export interface T2lSatData {
  satId: number;
  satName: string;
  /** Pre-resolved display country (top-N name or 'Other'), computed on the main thread. */
  country: string;
  tle1: string;
  tle2: string;
  /** Orbital period in minutes, used to size the multi-orbit sampling window. */
  periodMin: number;
}

export interface T2lMsgStart {
  typ: T2lWorkerMsgType.START;
  runId: number;
  sats: T2lSatData[];
  /** Window origin in ms since epoch (the simulation time). */
  nowMs: number;
  /** Points sampled per orbital period. */
  samplePoints: number;
  /** Maximum time-from-now (minutes) to keep. */
  maxTimeMin: number;
}

export interface T2lMsgCancel {
  typ: T2lWorkerMsgType.CANCEL;
  runId: number;
}

export type T2lWorkerInMsg = T2lMsgStart | T2lMsgCancel;

// ─── Outbound Message Types ─────────────────────────────────────────────────

export const enum T2lWorkerOutMsgType {
  /** A single satellite's plot line. */
  CHUNK = 0,
  /** Progress update (satellites processed of total). */
  PROGRESS = 1,
  /** Computation finished. */
  COMPLETE = 2,
  /** Fatal worker error. */
  ERROR = 3,
}

export interface T2lOutChunk {
  typ: T2lWorkerOutMsgType.CHUNK;
  runId: number;
  /** One satellite's line, or null when it produced no in-window points. */
  line: Time2LonSatLine | null;
}

export interface T2lOutProgress {
  typ: T2lWorkerOutMsgType.PROGRESS;
  runId: number;
  processed: number;
  total: number;
}

export interface T2lOutComplete {
  typ: T2lWorkerOutMsgType.COMPLETE;
  runId: number;
}

export interface T2lOutError {
  typ: T2lWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type T2lWorkerOutMsg = T2lOutChunk | T2lOutProgress | T2lOutComplete | T2lOutError;
