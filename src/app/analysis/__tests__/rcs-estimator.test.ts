import {
  buildCatalogRcsStats,
  CatalogRcsStats,
  EMPTY_CATALOG_RCS_STATS,
  estimateRcs,
  estimateRcsFromGeometry,
  estimateRcsFromVmag,
  estimateRcsWithSource,
  KNOWN_OBJECT_RCS,
  lookupKnownRcs,
  mineRcsFromCatalog,
} from '@app/app/analysis/rcs-estimator';
import { Satellite, SpaceObjectType } from '@ootk/src/main';
import { describe, expect, it } from 'vitest';

const makeSat = (overrides: Partial<Satellite>): Satellite => ({
  id: 0,
  name: '',
  type: SpaceObjectType.PAYLOAD,
  bus: '',
  length: '',
  diameter: '',
  span: '',
  shape: '',
  rcs: null,
  vmag: null,
  ...overrides,
} as unknown as Satellite);

describe('lookupKnownRcs', () => {
  it('matches a Starlink name prefix (hyphenated form) to the curated entry', () => {
    expect(lookupKnownRcs(makeSat({ name: 'STARLINK-1234' }))).toBe(5);
  });

  it('also matches the space-separated naming variant', () => {
    expect(lookupKnownRcs(makeSat({ name: 'STARLINK 1234' }))).toBe(5);
  });

  it('also matches mixed-case (catalog feed variations)', () => {
    expect(lookupKnownRcs(makeSat({ name: 'Starlink-1234' }))).toBe(5);
  });

  it('prefers a bus match over a name-prefix match', () => {
    expect(lookupKnownRcs(makeSat({ name: 'STARLINK-9999', bus: 'CubeSat 6U' }))).toBe(0.06);
  });

  it('returns null for an unrelated name', () => {
    expect(lookupKnownRcs(makeSat({ name: 'RANDOM-FAKESAT-7' }))).toBe(null);
  });

  it('refuses to apply payload presets to debris/rocket bodies', () => {
    const sat = makeSat({ name: 'STARLINK-1234', type: SpaceObjectType.DEBRIS });

    expect(lookupKnownRcs(sat)).toBe(null);
  });
});

describe('buildCatalogRcsStats', () => {
  it('computes arithmetic mean RCS per bus and per name prefix', () => {
    const sats = [
      makeSat({ id: 1, name: 'STARLINK-1', bus: 'STARLINK v1.5', rcs: 10 }),
      makeSat({ id: 2, name: 'STARLINK-2', bus: 'STARLINK v1.5', rcs: 20 }),
      makeSat({ id: 3, name: 'ISS (ZARYA)', bus: 'ISS', rcs: 400 }),
    ];
    const stats = buildCatalogRcsStats(sats);

    expect(stats.byBus.get('STARLINK v1.5')).toBeCloseTo(15, 5);
    expect(stats.byBus.get('ISS')).toBe(400);
    expect(stats.byNamePrefix.get('STARLINK')).toBeCloseTo(15, 5);
    expect(stats.byNamePrefix.get('ISS')).toBe(400);
    expect(stats.sampleSize).toBe(3);
  });

  it('skips entries with missing, NaN, zero, or negative RCS', () => {
    const sats = [
      makeSat({ id: 1, name: 'A', bus: 'BUS1', rcs: null }),
      makeSat({ id: 2, name: 'A', bus: 'BUS1', rcs: 0 }),
      makeSat({ id: 3, name: 'A', bus: 'BUS1', rcs: -5 }),
      makeSat({ id: 4, name: 'A', bus: 'BUS1', rcs: NaN }),
      makeSat({ id: 5, name: 'A', bus: 'BUS1', rcs: 42 }),
    ];
    const stats = buildCatalogRcsStats(sats);

    expect(stats.byBus.get('BUS1')).toBe(42);
  });
});

