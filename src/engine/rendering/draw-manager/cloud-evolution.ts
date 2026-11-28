/**
 * Cloud evolution: removes some of the painted cloud coverage depending on the simulation date, never adds any.
 * TS twin of CLOUD_EVOLUTION_GLSL (painted-clouds-glsl.ts); keep the constants in step.
 *
 * Two noise terms decide how far the cloud is eroded at a point and time (e, 0..1), and the larger of the two wins:
 * - holes: two octaves (about 1500 km and 500 km cells) cross-faded every `periodDays`;
 * - storm systems: one coarse octave (about 4000 km cells) cross-faded every `stormPeriodDays`, so whole cloud masses
 *   come and go over a few days instead of only being punched through.
 *
 * Erosion is a threshold cut, not a rescale (W5). The W4 rescale `(c - h) / (1 - h + soft h)` turned a dense deck into a
 * broad band of half-transparent cloud along the smooth noise blob ("an eraser that fades the edge"). Now each point
 * has a survival score s = c + detailAmp (d - 0.5), where d is the cloud map itself read at two rotated directions
 * (real cloud shape from elsewhere on the globe). Cloud survives where s is above the cut level L(e) and keeps its
 * coverage unchanged there; it goes to zero across a narrow feather of the score around L. So the new edge follows
 * the contours of real cloud (the deck's own thin parts first, then the shape of the borrowed cloud through a uniform
 * deck), is opaque right up to the edge, and breaks into detached fragments where e changes slowly.
 */
export const CLOUD_EVOLUTION = {
  /** Noise cells per unit sphere radius for the two hole octaves (about 1500 km and 500 km on the ground). */
  freq1: 4.25,
  freq2: 12.75,
  /** Weight of the second octave. */
  w2: 0.35,
  /** Hole noise below `lo` is fully eroded (at full depth); above `hi` is untouched. */
  lo: 0.15,
  hi: 0.48,
  /** Hole cross-fade period in days (18 h; 12 h made a hole open within about an hour). */
  periodDays: 0.75,
  /** Storm-system octave: cells per unit radius (about 4000 km), thresholds, and cross-fade period (days). */
  stormFreq: 1.6,
  stormLo: 0.11,
  stormHi: 0.43,
  stormPeriodDays: 2.5,
  /** Strength at which the erosion reaches full depth (e can be 1); below it the depth scales down linearly. */
  fullDepthStrength: 0.5,
  /** Above `fullDepthStrength` the thresholds rise by this much per unit strength, so more is removed more often. */
  thresholdPerStrength: 0.1,
  /** Weight of the borrowed cloud detail in the survival score. */
  detailAmp: 1.5,
  /** Half width of the cut feather, in score units. */
  feather: 0.3,
  /** The borrowed map value is turned into cloud opacity (as paintedCloudOpacity) so the detail is real cloud shape. */
  detailLo: 0.08,
  detailHi: 0.65,
  /**
   * Level of detail of the detail reads on the 8k map (2 = a 2048-wide map, about 20 km texels). Fixed in ground
   * terms (W6): a smaller map reads its own level that matches it, and the camera never changes it. It used to be
   * added to the caller's footprint level, so zooming or turning the globe moved the cut.
   */
  detailLod: 2,
  /** Width of the map that detailLod is counted on. */
  detailLodMapWidth: 8192,
  /** Share of the synthetic fallback in the cut detail, and its base frequency (cells per unit radius). */
  synthWeight: 0.45,
  synthFreq: 24,
} as const;

/** Rotation matrix (row major) for an axis (any length) and angle. */
function rotation(axis: readonly [number, number, number], angle: number): number[] {
  const l = Math.hypot(...axis);
  const [x, y, z] = axis.map((a) => a / l);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;

  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
}

/**
 * The two rotations that pick where on the globe the detail is borrowed from. Their poles (where the equirectangular
 * map is smeared) fall far from each other, and each read is weighted by the squared cosine of its own latitude.
 */
export const CLOUD_DETAIL_ROTATIONS: readonly (readonly number[])[] = [rotation([0.3, 0.8, 0.52], 2.1), rotation([-0.7, 0.2, 0.68], 3.9)];

const fract = (x: number) => x - Math.floor(x);

function hash13(x: number, y: number, z: number): number {
  let a = fract(x * 0.1031);
  let b = fract(y * 0.1031);
  let c = fract(z * 0.1031);
  const d = a * (c + 31.32) + b * (b + 31.32) + c * (a + 31.32);

  a += d;
  b += d;
  c += d;

  return fract((a + b) * c);
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));

  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function valueNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const h = (i: number, j: number, k: number) => hash13(ix + i, iy + j, iz + k);

  return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), ux), lerp(h(0, 1, 0), h(1, 1, 0), ux), uy), lerp(lerp(h(0, 0, 1), h(1, 0, 1), ux), lerp(h(0, 1, 1), h(1, 1, 1), ux), uy), uz);
}

