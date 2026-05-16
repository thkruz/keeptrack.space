import { SatMath } from '@app/app/analysis/sat-math';
import { estimateStdMag } from '@app/app/analysis/std-mag-estimator';
import { Satellite, SpaceObjectType } from '@ootk/src/main';

export type RcsSource = 'catalog' | 'preset' | 'catalog-mined' | 'geometric' | 'vmag-derived';

export interface RcsWithSource {
  rcs: number;
  source: RcsSource;
}

interface KnownObjectRcsEntry {
  /** Human-readable identifier for the preset (used in tests/debug). */
  readonly id: string;
  /** Case-insensitive name prefix matched against `Satellite.name`. */
  readonly namePrefix?: string;
  /** Exact match against `Satellite.bus`. */
  readonly bus?: string;
  /** Radar cross section in m². */
  readonly rcs: number;
  /** Citation or rationale — kept inline so values stay auditable. */
  readonly source: string;
}

/**
 * Curated fallback table for well-known buses/objects. Used only when the
 * catalog itself has nothing AND the catalog-mining layer can't find a
 * matching bus or name-prefix group. Most production catalog feeds already
 * carry RCS for these objects, so the table is a safety net rather than the
 * primary signal.
 */
export const KNOWN_OBJECT_RCS: readonly KnownObjectRcsEntry[] = [
  {
    // Catalog names use various separators ("STARLINK-1234", "STARLINK 1234",
    // occasionally lowercase). Match on the bare prefix to be feed-tolerant.
    id: 'starlink',
    namePrefix: 'STARLINK',
    rcs: 5,
    source: 'Mallama (2020+) post-VisorSat; web research indicates <10 m²',
  },
  {
    // "ISS (" disambiguates from any catalog row that just starts with "ISS";
    // the real names are "ISS (ZARYA)", "ISS (NAUKA)", etc.
    id: 'iss',
    namePrefix: 'ISS (',
    rcs: 399,
    source: 'CelesTrak catalog standard value for ISS',
  },
  {
    id: 'hubble',
    namePrefix: 'HST',
    rcs: 14,
    source: 'Approximate from HST cylinder dimensions (13.2 m × 4.2 m)',
  },
  {
    id: 'iridium-next',
    namePrefix: 'IRIDIUM',
    rcs: 14,
    source: 'Iridium NEXT bus + deployed solar arrays',
  },
  {
    id: 'oneweb',
    namePrefix: 'ONEWEB',
    rcs: 3,
    source: 'OneWeb 150kg bus',
  },
  {
    id: 'globalstar',
    namePrefix: 'GLOBALSTAR',
    rcs: 7,
    source: 'Globalstar 2nd generation bus',
  },
  {
    id: 'cubesat-3u',
    bus: 'CubeSat 3U',
    rcs: 0.03,
    source: 'Standard 3U dimensions (10 cm × 10 cm × 30 cm)',
  },
  {
    id: 'cubesat-6u',
    bus: 'CubeSat 6U',
    rcs: 0.06,
    source: 'Standard 6U dimensions',
  },
  {
    id: 'cubesat-12u',
    bus: 'CubeSat 12U',
    rcs: 0.12,
    source: 'Standard 12U dimensions',
  },
  // Deliberately no COSMOS entry: the Cosmos series spans ~50 years of widely
  // different bus families, payloads, and debris. A single mean is meaningless;
  // catalog-mining handles it correctly via per-bus averages when bus is set.
];

export interface CatalogRcsStats {
  /** Bus name → arithmetic mean RCS of catalog entries that have it set. */
  readonly byBus: ReadonlyMap<string, number>;
  /** First-word-of-name (uppercased) → arithmetic mean RCS. */
  readonly byNamePrefix: ReadonlyMap<string, number>;
  /** Number of source satellites used to build this stat snapshot. */
  readonly sampleSize: number;
}

export const EMPTY_CATALOG_RCS_STATS: CatalogRcsStats = {
  byBus: new Map(),
  byNamePrefix: new Map(),
  sampleSize: 0,
};

const isUsableRcs = (rcs: unknown): rcs is number => typeof rcs === 'number' && isFinite(rcs) && rcs > 0;

