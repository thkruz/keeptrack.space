import {
  COUNTRY_FILTERS,
  defaultFilterValue,
  enableGroup,
  FILTER_STORAGE_MAP,
  generateFilterId,
  getFilters,
  isDefaultState,
  OBJECT_TYPE_FILTERS,
  ORBITAL_REGIME_FILTERS,
  showOnlyInGroup,
  showOnlyPayloads,
  SOURCE_FILTERS,
} from '@app/plugins/filter-menu/filter-menu-core';

describe('filter-menu-core', () => {
  describe('generateFilterId', () => {
    it('camelCases and strips whitespace', () => {
      expect(generateFilterId('United States')).toBe('unitedStates');
      expect(generateFilterId('Rocket Bodies')).toBe('rocketBodies');
    });

    it('lowercases only the first character', () => {
      expect(generateFilterId('LEO Satellites')).toBe('lEOSatellites');
    });
  });

  describe('defaultFilterValue', () => {
    it('defaults enabled filters to on', () => {
      expect(defaultFilterValue({ name: 'x', category: 'c' })).toBe(true);
    });

    it('respects an explicit checked value', () => {
      expect(defaultFilterValue({ name: 'x', category: 'c', checked: false })).toBe(false);
    });

    it('defaults disabled filters to off', () => {
      expect(defaultFilterValue({ name: 'x', category: 'c', disabled: true })).toBe(false);
    });
  });

  describe('getFilters', () => {
    it('gives every filter an explicit id', () => {
      expect(getFilters().every((f) => typeof f.id === 'string' && f.id.length > 0)).toBe(true);
    });

    it('no longer exposes the removed agencies filter', () => {
      expect(getFilters().find((f) => f.id === 'agencies')).toBeUndefined();
    });

    it('groups the data-source filters under one category', () => {
      const sources = getFilters().filter((f) => SOURCE_FILTERS.includes(f.id!) && f.id !== 'vimpelSatellites');
      const categories = new Set(sources.map((f) => f.category));

      expect(sources.length).toBeGreaterThan(0);
      expect(categories.size).toBe(1);
    });
  });

  describe('group constants', () => {
    it('every grouped id and every storage-map id exists in the catalog', () => {
      const ids = new Set(getFilters().map((f) => f.id));
      // Vimpel only appears when the JSC catalog is enabled, so exclude it from the existence check.
      const groupIds = [...OBJECT_TYPE_FILTERS, ...ORBITAL_REGIME_FILTERS, ...COUNTRY_FILTERS, ...SOURCE_FILTERS]
        .filter((id) => id !== 'vimpelSatellites');

      groupIds.forEach((id) => expect(ids.has(id)).toBe(true));
      Object.keys(FILTER_STORAGE_MAP)
        .filter((id) => id !== 'vimpelSatellites')
        .forEach((id) => expect(ids.has(id)).toBe(true));
    });
  });

  describe('showOnlyInGroup', () => {
    it('enables only the target within the group', () => {
      expect(showOnlyInGroup('china', COUNTRY_FILTERS).china).toBe(true);
      expect(showOnlyInGroup('china', COUNTRY_FILTERS).unitedStates).toBe(false);
    });

    it('covers exactly the group ids', () => {
      expect(Object.keys(showOnlyInGroup('lEOSatellites', ORBITAL_REGIME_FILTERS)).sort((a, b) => a.localeCompare(b)))
        .toEqual([...ORBITAL_REGIME_FILTERS].sort((a, b) => a.localeCompare(b)));
    });
  });

  describe('enableGroup', () => {
    it('sets every id in the group to the given state', () => {
      const off = enableGroup(COUNTRY_FILTERS, false);

      expect(Object.values(off).every((v) => v === false)).toBe(true);
      expect(Object.keys(off).sort((a, b) => a.localeCompare(b))).toEqual([...COUNTRY_FILTERS].sort((a, b) => a.localeCompare(b)));
    });
  });

  describe('showOnlyPayloads', () => {
    it('keeps only operational and non-operational payloads on', () => {
      const patch = showOnlyPayloads();

      expect(patch.operationalPayloads).toBe(true);
      expect(patch.nonOperationalPayloads).toBe(true);
      expect(patch.debris).toBe(false);
      expect(patch.rocketBodies).toBe(false);
    });
  });

  describe('isDefaultState', () => {
    it('is true when every value matches its default', () => {
      expect(isDefaultState((id) => defaultFilterValue(getFilters().find((f) => f.id === id)!))).toBe(true);
    });

    it('treats an undefined value as the default', () => {
      // eslint-disable-next-line no-undefined
      expect(isDefaultState(() => undefined)).toBe(true);
    });

    it('is false when any value differs from its default', () => {
      expect(isDefaultState((id) => id !== 'debris')).toBe(false);
    });
  });
});
