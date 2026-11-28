/**
 * Terrain horizon masks for ground sensors.
 *
 * Pure functions, no data dependency: callers supply an {@link ElevationProvider}. The scan walks
 * outward along each azimuth, takes the highest elevation angle of the terrain as seen from the
 * antenna, and the reducer turns the dense profile into the vertex list a sensor accepts in
 * `elevationMasks` with `interpolateMask: true` (3 to 72 vertices, 0 to 89 degrees).
 *
 * Geometry: effective-earth-radius model. With radius factor `k` the effective radius is
 * `Re = k * R`; a terrain point at ground distance `s` and height `h` is seen from an antenna at
 * height `h0` at elevation `atan2((Re + h) cos(s / Re) - (Re + h0), (Re + h) sin(s / Re))`.
 * Use k = 4/3 for radar, k = 7/6 (about 1.17) for visible light, k = 1 for pure geometry.
 */

/** Mean earth radius in metres (IUGG). */
export const EARTH_RADIUS_M = 6371008.8;
/** Standard-atmosphere radius factor for radio and radar. */
export const K_RADAR = 4 / 3;
/** Standard-atmosphere radius factor for visible light (GDAL documents 6/7 as the curvature coefficient). */
export const K_OPTICAL = 7 / 6;

/** Highest mask elevation a sensor accepts, from `MAX_INTERPOLATED_MASK_EL`. */
export const MASK_MAX_EL_DEG = 89;
/** Most vertices an interpolated mask may have, from `MAX_INTERPOLATED_MASK_VERTICES`. */
export const MASK_MAX_VERTICES = 72;

export type VerticalDatum = 'EGM2008' | 'EGM96' | 'WGS84-ellipsoid' | 'synthetic';

export interface ElevationMetadata {
  /** Human name of the data set. */
  name: string;
  /** Datum the heights refer to. The horizon uses only height differences, so it cancels. */
  verticalDatum: VerticalDatum;
  /** Ground spacing of the data in metres; the scan step defaults to half of it. */
  resolutionM: number;
  /** Credit line that must travel with anything derived from the data. */
  attribution: string;
}

/** Source of ground heights. Implementations decide how missing data is filled (the build script uses 0 m for ocean). */
export interface ElevationProvider {
  readonly metadata: ElevationMetadata;
  /** Height in metres above the provider's datum at one point. */
  heightAt(latDeg: number, lonDeg: number): number;
  /** Fills `out[i]` with the height at (`latsDeg[i]`, `lonsDeg[i]`) for the first `count` points. */
  heightsAt(latsDeg: Float64Array, lonsDeg: Float64Array, out: Float64Array, count: number): void;
}

export interface HorizonSite {
  latDeg: number;
  lonDeg: number;
  /** Antenna height above the ground at the site, metres. */
  mountHeightM: number;
  /** Ground height at the site in the provider's datum. Defaults to `provider.heightAt` at the site. */
  groundHeightM?: number;
}

export interface HorizonOptions {
  /** Farthest terrain considered, metres. Default 150 000. */
  maxRangeM?: number;
  /** Azimuth spacing of the rays, degrees. Default 0.5. */
  azimuthStepDeg?: number;
  /** Effective earth radius factor. Default {@link K_RADAR}. */
  refractionK?: number;
  /** Terrain closer than this is ignored (trees, buildings, the antenna's own pad), metres. Default 100. */
  clearRadiusM?: number;
  /** Distance between samples along a ray, metres. Default half the provider resolution (at least 5 m). */
  rangeStepM?: number;
  /** Earth radius, metres. Default {@link EARTH_RADIUS_M}. */
  earthRadiusM?: number;
}