/**
 * "STARLINK-1234" → "STARLINK", "ISS (ZARYA)" → "ISS", "COSMOS 2543" → "COSMOS".
 * Returns null for empty / non-string input. Matches the bucketing the existing
 * `estimateRcsUsingHistoricalData` used (split on whitespace), generalised to
 * also handle the hyphenated-suffix naming pattern dominant in modern megasats.
 */
const extractNamePrefix = (name: string | null | undefined): string | null => {
  if (typeof name !== 'string' || name.length === 0) {
    return null;
  }
  const firstToken = name.toUpperCase().split(/[\s-]/u)[0];

  return firstToken.length > 0 ? firstToken : null;
};

/**
 * Build a one-shot statistics snapshot from the catalog. Designed to be called
 * once per recolor by the RCS color scheme, then handed to per-satellite
 * `estimateRcsWithSource` calls during the same pass — O(n) to build, O(1)
 * lookups thereafter. (Compare with the deprecated `estimateRcsUsingHistoricalData`
 * which scans the full catalog *per satellite*, yielding O(n²).)
 */
export const buildCatalogRcsStats = (sats: readonly Satellite[]): CatalogRcsStats => {
  const busSums = new Map<string, { sum: number; count: number }>();
  const nameSums = new Map<string, { sum: number; count: number }>();

  const accumulate = <K>(map: Map<K, { sum: number; count: number }>, key: K | null, rcs: number) => {
    if (key === null) {
      return;
    }
    const existing = map.get(key);

    if (existing) {
      existing.sum += rcs;
      existing.count++;
    } else {
      map.set(key, { sum: rcs, count: 1 });
    }
  };

  for (const sat of sats) {
    if (!isUsableRcs(sat.rcs)) {
      continue;
    }
    accumulate(busSums, sat.bus && sat.bus.length > 0 ? sat.bus : null, sat.rcs);
    accumulate(nameSums, extractNamePrefix(sat.name), sat.rcs);
  }

  const toMean = <K>(m: Map<K, { sum: number; count: number }>): Map<K, number> => {
    const result = new Map<K, number>();

    m.forEach((v, k) => result.set(k, v.sum / v.count));

    return result;
  };

  return {
    byBus: toMean(busSums),
    byNamePrefix: toMean(nameSums),
    sampleSize: sats.length,
  };
};

/**
 * Curated-table lookup. Bus exact match takes precedence over name prefix
 * because the bus field is deliberately set by the data feed and unambiguous.
 * Name-prefix matches are restricted to PAYLOAD-class objects to avoid
 * mis-applying a satellite preset to its debris.
 */
export const lookupKnownRcs = (sat: Satellite): number | null => {
  if (sat.bus) {
    const busMatch = KNOWN_OBJECT_RCS.find((entry) => entry.bus && entry.bus === sat.bus);

    if (busMatch) {
      return busMatch.rcs;
    }
  }

  if (!sat.name) {
    return null;
  }
  if (sat.type !== SpaceObjectType.PAYLOAD && sat.type !== SpaceObjectType.SPECIAL) {
    return null;
  }

  const nameUpper = sat.name.toUpperCase();

  for (const entry of KNOWN_OBJECT_RCS) {
    if (entry.namePrefix && nameUpper.startsWith(entry.namePrefix.toUpperCase())) {
      return entry.rcs;
    }
  }

  return null;
};

export const mineRcsFromCatalog = (sat: Satellite, stats: CatalogRcsStats): number | null => {
  if (sat.bus) {
    const busMean = stats.byBus.get(sat.bus);

    if (typeof busMean === 'number') {
      return busMean;
    }
  }
  const prefix = extractNamePrefix(sat.name);

  if (prefix !== null) {
    const prefixMean = stats.byNamePrefix.get(prefix);

    if (typeof prefixMean === 'number') {
      return prefixMean;
    }
  }

  // Deliberately no `type` fallback: averaging RCS across an entire type
  // (e.g. PAYLOAD) yields a meaningless number dominated by whichever bus
  // family is most populous, which then gets blindly applied to unrelated
  // objects. Better to return null and let the geometric layer try.
  return null;
};

