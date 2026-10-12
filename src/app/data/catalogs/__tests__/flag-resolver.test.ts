import flagAtlas from '../../../../../public/img/flag-atlas/atlas.json';
import { flagAtlasRect, resolveFlagKey } from '../flag-resolver';

const cells = flagAtlas.cells as unknown as Record<string, number[]>;

describe('resolveFlagKey', () => {
  it('uses the override first', () => {
    expect(resolveFlagKey({ country: 'US', operatorLogo: 'ISS' })).toBe('iss');
  });

  it('falls back to the country field', () => {
    // countryFlagIconMap: US -> US, PRC -> CN, ISS -> ISS (custom iss.png).
    expect(resolveFlagKey({ country: 'US' })).toBe('us');
    expect(resolveFlagKey({ country: 'PRC' })).toBe('cn');
    expect(resolveFlagKey({ country: 'ISS' })).toBe('iss');
  });

  it('returns null with neither', () => {
    expect(resolveFlagKey({})).toBeNull();
    expect(resolveFlagKey({ country: '' })).toBeNull();
    expect(resolveFlagKey(null)).toBeNull();
  });
});

describe('flagAtlasRect', () => {
  it('returns the cell for a known key and the fallback for an unknown one', () => {
    expect(flagAtlasRect('us')).toEqual(cells.us);
    expect(flagAtlasRect('no-such-flag')).toEqual(cells[flagAtlas.fallback]);
    expect(flagAtlasRect(null)).toBeNull();
  });
});