export interface HorizonProfile {
  /** Ray azimuths, degrees clockwise from north, `azimuthStepDeg` apart starting at 0. */
  azimuthsDeg: Float64Array;
  /** Elevation of the limiting terrain, degrees; negative when the geometric horizon is the limit. */
  elevationDeg: Float64Array;
  /** Ground distance of the limiting terrain, metres. */
  limitingDistanceM: Float64Array;
  /** Height of the antenna in the provider's datum, metres. */
  antennaHeightM: number;
  /** Ground height at the site, metres. */
  groundHeightM: number;
  /** Options after defaults. */
  options: Required<HorizonOptions>;
}

const DEG = Math.PI / 180;

/** Elevation angle in radians of a point at ground distance `s` and height `h`, from an antenna at height `h0`. */
export const elevationAngleRad = (s: number, h: number, h0: number, effectiveRadiusM: number): number => {
  const theta = s / effectiveRadiusM;

  return Math.atan2((effectiveRadiusM + h) * Math.cos(theta) - (effectiveRadiusM + h0), (effectiveRadiusM + h) * Math.sin(theta));
};

/** Point reached from (lat, lon) after `distM` along the great circle with initial bearing `azRad`, on a sphere. */
export const destinationPoint = (latRad: number, lonRad: number, azRad: number, distM: number, earthRadiusM: number): { latRad: number; lonRad: number } => {
  const delta = distM / earthRadiusM;
  const sinLat = Math.sin(latRad) * Math.cos(delta) + Math.cos(latRad) * Math.sin(delta) * Math.cos(azRad);
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat)));
  const lon2 = lonRad + Math.atan2(Math.sin(azRad) * Math.sin(delta) * Math.cos(latRad), Math.cos(delta) - Math.sin(latRad) * sinLat);

  return { latRad: lat2, lonRad: lon2 };
};

const normaliseLonDeg = (lon: number): number => {
  let l = ((((lon + 180) % 360) + 360) % 360) - 180;

  if (l === -180 && lon > 0) {
    l = 180;
  }

  return l;
};

/**
 * Scans the terrain around a site and returns the highest terrain elevation angle per azimuth.
 * Each ray takes one sample every `rangeStepM` from `max(clearRadiusM, step)` out to `maxRangeM`.
 */
export const computeHorizonMask = (provider: ElevationProvider, site: HorizonSite, options: HorizonOptions = {}): HorizonProfile => {
  const opts: Required<HorizonOptions> = {
    maxRangeM: options.maxRangeM ?? 150_000,
    azimuthStepDeg: options.azimuthStepDeg ?? 0.5,
    refractionK: options.refractionK ?? K_RADAR,
    clearRadiusM: options.clearRadiusM ?? 100,
    rangeStepM: options.rangeStepM ?? Math.max(5, provider.metadata.resolutionM / 2),
    earthRadiusM: options.earthRadiusM ?? EARTH_RADIUS_M,
  };

  if (!(opts.azimuthStepDeg > 0) || !(opts.rangeStepM > 0) || !(opts.maxRangeM > 0) || !(opts.refractionK > 0)) {
    throw new Error('computeHorizonMask: azimuthStepDeg, rangeStepM, maxRangeM and refractionK must be positive');
  }

  const ground = site.groundHeightM ?? provider.heightAt(site.latDeg, site.lonDeg);
  const h0 = ground + site.mountHeightM;
  const re = opts.refractionK * opts.earthRadiusM;
  const rays = Math.round(360 / opts.azimuthStepDeg);
  const firstS = Math.max(opts.clearRadiusM, opts.rangeStepM);
  const count = Math.max(1, Math.floor((opts.maxRangeM - firstS) / opts.rangeStepM) + 1);
  const dist = new Float64Array(count);

  for (let i = 0; i < count; i++) {
    dist[i] = firstS + i * opts.rangeStepM;
  }

  const lats = new Float64Array(count);
  const lons = new Float64Array(count);
  const heights = new Float64Array(count);
  const azimuthsDeg = new Float64Array(rays);
  const elevationDeg = new Float64Array(rays);
  const limitingDistanceM = new Float64Array(rays);
  const lat0 = site.latDeg * DEG;
  const lon0 = site.lonDeg * DEG;

  for (let r = 0; r < rays; r++) {
    const azDeg = r * opts.azimuthStepDeg;
    const azRad = azDeg * DEG;

    for (let i = 0; i < count; i++) {
      const p = destinationPoint(lat0, lon0, azRad, dist[i], opts.earthRadiusM);

      lats[i] = p.latRad / DEG;
      lons[i] = normaliseLonDeg(p.lonRad / DEG);
    }

    provider.heightsAt(lats, lons, heights, count);

    let best = -Infinity;
    let bestS = firstS;

    for (let i = 0; i < count; i++) {
      const el = elevationAngleRad(dist[i], heights[i], h0, re);

      if (el > best) {
        best = el;
        bestS = dist[i];
      }
    }

    azimuthsDeg[r] = azDeg;
    elevationDeg[r] = best / DEG;
    limitingDistanceM[r] = bestS;
  }

  return { azimuthsDeg, elevationDeg, limitingDistanceM, antennaHeightM: h0, groundHeightM: ground, options: opts };
};

