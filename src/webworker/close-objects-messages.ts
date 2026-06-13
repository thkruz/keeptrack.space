/**
 * Message type definitions for the close objects search web worker.
 * Shared between the main thread (thread manager) and the worker.
 *
 * The main thread does the cheap broad-phase sweep (it already has positions
 * from the position cruncher) and hands the worker the candidate pairs as TLE
 * data. The worker then runs the SGP4-heavy verification and time-of-closest-
 * approach (TCA) search off the main thread so the UI never freezes.
 */

// ─── Inbound message types (main -> worker) ────────────────────────────────

export const enum CoWorkerMsgType {
  START_SEARCH = 0,
  CANCEL = 1,
}

// ─── Outbound message types (worker -> main) ───────────────────────────────

export const enum CoWorkerOutMsgType {
  /** Verified pairs (no TCA yet) for an immediate first paint of the table. */
  VERIFIED = 1,
  /** Final results with TCA / miss-at-TCA filled in for the closest pairs. */
  COMPLETE = 2,
  ERROR = 3,
  PROGRESS = 4,
}

// ─── Serializable data structures ───────────────────────────────────────────

/** Serializable satellite data for worker transport. */
export interface CoSatelliteData {
  tle1: string;
  tle2: string;
  sccNum: string;
  name: string;
  perigee: number;
  apogee: number;
}

/**
 * A single close-object result row — plain numbers / strings only, no class
 * instances. This is the canonical result shape used on both threads.
 */
export interface CoResultRow {
  sat1Scc: string;
  sat1Name: string;
  sat2Scc: string;
  sat2Name: string;
  missDistanceKm: number;
  avgAltitudeKm: number;
  sat1Perigee: number;
  sat1Apogee: number;
  sat2Perigee: number;
  sat2Apogee: number;
  /** Absolute time of closest approach in ms since the Unix epoch, or null when unknown. */
  tcaEpochMs: number | null;
  /** Separation distance at TCA in km, or null when unknown. */
  missAtTcaKm: number | null;
}

// ─── Inbound message interfaces ─────────────────────────────────────────────

export interface CoMsgStartSearch {
  typ: CoWorkerMsgType.START_SEARCH;
  runId: number;
  /** Deduplicated satellite list; pairs index into this array. */
  sats: CoSatelliteData[];
  /** Candidate pairs as [index1, index2] tuples into `sats`. */
  pairs: [number, number][];
  searchRadiusKm: number;
  /** Simulation epoch (ms) the search window is anchored to. */
  simEpochMs: number;
  /** Offset (ms) past the sim epoch used to verify the broad-phase hit. */
  verifyOffsetMs: number;
  /** TCA look-ahead window (ms) starting at the sim epoch. */
  tcaWindowMs: number;
  /** Coarse scan step (ms) for the TCA search. */
  coarseStepMs: number;
  /** Golden-section refinement tolerance (ms). */
  tolMs: number;
  /** Cap on how many (closest) pairs get the SGP4-heavy TCA search. */
  maxTcaPairs: number;
}

export interface CoMsgCancel {
  typ: CoWorkerMsgType.CANCEL;
  runId: number;
}

export type CoWorkerInMsg = CoMsgStartSearch | CoMsgCancel;

// ─── Outbound message interfaces ────────────────────────────────────────────

export interface CoOutVerified {
  typ: CoWorkerOutMsgType.VERIFIED;
  runId: number;
  results: CoResultRow[];
}

export interface CoOutComplete {
  typ: CoWorkerOutMsgType.COMPLETE;
  runId: number;
  results: CoResultRow[];
}

export interface CoOutError {
  typ: CoWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export interface CoOutProgress {
  typ: CoWorkerOutMsgType.PROGRESS;
  runId: number;
  /** Pairs processed so far in the TCA phase. */
  processed: number;
  /** Total pairs that will get a TCA search. */
  total: number;
}

export type CoWorkerOutMsg = CoOutVerified | CoOutComplete | CoOutError | CoOutProgress;
