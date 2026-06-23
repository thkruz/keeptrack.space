/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * polar-plot-pass.ts - Pure pass-finding and az/el track sampling for the Polar
 * Plot. It has no DOM, ServiceLocator, or timeManager dependencies: every piece
 * of application state it needs (the simulation epoch, look-angle and
 * field-of-regard helpers, and the sun's ECI position) is injected through
 * {@link BestPassDeps}.
 *
 * Pass windows are detected by the shared best-pass calculator (coarse stepping +
 * orbit-period skipping) so the polar plot stays consistent with Best Pass and
 * the Pro polar view, and so a single time scrub no longer triggers a quarter of
 * a million on-thread propagations. Once a window is known, the arc between AOS
 * and LOS is sampled at a finer step to draw a smooth sky track.
 *
 * https://keeptrack.space
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
import { BestPassDeps, findPassesForSat, PassRae } from '@app/plugins/best-pass/best-pass-calculator';
import { Degrees, Kilometers, SatelliteRecord } from '@ootk/src/main';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Defaults tuned so short LEO passes are never skipped while a multi-day scan stays cheap. */
export const POLAR_PASS_DEFAULTS = {
  /** Pass-detection step. 30 s matches the Pro polar view and Best Pass. */
  coarseStepSec: 30,
  /** Track sampling step inside a detected pass; fine enough for a smooth arc. */
  trackStepSec: 5,
  /** How far back to start the search so a pass already in progress keeps its AOS. */
  lookbackMs: 60 * 60 * 1000,
} as const;

export interface PolarSample {
  t: Date;
  az: Degrees;
  el: Degrees;
  rng: Kilometers;
}

export interface PolarPass {
  /** Az/el samples from AOS to LOS, in chronological order. */
  samples: PolarSample[];
  aos: Date;
  los: Date;
  /** Maximum elevation reached during the pass, in degrees. */
  maxEl: Degrees;
  /** Time of maximum elevation (culmination). */
  culmination: Date;
  durationMs: number;
}

export interface PolarPassOptions {
  /** Days to look ahead from the simulation epoch. */
  windowDays: number;
  /** Maximum number of (current + upcoming) passes to return. */
  maxPasses: number;
  coarseStepSec?: number;
  trackStepSec?: number;
  lookbackMs?: number;
}

/**
 * Samples the satellite's az/el track between two times at a fixed step, keeping
 * only the points that are actually within the sensor's field of regard. Pure:
 * it touches only the injected look-angle/field-of-regard helpers.
 */
export const samplePassTrack = (
  satrec: SatelliteRecord,
  sensor: DetailedSensor,
  deps: Pick<BestPassDeps, 'getRae' | 'checkIsInView'>,
  aosMs: number,
  losMs: number,
  stepSec: number = POLAR_PASS_DEFAULTS.trackStepSec,
): PolarSample[] => {
  const samples: PolarSample[] = [];
  const stepMs = Math.max(1, stepSec) * 1000;

  const pushAt = (ms: number): void => {
    const t = new Date(ms);
    const rae = deps.getRae(t, satrec, sensor) as PassRae;

    if (rae.az === null || rae.el === null || !deps.checkIsInView(sensor, rae)) {
      return;
    }

    samples.push({
      t,
      az: rae.az as Degrees,
      el: rae.el as Degrees,
      rng: (rae.rng ?? 0) as Kilometers,
    });
  };

  for (let tMs = aosMs; tMs <= losMs; tMs += stepMs) {
    pushAt(tMs);
  }

  // Ensure the LOS endpoint is represented so the arc reaches the rim, but never
  // duplicate it when the window length is an exact multiple of the step.
  const lastMs = samples.length > 0 ? samples[samples.length - 1].t.getTime() : -Infinity;

  if (lastMs < losMs) {
    pushAt(losMs);
  }

  return samples;
};

/** Builds a {@link PolarPass} from a raw best-pass row plus its sampled track. */
export const buildPolarPass = (row: lookanglesRow, samples: PolarSample[]): PolarPass | null => {
  if (!(row.START_DATE instanceof Date) || !(row.STOP_DATE instanceof Date) || samples.length === 0) {
    return null;
  }

  const aos = row.START_DATE;
  const los = row.STOP_DATE;
  const culmination = typeof row.MAXIMUM_ELEVATION_DTG === 'number' ? new Date(row.MAXIMUM_ELEVATION_DTG) : aos;

  return {
    samples,
    aos,
    los,
    maxEl: parseFloat(row.MAXIMUM_ELEVATION ?? '0') as Degrees,
    culmination,
    durationMs: los.getTime() - aos.getTime(),
  };
};

/**
 * Finds the current and upcoming passes of `satrec` over `sensor` within the
 * look-ahead window and samples each one's sky track. Passes that have already
 * ended (LOS before the simulation epoch) are dropped, so the first entry is the
 * pass in progress or the next one to come.
 */
export const findPolarPasses = (
  satId: string,
  satrec: SatelliteRecord,
  sensor: DetailedSensor,
  deps: BestPassDeps,
  options: PolarPassOptions,
): PolarPass[] => {
  const coarseStepSec = options.coarseStepSec ?? POLAR_PASS_DEFAULTS.coarseStepSec;
  const trackStepSec = options.trackStepSec ?? POLAR_PASS_DEFAULTS.trackStepSec;
  const lookbackMs = options.lookbackMs ?? POLAR_PASS_DEFAULTS.lookbackMs;
  const nowMs = deps.baseTimeMs;

  // Search starting in the past so an in-progress pass keeps its true AOS.
  const searchDeps: BestPassDeps = { ...deps, baseTimeMs: nowMs - lookbackMs };
  const { passes } = findPassesForSat(satId, satrec, sensor, {
    lengthDays: options.windowDays + lookbackMs / MS_PER_DAY,
    intervalSec: coarseStepSec,
    // Over-request: some early rows are dropped for having already ended.
    maxResults: options.maxPasses + 2,
  }, searchDeps);

  const result: PolarPass[] = [];

  for (const row of passes) {
    if (result.length >= options.maxPasses) {
      break;
    }
    if (!(row.STOP_DATE instanceof Date) || row.STOP_DATE.getTime() < nowMs) {
      continue;
    }

    const samples = samplePassTrack(satrec, sensor, deps, (row.START_DATE as Date).getTime(), row.STOP_DATE.getTime(), trackStepSec);
    const pass = buildPolarPass(row, samples);

    if (pass) {
      result.push(pass);
    }
  }

  return result;
};