export const estimateRcsFromGeometry = (sat: Satellite): number | null => {
  const length = parseFloat(sat.length);
  const diameter = parseFloat(sat.diameter);
  const span = parseFloat(sat.span);

  if (!(length > 0) || !(diameter > 0) || !(span > 0)) {
    return null;
  }

  // SatMath.estimateRcs defaults to a box when shape is unknown, so an empty
  // shape string is safe — but we still need to pass *something*.
  const shape = (sat.shape && sat.shape.length > 0) ? sat.shape : 'box';

  return SatMath.estimateRcs(length, diameter, span, shape);
};

// Constants for the Lambert-sphere inversion below. Match the std-mag estimator
// so a round-trip vmag → RCS → vmag stays internally consistent.
const SUN_APPARENT_MAGNITUDE = -26.74;
const STD_REFERENCE_DISTANCE_M = 1_000_000;
const DEFAULT_ALBEDO = 0.2;
const LAMBERT_SPHERE_FACTOR = 2 / (3 * Math.PI);

/**
 * Photometric fallback: derive geometric cross-section from a known standard
 * magnitude (catalog vmag or std-mag preset/estimate) by inverting the same
 * Lambert-sphere formula the std-mag estimator runs forward. Treats geometric
 * cross-section as ≈ RCS, which holds for the diffuse-scattering limit and
 * matches the empirical `m ~ 2.5·log10(RCS)` relationship documented in the
 * space-surveillance literature.
 *
 * This is the coarsest layer in the cascade (real spacecraft are NOT diffuse
 * spheres — flat panels make actual RCS aspect-dependent), so it runs last.
 * Useful precisely for objects with known photometric brightness but no
 * direct radar measurement or bus metadata.
 */
export const estimateRcsFromVmag = (sat: Satellite): number | null => {
  const vmag = estimateStdMag(sat);

  if (vmag === null || !isFinite(vmag)) {
    return null;
  }

  // Inverse of:
  //   vmag = M_sun + 5·log10(d_ref_m) - 2.5·log10((2/3π)·albedo·A)
  // Solving for A:
  //   A = 10^((M_sun + 5·log10(d_ref_m) - vmag) / 2.5) / ((2/3π)·albedo)
  const logExp = (SUN_APPARENT_MAGNITUDE + 5 * Math.log10(STD_REFERENCE_DISTANCE_M) - vmag) / 2.5;
  const area = (10 ** logExp) / (LAMBERT_SPHERE_FACTOR * DEFAULT_ALBEDO);

  if (!isFinite(area) || area <= 0) {
    return null;
  }

  return area;
};

/**
 * Resolve a satellite's RCS, preferring the most authoritative source:
 *   1. Catalog value (`sat.rcs`) — published / curated upstream.
 *   2. Preset table    — observation-derived value for a famous bus / family.
 *   3. Catalog-mined   — mean of same-bus or same-name-prefix neighbours from
 *                        the supplied stats snapshot.
 *   4. Geometric       — derived from physical dimensions via SatMath.estimateRcs.
 *   5. Vmag-derived    — Lambert-sphere inversion from standard magnitude.
 *                        Coarse but useful for objects with known photometry
 *                        and no radar / dimensional metadata.
 *
 * The stats parameter is optional: pass `null`/`undefined` to skip the
 * catalog-mining layer (e.g. unit tests that don't construct a catalog).
 */
export const estimateRcsWithSource = (
  sat: Satellite,
  stats?: CatalogRcsStats | null,
): RcsWithSource | null => {
  if (isUsableRcs(sat.rcs)) {
    return { rcs: sat.rcs, source: 'catalog' };
  }

  const preset = lookupKnownRcs(sat);

  if (preset !== null) {
    return { rcs: preset, source: 'preset' };
  }

  if (stats) {
    const mined = mineRcsFromCatalog(sat, stats);

    if (mined !== null) {
      return { rcs: mined, source: 'catalog-mined' };
    }
  }

  const geom = estimateRcsFromGeometry(sat);

  if (geom !== null) {
    return { rcs: geom, source: 'geometric' };
  }

  const fromVmag = estimateRcsFromVmag(sat);

  if (fromVmag !== null) {
    return { rcs: fromVmag, source: 'vmag-derived' };
  }

  return null;
};

export const estimateRcs = (sat: Satellite, stats?: CatalogRcsStats | null): number | null =>
  estimateRcsWithSource(sat, stats)?.rcs ?? null;
