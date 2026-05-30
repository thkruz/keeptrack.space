import { constellations } from '@app/app/data/catalogs/constellations';

/*
 * constellations is a static data table (star groupings used by the astronomy
 * overlay); a smoke import keeps the module in the coverage denominator.
 */
describe('constellations', () => {
  it('exports a non-empty list of named constellations', () => {
    expect(Array.isArray(constellations)).toBe(true);
    expect(constellations.length).toBeGreaterThan(0);
    expect(constellations[0]).toHaveProperty('name');
  });
});
