import { Satellite, SpaceObjectType } from '@ootk/src/main';

/**
 * Standard reference distance (km) at which "standard magnitude" is defined
 * for satellite photometry — a 1000 km airless ranging convention used in
 * most published satellite vmag values.
 */
const STD_REFERENCE_DISTANCE_KM = 1000;

/**
 * Apparent magnitude of the Sun at 1 AU. Used as the photometric anchor for
 * the diffuse-Lambert-sphere intrinsic magnitude formula.
 */
const SUN_APPARENT_MAGNITUDE = -26.74;

/**
 * Default Bond/geometric albedo for an unknown spacecraft surface. 0.2 is a
 * reasonable mid-range value for mixed bus + solar-panel surfaces; published
 * Starlink/Iridium fits sit between ~0.15 and ~0.25.
 */
const DEFAULT_ALBEDO = 0.2;

/**
 * Geometric factor for a diffuse Lambert sphere at zero phase angle:
 *   I_back / P_intercepted = 2 / (3π)
 * Without it the back-scattered radiance is overstated by ~5 magnitudes.
 */
const LAMBERT_SPHERE_FACTOR = 2 / (3 * Math.PI);

export type StdMagSource = 'catalog' | 'preset' | 'estimate';

export interface StdMagWithSource {
  vmag: number;
  source: StdMagSource;
}

interface KnownObjectEntry {
  /** Human-readable identifier for the preset (used in tests/debug). */
  readonly id: string;
  /** Case-insensitive name prefix; matched against `Satellite.name`. */
  readonly namePrefix?: string;
  /** Exact match against `Satellite.bus`. */
  readonly bus?: string;
  /** Published / observed standard magnitude (1000 km reference). */
  readonly vmag: number;
  /** Citation or rationale — kept inline so values are auditable. */
  readonly source: string;
}

/**
 * Curated table of common satellite buses / objects and their published
 * standard magnitudes. Values are observed magnitudes normalised to 1000 km
 * range from amateur and professional photometric campaigns.
 *
 * Adding entries: pick a stable `namePrefix` (avoid version-dropping prefixes
 * like "STARLINK" if you mean v1.5 specifically) or a `bus` string that the
 * catalog feed actually emits.
 */
export const KNOWN_OBJECT_MAGNITUDES: readonly KnownObjectEntry[] = [
  {
    id: 'starlink-v1.5',
    namePrefix: 'STARLINK-',
    vmag: 5.5,
    source: 'Mallama (2022) post-VisorSat mean steady-state magnitude at 550 km',
  },
  {
    id: 'starlink-v2-mini',
    namePrefix: 'STARLINK-3',
    vmag: 6.0,
    source: 'SpaceX brightness mitigation report v2 mini ~6.0 at 1000 km',
  },
  {
    id: 'iss',
    namePrefix: 'ISS (',
    vmag: -1.3,
    source: 'NASA heavens-above mean standard magnitude for ISS truss configuration',
  },
  {
    id: 'hubble',
    namePrefix: 'HST',
    vmag: 2.0,
    source: 'Heavens-above published intrinsic magnitude for HST',
  },
  {
    id: 'iridium-next',
    namePrefix: 'IRIDIUM ',
    vmag: 6.0,
    source: 'Iridium NEXT diffuse steady-state magnitude (no flares)',
  },
  {
    id: 'oneweb',
    namePrefix: 'ONEWEB-',
    vmag: 7.5,
    source: 'OneWeb steady-state observed magnitude at ~1200 km operational altitude',
  },
  {
    id: 'globalstar',
    namePrefix: 'GLOBALSTAR',
    vmag: 7.0,
    source: 'Globalstar second-generation observed magnitudes',
  },
  {
    id: 'cosmos',
    namePrefix: 'COSMOS ',
    vmag: 4.5,
    source: 'Composite mean for Cosmos series payloads (heterogeneous; coarse)',
  },
  {
    id: 'cubesat-3u',
    bus: 'CubeSat 3U',
    vmag: 8.5,
    source: 'Generic 0.03 m² CubeSat at 1000 km, albedo 0.2',
  },
  {
    id: 'cubesat-6u',
    bus: 'CubeSat 6U',
    vmag: 7.8,
    source: 'Generic 0.06 m² CubeSat at 1000 km, albedo 0.2',
  },
  {
    id: 'cubesat-12u',
    bus: 'CubeSat 12U',
    vmag: 7.0,
    source: 'Generic 0.12 m² CubeSat at 1000 km, albedo 0.2',
  },
  {
    id: 'geo-comsat-lg',
    bus: 'BSS-702',
    vmag: 11.0,
    source: 'Typical 702HP GEO comsat at 36000 km mapped to 1000 km reference',
  },
  {
    id: 'geo-comsat-a2100',
    bus: 'A2100',
    vmag: 11.5,
    source: 'A2100 series GEO comsat — diffuse mean',
  },
  {
    id: 'meteor',
    namePrefix: 'METEOR-M',
    vmag: 4.5,
    source: 'Meteor-M weather satellite series mean',
  },
];

