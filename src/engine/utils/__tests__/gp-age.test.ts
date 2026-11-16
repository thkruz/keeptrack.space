import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampStaleThresholdHours,
  DEFAULT_STALE_GP_HOURS,
  formatGpAge,
  getStaleGpThresholdHours,
  gpAgeHours,
  gpEpochMs,
  isGpStale,
  resetGpAgeLoadState,
  setStaleGpThresholdHours,
} from '../gp-age';

describe('gp-age', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGpAgeLoadState();
    (globalThis as unknown as { settingsManager: { staleGpThresholdHours: number } }).settingsManager = { staleGpThresholdHours: DEFAULT_STALE_GP_HOURS };
  });

  it('converts a two-digit epoch year and day to ms with the 57 year pivot', () => {
    expect(gpEpochMs(26, 1.5)).toBe(Date.UTC(2026, 0, 1, 12));
    expect(gpEpochMs(98, 1)).toBe(Date.UTC(1998, 0, 1));
    expect(gpEpochMs(Number.NaN, 1)).toBeNull();
    expect(gpEpochMs(undefined, 1)).toBeNull();
  });

  it('measures age in hours to the given reference time', () => {
    const epoch = Date.UTC(2026, 10, 1);

    expect(gpAgeHours(epoch, epoch + 96 * 3600000)).toBe(96);
    expect(gpAgeHours(epoch, epoch - 3600000)).toBe(-1);
    expect(gpAgeHours(null, epoch)).toBeNull();
  });

  it('flags only ages strictly over the threshold', () => {
    expect(isGpStale(72, 72)).toBe(false);
    expect(isGpStale(72.1, 72)).toBe(true);
    expect(isGpStale(null, 72)).toBe(false);
  });

  it('formats age with the STALE marker past the threshold', () => {
    expect(formatGpAge(10, 72)).toBe('10.0');
    expect(formatGpAge(100, 72)).toBe('100.0 STALE');
    expect(formatGpAge(null, 72)).toBe('');
  });

  it('defaults to 72 h, clamps input and persists a change', () => {
    expect(getStaleGpThresholdHours()).toBe(72);
    expect(clampStaleThresholdHours('abc')).toBe(72);
    expect(clampStaleThresholdHours(0)).toBe(1);
    expect(clampStaleThresholdHours(1e9)).toBe(8760);
    expect(setStaleGpThresholdHours(24)).toBe(24);
    expect(getStaleGpThresholdHours()).toBe(24);

    resetGpAgeLoadState();
    (globalThis as unknown as { settingsManager: { staleGpThresholdHours: number } }).settingsManager.staleGpThresholdHours = 72;
    expect(getStaleGpThresholdHours()).toBe(24);
  });
});
