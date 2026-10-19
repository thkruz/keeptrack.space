import {
  buildAllowedTypes,
  buildSatLine,
  buildTopCountries,
  computeOrbits,
  isSatelliteAllowed,
  Time2LonFilters,
  widenFiltersForSelection,
} from '@app/plugins/plot-analysis/time2lon-core';
import { CatalogSource, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';

const filters = (over: Partial<Time2LonFilters> = {}): Time2LonFilters => ({
  activePayloads: true,
  inactivePayloads: false,
  rocketBodies: false,
  debris: false,
  celestrak: true,
  vimpel: false,
  minInclination: 0,
  maxInclination: 10,
  maxEccentricity: 0.1,
  minPeriod: 1340,
  maxPeriod: 1540,
  samplePoints: 24,
  maxTimeMin: 1440,
  ...over,
});

const sat = (over: Record<string, unknown> = {}): Satellite =>
  ({
    type: SpaceObjectType.PAYLOAD,
    status: PayloadStatus.OPERATIONAL,
    eccentricity: 0.001,
    period: 1436,
    inclination: 5,
    source: CatalogSource.CELESTRAK,
    ...over,
  }) as unknown as Satellite;

describe('time2lon-core buildAllowedTypes', () => {
  it('includes PAYLOAD when either payload toggle is on', () => {
    expect(buildAllowedTypes(filters({ activePayloads: true })).has(SpaceObjectType.PAYLOAD)).toBe(true);
    expect(buildAllowedTypes(filters({ activePayloads: false, inactivePayloads: true })).has(SpaceObjectType.PAYLOAD)).toBe(true);
  });

  it('includes rocket bodies and debris only when enabled', () => {
    const types = buildAllowedTypes(filters({ rocketBodies: true, debris: true }));

    expect(types.has(SpaceObjectType.ROCKET_BODY)).toBe(true);
    expect(types.has(SpaceObjectType.DEBRIS)).toBe(true);
  });

  it('is empty when no object types are selected', () => {
    expect(buildAllowedTypes(filters({ activePayloads: false, inactivePayloads: false })).size).toBe(0);
  });
});

describe('time2lon-core isSatelliteAllowed', () => {
  const allowed = buildAllowedTypes(filters());

  it('accepts an in-window GEO payload', () => {
    expect(isSatelliteAllowed(sat(), filters(), allowed)).toBe(true);
  });

  it('rejects a type not in the allowed set', () => {
    expect(isSatelliteAllowed(sat({ type: SpaceObjectType.DEBRIS }), filters(), allowed)).toBe(false);
  });

  it('honors the active/inactive payload status toggles', () => {
    const inactive = sat({ status: PayloadStatus.NONOPERATIONAL });

    expect(isSatelliteAllowed(inactive, filters({ activePayloads: true, inactivePayloads: false }), allowed)).toBe(false);
    expect(isSatelliteAllowed(inactive, filters({ activePayloads: false, inactivePayloads: true }), buildAllowedTypes(filters({ inactivePayloads: true })))).toBe(true);
  });

  it('rejects out-of-bounds eccentricity, period, and inclination', () => {
    expect(isSatelliteAllowed(sat({ eccentricity: 0.5 }), filters(), allowed)).toBe(false);
    expect(isSatelliteAllowed(sat({ period: 95 }), filters(), allowed)).toBe(false);
    expect(isSatelliteAllowed(sat({ period: 5000 }), filters(), allowed)).toBe(false);
    expect(isSatelliteAllowed(sat({ inclination: 60 }), filters(), allowed)).toBe(false);
  });

  it('applies the catalog source filters', () => {
    const vimpelSat = sat({ source: CatalogSource.VIMPEL });

    expect(isSatelliteAllowed(vimpelSat, filters({ vimpel: false }), allowed)).toBe(false);
    expect(isSatelliteAllowed(vimpelSat, filters({ vimpel: true }), allowed)).toBe(true);
    expect(isSatelliteAllowed(sat(), filters({ celestrak: false }), allowed)).toBe(false);
  });
});

describe('time2lon-core buildTopCountries', () => {
  const countryMap = { US: 'United States', RU: 'Russia', CN: 'China' };

  it('maps the top-N codes to display names and the rest to Other', () => {
    const lookup = buildTopCountries({ US: 100, RU: 50, CN: 10, XX: 1 }, countryMap, 2);

    expect(lookup.get('US')).toBe('United States');
    expect(lookup.get('RU')).toBe('Russia');
    expect(lookup.get('CN')).toBe('Other');
    expect(lookup.get('XX')).toBe('Other');
  });

  it('falls back to the raw code when not in the country map', () => {
    const lookup = buildTopCountries({ ZZ: 5 }, countryMap, 5);

    expect(lookup.get('ZZ')).toBe('ZZ');
  });

  it('handles empty input', () => {
    expect(buildTopCountries({}, countryMap, 15).size).toBe(0);
  });
});

describe('time2lon-core computeOrbits', () => {
  it('returns at least one orbit', () => {
    expect(computeOrbits(60, 1436)).toBe(1);
    expect(computeOrbits(1436, 1436)).toBe(1);
  });

  it('scales the orbit count to cover the requested window', () => {
    expect(computeOrbits(1440, 1436)).toBe(2);
    expect(computeOrbits(5760, 1436)).toBe(5);
  });

  it('guards against a non-positive period or window', () => {
    expect(computeOrbits(1440, 0)).toBe(1);
    expect(computeOrbits(0, 1436)).toBe(1);
  });
});

describe('time2lon-core buildSatLine', () => {
  const meta = { satId: 1, satName: 'GEOSAT', country: 'United States' };
  const NOW = 1_000_000;

  it('keeps only points inside [0, maxTimeMin] and stamps metadata', () => {
    const line = buildSatLine(
      meta,
      [
        { lon: 100, time: NOW + 60_000 }, // +1 min, kept
        { lon: 110, time: NOW - 60_000 }, // -1 min, dropped
        { lon: 120, time: NOW + 5000 * 60_000 }, // beyond horizon, dropped
      ],
      NOW,
      1440
    );

    expect(line).not.toBeNull();
    expect(line!.points).toHaveLength(1);
    expect(line!.points[0].value).toEqual([100, 1]);
    expect(line!.points[0].satName).toBe('GEOSAT');
    expect(line!.satId).toBe(1);
    expect(line!.country).toBe('United States');
  });

  it('returns null when no point survives the window', () => {
    expect(buildSatLine(meta, [{ lon: 100, time: NOW - 60_000 }], NOW, 1440)).toBeNull();
    expect(buildSatLine(meta, [], NOW, 1440)).toBeNull();
  });
});

describe('time2lon-core widenFiltersForSelection', () => {
  // GALAXY 15 (28884) from the iteration-2 scenario-5 log: non-operational, drifting GEO.
  const galaxy15 = sat({ status: PayloadStatus.NONOPERATIONAL, period: 1455.43, inclination: 3.85, eccentricity: 0.0018 });

  it('turns on Inactive Payloads when the selected drifter is hidden by the default filter', () => {
    const base = filters();

    expect(isSatelliteAllowed(galaxy15, base, buildAllowedTypes(base))).toBe(false);

    const widened = widenFiltersForSelection(base, galaxy15);

    expect(widened).not.toBe(base);
    expect(widened.inactivePayloads).toBe(true);
    expect(widened.activePayloads).toBe(true); // the rest of the band stays visible
    expect(isSatelliteAllowed(galaxy15, widened, buildAllowedTypes(widened))).toBe(true);
  });

  it('turns on the matching type and source toggles for rocket bodies, debris and Vimpel objects', () => {
    expect(widenFiltersForSelection(filters(), sat({ type: SpaceObjectType.ROCKET_BODY })).rocketBodies).toBe(true);
    expect(widenFiltersForSelection(filters(), sat({ type: SpaceObjectType.DEBRIS })).debris).toBe(true);
    expect(widenFiltersForSelection(filters(), sat({ source: CatalogSource.VIMPEL })).vimpel).toBe(true);
  });

  it('returns the same filters when nothing needs to change', () => {
    const base = filters();

    expect(widenFiltersForSelection(base, null)).toBe(base);
    expect(widenFiltersForSelection(base, sat())).toBe(base); // operational payload already shown
    expect(widenFiltersForSelection(base, sat({ type: SpaceObjectType.STAR }))).toBe(base);
  });

  it('leaves the filters alone when the selection is outside the orbital band', () => {
    const base = filters();

    expect(widenFiltersForSelection(base, sat({ status: PayloadStatus.NONOPERATIONAL, period: 95 }))).toBe(base);
    expect(widenFiltersForSelection(base, sat({ status: PayloadStatus.NONOPERATIONAL, inclination: 55 }))).toBe(base);
    expect(widenFiltersForSelection(base, sat({ status: PayloadStatus.NONOPERATIONAL, eccentricity: 0.7 }))).toBe(base);
  });
});
