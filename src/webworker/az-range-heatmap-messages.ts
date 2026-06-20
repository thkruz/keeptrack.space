/**
 * Message protocol for the Az/Range Heatmap Web Worker.
 *
 * The worker propagates a filtered satellite catalog forward in time, checks
 * each position against an elevation-band window at the current sensor, and
 * accumulates an azimuth × range count matrix. Intermediate PARTIAL snapshots
 * stream back every ~5 % of steps so the chart can render live while the job
 * runs. A final RESULT message carries the completed average.
 */

// ─── Inbound ─────────────────────────────────────────────────────────────────

export const enum AzRangeMsgType {
  START = 0,
  CANCEL = 1,
}

export interface AzRangeTleEntry {
  tle1: string;
  tle2: string;
  /** NORAD catalog number (string form, e.g. "25544"). Used to populate search results on bin click. */
  sccNum: string;
}

export interface AzRangeMsgStart {
  typ: AzRangeMsgType.START;
  runId: number;
  tleData: AzRangeTleEntry[];
  /** Observer latitude in degrees. */
  sensorLat: number;
  /** Observer longitude in degrees. */
  sensorLon: number;
  /** Observer altitude in km. */
  sensorAlt: number;
  /** Sensor maximum range in km — satellites beyond this are excluded. */
  sensorMaxRng: number;
  /** Simulation start time in ms since epoch. */
  startTimeMs: number;
  /** Duration of the analysis window in seconds. */
  durationSec: number;
  /** Propagation step size in seconds. */
  stepSec: number;
  /** Target elevation band centre in degrees. */
  elevationDeg: number;
  /** Half-width of the elevation band in degrees (e.g. 0.5, 1, 2, 5). */
  marginDeg: number;
  /** Number of azimuth bins (0–360°). */
  numAzBins: number;
  /** Number of range bins (0–sensorMaxRng). */
  numRngBins: number;
  /** Sensor FOV minimum azimuth (degrees, 0–360). */
  fovMinAz: number;
  /** Sensor FOV maximum azimuth (degrees, 0–360). May be < fovMinAz for wrap-around FOV. */
  fovMaxAz: number;
  /** Second-face FOV min azimuth (optional, dual-face sensors). */
  fovMinAz2?: number;
  /** Second-face FOV max azimuth (optional, dual-face sensors). */
  fovMaxAz2?: number;
}

export interface AzRangeMsgCancel {
  typ: AzRangeMsgType.CANCEL;
  runId: number;
}

export type AzRangeWorkerInMsg = AzRangeMsgStart | AzRangeMsgCancel;

// ─── Outbound ─────────────────────────────────────────────────────────────────

export const enum AzRangeOutMsgType {
  PARTIAL = 0,
  RESULT = 1,
  ERROR = 2,
}

/**
 * Intermediate snapshot — bins divided by stepsProcessed so the chart shows a
 * meaningful running average even before the job completes.
 */
export interface AzRangeOutPartial {
  typ: AzRangeOutMsgType.PARTIAL;
  runId: number;
  /** bins[azBinIdx][rngBinIdx] = average count over steps processed so far. */
  bins: number[][];
  numAzBins: number;
  numRngBins: number;
  maxRng: number;
  stepsProcessed: number;
  stepsTotal: number;
}

export interface AzRangeOutResult {
  typ: AzRangeOutMsgType.RESULT;
  runId: number;
  /** bins[azBinIdx][rngBinIdx] = average satellite count per time step. */
  bins: number[][];
  numAzBins: number;
  numRngBins: number;
  maxRng: number;
  /** binSatNums[azBinIdx][rngBinIdx] = catalog numbers of every satellite that ever hit this bin. */
  binSatNums: string[][][];
}

export interface AzRangeOutError {
  typ: AzRangeOutMsgType.ERROR;
  runId: number;
  message: string;
}

export type AzRangeWorkerOutMsg = AzRangeOutPartial | AzRangeOutResult | AzRangeOutError;
