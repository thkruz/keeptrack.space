/**
 * time2lon-core.ts - DOM-free core for the Waterfall (Time vs Longitude) plot.
 *
 * Holds the plot's data shapes plus the pure logic that screens the catalog,
 * buckets operators into a top-N country legend, and turns a satellite's sampled
 * sub-longitudes into a plot line. None of it touches the DOM, ServiceLocator,
 * echarts, or the country-data module (which pulls in CSS), so it runs unchanged
 * on the main thread, inside the time2lon web worker, and under vitest.
 */

import { CatalogSource, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';

/** A single data point: [longitude, timeFromNowMinutes] with metadata. */
export interface Time2LonDataPoint {
  value: [number, number];
  satName: string;
  satId: number;
}

/** Per-satellite line data, grouped by country name for the legend. */
export interface Time2LonSatLine {
  satName: string;
  satId: number;
  country: string;
  points: Time2LonDataPoint[];
}

/** Filter settings for the waterfall plot. */
export interface Time2LonFilters {
  activePayloads: boolean;
  inactivePayloads: boolean;
  rocketBodies: boolean;
  debris: boolean;
  celestrak: boolean;
  vimpel: boolean;
  minInclination: number;
  maxInclination: number;
  maxEccentricity: number;
  minPeriod: number;
  maxPeriod: number;
  samplePoints: number;
  maxTimeMin: number;
}

/** Metadata attached to every point of a satellite's line. */
export interface Time2LonLineMeta {
  satId: number;
  satName: string;
  country: string;
}

/** A geodetic sample as returned by the propagators: a longitude at an absolute time (ms). */
export interface Time2LonLlaSample {
  lon: number;
  time: number;
}

/** Maps the active object-type filters to the set of catalog types to keep. */
export const buildAllowedTypes = (filters: Time2LonFilters): Set<SpaceObjectType> => {
  const types = new Set<SpaceObjectType>();

  if (filters.activePayloads || filters.inactivePayloads) {
    types.add(SpaceObjectType.PAYLOAD);
  }
  if (filters.rocketBodies) {
    types.add(SpaceObjectType.ROCKET_BODY);
  }
  if (filters.debris) {
    types.add(SpaceObjectType.DEBRIS);
  }

  return types;
};

/**
 * True when a satellite passes every filter: allowed type, payload status,
 * eccentricity/period/inclination window, and catalog source. Mirrors the order
 * of the original inline checks so behavior is identical.
 */
export const isSatelliteAllowed = (sat: Satellite, filters: Time2LonFilters, allowedTypes: Set<SpaceObjectType>): boolean => {
  if (!allowedTypes.has(sat.type)) {
    return false;
  }

  // For payloads, honor the active/inactive status toggles.
  if (sat.type === SpaceObjectType.PAYLOAD) {
    const isActive = sat.status === PayloadStatus.OPERATIONAL;

    if (isActive && !filters.activePayloads) {
      return false;
    }
    if (!isActive && !filters.inactivePayloads) {
      return false;
    }
  }

  if (sat.eccentricity > filters.maxEccentricity) {
    return false;
  }
  if (sat.period < filters.minPeriod || sat.period > filters.maxPeriod) {
    return false;
  }
  if (sat.inclination < filters.minInclination || sat.inclination > filters.maxInclination) {
    return false;
  }

  // Source filter.
  if (sat.source === CatalogSource.VIMPEL && !filters.vimpel) {
    return false;
  }
  if (sat.source !== CatalogSource.VIMPEL && !filters.celestrak) {
    return false;
  }

  return true;
};

/**
 * Counts objects per country code, picks the top N, and returns a Map from raw
 * country code to human-readable display name. Codes outside the top N map to
 * 'Other'. The country map is injected so this stays free of the DOM/CSS-coupled
 * country-data module and remains worker-safe.
 */
export const buildTopCountries = (
  countryCounts: Record<string, number>,
  countryMap: Record<string, string>,
  topCount: number,
): Map<string, string> => {
  const sorted = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a);

  const topCodes = sorted.slice(0, topCount).map(([code]) => code);
  const lookup = new Map<string, string>();

  for (const code of topCodes) {
    lookup.set(code, countryMap[code] ?? code);
  }

  // Everything else maps to 'Other'.
  for (const [code] of sorted) {
    if (!lookup.has(code)) {
      lookup.set(code, 'Other');
    }
  }

  return lookup;
};

/**
 * How many orbital periods must be sampled to cover the requested time window.
 * A single orbit of sampling can only ever show ~one period of history; to plot
 * a multi-day waterfall we sample ceil(window / period) orbits. Always at least
 * one, and guards against a non-positive period.
 */
export const computeOrbits = (maxTimeMin: number, periodMin: number): number => {
  if (!(periodMin > 0) || !(maxTimeMin > 0)) {
    return 1;
  }

  return Math.max(1, Math.ceil(maxTimeMin / periodMin));
};

/**
 * Builds one satellite's plot line from its sampled sub-longitudes, keeping only
 * points whose offset falls inside [0, maxTimeMin]. Returns null when no point
 * survives, so empty lines never reach the chart.
 */
export const buildSatLine = (
  meta: Time2LonLineMeta,
  samples: Time2LonLlaSample[],
  nowMs: number,
  maxTimeMin: number,
): Time2LonSatLine | null => {
  const points: Time2LonDataPoint[] = [];

  for (const sample of samples) {
    const timeMin = (sample.time - nowMs) / 1000 / 60;

    if (timeMin < 0 || timeMin > maxTimeMin) {
      continue;
    }

    points.push({ value: [sample.lon, timeMin], satName: meta.satName, satId: meta.satId });
  }

  if (points.length === 0) {
    return null;
  }

  return { satName: meta.satName, satId: meta.satId, country: meta.country, points };
};
