import {
  deriveCrossSectionAreaM2,
  estimateStdMag,
  estimateStdMagFromProperties,
  estimateStdMagWithSource,
  KNOWN_OBJECT_MAGNITUDES,
  lookupKnownVmag,
} from '@app/app/analysis/std-mag-estimator';
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
  rcs: null,
  vmag: null,
  ...overrides,
} as unknown as Satellite);

describe('lookupKnownVmag', () => {
  it('matches a Starlink name prefix to the curated v1.5 entry', () => {
    const sat = makeSat({ name: 'STARLINK-1234' });

    expect(lookupKnownVmag(sat)).toBe(5.5);
  });

  it('matches a bus field exactly before falling back to name prefix', () => {
    const sat = makeSat({ name: 'STARLINK-9999', bus: 'CubeSat 6U' });

    // Bus match wins over name match
    expect(lookupKnownVmag(sat)).toBe(7.8);
  });

  it('is case-insensitive on name prefix', () => {
    const sat = makeSat({ name: 'starlink-1234' });

    expect(lookupKnownVmag(sat)).toBe(5.5);
  });

  it('returns null for an unrelated name', () => {
    // The COSMOS preset is keyed on the prefix "COSMOS " (with trailing
    // space), so "COSMOS-DEBRIS-7" must NOT match it — the hyphenated form is
    // typically the Russian Cosmos series re-cataloged as fragments.
    const sat = makeSat({ name: 'COSMOS-DEBRIS-7' });
    const sat2 = makeSat({ name: 'RANDOM-FAKESAT-7' });

    expect(lookupKnownVmag(sat)).toBe(null);
    expect(lookupKnownVmag(sat2)).toBe(null);
  });

  it('matches the canonical "COSMOS NNN" naming format', () => {
    const sat = makeSat({ name: 'COSMOS 2543' });

    expect(lookupKnownVmag(sat)).toBe(4.5);
  });

  it('refuses to apply payload-name presets to debris/rocket bodies', () => {
    const sat = makeSat({ name: 'STARLINK-1234', type: SpaceObjectType.DEBRIS });

    expect(lookupKnownVmag(sat)).toBe(null);
  });

  it('returns null when name is empty and bus is unset', () => {
    const sat = makeSat({ name: '' });

    expect(lookupKnownVmag(sat)).toBe(null);
  });
});

describe('deriveCrossSectionAreaM2', () => {
  it('uses length × max(diameter, span) for rectangular projection', () => {
    const sat = makeSat({ length: '3.7 m', diameter: '1.5 m', span: '0.5 m' });

    // 3.7 * max(1.5, 0.5) = 5.55
    expect(deriveCrossSectionAreaM2(sat)).toBeCloseTo(5.55, 5);
  });

  it('prefers span over diameter when span is larger', () => {
    const sat = makeSat({ length: '2.0 m', diameter: '1.0 m', span: '8.0 m' });

    // 2.0 * 8.0 = 16.0
    expect(deriveCrossSectionAreaM2(sat)).toBeCloseTo(16, 5);
  });

  it('falls back to π·r² when only diameter is present', () => {
    const sat = makeSat({ diameter: '2.0 m' });

    // π * 1² = π
    expect(deriveCrossSectionAreaM2(sat)).toBeCloseTo(Math.PI, 5);
  });

  it('falls back to RCS when no dimensions are available', () => {
    const sat = makeSat({ rcs: 2.5 });

    expect(deriveCrossSectionAreaM2(sat)).toBe(2.5);
  });

  it('returns null when nothing usable is provided', () => {
    const sat = makeSat({});

    expect(deriveCrossSectionAreaM2(sat)).toBe(null);
  });

  it('ignores zero or non-numeric strings', () => {
    const sat = makeSat({ length: '0 m', diameter: 'unknown', span: '' });

    expect(deriveCrossSectionAreaM2(sat)).toBe(null);
  });
});