describe('mineRcsFromCatalog', () => {
  let stats: CatalogRcsStats;

  beforeEach(() => {
    stats = buildCatalogRcsStats([
      makeSat({ id: 1, name: 'STARLINK-1', bus: 'STARLINK v1.5', rcs: 10 }),
      makeSat({ id: 2, name: 'STARLINK-2', bus: 'STARLINK v1.5', rcs: 20 }),
      makeSat({ id: 3, name: 'IRIDIUM 100', bus: 'IRIDIUM NEXT', rcs: 7 }),
    ]);
  });

  it('prefers a bus match over the name-prefix average when both exist', () => {
    const sat = makeSat({ name: 'STARLINK-9999', bus: 'STARLINK v1.5' });

    expect(mineRcsFromCatalog(sat, stats)).toBeCloseTo(15, 5);
  });

  it('falls back to name-prefix average when bus is unset', () => {
    const sat = makeSat({ name: 'STARLINK-NEW' });

    expect(mineRcsFromCatalog(sat, stats)).toBeCloseTo(15, 5);
  });

  it('returns null when neither bus nor name-prefix match', () => {
    const sat = makeSat({ name: 'UNRELATED-OBJ' });

    expect(mineRcsFromCatalog(sat, stats)).toBe(null);
  });

  it('does NOT fall back to type — averaging across an entire type is meaningless', () => {
    const sat = makeSat({ name: 'UNRELATED', type: SpaceObjectType.PAYLOAD });

    expect(mineRcsFromCatalog(sat, stats)).toBe(null);
  });
});

describe('estimateRcsFromGeometry', () => {
  it('uses SatMath.estimateRcs when length, diameter, and span are all present', () => {
    const sat = makeSat({ length: '3.0 m', diameter: '1.5 m', span: '8 m', shape: 'box' });
    const rcs = estimateRcsFromGeometry(sat);

    expect(rcs).not.toBe(null);
    expect(isFinite(rcs!)).toBe(true);
    expect(rcs!).toBeGreaterThan(0);
  });

  it('defaults to box when shape is empty', () => {
    const withShape = estimateRcsFromGeometry(makeSat({ length: '3 m', diameter: '1.5 m', span: '8 m', shape: 'box' }));
    const withoutShape = estimateRcsFromGeometry(makeSat({ length: '3 m', diameter: '1.5 m', span: '8 m', shape: '' }));

    expect(withoutShape).toBe(withShape);
  });

  it('returns null when any dimension is missing or zero', () => {
    expect(estimateRcsFromGeometry(makeSat({ length: '3 m', diameter: '1.5 m', span: '' }))).toBe(null);
    expect(estimateRcsFromGeometry(makeSat({ length: '0 m', diameter: '1.5 m', span: '8 m' }))).toBe(null);
    expect(estimateRcsFromGeometry(makeSat({}))).toBe(null);
  });
});

describe('estimateRcsWithSource cascade', () => {
  it('returns the catalog value untouched when sat.rcs is set', () => {
    const sat = makeSat({ rcs: 5.5, name: 'STARLINK-1234' });

    expect(estimateRcsWithSource(sat, EMPTY_CATALOG_RCS_STATS)).toEqual({ rcs: 5.5, source: 'catalog' });
  });

  it('prefers preset over catalog-mining and geometry', () => {
    const stats = buildCatalogRcsStats([makeSat({ id: 1, name: 'STARLINK-1', rcs: 999 })]);
    const sat = makeSat({ name: 'STARLINK-9999', length: '1', diameter: '1', span: '1', shape: 'box' });
    const result = estimateRcsWithSource(sat, stats);

    expect(result?.source).toBe('preset');
    expect(result?.rcs).toBe(5);
  });

  it('falls back to catalog-mined when no preset matches but bus is in stats', () => {
    const stats = buildCatalogRcsStats([
      makeSat({ id: 1, name: 'OBSCURE-1', bus: 'OBSCURE BUS', rcs: 33 }),
      makeSat({ id: 2, name: 'OBSCURE-2', bus: 'OBSCURE BUS', rcs: 27 }),
    ]);
    const sat = makeSat({ name: 'OBSCURE-NEW', bus: 'OBSCURE BUS' });
    const result = estimateRcsWithSource(sat, stats);

    expect(result?.source).toBe('catalog-mined');
    expect(result?.rcs).toBe(30);
  });

  it('falls back to geometric when nothing else applies', () => {
    const sat = makeSat({
      name: 'UNCATALOGED-X',
      length: '3 m',
      diameter: '1.5 m',
      span: '8 m',
      shape: 'box',
    });
    const result = estimateRcsWithSource(sat, EMPTY_CATALOG_RCS_STATS);

    expect(result?.source).toBe('geometric');
    expect(isFinite(result!.rcs)).toBe(true);
  });

  it('falls back to vmag-derived when nothing else applies but catalog vmag is set', () => {
    // No catalog rcs, no preset name match, no dimensions, no catalog-mined match
    // — but sat.vmag is set, so the Lambert-sphere inversion can produce a value.
    const sat = makeSat({ name: 'UNCATALOGED-X', vmag: 5.5 });
    const result = estimateRcsWithSource(sat, EMPTY_CATALOG_RCS_STATS);

    expect(result?.source).toBe('vmag-derived');
    expect(isFinite(result!.rcs)).toBe(true);
    expect(result!.rcs).toBeGreaterThan(0);
  });

  it('returns null when every layer fails (no rcs, no vmag, no preset, no dimensions)', () => {
    expect(estimateRcsWithSource(makeSat({ name: 'UNCATALOGED-X' }), EMPTY_CATALOG_RCS_STATS)).toBe(null);
  });

  it('skips the catalog-mining layer when stats are not provided', () => {
    // Without stats, an obscure-bus sat with no preset and no dimensions falls
    // straight to null instead of getting a bus-mean — keeps unit tests pure
    // without forcing them to construct a catalog snapshot.
    const sat = makeSat({ name: 'OBSCURE-NEW', bus: 'OBSCURE BUS' });

    expect(estimateRcsWithSource(sat)).toBe(null);
    expect(estimateRcsWithSource(sat, null)).toBe(null);
  });
});