/** lowbias32 integer hash, the twin of ceHashU (32-bit unsigned arithmetic). */
export function cloudEvolutionHashU(x: number): number {
  let h = x >>> 0;

  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 0x846ca68b) >>> 0;

  return (h ^ (h >>> 16)) >>> 0;
}

/** Twin of ceHashK: 24 exact bits in [0, 1). */
const hashK = (m: number, i: number): number => (cloudEvolutionHashU(m * 8 + i) >>> 8) / 16777216;

/**
 * Noise offset of field k, twin of ceOffset. An integer hash (W9): the float hash it replaced gave offsets up to 0.14
 * noise cells apart under two legal float32 evaluations, and the GPU switched between them from frame to frame.
 */
export function cloudEvolutionOffset(k: number, salt: number): [number, number, number] {
  const m = ((Math.round(k) % 4096) + 4096) % 4096;
  const s = Math.round(salt);

  return [37 * hashK(m, s), 37 * hashK(m, s + 1), 37 * hashK(m, s + 2)];
}

const offset = cloudEvolutionOffset;

function field(p: readonly [number, number, number], k: number): number {
  const o = offset(k, 0);
  const { freq1, freq2, w2 } = CLOUD_EVOLUTION;
  const n1 = valueNoise(p[0] * freq1 + o[0], p[1] * freq1 + o[1], p[2] * freq1 + o[2]);
  const n2 = valueNoise(p[0] * freq2 + o[1], p[1] * freq2 + o[2], p[2] * freq2 + o[0]);

  return n1 * (1 - w2) + n2 * w2;
}

function stormField(p: readonly [number, number, number], k: number): number {
  const o = offset(k, 3);
  const f = CLOUD_EVOLUTION.stormFreq;

  return valueNoise(p[0] * f + o[0], p[1] * f + o[1], p[2] * f + o[2]);
}

/**
 * Cross-fade of two independent fields with the spread kept: a plain mix of two fields is flatter half way through
 * (fewer extremes, so fewer holes every half period); dividing the offset from 0.5 by the mix's standard-deviation
 * factor keeps the share of hidden area steady through the period.
 */
function crossFade(a: number, b: number, s: number): number {
  return 0.5 + (lerp(a, b, s) - 0.5) / Math.sqrt((1 - s) * (1 - s) + s * s);
}

/** Field index wrap: the offsets repeat every 4096 periods (the shader hashes k mod 4096 too). */
const PHASE_WRAP = 4096;

/**
 * Cross-fade phase of the two noise terms at `tDays` (W6): [hole period index mod 4096, hole fraction 0..1, storm
 * period index mod 4096, storm fraction]. Computed in double precision and sent to the shaders as one vec4.
 * Sending tDays itself (about 20,700 days since 1970) as a float32 uniform rounds it to 2^-9 day = 168.75 s, so the
 * cut jumped every 2.8 minutes at real time (a visible pop) and moved in steps under time-lapse.
 */
export function cloudEvolutionPhase(tDays: number): [number, number, number, number] {
  const u = tDays / CLOUD_EVOLUTION.periodDays;
  const us = tDays / CLOUD_EVOLUTION.stormPeriodDays;
  const k = Math.floor(u);
  const ks = Math.floor(us);
  const wrap = (x: number) => ((x % PHASE_WRAP) + PHASE_WRAP) % PHASE_WRAP;

  return [wrap(k), u - k, wrap(ks), us - ks];
}

/** The time-varying hole noise in about 0..1 at unit direction `p` (Earth-fixed) and time `tDays`. */
export function cloudEvolutionNoise(p: readonly [number, number, number], tDays: number): number {
  const [k, s] = cloudEvolutionPhase(tDays);

  return crossFade(field(p, k), field(p, k + 1), smooth(0, 1, s));
}

/** The time-varying storm-system noise in about 0..1. */
export function cloudEvolutionStormNoise(p: readonly [number, number, number], tDays: number): number {
  const [, , k, s] = cloudEvolutionPhase(tDays);

  return crossFade(stormField(p, k), stormField(p, k + 1), smooth(0, 1, s));
}

