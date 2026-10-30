/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * breakup-analysis-core.ts holds the pure, DOM-free and locale-free math for the
 * Breakup Analysis plugin: dispersion statistics, the launch-to-breakup gap, the
 * Gabbard (period vs apogee/perigee) data series, the CSV export rows, and the
 * fragment-table sort comparator. Keeping it free of the DOM and ServiceLocator
 * lets every helper be unit-tested directly against plain satellite-shaped
 * objects.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { Satellite, SpaceObjectType } from '@ootk/src/main';
import { BreakupEvent } from './breakup-events';

export interface FieldStats {
  min: number;
  max: number;
  mean: number;
}

export interface AltitudeStats {
  minPerigee: number;
  maxPerigee: number;
  meanPerigee: number;
  minApogee: number;
  maxApogee: number;
  meanApogee: number;
}

export interface TypeCounts {
  payloads: number;
  rocketBodies: number;
  debris: number;
}

export interface EventSummary {
  tracked: number;
  estimated: number;
  /** Tracked / estimated as a percentage string with one decimal (e.g. "42.1"). */
  trackingRatio: string;
  counts: TypeCounts;
  altStats: AltitudeStats;
  eccStats: FieldStats;
  incStats: FieldStats;
  /** Members flagged by {@link isLikelyDecayed} (kept in every count above). */
  likelyDecayed: number;
}

/** One [period (min), altitude (km)] tuple for a Gabbard scatter point. */
export type GabbardPoint = [number, number];

export interface GabbardData {
  apogee: GabbardPoint[];
  perigee: GabbardPoint[];
}

export type FragmentSortKey = 'sccNum' | 'name' | 'type' | 'perigee' | 'apogee' | 'inclination' | 'eccentricity' | 'period';
export type SortDir = 'asc' | 'desc';

/** Fractional years between two ISO dates, as a one-decimal string. */
export const calcYearsBetween = (date1: string, date2: string): string => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  return years.toFixed(1);
};

