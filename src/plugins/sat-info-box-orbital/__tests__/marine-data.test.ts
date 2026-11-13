import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildGeoRegionIndex, findGeoRegion } from '@app/app/analysis/geo-region-lookup';

const file = resolve(__dirname, '../../../../public/data/marine-regions-simplified.geojson');

describe('marine-regions-simplified.geojson (#27)', () => {
  const index = buildGeoRegionIndex(JSON.parse(readFileSync(file, 'utf8')).features);

  it('stays small', () => {
    expect(statSync(file).size).toBeLessThan(120_000);
  });

  it.each([
    [0, -140, 'Pacific Ocean'],
    [30, -40, 'Atlantic Ocean'],
    [-20, 80, 'Indian Ocean'],
    [35, 18, 'Sea'],
    [25, -90, 'Gulf of Mexico'],
    [20, 38, 'Red Sea'],
    [43, 34, 'Black Sea'],
    [56, 3, 'North Sea'],
    [15, -75, 'Caribbean Sea'],
  ])('names %d, %d as something containing "%s"', (lat, lon, expected) => {
    const hit = findGeoRegion(index, lat, lon);

    expect(hit?.name).toContain(expected);
  });

  it('prefers a sea over the ocean around it', () => {
    expect(findGeoRegion(index, 20, 38)?.name).toBe('Red Sea');
  });
});
