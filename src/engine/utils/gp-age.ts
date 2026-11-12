/**
 * gp-age.ts - shared GP (element set) epoch, age and stale-flag helpers for the watchlist, pass tables and
 * their exports. Age is measured in hours from the element set epoch to a caller-chosen reference time
 * (the watchlist uses the simulation clock; pass tables use the pass start), never silently to "now".
 *
 * The stale threshold is the `staleGpThresholdHours` setting (default 72 h), persisted per device.
 */
import { PersistenceManager, StorageKey } from './persistence-manager';

export const DEFAULT_STALE_GP_HOURS = 72;
export const MIN_STALE_GP_HOURS = 1;
export const MAX_STALE_GP_HOURS = 8760;
/** Marker appended to an age in tables and exports. Plain text so it survives CSV and screen readers. */
export const STALE_MARKER = 'STALE';

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

/** Epoch of a TLE-style element set (two-digit year, fractional day of year) in ms since 1970, or null. Same 57 year pivot as Tle. */
export const gpEpochMs = (epochYear: number | undefined | null, epochDay: number | undefined | null): number | null => {
  if (typeof epochYear !== 'number' || typeof epochDay !== 'number' || !Number.isFinite(epochYear) || !Number.isFinite(epochDay)) {
    return null;
  }
  let year = epochYear;

  if (epochYear < 57) {
    year = 2000 + epochYear;
  } else if (epochYear < 100) {
    year = 1900 + epochYear;
  }

  return Math.round(Date.UTC(year, 0, 1) + (epochDay - 1) * DAY_MS);
};

/** Age in hours from the epoch to `atMs`; negative when the epoch is after the reference time. */
export const gpAgeHours = (epochMs: number | null, atMs: number): number | null => (epochMs === null || !Number.isFinite(atMs) ? null : (atMs - epochMs) / HOUR_MS);

export const clampStaleThresholdHours = (hours: unknown): number => {
  const value = typeof hours === 'string' ? Number.parseFloat(hours) : hours;

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_STALE_GP_HOURS;
  }

  return Math.min(MAX_STALE_GP_HOURS, Math.max(MIN_STALE_GP_HOURS, value));
};

let isLoaded_ = false;

/** The configured stale threshold in hours. Loads the persisted value on first use. */
export const getStaleGpThresholdHours = (): number => {
  if (!isLoaded_) {
    isLoaded_ = true;
    try {
      const raw = PersistenceManager.getInstance().getItem(StorageKey.STALE_GP_THRESHOLD_HOURS);

      if (raw !== null && typeof settingsManager !== 'undefined') {
        settingsManager.staleGpThresholdHours = clampStaleThresholdHours(raw);
      }
    } catch {
      // Storage can be unavailable; fall back to the default.
    }
  }

  return typeof settingsManager === 'undefined' ? DEFAULT_STALE_GP_HOURS : clampStaleThresholdHours(settingsManager.staleGpThresholdHours);
};

/** Sets and persists the stale threshold (clamped to 1 h .. 1 year). Returns the stored value. */
export const setStaleGpThresholdHours = (hours: unknown): number => {
  const value = clampStaleThresholdHours(hours);

  isLoaded_ = true;
  if (typeof settingsManager !== 'undefined') {
    settingsManager.staleGpThresholdHours = value;
  }
  try {
    PersistenceManager.getInstance().saveItem(StorageKey.STALE_GP_THRESHOLD_HOURS, String(value));
  } catch {
    // Not persisted; the in-memory value still applies this session.
  }

  return value;
};

/** Test hook: forget the cached load so the next read re-reads storage. */
export const resetGpAgeLoadState = (): void => {
  isLoaded_ = false;
};

export const isGpStale = (ageHours: number | null, thresholdHours: number = getStaleGpThresholdHours()): boolean => ageHours !== null && ageHours > thresholdHours;

/** Age text with one decimal in hours, plus the stale marker when over the threshold. Empty string when the age is unknown. */
export const formatGpAge = (ageHours: number | null, thresholdHours: number = getStaleGpThresholdHours()): string => {
  if (ageHours === null) {
    return '';
  }
  const text = ageHours.toFixed(1);

  return isGpStale(ageHours, thresholdHours) ? `${text} ${STALE_MARKER}` : text;
};
