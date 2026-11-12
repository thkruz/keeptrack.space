/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * best-pass-calculator.ts contains the pure pass-finding and scoring math for the
 * Best Pass plugin. It has no DOM, ServiceLocator, or timeManager dependencies:
 * every piece of application state it needs (the simulation epoch, look-angle and
 * field-of-regard helpers, and the sun's ECI position) is injected through
 * {@link BestPassDeps}. This lets the exact same logic run on the main thread and
 * inside a Web Worker, and lets it be unit-tested without a browser.
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { lookanglesRow } from '@app/engine/core/interfaces';
import { Degrees, eci2rae, Kilometers, MINUTES_PER_DAY, SatelliteRecord, TAU } from '@ootk/src/main';

/** Default per-satellite cap on how many passes are collected before truncating. */
export const DEFAULT_MAX_RESULTS = 5000;

/** Pass AOS/LOS are bisected to this resolution (ms). */
export const EDGE_REFINE_MS = 1000;

/** Elevation (deg) at or below which a pass edge counts as a horizon-grazing pass. */
const HORIZON_ELEVATION_DEG = 3.5;

/** Look angle in the units returned by SatMath.getRae (az/el in degrees, rng in km). */
export interface PassRae {
  az: number | null;
  el: number | null;
  rng: number | null;
}

/** Returns the satellite's look angle from the sensor at the given time. */
export type GetRaeFn = (date: Date, satrec: SatelliteRecord, sensor: DetailedSensor) => PassRae;

/** Returns true when the look angle is within the sensor's field of regard. */
export type CheckInViewFn = (sensor: DetailedSensor, rae: PassRae) => boolean;

/** Returns the sun's ECI position (km) at the given time. */
export type SunEciFn = (date: Date) => { x: Kilometers; y: Kilometers; z: Kilometers };

export interface BestPassOptions {
  /** Number of days to look ahead from the simulation epoch. */
  lengthDays: number;
  /** Propagation step in seconds. */
  intervalSec: number;
  /** Maximum passes to collect for a single satellite before truncating. */
  maxResults?: number;
  /**
   * Opt-in. When true, a pass in view at the first sample starts at the window start and a pass
   * still in view at the last sample ends at the window end, flagged START_CLIPPED / END_CLIPPED.
   * Default false: such contacts behave as before (no start, or no stop, so no row).
   */
  includeClippedPasses?: boolean;
  /**
   * Resolution (ms) pass AOS/LOS are bisected to. Default {@link EDGE_REFINE_MS} (1 s).
   * 0 disables refinement, so edges are the coarse samples (the pre-refinement behavior).
   */
  edgeRefineMs?: number;
}

export interface BestPassDeps {
  /** Simulation epoch in ms; all offsets are added to this. */
  baseTimeMs: number;
  getRae: GetRaeFn;
  checkIsInView: CheckInViewFn;
  sunEciKm: SunEciFn;
}

export interface BestPassResult {
  /** Raw pass rows. START_DTG is numeric (ms) and date/time fields hold Date objects;
   *  call {@link normalizePassRows} before display/export. */
  passes: lookanglesRow[];
  /** True when the per-satellite {@link BestPassOptions.maxResults} cap was hit. */
  truncated: boolean;
}

/** Named weights for {@link scorePass}; kept out of the loop so they are documented and tweakable. */
const SCORE = {
  /** A pass earns full duration points at 8 minutes in coverage. */
  durationFullMin: 8,
  durationMax: 10,
  /** A pass earns full elevation points at 50 deg maximum elevation. */
  elevationFullDeg: 50,
  elevationMax: 10,
  /** Horizon-to-horizon passes double their elevation points. */
  horizonToHorizonMultiplier: 2,
  /** A pass earns full range points at 750 km minimum range. */
  rangeFullKm: 750,
  rangeMax: 10,
};

/**
 * Scores a single pass 0..30 from its geometry. Longer passes, higher maximum
 * elevation, and closer minimum range all score better; horizon-to-horizon
 * passes (both edges low on the horizon) get bonus elevation points.
 */
export const scorePass = (durationMs: number, maxElDeg: number, minRngKm: number, isHorizonToHorizon: boolean): number => {
  let score = Math.min(((durationMs / 1000 / 60) * SCORE.durationMax) / SCORE.durationFullMin, SCORE.durationMax);

  let elScore = Math.min((maxElDeg / SCORE.elevationFullDeg) * SCORE.elevationMax, SCORE.elevationMax);

  elScore *= isHorizonToHorizon ? SCORE.horizonToHorizonMultiplier : 1;
  score += elScore;
  score += Math.min((SCORE.rangeMax * SCORE.rangeFullKm) / minRngKm, SCORE.rangeMax);

  return score;
};

/** An all-null pass row, used as the "no pass detected at this step" sentinel. */
export const emptyPassRow = (): lookanglesRow => ({
  START_DTG: null,
  SATELLITE_ID: null,
  SENSOR: null,
  PASS_SCORE: null,
  START_DATE: null,
  START_TIME: null,
  START_AZIMUTH: null,
  START_ELEVATION: null,
  START_RANGE: null,
  STOP_DATE: null,
  STOP_TIME: null,
  STOP_AZIMTUH: null,
  STOP_ELEVATION: null,
  STOP_RANGE: null,
  TIME_IN_COVERAGE_SECONDS: null,
  MINIMUM_RANGE: null,
  MAXIMUM_ELEVATION: null,
  MAXIMUM_ELEVATION_DTG: null,
  SENSOR_TO_SUN_AZIMUTH: null,
  SENSOR_TO_SUN_ELEVATION: null,
});

/**
 * Finds the best passes of a single satellite over a single sensor within the
 * look-ahead window. After detecting a pass it skips ~75% of an orbital period
 * to avoid re-detecting the same pass on the next propagation step.
 *
 * Rows are returned raw (numeric START_DTG, Date date/time fields) so callers can
 * sort across satellites by START_DTG before {@link normalizePassRows} stringifies them.
 */
export const findPassesForSat = (
  satId: string,
  satrec: SatelliteRecord,
  sensor: DetailedSensor,
  options: BestPassOptions,
  deps: BestPassDeps,
  sensorName: string | null = null
): BestPassResult => {
  const { baseTimeMs, getRae, checkIsInView, sunEciKm } = deps;
  const looksInterval = options.intervalSec;
  const looksLength = options.lengthDays;
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;

  const timeAt = (offsetMs: number): Date => new Date(baseTimeMs + offsetMs);
  const windowSec = looksLength * 24 * 60 * 60;
  const clip = options.includeClippedPasses === true;

  const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU);

  const passes: lookanglesRow[] = [];
  let truncated = false;

  let offset = 0;
  let score = 0;
  let sAz: string | null = null;
  let sEl: string | null = null;
  let srng: string | null = null;
  let sTime: Date | null = null;
  let passMinrng: number = sensor.maxRng;
  let passMaxEl = 0;
  let passMaxElTime: Date | null = null;
  let start3 = false;
  let stop3 = false;
  /** True when this pass's AOS was produced by the horizon mask. */
  let startMasked = false;
  /** True when the pass was already in view at the first sample, so its real AOS is before the window. */
  let startClipped = false;
  /** True when the last emitted pass's LOS was produced by the horizon mask. */
  let lastStopMasked = false;

  /** The out-of-view neighbour of an edge sample is mask-blocked: the mask made this edge. */
  const isMaskEdge = (rae: PassRae): boolean =>
    rae.az !== null && rae.el !== null && typeof sensor.isMaskBlocked === 'function' && sensor.isMaskBlocked(rae.az as Degrees, rae.el as Degrees);

  /** Loop counter in seconds from the window start; the loop variable itself so float drift cannot hide the last sample. */
  let offsetSec = 0;

  /**
   * Bisects between an out-of-view sample and an in-view sample down to {@link EDGE_REFINE_MS}
   * and returns the in-view side, so pass AOS/LOS agree with finer-grained consumers (the
   * access timeline) instead of being quantised to the coarse step.
   */
  const refineMs = options.edgeRefineMs ?? EDGE_REFINE_MS;
  const refineEdge = (outDate: Date, inDate: Date, inRae: PassRae): { date: Date; rae: PassRae } => {
    let outMs = outDate.getTime();
    let inMs = inDate.getTime();
    let rae = inRae;

    while (Number.isFinite(refineMs) && refineMs >= 1 && Math.abs(inMs - outMs) > refineMs) {
      const midMs = Math.round((inMs + outMs) / 2);
      const midRae = getRae(new Date(midMs), satrec, sensor);

      if (checkIsInView(sensor, midRae)) {
        inMs = midMs;
        rae = midRae;
      } else {
        outMs = midMs;
      }
    }

    return { date: new Date(inMs), rae };
  };

  const propagateBestPass = (now: Date): lookanglesRow => {
    const aer = getRae(now, satrec, sensor) as Required<PassRae>;
    const isInFOV = checkIsInView(sensor, aer);

    if (!isInFOV) {
      return emptyPassRow();
    }

    const isFirstSample = clip && offsetSec === 0;
    const isLastSample = clip && offsetSec + looksInterval >= windowSec;
    let aer1: PassRae = aer;
    let isInFOV1 = true;

    if (!isFirstSample) {
      aer1 = getRae(timeAt(offset - looksInterval * 1000), satrec, sensor);
      isInFOV1 = checkIsInView(sensor, aer1);
    }

    const isRising = isFirstSample || !isInFOV1;

    if (isRising) {
      // Drop any state left by a discarded single-sample contact.
      if (clip) {
        resetPassState();
      } else {
        // Default path: the earlier lone contact is still dropped, but its peak must not carry over.
        passMinrng = sensor.maxRng;
        passMaxEl = 0;
        passMaxElTime = null;
        start3 = false;
      }
      // Rising edge: the previous step was out of view, so this is the pass start.
      // At the first sample the satellite is already in view: the window start acts as AOS.
      // A clipped start is not a real horizon crossing, so it never earns the horizon bonus.
      if (!isFirstSample && aer.el <= HORIZON_ELEVATION_DEG) {
        start3 = true;
      }
      startClipped = isFirstSample;
      startMasked = isFirstSample ? false : isMaskEdge(aer1);
      const rise = isFirstSample ? { date: now, rae: aer } : refineEdge(timeAt(Math.max(offset - looksInterval * 1000, 0)), now, aer);

      sTime = rise.date;
      sAz = (rise.rae.az as number).toFixed(0);
      sEl = (rise.rae.el as number).toFixed(1);
      srng = (rise.rae.rng as number).toFixed(0);
    }

    // A rising sample can only close the pass at once when it is the last one in the window.
    if (!isRising || isLastSample) {
      const now2 = timeAt(clip ? Math.min(offset + looksInterval * 1000, windowSec * 1000) : offset + looksInterval * 1000);

      aer1 = getRae(now2, satrec, sensor);
      isInFOV1 = checkIsInView(sensor, aer1);
      // At the last sample the window end acts as LOS even if the satellite is still in view.
      const endClipped = isLastSample && isInFOV1;

      // A contact seen only at the last sample is dropped, as single-sample contacts are elsewhere.
      if (isRising && !endClipped) {
        return emptyPassRow();
      }

      if (!isInFOV1 || isLastSample) {
        if (clip) {
          if (passMaxEl < aer.el) {
            passMaxEl = aer.el;
            passMaxElTime = now;
          }
          if (passMinrng > aer.rng) {
            passMinrng = aer.rng;
          }
        }

        // Falling edge: the next step is out of view (or the window ends), so this is the pass stop.
        // A clipped end is the window end itself, not the last sample, and never earns the horizon bonus.
        stop3 = !endClipped && aer.el <= HORIZON_ELEVATION_DEG;

        if (sTime === null) {
          return emptyPassRow();
        }

        const set = endClipped ? null : refineEdge(timeAt(Math.min(now2.getTime() - baseTimeMs, windowSec * 1000)), now, aer);
        const stopTime = endClipped ? timeAt(windowSec * 1000) : (set as { date: Date }).date;
        const stopRae: PassRae = endClipped ? getRae(stopTime, satrec, sensor) : (set as { rae: PassRae }).rae;

        if (endClipped && stopRae.el !== null && stopRae.el !== undefined && passMaxEl < stopRae.el) {
          passMaxEl = stopRae.el;
          passMaxElTime = stopTime;
        }
        if (endClipped && stopRae.rng !== null && stopRae.rng !== undefined && passMinrng > stopRae.rng) {
          passMinrng = stopRae.rng;
        }

        const durationMs = stopTime.getTime() - sTime.getTime();

        score = scorePass(durationMs, passMaxEl, passMinrng, start3 && stop3);

        const tic = durationMs / 1000 || 0;
        const sunRae = eci2rae(stopTime, sunEciKm(stopTime), sensor);

        lastStopMasked = endClipped ? false : isMaskEdge(aer1);

        return {
          START_DTG: sTime.getTime(),
          SATELLITE_ID: satId,
          SENSOR: sensorName,
          PASS_SCORE: score.toFixed(1),
          START_DATE: sTime,
          START_TIME: sTime,
          START_AZIMUTH: sAz!,
          START_ELEVATION: sEl!,
          START_RANGE: srng!,
          STOP_DATE: stopTime,
          STOP_TIME: stopTime,
          STOP_AZIMTUH: (stopRae.az ?? aer.az).toFixed(0),
          STOP_ELEVATION: (stopRae.el ?? aer.el).toFixed(1),
          STOP_RANGE: (stopRae.rng ?? aer.rng).toFixed(0),
          TIME_IN_COVERAGE_SECONDS: tic,
          MINIMUM_RANGE: passMinrng.toFixed(0),
          MAXIMUM_ELEVATION: passMaxEl.toFixed(1),
          MAXIMUM_ELEVATION_DTG: (passMaxElTime ?? sTime).getTime(),
          SENSOR_TO_SUN_AZIMUTH: sunRae.az.toFixed(1),
          SENSOR_TO_SUN_ELEVATION: sunRae.el.toFixed(1),
          MASK_LIMITED: startMasked || lastStopMasked,
          ...(clip ? { START_CLIPPED: startClipped, END_CLIPPED: endClipped } : {}),
          MASK_APPLIED: typeof sensor.hasElevationMask === 'function' && sensor.hasElevationMask(),
        };
      }
    }

    if (passMaxEl < aer.el) {
      passMaxEl = aer.el;
      passMaxElTime = now;
    }
    if (passMinrng > aer.rng) {
      passMinrng = aer.rng;
    }

    return emptyPassRow();
  };

  const resetPassState = (): void => {
    score = 0;
    sAz = null;
    sEl = null;
    srng = null;
    sTime = null;
    passMinrng = sensor.maxRng;
    passMaxEl = 0;
    passMaxElTime = null;
    start3 = false;
    stop3 = false;
    startMasked = false;
    startClipped = false;
  };

  for (let i = 0; i < windowSec; i += looksInterval) {
    if (passes.length >= maxResults) {
      truncated = true;
      break;
    }

    offsetSec = i;
    offset = i * 1000;
    const now = timeAt(offset);
    const row = propagateBestPass(now);

    if (row.PASS_SCORE !== null) {
      passes.push(row);
      resetPassState();
      /*
       * Skip most of one orbit to avoid re-detecting this pass, unless the horizon mask
       * cut it short: then the same overflight re-emerges minutes later as a second contact.
       */
      if (!lastStopMasked) {
        i += orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }
  }

  return { passes, truncated };
};

/**
 * Stringifies raw pass rows in place for display/export: START_DTG becomes a full
 * ISO timestamp, START/STOP_DATE become date-only, and START/STOP_TIME become
 * time-only (HH:MM:SS). Safe to call once after sorting across satellites.
 */
export const normalizePassRows = (passes: lookanglesRow[]): lookanglesRow[] => {
  for (const pass of passes) {
    pass.START_DTG = (pass.START_DATE as Date).toISOString();
    pass.START_DATE = (pass.START_DATE as Date).toISOString().split('T')[0];
    pass.START_TIME = (pass.START_TIME as Date).toISOString().split('T')[1].split('.')[0];
    pass.STOP_DATE = (pass.STOP_DATE as Date).toISOString().split('T')[0];
    pass.STOP_TIME = (pass.STOP_TIME as Date).toISOString().split('T')[1].split('.')[0];
  }

  return passes;
};

/**
 * Wraps a {@link GetRaeFn} to remember whether any sample produced a look angle. Opt-in for
 * the Best Passes worker and OSS sync path only; {@link findPassesForSat} and its other
 * callers are unchanged. A decayed object or a TLE the propagator rejects yields null
 * elevations for every sample and no passes, without throwing.
 */
export const trackRaeFailure = (getRae: GetRaeFn): { getRae: GetRaeFn; failed: () => boolean } => {
  let samples = 0;
  let resolved = 0;

  return {
    getRae: (date, satrec, sensor) => {
      const rae = getRae(date, satrec, sensor);

      samples++;
      if (typeof rae.el === 'number' && Number.isFinite(rae.el)) {
        resolved++;
      }

      return rae;
    },
    failed: () => samples > 0 && resolved === 0,
  };
};
