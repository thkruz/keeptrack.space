/**
 * Orbit Cruncher Web Worker Message Types
 *
 * Typed message interfaces for communication between the main thread
 * and the orbitCruncher web worker. Follows the same pattern as
 * position-cruncher-messages.ts and color-worker-messages.ts.
 */

import { Degrees, Kilometers, SatelliteRecord } from '@ootk/src/main';

// ─── Message Type Enum ──────────────────────────────────────────────────────

export const enum OrbitCruncherMsgType {
  INIT = 0,
  SATELLITE_UPDATE = 1,
  MISSILE_UPDATE = 2,
  CHANGE_ORBIT_TYPE = 3,
  SETTINGS_UPDATE = 4,
  /** Worker → Main: orbit points calculated */
  RESPONSE_DATA = 5,
}

export enum OrbitDrawTypes {
  ORBIT,
  TRAIL,
}

// ─── Incoming Messages (Main Thread → Worker) ───────────────────────────────

export interface OrbitCruncherInMsgInit {
  typ: OrbitCruncherMsgType.INIT;
  orbitFadeFactor?: number;
  objData: string;
  numSegs: number;
  numberOfOrbitsToDraw?: number;
  /** Catalog-swap sequence number. Worker rejects update messages older than the last INIT. */
  seqNum?: number;
}

export interface OrbitCruncherInMsgSatelliteUpdate {
  typ: OrbitCruncherMsgType.SATELLITE_UPDATE;
  id: number;
  /** Simulation time (ms since epoch) — computed on main thread to avoid worker scheduling skew */
  simulationTime: number;
  tle1?: string;
  tle2?: string;
  isEcfOutput: boolean;
  isPolarViewEcf?: boolean;
  seqNum?: number;
}

export interface OrbitCruncherInMsgMissileUpdate {
  typ: OrbitCruncherMsgType.MISSILE_UPDATE;
  id: number;
  /** Simulation time (ms since epoch) — computed on main thread to avoid worker scheduling skew */
  simulationTime: number;
  latList?: Degrees[];
  lonList?: Degrees[];
  altList?: Kilometers[];
  /**
   * Launch epoch (ms since Unix epoch) of sample index 0. Each sample sits one
   * second later (the 1 Hz cadence the position cruncher indexes by), so the
   * worker can rotate every sample to ECI with the GMST at *its* time instead of
   * one GMST for the whole arc — which otherwise spins a multi-hour trajectory
   * (e.g. a GEO intercept) far off its dots.
   */
  startTime?: number;
  isEcfOutput: boolean;
  isPolarViewEcf?: boolean;
  seqNum?: number;
}

export interface OrbitCruncherInMsgChangeOrbitType {
  typ: OrbitCruncherMsgType.CHANGE_ORBIT_TYPE;
  orbitType: OrbitDrawTypes;
}

export interface OrbitCruncherInMsgSettingsUpdate {
  typ: OrbitCruncherMsgType.SETTINGS_UPDATE;
  numberOfOrbitsToDraw: number;
}

export type OrbitCruncherInMsgs =
  | OrbitCruncherInMsgInit
  | OrbitCruncherInMsgSatelliteUpdate
  | OrbitCruncherInMsgMissileUpdate
  | OrbitCruncherInMsgChangeOrbitType
  | OrbitCruncherInMsgSettingsUpdate;

// ─── Outgoing Messages (Worker → Main Thread) ──────────────────────────────

export interface OrbitCruncherOutMsgPoints {
  typ: OrbitCruncherMsgType.RESPONSE_DATA;
  /**
   * Orbit path vertices RELATIVE to `anchor` (x, y, z, alpha per vertex). The
   * subtraction happens in the worker in float64, BEFORE the float32 write, so
   * near-anchor vertices survive the float32 buffer with sub-mm precision. At
   * full orbital magnitude (~42164 km for GEO) one float32 ULP is ~4 m and its
   * per-frame rounding re-roll made ECF orbit lines visibly shiver when zoomed
   * in; the renderer re-adds the anchor via a float64-computed uniform.
   */
  pointsOut: Float32Array;
  /**
   * Float64 anchor (the first computed path point) in the same frame as
   * `pointsOut` (ECEF when isEcfOutput/isPolarViewEcf, TEME otherwise).
   * [0, 0, 0] for empty/invalid responses.
   */
  anchor: [number, number, number];
  satId: number;
  /** Echoes the seqNum the worker was on when it produced these points. Main thread drops stale responses. */
  seqNum?: number;
}

// ─── Object Cache Types (used inside the worker) ───────────────────────────

export interface OrbitCruncherOtherObject {
  ignore: true;
}

export interface OrbitCruncherSatelliteObject {
  satrec: SatelliteRecord;
  tle1: string;
  tle2: string;
}

export interface OrbitCruncherMissileObject {
  missile: true;
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
  /** Launch epoch (ms) of sample 0; enables per-sample GMST. See the update message. */
  startTime?: number;
}

export type OrbitCruncherCachedObject =
  | OrbitCruncherOtherObject
  | OrbitCruncherSatelliteObject
  | OrbitCruncherMissileObject;
