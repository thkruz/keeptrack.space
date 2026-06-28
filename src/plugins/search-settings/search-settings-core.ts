/**
 * DOM-free logic for the Search Settings plugin: bounds, defaults, value
 * parsing/clamping, and (de)serialization of the searchable-fields map. Keeping
 * this pure makes it unit-testable without jsdom and keeps the plugin file
 * focused on DOM wiring.
 */
import type { SearchableFields, SearchableTypes } from '@app/settings/core-settings';

/** Allowed range and default for the maximum number of search results. */
export const SEARCH_LIMIT_MIN = 1;
export const SEARCH_LIMIT_MAX = 10_000;
export const SEARCH_LIMIT_DEFAULT = 600;

/** Allowed range and default for the minimum characters before searching. */
export const MIN_SEARCH_CHARS_MIN = 1;
export const MIN_SEARCH_CHARS_MAX = 10;
export const MIN_SEARCH_CHARS_DEFAULT = 2;

/** Defaults for the boolean toggles. */
export const SHOW_DECAYED_DEFAULT = true;
export const SHOW_VIMPEL_DEFAULT = false;

/** Every searchable field enabled — the default and the reset target. */
export const DEFAULT_SEARCHABLE_FIELDS: SearchableFields = {
  name: true,
  altName: true,
  bus: true,
  noradId: true,
  intlDes: true,
  launchVehicle: true,
};

/** Every searchable object type enabled — the default and the reset target. */
export const DEFAULT_SEARCHABLE_TYPES: SearchableTypes = {
  satellite: true,
  missile: true,
  star: true,
  sensor: true,
  launchSite: true,
  planet: true,
};

export interface ParsedNumber {
  value: number;
  valid: boolean;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * Parse a raw max-results string. Invalid (non-numeric or below the minimum)
 * input is flagged so the caller can reject it; otherwise the value is clamped
 * to the allowed range.
 */
export const parseMaxResults = (raw: string): ParsedNumber => {
  const parsed = parseInt(raw, 10);

  if (isNaN(parsed) || parsed < SEARCH_LIMIT_MIN) {
    return { value: SEARCH_LIMIT_DEFAULT, valid: false };
  }

  return { value: clamp(parsed, SEARCH_LIMIT_MIN, SEARCH_LIMIT_MAX), valid: true };
};

/**
 * Parse a raw minimum-search-characters string. Same contract as
 * {@link parseMaxResults}.
 */
export const parseMinSearchChars = (raw: string): ParsedNumber => {
  const parsed = parseInt(raw, 10);

  if (isNaN(parsed) || parsed < MIN_SEARCH_CHARS_MIN) {
    return { value: MIN_SEARCH_CHARS_DEFAULT, valid: false };
  }

  return { value: clamp(parsed, MIN_SEARCH_CHARS_MIN, MIN_SEARCH_CHARS_MAX), valid: true };
};

/** Parse a persisted boolean ('true'/'false'), falling back when absent/garbage. */
export const parseBool = (raw: string | null, fallback: boolean): boolean => {
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }

  return fallback;
};

/**
 * Parse a persisted searchable-fields JSON blob. Unknown keys are dropped and
 * missing keys fall back to enabled, so an old or corrupt value never disables
 * a field the user never touched.
 */
export const parseSearchableFields = (raw: string | null): SearchableFields => {
  const result: SearchableFields = { ...DEFAULT_SEARCHABLE_FIELDS };

  if (raw === null) {
    return result;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    for (const key of Object.keys(DEFAULT_SEARCHABLE_FIELDS) as (keyof SearchableFields)[]) {
      if (typeof parsed[key] === 'boolean') {
        result[key] = parsed[key];
      }
    }
  } catch {
    // Corrupt value — keep the all-enabled default.
  }

  return result;
};

/** Serialize the searchable-fields map for persistence. */
export const serializeSearchableFields = (fields: SearchableFields): string => JSON.stringify(fields);

/**
 * Parse a persisted searchable-types JSON blob. Unknown keys are dropped and
 * missing keys fall back to their default (satellites/missiles on, the rest
 * off), so an old or corrupt value never changes a toggle the user never set.
 */
export const parseSearchableTypes = (raw: string | null): SearchableTypes => {
  const result: SearchableTypes = { ...DEFAULT_SEARCHABLE_TYPES };

  if (raw === null) {
    return result;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    for (const key of Object.keys(DEFAULT_SEARCHABLE_TYPES) as (keyof SearchableTypes)[]) {
      if (typeof parsed[key] === 'boolean') {
        result[key] = parsed[key];
      }
    }
  } catch {
    // Corrupt value — keep the defaults.
  }

  return result;
};

/** Serialize the searchable-types map for persistence. */
export const serializeSearchableTypes = (types: SearchableTypes): string => JSON.stringify(types);
