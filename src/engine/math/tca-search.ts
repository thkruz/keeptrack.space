/**
 * tca-search.ts finds the true time of closest approach (TCA) between two
 * objects given a scalar separation-distance function of time. A coarse scan
 * brackets the global minimum inside the search window, then a golden-section
 * refinement narrows it below the requested tolerance.
 *
 * Pure math (no astrodynamics dependencies) so it can run on the main thread or
 * inside a web worker. The golden-section refinement delegates to ootk's
 * GoldenSection so the whole conjunction family shares one optimizer
 * implementation (see src/engine/conjunction).
 */

import { GoldenSection } from '@ootk/src/main';

/** Distance (km) between two objects at time t (ms since the search epoch). */
export type DistanceFn = (tMs: number) => number;

export interface TcaResult {
  /** Time of closest approach in ms relative to the search epoch. */
  tcaMs: number;
  /** Separation distance at TCA in km. */
  missKm: number;
}

/**
 * Golden-section search for the minimum of a unimodal function on [a, b].
 * Returns the abscissa of the minimum to within tolMs. Thin domain wrapper over
 * ootk's GoldenSection so there is one optimizer across the codebase.
 */
export const goldenSectionMin = (fn: DistanceFn, a: number, b: number, tolMs = 50): number =>
  GoldenSection.searchMin(fn, Math.min(a, b), Math.max(a, b), tolMs);

/**
 * Finds the time of closest approach inside [startMs, endMs].
 *
 * A coarse scan with step coarseStepMs locates the smallest sampled
 * separation; a golden-section refinement over the bracketing interval
 * (one coarse step on each side, clamped to the window) then converges on
 * the true minimum. Non-finite samples (failed propagations) are skipped.
 *
 * Returns null when every sample is non-finite.
 */
export const findTca = (
  distFn: DistanceFn,
  startMs: number,
  endMs: number,
  coarseStepMs: number,
  tolMs = 50,
): TcaResult | null => {
  if (endMs <= startMs || coarseStepMs <= 0) {
    return null;
  }

  let bestT = NaN;
  let bestD = Infinity;

  for (let t = startMs; t <= endMs; t += coarseStepMs) {
    const d = distFn(t);

    if (isFinite(d) && d < bestD) {
      bestD = d;
      bestT = t;
    }
  }

  // Always sample the window end so the scan never misses the final segment
  const dEnd = distFn(endMs);

  if (isFinite(dEnd) && dEnd < bestD) {
    bestD = dEnd;
    bestT = endMs;
  }

  if (isNaN(bestT)) {
    return null;
  }

  // Refine inside the bracketing interval around the coarse minimum
  const lo = Math.max(startMs, bestT - coarseStepMs);
  const hi = Math.min(endMs, bestT + coarseStepMs);
  const refinedT = goldenSectionMin(distFn, lo, hi, tolMs);
  const refinedD = distFn(refinedT);

  // Guard against a refinement landing on a failed-propagation sample
  if (isFinite(refinedD) && refinedD <= bestD) {
    return { tcaMs: refinedT, missKm: refinedD };
  }

  return { tcaMs: bestT, missKm: bestD };
};