/** One mask vertex in the shape of the sensor `ElevationMask` (interpolated mode ignores `stopAz`). */
export interface MaskVertex {
  startAz: number;
  stopAz: number;
  minEl: number;
}

export interface ReduceOptions {
  /** Most vertices to return. Default 72. */
  maxVertices?: number;
  /** Largest amount the mask may sit below the profile at a ray, degrees. Default 0.1. */
  maxUnderDeg?: number;
  /** Stop adding vertices to reduce over-masking once it is below this, degrees. Default 0.05. */
  targetOverDeg?: number;
}

export interface ReducedMask {
  vertices: MaskVertex[];
  /** Largest amount the mask sits below the clamped profile at any ray, degrees (positive means sky is shown that the terrain hides). */
  maxUnderDeg: number;
  /** Largest amount the mask sits above the clamped profile at any ray, degrees (positive means sky is hidden that the terrain leaves open). */
  maxOverDeg: number;
  /** Root-mean-square of (mask - profile) over all rays, degrees. */
  rmsDeg: number;
}

/** Linear interpolation of vertices (sorted, azimuth in [0, 360)) at one azimuth, wrapping at 360. */
export const interpolateMaskEl = (vertices: readonly MaskVertex[], azDeg: number): number => {
  const n = vertices.length;
  let lo = 0;
  let hi = n;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;

    if (vertices[mid].startAz <= azDeg) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const next = vertices[lo % n];
  const prev = vertices[(lo - 1 + n) % n];
  let span = next.startAz - prev.startAz;

  if (span <= 0) {
    span += 360;
  }

  let offset = azDeg - prev.startAz;

  if (offset < 0) {
    offset += 360;
  }

  return prev.minEl + ((next.minEl - prev.minEl) * offset) / span;
};

/**
 * Reduces a dense horizon profile to at most `maxVertices` mask vertices.
 *
 * The profile is first clamped to 0 to 89 degrees (a sensor mask cannot be negative). Vertices sit
 * on profile rays. Phase 1 adds a vertex at the ray where the mask is lowest below the profile
 * until that gap is within `maxUnderDeg`. Phase 2 spends any spare vertices where the mask is
 * highest above the profile (valleys the straight lines would otherwise cover). If the vertex
 * limit stops phase 1 early, vertices are lifted until no ray is more than `maxUnderDeg` below the
 * profile. So the error is bounded on the "shows too much sky" side and the reduction errs toward
 * "hides a little more sky" only where it has to (valleys, or a budget that is too small).
 */
