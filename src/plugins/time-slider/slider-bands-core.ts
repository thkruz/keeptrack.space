/**
 * Pure band math for the time slider's eclipse and epoch-trust layers.
 *
 * No DOM, ServiceLocator or WebGL imports: the plugin samples the selected
 * satellite and hands plain numbers in, so everything here is unit-testable.
 */

import { SunStatus } from '@ootk/src/main';

export type BandKind = 'umbra' | 'penumbra' | 'trust';

export interface Band {
  /** Start of the band as a fraction (0..1) of the slider window. */
  startFrac: number;
  /** End of the band as a fraction (0..1) of the slider window. */
  endFrac: number;
  /** Opacity of the band colour (0..1). */
  alpha: number;
  kind: BandKind;
}

export interface EclipseSample {
  ms: number;
  status: SunStatus;
  /**
   * Optional signed clearance from the cylindrical shadow edge (km): positive when
   * outside the cylinder, negative inside. When both samples around a transition
   * carry it and it changes sign, the edge is placed by linear interpolation
   * instead of at the midpoint.
   */
  clearance?: number;
}

/** Band opacity for a fully shadowed span. */
export const UMBRA_ALPHA = 0.7;
/** Band opacity for a partially shadowed span. */
export const PENUMBRA_ALPHA = 0.35;
/** Above this many eclipse bands, bin into this many equal buckets so the track stays readable. */
export const MAX_ECLIPSE_BANDS = 120;

/** Epoch-age thresholds in days: ok <= 3 < caution <= 7 < low <= 14 < poor. */
export const EPOCH_TRUST_DAYS = [3, 7, 14] as const;

export type TrustLevel = 'ok' | 'caution' | 'low' | 'poor';

/** Track tint opacity per trust level (0x2E, 0x55, 0x80 out of 0xFF). */
export const TRUST_ALPHA: Record<TrustLevel, number> = {
  ok: 0,
  caution: 0x2e / 0xff,
  low: 0x55 / 0xff,
  poor: 0x80 / 0xff,
};

const DAY_MS = 86400e3;

/** Grade an element-set age. Negative ages (sim time before epoch) count by magnitude. */
export const trustLevel = (days: number): TrustLevel => {
  const d = Math.abs(days);

  if (d > EPOCH_TRUST_DAYS[2]) {
    return 'poor';
  }
  if (d > EPOCH_TRUST_DAYS[1]) {
    return 'low';
  }
  if (d > EPOCH_TRUST_DAYS[0]) {
    return 'caution';
  }

  return 'ok';
};

const clamp01_ = (x: number): number => Math.min(1, Math.max(0, x));

const isShadow_ = (s: SunStatus): boolean => s === SunStatus.UMBRAL || s === SunStatus.PENUMBRAL;

/** Time of the boundary between sample a (inside one state) and sample b (inside the next). */
const edgeMs_ = (a: EclipseSample, b: EclipseSample): number => {
  const ca = a.clearance;
  const cb = b.clearance;

  if (typeof ca === 'number' && typeof cb === 'number' && ca * cb < 0) {
    // t = t_i + (t_{i+1} - t_i) * c_i / (c_i - c_{i+1})
    return a.ms + ((b.ms - a.ms) * ca) / (ca - cb);
  }

  return (a.ms + b.ms) / 2;
};

/**
 * Turn time-ordered samples into one band per contiguous umbra or penumbra run,
 * clipped to the window. Edges between samples sit at the midpoint (or the
 * clearance zero crossing when available). When more than
 * {@link MAX_ECLIPSE_BANDS} bands result, returns exactly that many equal
 * buckets whose alpha is the alpha-weighted shadowed fraction of the bucket.
 */
