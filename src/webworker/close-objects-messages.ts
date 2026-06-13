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
  /** Signals the TCA phase finished (all chunks already sent). */
  COMPLETE = 2,
  ERROR = 3,
  /** A batch of TCA results, patched onto the already-painted rows by index. */
  TCA_CHUNK = 4,
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
  /**
   * Pairs whose verified miss distance is below this (km) are dropped as
   * duplicate TLEs of the same object rather than a genuine conjunction.
   */
  minMissDistanceKm: number;
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

/** A single pair's TCA result, keyed by its index in the VERIFIED result list. */
export interface CoTcaUpdate {
  /** Index into the VERIFIED results array (same sorted order on both threads). */
  i: number;
  tcaEpochMs: number;
  missAtTcaKm: number;
}

export interface CoOutTcaChunk {
  typ: CoWorkerOutMsgType.TCA_CHUNK;
  runId: number;
  updates: CoTcaUpdate[];
  /** Pairs processed so far in the TCA phase. */
  processed: number;
  /** Total pairs that will get a TCA search. */
  total: number;
}

export interface CoOutComplete {
  typ: CoWorkerOutMsgType.COMPLETE;
  runId: number;
  /** Pairs that received a TCA search (may be capped below the result count). */
  tcaCount: number;
}

export interface CoOutError {
  typ: CoWorkerOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type CoWorkerOutMsg = CoOutVerified | CoOutTcaChunk | CoOutComplete | CoOutError;
