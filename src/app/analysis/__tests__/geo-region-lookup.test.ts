import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGeoRegionIndex, findGeoRegion, type GeoRegionFeature, getGeoRegionName } from '../geo-region-lookup';

const square = (x0: number, y0: number, x1: number, y1: number): number[][] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
  [x0, y0],
];

const features: GeoRegionFeature[] = [
  { properties: { name: 'Boxland', names: { de: 'Kastenland' } }, geometry: { type: 'Polygon', coordinates: [square(0, 0, 10, 10)] } },
  // Donut: hole in the middle
  { properties: { name: 'Donut' }, geometry: { type: 'Polygon', coordinates: [square(20, 0, 40, 20), square(25, 5, 35, 15)] } },
  // Multipolygon, two islands
  { properties: { name: 'Twin' }, geometry: { type: 'MultiPolygon', coordinates: [[square(50, 0, 52, 2)], [square(60, 0, 62, 2)]] } },
  // Crosses the antimeridian in a single ring (170E to 170W)
  {
    properties: { name: 'Fijiish' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [170, -20],
          [-170, -20],
          [-170, -10],
          [170, -10],
          [170, -20],
        ],
      ],
    },
  },
  // Split at the antimeridian, Russia style (two polygons touching +-180)
  { properties: { name: 'Eastland' }, geometry: { type: 'MultiPolygon', coordinates: [[square(160, 60, 180, 70)], [square(-180, 60, -170, 70)]] } },
  { properties: { name: 'Nowhere' }, geometry: null },
];
const index = buildGeoRegionIndex(features);
const nameAt = (lat: number, lon: number): string | null => findGeoRegion(index, lat, lon)?.name ?? null;

describe('geo-region-lookup', () => {
  it('finds a point inside a country', () => {
    expect(nameAt(5, 5)).toBe('Boxland');
  });

  it('returns null over ocean', () => {
    expect(nameAt(-50, 100)).toBeNull();
    expect(nameAt(5, 15)).toBeNull();
  });

  it('respects holes', () => {
    expect(nameAt(10, 30)).toBeNull();
    expect(nameAt(2, 22)).toBe('Donut');
  });

  it('handles multipolygons', () => {
    expect(nameAt(1, 51)).toBe('Twin');
    expect(nameAt(1, 61)).toBe('Twin');
    expect(nameAt(1, 56)).toBeNull();
  });

  it('handles a ring that crosses the antimeridian', () => {
    expect(nameAt(-15, 175)).toBe('Fijiish');
    expect(nameAt(-15, -175)).toBe('Fijiish');
    expect(nameAt(-15, 180)).toBe('Fijiish');
    expect(nameAt(-15, 0)).toBeNull();
    expect(nameAt(-15, -160)).toBeNull();
  });

  it('handles countries split at the antimeridian', () => {
    expect(nameAt(65, 170)).toBe('Eastland');
    expect(nameAt(65, -175)).toBe('Eastland');
    expect(nameAt(65, -165)).toBeNull();
  });

  it('normalizes longitudes outside -180..180', () => {
    expect(nameAt(5, 365)).toBe('Boxland');
    expect(nameAt(5, -355)).toBe('Boxland');
  });

  it('rejects non-finite input', () => {
    expect(nameAt(Number.NaN, 5)).toBeNull();
  });

  it('localizes with fallback to English', () => {
    const hit = findGeoRegion(index, 5, 5)!;

    expect(getGeoRegionName(hit, 'de-DE')).toBe('Kastenland');
    expect(getGeoRegionName(hit, 'fr')).toBe('Boxland');
  });
});

describe('geo-region-lookup with the Natural Earth 50m dataset', () => {
  const json = JSON.parse(readFileSync(join(process.cwd(), 'public/data/ne_50m_admin_0_countries.geojson'), 'utf8')) as { features: GeoRegionFeature[] };
  const real = buildGeoRegionIndex(json.features);
  const at = (lat: number, lon: number): string | null => findGeoRegion(real, lat, lon)?.name ?? null;

  it('resolves real countries, both sides of the antimeridian, and ocean', () => {
    expect(at(39, -98)).toBe('United States of America');
    expect(at(55, 37)).toBe('Russia');
    expect(at(66, 170)).toBe('Russia');
    expect(at(66, -175)).toBe('Russia');
    expect(at(-17.7, 178)).toBe('Fiji');
    expect(at(0, -140)).toBeNull();
    expect(at(-40, -30)).toBeNull();
  });
});
