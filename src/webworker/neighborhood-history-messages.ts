/**
 * Message protocol for the Neighborhood History Web Worker.
 *
 * The main thread parses OEM text into structured-clone-friendly
 * {@link RawDataBlock}s (the parse itself is cheap and the OemParser is not
 * worker-safe), then this worker runs the expensive per-point J2000 -> longitude/
 * inclination conversion off the main thread, streaming one file's datasets back
 * at a time. Mirrors the overflight worker's request/response pattern.
 */

import type { OemDataset, RawDataBlock } from '../plugins-pro/neighborhood-history/neighborhood-history-core';

// ─── Inbound Message Types ──────────────────────────────────────────────────

export const enum NhWorkerMsgType {
  /** Start converting a batch of parsed files. */
  START = 0,
  /** Cancel the in-progress conversion. */
  CANCEL = 1,
}

/** One parsed file's worth of OEM data blocks, tagged with the caller's id. */
export interface NhFileInput {
  fileId: number;
  blocks: RawDataBlock[];
}

export interface NhMsgStart {
  typ: NhWorkerMsgType.START;
  runId: number;
  files: NhFileInput[];
}

export interface NhMsgCancel {
  typ: NhWorkerMsgType.CANCEL;
  runId: number;
}

export type NhWorkerInMsg = NhMsgStart | NhMsgCancel;

// ─── Outbound Message Types ─────────────────────────────────────────────────

export const enum NhWorkerOutMsgType {
  /** One file's converted datasets. */
  CHUNK = 0,
  /** Progress update (files processed of total). */
  PROGRESS = 1,
  /** Conversion finished. */
  COMPLETE = 2,
  /** Fatal worker error. */
  ERROR = 3,
}

export interface NhOutChunk {
  typ: NhWorkerOutMsgType.CHUNK;
  runId: number;
  fileId: number;
  datasets: OemDataset[];
}

export interface NhOutProgress {
  typ: NhWorkerOutMsgType.PROGRESS;
  runId: number;
  processed: number;
  total: number;
}

export interface NhOutComplete {
  typ: NhWorkerOutMsgType.COMPLETE;
  runId: number;
}

export interface NhOutError {
  typ: NhWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type NhWorkerOutMsg = NhOutChunk | NhOutProgress | NhOutComplete | NhOutError;