/** Min/max/mean of an arbitrary numeric field; zeroed for an empty set. */
export const calcFieldStats = (sats: Satellite[], getter: (s: Satellite) => number): FieldStats => {
  if (sats.length === 0) {
    return { min: 0, max: 0, mean: 0 };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (const sat of sats) {
    const val = getter(sat);

    if (val < min) {
      min = val;
    }
    if (val > max) {
      max = val;
    }
    sum += val;
  }

  return { min, max, mean: sum / sats.length };
};

/** Perigee/apogee min/max/mean; zeroed for an empty set. */
export const calcAltitudeStats = (sats: Satellite[]): AltitudeStats => {
  const perigee = calcFieldStats(sats, (s) => s.perigee);
  const apogee = calcFieldStats(sats, (s) => s.apogee);

  return {
    minPerigee: perigee.min,
    maxPerigee: perigee.max,
    meanPerigee: perigee.mean,
    minApogee: apogee.min,
    maxApogee: apogee.max,
    meanApogee: apogee.mean,
  };
};

/** Bucket fragments into payloads / rocket bodies / everything-else (debris). */
export const countByType = (sats: Satellite[]): TypeCounts => {
  let payloads = 0;
  let rocketBodies = 0;
  let debris = 0;

  for (const sat of sats) {
    if (sat.type === SpaceObjectType.PAYLOAD) {
      payloads++;
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      rocketBodies++;
    } else {
      debris++;
    }
  }

  return { payloads, rocketBodies, debris };
};

// =========================================================================
// Likely-decayed members
// =========================================================================

/** A member whose perigee is below this altitude (km) is flagged "likely decayed". */
export const LIKELY_DECAYED_PERIGEE_KM = 120;

/**
 * A member whose element set epoch is more than this many days older than the
 * reference time (the archive date, or the simulation time on the live
 * catalog) is flagged "likely decayed": a catalog that still carries it has
 * not had a fresh element set for it in that long.
 */
export const LIKELY_DECAYED_EPOCH_AGE_DAYS = 90;

const DAY_MS_ = 86_400_000;

/** UTC TLE epoch as Unix ms, or null when the epoch fields are unavailable. */
export const tleEpochMs = (epochYear: number, epochDay: number): number | null => {
  if (!Number.isFinite(epochYear) || !Number.isFinite(epochDay) || epochDay <= 0) {
    return null;
  }
  const year = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;

  return Date.UTC(year, 0, 1) + (epochDay - 1) * DAY_MS_;
};

/**
 * True when a member is likely decayed: perigee below
 * {@link LIKELY_DECAYED_PERIGEE_KM}, or an element set epoch more than
 * {@link LIKELY_DECAYED_EPOCH_AGE_DAYS} days before `referenceMs`. A missing
 * perigee or epoch never flags; a non-finite `referenceMs` skips the age rule.
 * Flagged members are kept in the set; this only labels them.
 */
export const isLikelyDecayed = (sat: Satellite, referenceMs: number): boolean => {
  if (Number.isFinite(sat.perigee) && sat.perigee < LIKELY_DECAYED_PERIGEE_KM) {
    return true;
  }

  if (!Number.isFinite(referenceMs)) {
    return false;
  }

  const epochMs = tleEpochMs(sat.epochYear, sat.epochDay);

  return epochMs !== null && referenceMs - epochMs > LIKELY_DECAYED_EPOCH_AGE_DAYS * DAY_MS_;
};

/** Number of members {@link isLikelyDecayed} flags. */
export const countLikelyDecayed = (sats: readonly Satellite[], referenceMs: number): number => {
  let count = 0;

  for (const sat of sats) {
    if (isLikelyDecayed(sat, referenceMs)) {
      count++;
    }
  }

  return count;
};

/**
 * Aggregate every statistic the detail panel needs for one event + its tracked
 * fragments. `referenceMs` is the time the likely-decayed age rule measures
 * from (NaN applies only the perigee rule).
 */
export const summarizeEvent = (event: BreakupEvent, sats: Satellite[], referenceMs = Number.NaN): EventSummary => summarizeFragments(sats, event.estimatedDebrisCount, referenceMs);

/**
 * Aggregate the detail-panel statistics for any fragment set. `estimated` is
 * the expected total debris count (0 when unknown, which reports a 0 ratio).
 * {@link summarizeEvent} is this with the curated event's estimate, so a live
 * (uncurated) set gets exactly the same dispersion math.
 */
export const summarizeFragments = (sats: Satellite[], estimated = 0, referenceMs = Number.NaN): EventSummary => {
  const tracked = sats.length;

  return {
    tracked,
    estimated,
    trackingRatio: estimated > 0 ? ((tracked / estimated) * 100).toFixed(1) : '0',
    counts: countByType(sats),
    altStats: calcAltitudeStats(sats),
    eccStats: calcFieldStats(sats, (s) => s.eccentricity),
    incStats: calcFieldStats(sats, (s) => s.inclination),
    likelyDecayed: countLikelyDecayed(sats, referenceMs),
  };
};

/**
 * Build the two Gabbard scatter series (period on x, altitude on y). The
 * Gabbard diagram is the canonical breakup-cloud visualization: a tight cluster
 * fans into a bow-tie as fragments spread in energy. Fragments with a
 * non-finite period (degenerate/reentering) are dropped.
 */
export const buildGabbardData = (sats: Satellite[]): GabbardData => {
  const apogee: GabbardPoint[] = [];
  const perigee: GabbardPoint[] = [];

  for (const sat of sats) {
    const period = sat.period;

    if (!Number.isFinite(period) || period <= 0) {
      continue;
    }

    apogee.push([period, sat.apogee]);
    perigee.push([period, sat.perigee]);
  }

  return { apogee, perigee };
};

/** UTC TLE epoch from the source snapshot; an unavailable epoch remains explicit. */
export const tleEpochIso = (epochYear: number, epochDay: number): string => {
  const ms = tleEpochMs(epochYear, epochDay);

  return ms === null ? '' : new Date(Math.round(ms)).toISOString();
};

/** CSV value of the likely-decayed flag (exports stay English for machine parsing). */
export const likelyDecayedCsvValue = (sat: Satellite, referenceMs: number): string => (isLikelyDecayed(sat, referenceMs) ? 'yes' : 'no');

/**
 * Plain rows for {@link saveCsv} (column order preserved by Papa.unparse).
 * `referenceMs` feeds the trailing `likelyDecayed` column (see {@link isLikelyDecayed}).
 */
export const buildCsvRows = (sats: Satellite[], event?: BreakupEvent, referenceMs = Number.NaN): Array<Record<string, string | number>> =>
  sats.map((sat) => ({
    noradId: sat.sccNum,
    name: sat.name,
    cospar: sat.intlDes ?? '',
    tleEpochUtc: tleEpochIso(sat.epochYear, sat.epochDay),
    provenance: 'loaded catalog elements; launch-prefix membership',
    curatedEventId: event?.id ?? '',
    historicalParentNoradId: event?.parentNoradId ?? '',
    historicalBreakupDate: event?.breakupDate ?? '',
    type: sat.getTypeString(),
    perigeeKm: Number(sat.perigee.toFixed(1)),
    apogeeKm: Number(sat.apogee.toFixed(1)),
    inclinationDeg: Number(sat.inclination.toFixed(2)),
    eccentricity: Number(sat.eccentricity.toFixed(4)),
    periodMin: Number(sat.period.toFixed(1)),
    likelyDecayed: likelyDecayedCsvValue(sat, referenceMs),
  }));

const fragmentSortValue = (sat: Satellite, key: FragmentSortKey): number | string => {
  switch (key) {
    case 'name':
      return sat.name;
    case 'type':
      return sat.getTypeString();
    case 'perigee':
      return sat.perigee;
    case 'apogee':
      return sat.apogee;
    case 'inclination':
      return sat.inclination;
    case 'eccentricity':
      return sat.eccentricity;
    case 'period':
      return sat.period;
    case 'sccNum':
    default:
      // Numeric-aware so SCC numbers sort 5, 10, 100 rather than 10, 100, 5.
      return Number.parseInt(sat.sccNum, 10);
  }
};

/**
 * Return a sorted copy of the fragment list (does not mutate the input). String
 * keys use a locale-aware compare; numeric keys (including a NaN-safe SCC parse)
 * sort numerically.
 */
export const sortFragments = (sats: Satellite[], key: FragmentSortKey, dir: SortDir): Satellite[] => {
  const factor = dir === 'asc' ? 1 : -1;

  return [...sats].sort((a, b) => {
    const av = fragmentSortValue(a, key);
    const bv = fragmentSortValue(b, key);

    if (typeof av === 'string' || typeof bv === 'string') {
      return factor * String(av).localeCompare(String(bv));
    }

    const aNum = Number.isNaN(av) ? Infinity : av;
    const bNum = Number.isNaN(bv) ? Infinity : bv;

    return factor * (aNum - bNum);
  });
};
