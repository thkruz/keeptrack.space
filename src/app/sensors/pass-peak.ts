/**
 * Shared maximum-elevation refinement. Look Angles, the Doppler pass card and the Visibility Windows report all
 * call this, so one pass has one Max El time, to the second, whatever the sampling step or the sample phase
 * (the simulation clock) of the caller.
 *
 * Rule: the peak is the whole UTC second with the highest elevation; a tie goes to the earlier second.
 *
 * Pure math over an elevation function, so it can move into ootk unchanged.
 */

/** Coarse scan step used by {@link findPassPeakMs}. Pass elevation curves are smooth at this scale. */
export const PEAK_COARSE_STEP_MS = 10000;

type ElevationAt = (epochMs: number) => number | null;

/**
 * Refines a peak known to lie within `halfSpanMs` of `centerMs`: ternary search of the elevation curve, then the
 * whole seconds around the narrowed bracket are compared. `minMs` and `maxMs` bound the search (the pass edges).
 * @returns The whole-second epoch (ms) of the highest elevation and that elevation, or null when no sample resolves.
 */
export const refinePeakMs = (
  elAt: ElevationAt,
  centerMs: number,
  halfSpanMs: number,
  minMs = Number.NEGATIVE_INFINITY,
  maxMs = Number.POSITIVE_INFINITY
): { ms: number; el: number } | null => {
  let lo = Math.max(minMs, centerMs - halfSpanMs);
  let hi = Math.min(maxMs, centerMs + halfSpanMs);

  while (hi - lo > 1000) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;

    if ((elAt(m1) ?? -90) < (elAt(m2) ?? -90)) {
      lo = m1;
    } else {
      hi = m2;
    }
  }
  let best: { ms: number; el: number } | null = null;

  for (let ms = Math.floor(lo / 1000) * 1000; ms <= Math.ceil(hi / 1000) * 1000; ms += 1000) {
    if (ms < minMs - 999 || ms > maxMs + 999) {
      continue;
    }
    const el = elAt(ms);

    if (el !== null && (best === null || el > best.el)) {
      best = { ms, el };
    }
  }

  return best;
};

/**
 * Peak of a pass between `fromMs` and `toMs`: a coarse scan on a grid fixed to the UTC clock (not to `fromMs`),
 * then {@link refinePeakMs} around the best coarse sample.
 */
export const findPassPeakMs = (elAt: ElevationAt, fromMs: number, toMs: number): { ms: number; el: number } | null => {
  let bestMs: number | null = null;
  let bestEl = Number.NEGATIVE_INFINITY;

  for (let t = Math.ceil(fromMs / PEAK_COARSE_STEP_MS) * PEAK_COARSE_STEP_MS; t <= toMs; t += PEAK_COARSE_STEP_MS) {
    const el = elAt(t);

    if (el !== null && el > bestEl) {
      bestEl = el;
      bestMs = t;
    }
  }
  // A window shorter than one coarse step has no grid sample: refine around its middle.
  const centerMs = bestMs ?? (fromMs + toMs) / 2;
  const halfSpanMs = bestMs === null ? Math.max(1000, (toMs - fromMs) / 2) : PEAK_COARSE_STEP_MS;

  return refinePeakMs(elAt, centerMs, halfSpanMs, fromMs, toMs);
};
