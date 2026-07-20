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

/** Aggregate every statistic the detail panel needs for one event + its tracked fragments. */
export const summarizeEvent = (event: BreakupEvent, sats: Satellite[]): EventSummary => {
  const tracked = sats.length;
  const estimated = event.estimatedDebrisCount;

  return {
    tracked,
    estimated,
    trackingRatio: estimated > 0 ? ((tracked / estimated) * 100).toFixed(1) : '0',
    counts: countByType(sats),
    altStats: calcAltitudeStats(sats),
    eccStats: calcFieldStats(sats, (s) => s.eccentricity),
    incStats: calcFieldStats(sats, (s) => s.inclination),
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

/** Plain rows for {@link saveCsv} (column order preserved by Papa.unparse). */
export const buildCsvRows = (sats: Satellite[]): Array<Record<string, string | number>> =>
  sats.map((sat) => ({
    noradId: sat.sccNum,
    name: sat.name,
    type: sat.getTypeString(),
    perigeeKm: Number(sat.perigee.toFixed(1)),
    apogeeKm: Number(sat.apogee.toFixed(1)),
    inclinationDeg: Number(sat.inclination.toFixed(2)),
    eccentricity: Number(sat.eccentricity.toFixed(4)),
    periodMin: Number(sat.period.toFixed(1)),
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
