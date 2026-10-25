/**
 * Message type definitions for the debris screening web worker.
 * Shared between the main thread (thread manager) and the worker.
 */

// ─── Inbound message types (main -> worker) ────────────────────────────────

export const enum DsWorkerMsgType {
  START_SCREENING = 0,
  CANCEL = 1,
}

// ─── Outbound message types (worker -> main) ───────────────────────────────

export const enum DsWorkerOutMsgType {
  CHUNK = 1,
  COMPLETE = 2,
  ERROR = 3,
  PROGRESS = 4,
}

// ─── Serializable data structures ───────────────────────────────────────────

/** Serializable satellite data for worker transport. */
export interface DsSatelliteData {
  tle1: string;
  tle2: string;
  name: string;
  radius: number;
  /**
   * TLE lines the covariance is built from when they are not the object's own: an analyst
   * clone sends its root parent's (uncertainty-source.ts). Omitted, the object's TLE is used.
   */
  covarianceTle1?: string;
  covarianceTle2?: string;
}

/** A single screening result row; plain numbers only, no class instances. */
export interface DsResultRow {
  secondaryId: string;
  tcaMs: number;
  missDistance: number;
  /** Signed radial component (km) of the secondary relative to the primary, primary RIC (ootk v8) */
  radialDistance: number;
  /** Signed in-track component (km), primary RIC */
  intrackDistance: number;
  /** Signed cross-track component (km), primary RIC */
  crosstrackDistance: number;
  relativeVelocity: number;
  probabilityOfCollision: number | null;
  riskScore: number;
}

// ─── Inbound message interfaces ─────────────────────────────────────────────

export interface DsMsgStartScreening {
  typ: DsWorkerMsgType.START_SCREENING;
  runId: number;
  primary: DsSatelliteData;
  secondaries: DsSatelliteData[];
  startTimeMs: number;
  endTimeMs: number;
  searchStepSize: number;
  uVal: number;
  vVal: number;
  wVal: number;
  batchSize: number;
  covarianceConfidenceLevel: number;
}

export interface DsMsgCancel {
  typ: DsWorkerMsgType.CANCEL;
  runId: number;
}

export type DsWorkerInMsg = DsMsgStartScreening | DsMsgCancel;

// ─── Outbound message interfaces ────────────────────────────────────────────

export interface DsOutChunk {
  typ: DsWorkerOutMsgType.CHUNK;
  runId: number;
  results: DsResultRow[];
  processedCount: number;
  totalCandidates: number;
}

export interface DsOutComplete {
  typ: DsWorkerOutMsgType.COMPLETE;
  runId: number;
  totalResults: number;
  totalCandidates: number;
}

export interface DsOutError {
  typ: DsWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export interface DsOutProgress {
  typ: DsWorkerOutMsgType.PROGRESS;
  runId: number;
  phase: 'coarse_filter' | 'assessment';
  candidateCount: number;
}

export type DsWorkerOutMsg = DsOutChunk | DsOutComplete | DsOutError | DsOutProgress;
