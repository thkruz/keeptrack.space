/**
 * Shared rise/set (AOS/LOS) refinement. Every view that reports a pass start or end (Look Angles,
 * Best Passes, the info box Next Pass) calls this, so one pass has one start and one end, to the second,
 * whatever the sampling step or sample phase of the caller.
 *
 * Rule: a pass starts at the first whole UTC second at which the object is inside the sensor's field of
 * view limits (elevation floor, mask, range) and ends at the last whole UTC second inside them.
 *
 * Pure math over a predicate, so it can move into ootk unchanged.
 */

/** Bisection stops when the bracket is this narrow (ms); the result is then snapped to a whole second. */
const BISECT_MS = 1;

/**
 * Finds the pass edge between a sample that is out of view and one that is in view.
 * @param isInView Whether the object is in view at an epoch (ms).
 * @param outMs Epoch of a sample known to be out of view.
 * @param inMs Epoch of a sample known to be in view. After `outMs` the edge is a rise, before it a set.
 * @returns The in-view whole-second epoch (ms) nearest the crossing.
 */
export const refinePassEdgeMs = (isInView: (epochMs: number) => boolean, outMs: number, inMs: number): number => {
  const isRise = inMs > outMs;
  let lo = outMs;
  let hi = inMs;

  while (Math.abs(hi - lo) > BISECT_MS) {
    const mid = Math.round((hi + lo) / 2);

    if (mid === hi || mid === lo) {
      break;
    }
    if (isInView(mid)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  // hi is the in-view side of the crossing; snap it inward to a whole second that is still in view.
  // The snapped second may lie just outside the caller's bracket, so it is checked directly.
  const step = isRise ? 1000 : -1000;
  let snapped = (isRise ? Math.ceil(hi / 1000) : Math.floor(hi / 1000)) * 1000;

  for (let tries = 0; tries < 3; tries++) {
    if (isInView(snapped)) {
      return snapped;
    }
    snapped += step;
  }

  return hi;
};