/**
 * Parse a numeric value from a free-form string field like `"3.7 m"` or
 * `"1500 kg"`. Returns null for empty/non-numeric input so callers can decide
 * the fallback path.
 */
const parseLeadingNumber = (raw: string | number | null | undefined): number | null => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Derive an optical cross-sectional area in m² for a satellite, in this order:
 *   1. length × max(diameter, span) — rectangular projection
 *   2. π · (diameter / 2)²          — circular end-on
 *   3. sat.rcs                      — radar cross section as a proxy
 *
 * The RCS fallback is intentionally last: RCS is a radar quantity and conflates
 * material, geometry, and incidence; using it as an optical area is a coarse
 * approximation flagged via the 'estimate' source tag at the callsite.
 */
export const deriveCrossSectionAreaM2 = (sat: Satellite): number | null => {
  const length = parseLeadingNumber(sat.length);
  const diameter = parseLeadingNumber(sat.diameter);
  const span = parseLeadingNumber(sat.span);

  const widthCandidate = Math.max(diameter ?? 0, span ?? 0);

  if (length !== null && widthCandidate > 0) {
    return length * widthCandidate;
  }

  if (diameter !== null) {
    const radius = diameter / 2;

    return Math.PI * radius * radius;
  }

  if (sat.rcs !== null && typeof sat.rcs === 'number' && sat.rcs > 0) {
    return sat.rcs;
  }

  return null;
};

/**
 * Diffuse Lambert sphere intrinsic magnitude at the 1000 km reference range.
 *
 *   m = M_sun + 5·log10(d_ref_m) - 2.5·log10((2/3π) · albedo · area_m2)
 *
 * Derived from `m_obs - M_sun = -2.5·log10(F_reflected / F_sun_at_observer)`
 * with the Lambert-sphere back-scattered intensity I = (2/3π)·P_intercepted.
 * Reference distance is fixed at 1000 km; the constants collapse to a single
 * additive term but are kept explicit to make alternative reference distances
 * trivial to drop in later.
 */
export const estimateStdMagFromProperties = (areaM2: number, albedo: number = DEFAULT_ALBEDO): number => {
  if (!(areaM2 > 0) || !(albedo > 0)) {
    return Number.POSITIVE_INFINITY;
  }

  // Convert km → m so it shares units with area's m² inside the log term.
  const dRefMeters = STD_REFERENCE_DISTANCE_KM * 1000;

  return SUN_APPARENT_MAGNITUDE + 5 * Math.log10(dRefMeters) - 2.5 * Math.log10(LAMBERT_SPHERE_FACTOR * albedo * areaM2);
};

/**
 * Match a satellite against the curated preset table. Bus exact-match takes
 * precedence over name prefix because the bus field is set deliberately by
 * the data feed and is far less ambiguous than a name pattern.
 */
export const lookupKnownVmag = (sat: Satellite): number | null => {
  if (sat.bus) {
    const busMatch = KNOWN_OBJECT_MAGNITUDES.find((entry) => entry.bus && entry.bus === sat.bus);

    if (busMatch) {
      return busMatch.vmag;
    }
  }

  if (!sat.name) {
    return null;
  }

  if (sat.type !== SpaceObjectType.PAYLOAD && sat.type !== SpaceObjectType.SPECIAL) {
    return null;
  }

  const nameUpper = sat.name.toUpperCase();

  for (const entry of KNOWN_OBJECT_MAGNITUDES) {
    if (entry.namePrefix && nameUpper.startsWith(entry.namePrefix.toUpperCase())) {
      return entry.vmag;
    }
  }

  return null;
};

/**
 * Resolve a satellite's standard magnitude, preferring the most authoritative
 * source available:
 *   1. Catalog value (`sat.vmag`) — published / curated upstream.
 *   2. Preset table  — observation-derived value for a known bus / family.
 *   3. Physics estimate from physical properties.
 *
 * Returns null only when no input supports any of the three paths — letting
 * the UI render the existing "Unknown" string instead of a fabricated number.
 */
export const estimateStdMagWithSource = (sat: Satellite): StdMagWithSource | null => {
  if (typeof sat.vmag === 'number' && !isNaN(sat.vmag)) {
    // A back-fill that flagged its value as estimated (e.g. the VMag database
    // RCS fallback) keeps its 'estimate' provenance so the UI still renders the
    // `(est.)` suffix rather than presenting a coarse value as catalog-grade.
    const source: StdMagSource = (sat as Satellite & { isVmagEstimated?: boolean }).isVmagEstimated ? 'estimate' : 'catalog';

    return { vmag: sat.vmag, source };
  }

  const preset = lookupKnownVmag(sat);

  if (preset !== null) {
    return { vmag: preset, source: 'preset' };
  }

  const areaM2 = deriveCrossSectionAreaM2(sat);

  if (areaM2 !== null) {
    return { vmag: estimateStdMagFromProperties(areaM2), source: 'estimate' };
  }

  return null;
};

/**
 * Convenience wrapper that drops the source tag — kept for callers that only
 * need the numeric value (e.g. the legacy `calculateStdMag_` callsite).
 */
export const estimateStdMag = (sat: Satellite): number | null => estimateStdMagWithSource(sat)?.vmag ?? null;