export const reduceHorizonMask = (azimuthsDeg: ArrayLike<number>, elevationDeg: ArrayLike<number>, options: ReduceOptions = {}): ReducedMask => {
  const maxVertices = Math.max(3, Math.min(MASK_MAX_VERTICES, options.maxVertices ?? MASK_MAX_VERTICES));
  const maxUnder = options.maxUnderDeg ?? 0.1;
  const targetOver = options.targetOverDeg ?? 0.05;
  const n = azimuthsDeg.length;

  if (n < 3 || elevationDeg.length !== n) {
    throw new Error('reduceHorizonMask: need at least 3 rays and matching arrays');
  }

  const y = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    y[i] = Math.min(MASK_MAX_EL_DEG, Math.max(0, elevationDeg[i]));
  }

  const selected = new Set<number>([0, Math.floor(n / 3), Math.floor((2 * n) / 3)]);
  // Seed with the highest ray as well, so the biggest peak is a vertex from the start.
  let top = 0;

  for (let i = 1; i < n; i++) {
    if (y[i] > y[top]) {
      top = i;
    }
  }

  if (selected.size < maxVertices) {
    selected.add(top);
  }

  const polyAt = (sorted: number[], i: number): number => {
    let lo = 0;
    let hi = sorted.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;

      if (sorted[mid] <= i) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    const a = sorted[(lo - 1 + sorted.length) % sorted.length];
    const b = sorted[lo % sorted.length];
    let span = b - a;

    if (span <= 0) {
      span += n;
    }

    let off = i - a;

    if (off < 0) {
      off += n;
    }

    return y[a] + ((y[b] - y[a]) * off) / span;
  };

  const errors = (sorted: number[]): { under: number; underIdx: number; over: number; overIdx: number } => {
    let under = 0;
    let underIdx = -1;
    let over = 0;
    let overIdx = -1;

    for (let i = 0; i < n; i++) {
      const d = polyAt(sorted, i) - y[i];

      if (-d > under) {
        under = -d;
        underIdx = i;
      }

      if (d > over) {
        over = d;
        overIdx = i;
      }
    }

    return { under, underIdx, over, overIdx };
  };

  let sorted = [...selected].sort((a, b) => a - b);

  while (sorted.length < maxVertices) {
    const e = errors(sorted);
    let add = -1;

    if (e.under > maxUnder) {
      add = e.underIdx;
    } else if (e.over > targetOver) {
      add = e.overIdx;
    }

    if (add < 0 || selected.has(add)) {
      break;
    }

    selected.add(add);
    sorted = [...selected].sort((a, b) => a - b);
  }

  const vy = sorted.map((i) => y[i]);

  // Budget exhausted before the under-error bound held: lift both ends of each offending segment.
  for (let i = 0; i < n; i++) {
    let lo = 0;
    let hi = sorted.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;

      if (sorted[mid] <= i) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    const ia = (lo - 1 + sorted.length) % sorted.length;
    const ib = lo % sorted.length;
    const a = sorted[ia];
    const b = sorted[ib];
    let span = b - a;

    if (span <= 0) {
      span += n;
    }

    let off = i - a;

    if (off < 0) {
      off += n;
    }

    const p = vy[ia] + ((vy[ib] - vy[ia]) * off) / span;
    const gap = y[i] - p - maxUnder;

    if (gap > 0) {
      vy[ia] = Math.min(MASK_MAX_EL_DEG, vy[ia] + gap);
      vy[ib] = Math.min(MASK_MAX_EL_DEG, vy[ib] + gap);
    }
  }

  const vertices: MaskVertex[] = sorted.map((idx, k) => ({
    startAz: Number(azimuthsDeg[idx].toFixed(3)),
    stopAz: Number(azimuthsDeg[idx].toFixed(3)),
    // Round up to 0.001 degree so rounding never moves the mask below the profile.
    minEl: Math.min(MASK_MAX_EL_DEG, Math.ceil(vy[k] * 1000) / 1000),
  }));

  let under = 0;
  let over = 0;
  let sumSq = 0;

  for (let i = 0; i < n; i++) {
    const d = interpolateMaskEl(vertices, azimuthsDeg[i]) - y[i];

    under = Math.max(under, -d);
    over = Math.max(over, d);
    sumSq += d * d;
  }

  return { vertices, maxUnderDeg: under, maxOverDeg: over, rmsDeg: Math.sqrt(sumSq / n) };
};
