import type { EmbedAccessWindow } from './embed-types';

/** One look-angle sample: null when the object cannot be propagated at that time. */
export interface AccessSample {
  inView: boolean;
  elDeg: number;
}

/**
 * Access intervals over [startMs, endMs], clipped to the query window. Samples every `stepMs` plus
 * both boundaries, so a contact that is already under way at startMs (or still running at endMs)
 * is reported from/to the boundary instead of being dropped for lacking a rising or falling edge.
 */
export const sampleAccessWindows = (startMs: number, endMs: number, stepMs: number, sample: (timeMs: number) => AccessSample | null): EmbedAccessWindow[] => {
  const windows: EmbedAccessWindow[] = [];
  let open: EmbedAccessWindow | null = null;
  let lastInViewMs = startMs;

  for (let t = startMs; ; t = Math.min(t + stepMs, endMs)) {
    const s = sample(t);

    if (s?.inView) {
      if (open) {
        open.maxElDeg = Math.max(open.maxElDeg, s.elDeg);
      } else {
        open = { startMs: t, endMs: t, maxElDeg: s.elDeg };
      }
      lastInViewMs = t;
    } else if (open) {
      open.endMs = lastInViewMs;
      windows.push(open);
      open = null;
    }
    if (t >= endMs) {
      break;
    }
  }
  if (open) {
    open.endMs = lastInViewMs;
    windows.push(open);
  }

  return windows;
};