/** How far the cloud is eroded here and now (0..1; 1 removes everything). Strength 0 erodes nothing. */
export function cloudEvolutionHide(p: readonly [number, number, number], tDays: number, strength: number): number {
  if (strength <= 0) {
    return 0;
  }
  const E = CLOUD_EVOLUTION;
  const depth = Math.min(1, strength / E.fullDepthStrength);
  const shift = Math.max(0, strength - E.fullDepthStrength) * E.thresholdPerStrength;
  const holes = 1 - smooth(E.lo + shift, E.hi + shift, cloudEvolutionNoise(p, tDays));
  const storms = 1 - smooth(E.stormLo + shift, E.stormHi + shift, cloudEvolutionStormNoise(p, tDays));

  return depth * Math.max(holes, storms);
}

/** Equirectangular uv of a unit direction (inverse of directionFromUv). */
export function uvFromDirection(p: readonly [number, number, number]): [number, number] {
  const lon = Math.atan2(p[1], p[0]);
  const lat = Math.asin(Math.min(1, Math.max(-1, p[2])));

  return [0.5 + lon / (2 * Math.PI), 0.5 - lat / Math.PI];
}

/** Static (Earth-anchored) synthetic detail in about 0..1: three value-noise octaves, the fallback where the borrowed
 * cloud is flat (clear sky or a uniform deck). */
export function cloudEvolutionSynthDetail(p: readonly [number, number, number]): number {
  const f = CLOUD_EVOLUTION.synthFreq;
  const n1 = valueNoise(p[0] * f + 11.3, p[1] * f + 7.1, p[2] * f + 3.7);
  const n2 = valueNoise(p[0] * 2 * f + 5.9, p[1] * 2 * f + 13.4, p[2] * 2 * f + 1.3);
  const n3 = valueNoise(p[0] * 4 * f + 2.2, p[1] * 4 * f + 4.8, p[2] * 4 * f + 9.6);

  return 0.5 * n1 + 0.3 * n2 + 0.2 * n3;
}

/** Level of detail of the detail reads on a map `mapWidth` texels wide: the same ground resolution on any map. */
export function cloudDetailLod(mapWidth: number): number {
  return Math.max(0, CLOUD_EVOLUTION.detailLod + Math.log2(mapWidth / CLOUD_EVOLUTION.detailLodMapWidth));
}

/**
 * Cut detail at `p` (0..1): the cloud map's opacity read at two rotated directions (real cloud shape borrowed from
 * elsewhere on the globe), mixed with the synthetic fallback. The reads are weighted by the 4th power of their own
 * latitude cosine, so one read dominates almost everywhere (no low-contrast average of two fields) and neither smeared
 * pole shows. `sample(u, v)` reads the map (u in 0..1, wrapping).
 */
export function cloudEvolutionDetail(p: readonly [number, number, number], sample: (u: number, v: number) => number): number {
  const E = CLOUD_EVOLUTION;
  let sum = 0;
  let wsum = 0;

  for (const m of CLOUD_DETAIL_ROTATIONS) {
    const q: [number, number, number] = [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[3] * p[0] + m[4] * p[1] + m[5] * p[2], m[6] * p[0] + m[7] * p[1] + m[8] * p[2]];
    const c2 = Math.max(1 - q[2] * q[2], 1e-4);
    const w = c2 * c2;
    const [u, v] = uvFromDirection(q);

    sum += w * smooth(E.detailLo, E.detailHi, sample(u, v));
    wsum += w;
  }

  return (1 - E.synthWeight) * (sum / wsum) + E.synthWeight * cloudEvolutionSynthDetail(p);
}

/**
 * Coverage after erosion `e` with borrowed detail `d`: `c` unchanged where the score is above the cut, 0 below it.
 * Never above `c`; `c` at e = 0 for any d in 0..1; 0 at e = 1.
 */
export function applyCloudHide(c: number, e: number, d = 0.5): number {
  if (e <= 0) {
    return c;
  }
  const { detailAmp: A, feather: w } = CLOUD_EVOLUTION;
  const s = c + A * (d - 0.5);
  const cut = -0.5 * A - w + e * (1 + A + 2 * w);

  return c * smooth(cut - w, cut + w, s);
}

/** Coverage after erosion; never above `c`. Strength 0 returns `c`. `d` is cloudEvolutionDetail at p. */
export function evolveCloudCoverage(p: readonly [number, number, number], c: number, tDays: number, strength: number, d = 0.5): number {
  if (strength <= 0) {
    return c;
  }

  return applyCloudHide(c, cloudEvolutionHide(p, tDays, strength), d);
}

/** Unit direction for an equirectangular uv (u wraps at the antimeridian, no seam). */
export function directionFromUv(u: number, v: number): [number, number, number] {
  const lon = (u - 0.5) * 2 * Math.PI;
  const lat = (0.5 - v) * Math.PI;

  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}
