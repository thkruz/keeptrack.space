/**
 * Message protocol for the Best Pass Web Worker.
 *
 * The worker scores upcoming passes of a list of satellites over one or more
 * sensors off the main thread, streaming results back per satellite so the UI
 * stays responsive and partial results appear progressively.
 */

import type { lookanglesRow, SensorObjectCruncher } from '../engine/core/interfaces';

// ─── Inbound Message Types ──────────────────────────────────────────────────

export const enum BpWorkerMsgType {
  /** Start a best-pass search. */
  START = 0,
  /** Cancel the in-progress search. */
  CANCEL = 1,
}

/** Serializable satellite input: canonical sccNum plus its TLE lines. */
export interface BpSatData {
  sccNum: string;
  tle1: string;
  tle2: string;
}

export interface BpMsgStart {
  typ: BpWorkerMsgType.START;
  runId: number;
  sats: BpSatData[];
  /** Active sensor(s) - structured-cloned DetailedSensor data, reconstructed in the worker. */
  sensors: SensorObjectCruncher[];
  /** Display names parallel to {@link sensors}; used for the SENSOR column. */
  sensorNames: (string | null)[];
  /** Simulation epoch in ms; all offsets are added to this. */
  baseTimeMs: number;
  lengthDays: number;
  intervalSec: number;
  maxResults: number;
  /** Snapshot of the sun's ECI position (km), reused for the whole search. */
  sunEci: { x: number; y: number; z: number };
}

export interface BpMsgCancel {
  typ: BpWorkerMsgType.CANCEL;
  runId: number;
}

export type BpWorkerInMsg = BpMsgStart | BpMsgCancel;

// ─── Outbound Message Types ─────────────────────────────────────────────────

export const enum BpWorkerOutMsgType {
  /** A batch of pass rows (one satellite's worth). */
  CHUNK = 0,
  /** Progress update (satellites processed of total). */
  PROGRESS = 1,
  /** Search finished. */
  COMPLETE = 2,
  /** Fatal worker error. */
  ERROR = 3,
}

export interface BpOutChunk {
  typ: BpWorkerOutMsgType.CHUNK;
  runId: number;
  /** Raw pass rows (numeric START_DTG, Date date/time fields). Normalized on the main thread. */
  passes: lookanglesRow[];
}

export interface BpOutProgress {
  typ: BpWorkerOutMsgType.PROGRESS;
  runId: number;
  processed: number;
  total: number;
}

export interface BpOutComplete {
  typ: BpWorkerOutMsgType.COMPLETE;
  runId: number;
  /** True when any satellite hit the per-satellite result cap. */
  truncated: boolean;
}

export interface BpOutError {
  typ: BpWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type BpWorkerOutMsg = BpOutChunk | BpOutProgress | BpOutComplete | BpOutError;
