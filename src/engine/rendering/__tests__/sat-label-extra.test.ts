import { describe, expect, it } from 'vitest';
import { composeExtraLabels, extraLabelGlyphs, GLYPH_CHARS, glyphIndexOf, groundPointEci, MAX_EXTRA_LABELS } from '../sat-label-manager';

describe('label glyph atlas', () => {
  it('keeps the catalog-number glyph indices (digits 0-9, J=10, S=11, C=12)', () => {
    expect(GLYPH_CHARS.slice(0, 13)).toBe('0123456789JSC');
    expect(glyphIndexOf('7')).toBe(7);
    expect(glyphIndexOf('J')).toBe(10);
    expect(glyphIndexOf('C')).toBe(12);
  });

  it('has no duplicate glyphs and fits the 10x10 atlas', () => {
    expect(new Set(GLYPH_CHARS).size).toBe(GLYPH_CHARS.length);
    expect(GLYPH_CHARS.length).toBeLessThanOrEqual(100);
  });

  it('covers every letter, digit and the punctuation used by host names', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.:/()+#&') {
      expect(glyphIndexOf(ch), ch).toBeGreaterThanOrEqual(0);
    }
  });

  it('maps host names to glyphs, blanks for space and ? for unknown characters', () => {
    const glyphs = extraLabelGlyphs('GW-01 é');

    expect(glyphs).toHaveLength(7);
    expect(glyphs[0]).toBe(glyphIndexOf('G'));
    expect(glyphs[2]).toBe(glyphIndexOf('-'));
    expect(glyphs[5]).toBe(-1);
    expect(glyphs[6]).toBe(glyphIndexOf('?'));
    expect(extraLabelGlyphs('MERIDIAN-SAR-2')).toHaveLength(14);
  });
});

describe('extra label set composition', () => {
  it('merges host, marker and sensor sources in order and drops duplicate keys', () => {
    const out = composeExtraLabels(
      [{ key: 'host:3', text: 'MERIDIAN-SAR-2', satId: 3 }],
      [{ key: 'marker:a', text: 'Target', ground: { latDeg: 1, lonDeg: 2, altKm: 0 } }],
      [
        { key: 'sensor:GW', text: 'GW-01 (auto)', ground: { latDeg: 53, lonDeg: -9, altKm: 0 } },
        { key: 'host:3', text: 'dup', satId: 3 },
      ]
    );

    expect(out.map((l) => l.key)).toEqual(['host:3', 'marker:a', 'sensor:GW']);
  });

  it('lets a host sensor label win over the same sensor from the global setting', () => {
    const out = composeExtraLabels(
      [{ key: 'sensor:GW', text: 'GW-01', ground: { latDeg: 53, lonDeg: -9, altKm: 0 }, color: [1, 0, 0] }],
      [{ key: 'sensor:GW', text: 'Galway', ground: { latDeg: 53, lonDeg: -9, altKm: 0 } }]
    );

    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('GW-01');
  });

  it('drops empty text and labels with no anchor, and caps the count', () => {
    expect(
      composeExtraLabels([
        { key: 'a', text: '', satId: 1 },
        { key: 'b', text: 'x' },
      ])
    ).toEqual([]);
    const many = Array.from({ length: MAX_EXTRA_LABELS + 20 }, (_, i) => ({ key: `k${i}`, text: 'x', satId: i }));

    expect(composeExtraLabels(many)).toHaveLength(MAX_EXTRA_LABELS);
  });
});

describe('ground label position math (flat map)', () => {
  /** The label shader's flat-map branch, in JS. */
  const flatXY = (eci: number[], gmst: number, radius = 6371, centerX = 0) => {
    const PI = Math.PI;
    let lon = Math.atan2(eci[1], eci[0]) - gmst;

    lon = ((((lon + PI) % (2 * PI)) + 2 * PI) % (2 * PI)) - PI;
    const lat = Math.atan2(eci[2], Math.hypot(eci[0], eci[1]));
    const mapW = 2 * PI * radius;
    let x = lon * radius;

    x = centerX + ((((x - centerX + mapW * 0.5) % mapW) + mapW) % mapW) - mapW * 0.5;

    return { x, y: lat * radius };
  };

  it.each([
    [53.27, -9.05, 1.2],
    [-33.9, 151.2, 4.9],
    [0, 179.9, 0.3],
    [64, -179.5, 6.0],
  ])('puts lat %f lon %f at the same map x/y as the dots shader for any gmst (%f)', (lat, lon, gmst) => {
    const eci = groundPointEci(lat, lon, 0.02, gmst);
    const { x, y } = flatXY(eci, gmst);

    expect(x / 6371).toBeCloseTo((lon * Math.PI) / 180, 6);
    expect(y / 6371).toBeCloseTo((lat * Math.PI) / 180, 6);
  });

  it('puts the point on the nearest copy of the map when panned across the date line', () => {
    const eci = groundPointEci(10, 179, 0, 0.5);
    const mapW = 2 * Math.PI * 6371;
    const centerX = ((-179 * Math.PI) / 180) * 6371;
    const { x } = flatXY(eci, 0.5, 6371, centerX);

    expect(Math.abs(x - centerX)).toBeLessThan(mapW / 2);
    expect(x).toBeCloseTo(((179 * Math.PI) / 180) * 6371 - mapW, 3);
  });

  it('keeps the point inside the shader ground-object radius so the globe rotates it to the current gmst', () => {
    expect(Math.hypot(...groundPointEci(10, 20, 0.3, 1))).toBeLessThan(6421);
    expect(Math.hypot(...groundPointEci(10, 20, 0.3, 1))).toBeCloseTo(6371.3, 3);
  });
});
