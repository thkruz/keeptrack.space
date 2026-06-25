import { ToastMsgType } from '@app/engine/core/interfaces';
import { Degrees, Kilometers } from '@ootk/src/main';

/**
 * Input contract for creating a missile.
 *
 * Replaces the 14 positional parameters that `missileManager.createMissile`
 * historically accepted. Used internally by [MissileSimulation] today; will
 * become the public API in PR 4.
 */
export interface MissileSpec {
  launchLatitude: number;
  launchLongitude: number;
  targetLatitude: number;
  targetLongitude: number;
  numberOfWarheads: number;
  missileObjectNum: number;
  startTime: number;
  description: string;
  length?: number;
  diameter?: number;
  burnRate?: number;
  maxRangeKm: number;
  country?: string;
  minAltitudeKm?: number;
}

/**
 * Structured public result of a missile launch attempt.
 *
 * Returned by the future `MissileManager.createMissile(spec)` (PR 4). For PR 2
 * this is defined alongside its consumer but not yet exposed to callers - the
 * legacy `Missile()` still returns `1` / `0`.
 */
export interface MissileLaunchResult {
  success: boolean;
  missileId?: number;
  errorMessage?: string;
  errorType?: ToastMsgType;
  retryCount?: number;
}

/** Raw trajectory output produced by a single `MissileSimulation.run()`. */
export interface MissileTrajectory {
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
  maxAltitudeKm: number;
}

/**
 * Tagged-union result of `MissileSimulation.run()`.
 *
 * The simulation reports four distinct outcomes:
 * - `success`: a complete trajectory landed within the requested apogee.
 * - `error`: a downstream-visible failure (e.g. out-of-range arc length).
 *   Carries a human-readable message and severity for the toast/error UI.
 * - `lowApogee`: the trajectory completed but maxAlt < minAltitudeTrue. The
 *   caller may retry with a higher burn rate. Carries the suggested multiplier.
 * - `tooClose`: the requested arc is too short for the missile's minAltitude
 *   to be physically attainable (saturates the range cap).
 */
export type MissileSimulationResult =
  | {
    kind: 'success';
    trajectory: MissileTrajectory;
  }
  | {
    kind: 'error';
    errorMessage: string;
    errorType: ToastMsgType;
  }
  | {
    kind: 'lowApogee';
    burnMultiplier: number;
  }
  | {
    kind: 'tooClose';
    errorMessage: string;
    errorType: ToastMsgType;
  };