describe('estimateStdMagFromProperties', () => {
  it('returns a finite number in a sane brightness range for typical satellite area', () => {
    const mag = estimateStdMagFromProperties(2.0, 0.2);

    expect(isFinite(mag)).toBe(true);
    expect(mag).toBeGreaterThan(0);
    expect(mag).toBeLessThan(12);
  });

  it('is brighter (smaller number) for larger area at fixed albedo', () => {
    const small = estimateStdMagFromProperties(1.0, 0.2);
    const large = estimateStdMagFromProperties(100.0, 0.2);

    expect(large).toBeLessThan(small);
  });

  it('is brighter for higher albedo at fixed area', () => {
    const dark = estimateStdMagFromProperties(2.0, 0.05);
    const bright = estimateStdMagFromProperties(2.0, 0.5);

    expect(bright).toBeLessThan(dark);
  });

  it('returns +Infinity for zero or negative area', () => {
    expect(estimateStdMagFromProperties(0, 0.2)).toBe(Number.POSITIVE_INFINITY);
    expect(estimateStdMagFromProperties(-1, 0.2)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('estimateStdMagWithSource', () => {
  it('returns the catalog value untouched when sat.vmag is set', () => {
    const sat = makeSat({ vmag: 4.2, name: 'STARLINK-1234' });

    expect(estimateStdMagWithSource(sat)).toEqual({ vmag: 4.2, source: 'catalog' });
  });

  it('reports estimate provenance for a back-filled vmag flagged as estimated', () => {
    const sat = makeSat({ vmag: 4.2, name: 'STARLINK-1234' });

    (sat as typeof sat & { isVmagEstimated?: boolean }).isVmagEstimated = true;

    expect(estimateStdMagWithSource(sat)).toEqual({ vmag: 4.2, source: 'estimate' });
  });

  it('prefers a preset over a property-derived estimate when both apply', () => {
    const sat = makeSat({
      name: 'STARLINK-1234',
      length: '3.7 m',
      diameter: '1.5 m',
    });

    const result = estimateStdMagWithSource(sat);

    expect(result?.source).toBe('preset');
    expect(result?.vmag).toBe(5.5);
  });

  it('falls back to a property-derived estimate when no preset matches', () => {
    const sat = makeSat({
      name: 'UNCATALOGED-42',
      length: '3.0 m',
      diameter: '1.0 m',
    });

    const result = estimateStdMagWithSource(sat);

    expect(result?.source).toBe('estimate');
    expect(isFinite(result!.vmag)).toBe(true);
  });

  it('returns null when no signal is available', () => {
    const sat = makeSat({ name: 'UNCATALOGED-42' });

    expect(estimateStdMagWithSource(sat)).toBe(null);
  });
});

describe('estimateStdMag (numeric convenience)', () => {
  it('returns the same number as estimateStdMagWithSource', () => {
    const sat = makeSat({ name: 'STARLINK-1234' });

    expect(estimateStdMag(sat)).toBe(estimateStdMagWithSource(sat)?.vmag);
  });

  it('returns null when no source is available', () => {
    const sat = makeSat({ name: 'UNCATALOGED-42' });

    expect(estimateStdMag(sat)).toBe(null);
  });
});

describe('KNOWN_OBJECT_MAGNITUDES calibration', () => {
  it.each(KNOWN_OBJECT_MAGNITUDES.map((entry) => [entry.id, entry.vmag]))(
    '%s vmag is finite and within a plausible observation range',
    (_id, vmag) => {
      expect(isFinite(vmag as number)).toBe(true);
      // Brightest object catalogued is the ISS (~-1.3); faintest GEO comsats
      // sit near +12. Anything outside that range is almost certainly a typo.
      expect(vmag as number).toBeGreaterThan(-5);
      expect(vmag as number).toBeLessThan(15);
    },
  );

  it('contains an ISS entry (sanity check for headline-known object)', () => {
    const iss = KNOWN_OBJECT_MAGNITUDES.find((entry) => entry.id === 'iss');

    expect(iss).toBeDefined();
    expect(iss!.vmag).toBeLessThan(0);
  });

  it('contains a Starlink v1.5 entry within published observation bounds', () => {
    const starlink = KNOWN_OBJECT_MAGNITUDES.find((entry) => entry.id === 'starlink-v1.5');

    expect(starlink).toBeDefined();
    // Published post-VisorSat mean is ~5.5 at 1000 km; allow ±1 magnitude
    expect(starlink!.vmag).toBeGreaterThan(4);
    expect(starlink!.vmag).toBeLessThan(7);
  });
});