export const eclipseBands = (samples: EclipseSample[], windowStartMs: number, windowEndMs: number): Band[] => {
  const span = windowEndMs - windowStartMs;

  if (!(span > 0) || samples.length === 0) {
    return [];
  }

  const bands: Band[] = [];
  let i = 0;

  while (i < samples.length) {
    const status = samples[i].status;

    if (!isShadow_(status)) {
      i++;
      continue;
    }
    let j = i;

    while (j + 1 < samples.length && samples[j + 1].status === status) {
      j++;
    }
    const startMs = i === 0 ? samples[0].ms : edgeMs_(samples[i - 1], samples[i]);
    const endMs = j === samples.length - 1 ? samples[j].ms : edgeMs_(samples[j], samples[j + 1]);
    const startFrac = clamp01_((startMs - windowStartMs) / span);
    const endFrac = clamp01_((endMs - windowStartMs) / span);

    if (endFrac > startFrac) {
      bands.push({
        startFrac,
        endFrac,
        alpha: status === SunStatus.UMBRAL ? UMBRA_ALPHA : PENUMBRA_ALPHA,
        kind: status === SunStatus.UMBRAL ? 'umbra' : 'penumbra',
      });
    }
    i = j + 1;
  }

  return bands.length > MAX_ECLIPSE_BANDS ? binBands_(bands, MAX_ECLIPSE_BANDS) : bands;
};

const binBands_ = (bands: Band[], count: number): Band[] => {
  const out: Band[] = [];
  const width = 1 / count;
  let k = 0;

  for (let b = 0; b < count; b++) {
    const lo = b * width;
    const hi = (b + 1) * width;
    let weighted = 0;

    // Bands are time-ordered and disjoint, so walk them once across all buckets.
    while (k < bands.length && bands[k].endFrac <= lo) {
      k++;
    }
    for (let m = k; m < bands.length && bands[m].startFrac < hi; m++) {
      const overlap = Math.min(hi, bands[m].endFrac) - Math.max(lo, bands[m].startFrac);

      if (overlap > 0) {
        weighted += overlap * bands[m].alpha;
      }
    }
    out.push({ startFrac: lo, endFrac: hi, alpha: weighted / width, kind: 'umbra' });
  }

  return out;
};

/**
 * Split the window at epoch +/- 3, 7 and 14 days and grade each piece at its
 * midpoint. Pieces are returned in time order, including `ok` pieces (alpha 0)
 * so callers can see the full partition.
 */
export const trustBands = (epochMs: number, windowStartMs: number, windowEndMs: number): Band[] => {
  const span = windowEndMs - windowStartMs;

  if (!(span > 0) || !Number.isFinite(epochMs)) {
    return [];
  }

  const cuts: number[] = [windowStartMs, windowEndMs];

  for (const d of EPOCH_TRUST_DAYS) {
    for (const t of [epochMs - d * DAY_MS, epochMs + d * DAY_MS]) {
      if (t > windowStartMs && t < windowEndMs) {
        cuts.push(t);
      }
    }
  }
  cuts.sort((a, b) => a - b);

  const bands: Band[] = [];

  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];

    if (b <= a) {
      continue;
    }
    const level = trustLevel(((a + b) / 2 - epochMs) / DAY_MS);

    bands.push({ startFrac: (a - windowStartMs) / span, endFrac: (b - windowStartMs) / span, alpha: TRUST_ALPHA[level], kind: 'trust' });
  }

  return bands;
};

const pct_ = (frac: number): string => `${(frac * 100).toFixed(3)}%`;

/**
 * Build a hard-stop `linear-gradient` for the bands. `rgb` is a CSS colour
 * triple usable inside `rgba()`, e.g. `'90, 110, 200'` or
 * `'var(--time-slider-eclipse-rgb)'`. Returns `'none'` when nothing is visible.
 */
export const bandsToGradient = (bands: Band[], rgb: string): string => {
  const visible = bands.filter((b) => b.alpha > 0 && b.endFrac > b.startFrac).sort((a, b) => a.startFrac - b.startFrac);

  if (visible.length === 0) {
    return 'none';
  }

  const stops: string[] = [];

  for (const b of visible) {
    const color = `rgba(${rgb}, ${b.alpha.toFixed(3)})`;

    stops.push(`transparent ${pct_(b.startFrac)}`, `${color} ${pct_(b.startFrac)}`, `${color} ${pct_(b.endFrac)}`, `transparent ${pct_(b.endFrac)}`);
  }

  return `linear-gradient(to right, ${stops.join(', ')})`;
};
