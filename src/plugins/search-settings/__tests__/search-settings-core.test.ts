import {
  DEFAULT_SEARCHABLE_FIELDS,
  DEFAULT_SEARCHABLE_TYPES,
  MIN_SEARCH_CHARS_DEFAULT,
  parseBool,
  parseMaxResults,
  parseMinSearchChars,
  parseSearchableFields,
  parseSearchableTypes,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  serializeSearchableFields,
  serializeSearchableTypes,
} from '@app/plugins/search-settings/search-settings-core';

describe('search-settings-core', () => {
  describe('parseMaxResults', () => {
    it('accepts a valid value', () => {
      expect(parseMaxResults('250')).toEqual({ value: 250, valid: true });
    });

    it('clamps above the maximum', () => {
      expect(parseMaxResults('99999999')).toEqual({ value: SEARCH_LIMIT_MAX, valid: true });
    });

    it('rejects non-numeric input', () => {
      expect(parseMaxResults('abc')).toEqual({ value: SEARCH_LIMIT_DEFAULT, valid: false });
    });

    it('rejects values below the minimum', () => {
      expect(parseMaxResults('0')).toEqual({ value: SEARCH_LIMIT_DEFAULT, valid: false });
    });

    it('parses with base 10 (no octal/garbage)', () => {
      expect(parseMaxResults('010')).toEqual({ value: 10, valid: true });
    });
  });

  describe('parseMinSearchChars', () => {
    it('accepts a valid value', () => {
      expect(parseMinSearchChars('3')).toEqual({ value: 3, valid: true });
    });

    it('clamps above the maximum', () => {
      expect(parseMinSearchChars('50')).toEqual({ value: 10, valid: true });
    });

    it('rejects non-numeric input', () => {
      expect(parseMinSearchChars('xyz')).toEqual({ value: MIN_SEARCH_CHARS_DEFAULT, valid: false });
    });
  });

  describe('parseBool', () => {
    it('parses true/false', () => {
      expect(parseBool('true', false)).toBe(true);
      expect(parseBool('false', true)).toBe(false);
    });

    it('falls back on garbage or null', () => {
      expect(parseBool(null, true)).toBe(true);
      expect(parseBool('nope', false)).toBe(false);
    });
  });

  describe('parseSearchableFields', () => {
    it('returns all-enabled defaults for null', () => {
      expect(parseSearchableFields(null)).toEqual(DEFAULT_SEARCHABLE_FIELDS);
    });

    it('returns all-enabled defaults for corrupt JSON', () => {
      expect(parseSearchableFields('{not json')).toEqual(DEFAULT_SEARCHABLE_FIELDS);
    });

    it('applies known boolean keys and ignores unknown ones', () => {
      const result = parseSearchableFields(JSON.stringify({ name: false, bogus: true }));

      expect(result.name).toBe(false);
      expect(result.bus).toBe(true);
      expect((result as unknown as Record<string, unknown>).bogus).toBeUndefined();
    });

    it('round-trips through serialize', () => {
      const fields = { ...DEFAULT_SEARCHABLE_FIELDS, noradId: false, intlDes: false };

      expect(parseSearchableFields(serializeSearchableFields(fields))).toEqual(fields);
    });
  });

  describe('parseSearchableTypes', () => {
    it('returns defaults (sats/missiles on, rest off) for null', () => {
      expect(parseSearchableTypes(null)).toEqual(DEFAULT_SEARCHABLE_TYPES);
    });

    it('returns defaults for corrupt JSON', () => {
      expect(parseSearchableTypes('{not json')).toEqual(DEFAULT_SEARCHABLE_TYPES);
    });

    it('applies known boolean keys and falls back to defaults for the rest', () => {
      const result = parseSearchableTypes(JSON.stringify({ star: false, bogus: true }));

      expect(result.star).toBe(false); // overridden by the persisted value
      expect(result.satellite).toBe(true); // missing key falls back to default
      expect(result.planet).toBe(true); // missing key falls back to default
      expect((result as unknown as Record<string, unknown>).bogus).toBeUndefined();
    });

    it('round-trips through serialize', () => {
      const types = { ...DEFAULT_SEARCHABLE_TYPES, star: true, launchSite: true };

      expect(parseSearchableTypes(serializeSearchableTypes(types))).toEqual(types);
    });
  });
});
