import { describe, expect, it, vi } from 'vitest';
import { DISPLAY_TIME_ZONE_EVENT, describeZoneAt, displayZoneColumns, displayZoneHeaders, parseDisplayTimeZone, setDisplayTimeZone, zoneOffsetLabel } from '../display-time-zone';

const WINTER = Date.UTC(2026, 0, 15, 12, 0, 0);
const SUMMER = Date.UTC(2026, 6, 15, 12, 0, 0);

describe('display time zone', () => {
  it('defaults to UTC for empty or unknown values', () => {
    expect(parseDisplayTimeZone(null)).toBe('UTC');
    expect(parseDisplayTimeZone('utc')).toBe('UTC');
    expect(parseDisplayTimeZone('Not/AZone')).toBe('UTC');
    expect(parseDisplayTimeZone('America/New_York')).toBe('America/New_York');
  });

  it('reports the numeric offset including daylight saving', () => {
    expect(zoneOffsetLabel(WINTER, 'America/New_York')).toBe('UTC-05:00');
    expect(zoneOffsetLabel(SUMMER, 'America/New_York')).toBe('UTC-04:00');
    expect(zoneOffsetLabel(WINTER, 'Asia/Kolkata')).toBe('UTC+05:30');
  });

  it('adds no columns for UTC and wall clock plus offset for other zones', () => {
    expect(displayZoneColumns(WINTER, 'UTC')).toBeNull();
    expect(displayZoneHeaders('startTime', 'UTC')).toEqual([]);
    expect(displayZoneColumns(WINTER, 'America/New_York')).toEqual({ local: '2026-01-15 07:00:00', offset: 'UTC-05:00', zone: 'America/New_York' });
    expect(displayZoneHeaders('startTime', 'America/New_York')).toEqual(['startTime (America/New_York)', 'startTime offset']);
  });

  it('keeps the two instants of the repeated autumn hour distinguishable by offset', () => {
    const first = Date.UTC(2026, 10, 1, 5, 30, 0);
    const second = Date.UTC(2026, 10, 1, 6, 30, 0);

    expect(displayZoneColumns(first, 'America/New_York')?.local).toBe(displayZoneColumns(second, 'America/New_York')?.local);
    expect(displayZoneColumns(first, 'America/New_York')?.offset).toBe('UTC-04:00');
    expect(displayZoneColumns(second, 'America/New_York')?.offset).toBe('UTC-05:00');
  });

  it('labels the chip', () => {
    expect(describeZoneAt(WINTER, 'UTC')).toBe('UTC');
    expect(describeZoneAt(WINTER, 'America/New_York')).toContain('UTC-05:00');
  });

  it('announces a zone change so the timeline marker can re-render (#458)', () => {
    const listener = vi.fn();

    window.addEventListener(DISPLAY_TIME_ZONE_EVENT, listener);
    setDisplayTimeZone('America/New_York');
    window.removeEventListener(DISPLAY_TIME_ZONE_EVENT, listener);
    setDisplayTimeZone('UTC');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('getDisplayZoneChoices site zone (#478)', () => {
  it('offers the selected sensor site zone alongside UTC', async () => {
    const { getDisplayZoneChoices } = await import('../display-time-zone');
    const choices = getDisplayZoneChoices('UTC', 'America/Chicago');

    expect(choices).toContain('America/Chicago');
    expect(choices[0]).toBe('UTC');
  });

  it('ignores an invalid site zone', async () => {
    const { getDisplayZoneChoices } = await import('../display-time-zone');

    expect(getDisplayZoneChoices('UTC', 'Not/AZone')).not.toContain('Not/AZone');
  });
});
