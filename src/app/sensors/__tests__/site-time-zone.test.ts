import { browserTimeZone, formatInTimeZone, isValidTimeZone, normalizeTimeZone, resolveSiteTimeZone } from '@app/app/sensors/site-time-zone';

describe('site time zone helpers', () => {
  it('accepts IANA names and rejects junk', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('normalizes empty and invalid values to undefined', () => {
    expect(normalizeTimeZone('  Europe/Paris ')).toBe('Europe/Paris');
    expect(normalizeTimeZone('')).toBeUndefined();
    expect(normalizeTimeZone('nope')).toBeUndefined();
    expect(normalizeTimeZone(undefined)).toBeUndefined();
  });

  it('empty zone resolves to the browser zone', () => {
    expect(resolveSiteTimeZone('')).toBe(browserTimeZone());
    expect(resolveSiteTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  it('formats the wall clock of the zone, including DST and the date rollover', () => {
    // 2026-07-01T02:30:00Z is 22:30 the previous day in New York (EDT, UTC-4)
    expect(formatInTimeZone(Date.UTC(2026, 6, 1, 2, 30, 0), 'America/New_York')).toEqual({ date: '2026-06-30', time: '22:30:00' });
    // January is EST (UTC-5)
    expect(formatInTimeZone(Date.UTC(2026, 0, 1, 2, 30, 0), 'America/New_York')).toEqual({ date: '2025-12-31', time: '21:30:00' });
    // Midnight is 00, not 24
    expect(formatInTimeZone(Date.UTC(2026, 0, 1, 0, 0, 0), 'UTC').time).toBe('00:00:00');
  });

  it('drops a non-string stored zone without throwing', () => {
    for (const bad of [5, {}, [], true, null, undefined]) {
      expect(normalizeTimeZone(bad)).toBeUndefined();
    }
  });
});
