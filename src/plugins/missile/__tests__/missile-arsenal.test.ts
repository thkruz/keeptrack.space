import { CHINA_LARGEST_CITIES, CHINA_MILITARY_BASES } from '@app/plugins/missile/china-targets';
import {
  ATTACKER_SITES,
  attackerDesc,
  CHINA_CITY_TARGET_ID_BASE,
  CHINA_MILITARY_TARGET_ID_BASE,
  CITY_TARGET_ID_BASE,
  CUSTOM_TARGET_ID,
  getAttackerSite,
  MILITARY_TARGET_ID_BASE,
  RUSSIA_CITY_TARGET_ID_BASE,
  RUSSIA_MILITARY_TARGET_ID_BASE,
  TARGET_OPTIONS,
  targetLat,
  targetLon,
} from '@app/plugins/missile/missile-arsenal';
import { RUSSIA_LARGEST_CITIES, RUSSIA_MILITARY_BASES } from '@app/plugins/missile/russia-targets';
import { US_LARGEST_CITIES, US_MILITARY_BASES } from '@app/plugins/missile/us-targets';

describe('missile-arsenal registry', () => {
  it('resolves Russian options to the correct site (regression for the dropdown<->data desync)', () => {
    // Before the registry, value 206 mapped to data index 6 (Kozel'sk) instead of
    // Krasnoyarsk, and every Russian option after it was off-by-N. Pin the cases
    // that used to be wrong.
    expect(attackerDesc(getAttackerSite(206)!)).toContain('Krasnoyarsk');
    expect(attackerDesc(getAttackerSite(207)!)).toContain('Nizhniy Tagil');
    expect(attackerDesc(getAttackerSite(213)!)).toContain('Borei');
    expect(attackerDesc(getAttackerSite(215)!)).toContain('Layner');
  });

  it('never resolves an exposed option to the skipped Kozel`sk record', () => {
    for (const site of ATTACKER_SITES) {
      expect(attackerDesc(site)).not.toContain('Kozel');
    }
  });

  it('flags exactly the submarine / mobile launch sites', () => {
    const subs = ATTACKER_SITES.filter((s) => s.isSub)
      .map((s) => s.id)
      .sort((a, b) => a - b);

    expect(subs).toEqual([100, 213, 214, 215, 321, 400, 500, 600]);
  });

  it('every option has a unique value', () => {
    const ids = ATTACKER_SITES.map((s) => s.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preset targets resolve to coordinates and custom impact does not', () => {
    expect(targetLat(0)).toBeCloseTo(38.951, 2); // Washington DC
    expect(targetLon(0)).toBeCloseTo(-77.013, 2);
    expect(targetLat(CUSTOM_TARGET_ID)).toBeUndefined();
    expect(targetLon(CUSTOM_TARGET_ID)).toBeUndefined();
  });

  it('resolves expanded US military-base and city targets by their id ranges', () => {
    // First military base and first city (index 0 of each list).
    expect(targetLat(MILITARY_TARGET_ID_BASE)).toBe(US_MILITARY_BASES[0].lat);
    expect(targetLon(MILITARY_TARGET_ID_BASE)).toBe(US_MILITARY_BASES[0].lon);
    expect(targetLat(CITY_TARGET_ID_BASE)).toBe(US_LARGEST_CITIES[0].lat);
    expect(targetLon(CITY_TARGET_ID_BASE)).toBe(US_LARGEST_CITIES[0].lon);

    // A mid-list entry resolves to its own coordinates (id math is per-index).
    const cityIdx = 10;

    expect(targetLat(CITY_TARGET_ID_BASE + cityIdx)).toBe(US_LARGEST_CITIES[cityIdx].lat);
  });

  it('exposes all military bases and 50 cities as grouped dropdown options', () => {
    const military = TARGET_OPTIONS.filter((o) => o.groupKey === 'usMilitaryBases');
    const cities = TARGET_OPTIONS.filter((o) => o.groupKey === 'usLargestCities');

    expect(military).toHaveLength(US_MILITARY_BASES.length);
    expect(cities).toHaveLength(50);
    // Bulk entries carry a literal label (proper place name), not a locale key.
    expect(military.every((o) => typeof o.label === 'string' && !o.labelKey)).toBe(true);
    expect(cities[0].label).toBe(US_LARGEST_CITIES[0].name);
  });

  it('resolves and groups the Russia and China target catalogs', () => {
    // Coordinate resolution by id range.
    expect(targetLat(RUSSIA_MILITARY_TARGET_ID_BASE)).toBe(RUSSIA_MILITARY_BASES[0].lat);
    expect(targetLon(RUSSIA_CITY_TARGET_ID_BASE)).toBe(RUSSIA_LARGEST_CITIES[0].lon);
    expect(targetLat(CHINA_MILITARY_TARGET_ID_BASE)).toBe(CHINA_MILITARY_BASES[0].lat);
    expect(targetLon(CHINA_CITY_TARGET_ID_BASE)).toBe(CHINA_LARGEST_CITIES[0].lon);

    // Each catalog is exposed as its own dropdown group with literal labels.
    const byGroup = (key: string) => TARGET_OPTIONS.filter((o) => o.groupKey === key);

    expect(byGroup('russiaMilitaryBases')).toHaveLength(RUSSIA_MILITARY_BASES.length);
    expect(byGroup('russiaLargestCities')).toHaveLength(50);
    expect(byGroup('chinaMilitaryBases')).toHaveLength(CHINA_MILITARY_BASES.length);
    expect(byGroup('chinaLargestCities')).toHaveLength(50);
    expect(byGroup('russiaLargestCities')[0].label).toBe(RUSSIA_LARGEST_CITIES[0].name);
    expect(byGroup('chinaLargestCities')[0].label).toBe(CHINA_LARGEST_CITIES[0].name);
  });

  it('gives every target option a unique id and every option resolves to a coordinate', () => {
    const ids = TARGET_OPTIONS.map((o) => o.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const opt of TARGET_OPTIONS) {
      if (opt.id === CUSTOM_TARGET_ID) {
        continue;
      }
      expect(typeof targetLat(opt.id)).toBe('number');
      expect(typeof targetLon(opt.id)).toBe('number');
    }
  });
});
