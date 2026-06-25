/**
 * Shared time-of-closest-approach (TCA) primitives for the Conjunctions family
 * (TOCA/POCA, Close Objects, Debris Screening).
 *
 * The single global-minimum finder (`findTca`) and the golden-section optimizer
 * live in engine/math/tca-search and are re-exported here so every conjunction
 * tool imports from one place. `findApproachMinima` adds the multi-minimum scan
 * that "next N close approaches" tools need (findTca returns only the closest).
 *
 * Pure math (a scalar distance-of-time function); no astrodynamics or DOM, so it
 * runs identically on the main thread, in unit tests, and inside a web worker.
 */

import { findTca, goldenSectionMin, type DistanceFn, type TcaResult } from '@app/engine/math/tca-search';

export { findTca, goldenSectionMin };
export type { DistanceFn, TcaResult };

/** A refined local minimum of a separation function within the search window. */
export interface ApproachMinimum {
  /** Time of the minimum in ms relative to the search epoch (offset 0). */
  tcaMs: number;
  /** Separation distance (km) at the minimum. */
  missKm: number;
}

/**
 * Scan `[0, windowMs)` for every local minimum of `distFn` and refine each to
 * sub-grid accuracy.
 *
 * The coarse scan establishes descending-then-ascending samples around each dip,
 * so the bracket `[center - step, center + step]` is unimodal - the precondition
 * `goldenSectionMin` requires. Minima exactly at the window edges (a still-closing
 * pass at the end) are not reported by design. Use this when you want the list of
 * upcoming approaches; use `findTca` when you want only the single closest.
 */
export const findApproachMinima = (
  distFn: DistanceFn,
  windowMs: number,
  stepMs: number,
  tolMs = 500,
): ApproachMinimum[] => {
  const minima: ApproachMinimum[] = [];
  let previousDistance = Infinity;
  let isDescending = false;

  for (let t = 0; t < windowMs; t += stepMs) {
    const distance = distFn(t);

    if (previousDistance < Infinity) {
      if (previousDistance < distance && isDescending) {
        // The minimum sits at the previous sample; bracket it and refine.
        const center = t - stepMs;
        const tcaMs = goldenSectionMin(distFn, Math.max(center - stepMs, 0), center + stepMs, tolMs);

        minima.push({ tcaMs, missKm: distFn(tcaMs) });
      }

      isDescending = distance < previousDistance;
    }

    previousDistance = distance;
  }

  return minima;
};