describe('estimateRcsFromVmag', () => {
  it('returns a finite positive RCS when sat.vmag is set', () => {
    const sat = makeSat({ vmag: 5.5 });
    const rcs = estimateRcsFromVmag(sat);

    expect(rcs).not.toBe(null);
    expect(isFinite(rcs!)).toBe(true);
    expect(rcs!).toBeGreaterThan(0);
  });

  it('produces brighter (smaller) magnitudes → larger RCS values, per the Lambert inversion', () => {
    const issLikeRcs = estimateRcsFromVmag(makeSat({ vmag: -1.3 }))!;
    const cubeSatLikeRcs = estimateRcsFromVmag(makeSat({ vmag: 10 }))!;

    expect(issLikeRcs).toBeGreaterThan(cubeSatLikeRcs);
    expect(issLikeRcs).toBeGreaterThan(100);
    expect(cubeSatLikeRcs).toBeLessThan(1);
  });

  it('returns null when no vmag signal exists anywhere', () => {
    expect(estimateRcsFromVmag(makeSat({ name: 'UNCATALOGED-X' }))).toBe(null);
  });

  it('uses the std-mag estimator under the hood, so vmag presets trigger it', () => {
    // A Starlink name → std-mag preset (~5.5) → vmag-derived RCS > 0
    const rcs = estimateRcsFromVmag(makeSat({ name: 'STARLINK-1234' }));

    expect(rcs).not.toBe(null);
    expect(rcs!).toBeGreaterThan(0);
  });
});

describe('estimateRcs (numeric convenience)', () => {
  it('returns the same number as estimateRcsWithSource', () => {
    const sat = makeSat({ name: 'STARLINK-1234' });

    expect(estimateRcs(sat, EMPTY_CATALOG_RCS_STATS)).toBe(estimateRcsWithSource(sat, EMPTY_CATALOG_RCS_STATS)?.rcs);
  });
});

describe('KNOWN_OBJECT_RCS calibration', () => {
  it.each(KNOWN_OBJECT_RCS.map((entry) => [entry.id, entry.rcs]))(
    '%s rcs is finite and within a plausible physical range',
    (_id, rcs) => {
      expect(isFinite(rcs as number)).toBe(true);
      // CubeSat (3U) is the smallest at ~0.03 m²; ISS is the largest at ~400 m².
      // Anything outside [0.001, 5000] m² is almost certainly a typo.
      expect(rcs as number).toBeGreaterThan(0.001);
      expect(rcs as number).toBeLessThan(5000);
    },
  );
});
