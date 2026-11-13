/**
 * Global display time zone.
 *
 * One user choice (UTC by default, or an IANA zone name such as "America/New_York") that clocks,
 * tables and exports follow. It is stored in an account-scoped (synced) key. The stored instant
 * is always UTC: exports keep their UTC column and add a display-zone column next to it, so a
 * changed zone never changes what was queried. Nothing here switches the zone on its own.
 *
 * @license AGPL-3.0-or-later
 */

import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { browserTimeZone, formatInTimeZone, normalizeTimeZone } from './site-time-zone';

export const UTC_ZONE = 'UTC';

/** True for the neutral default: the zone is UTC (any spelling Intl treats as UTC). */
export const isUtcZone = (zone: string): boolean => zone === UTC_ZONE || zone === 'Etc/UTC' || zone === 'Etc/GMT';

/** Narrows a stored or typed value to "UTC" or a valid IANA zone; anything else falls back to UTC. */
export const parseDisplayTimeZone = (value: unknown): string => {
  if (typeof value === 'string' && value.trim().toUpperCase() === UTC_ZONE) {
    return UTC_ZONE;
  }

  return normalizeTimeZone(value) ?? UTC_ZONE;
};

/** The saved display zone ("UTC" when nothing valid is saved). */
export const getDisplayTimeZone = (): string => {
  try {
    return parseDisplayTimeZone(PersistenceManager.getInstance().getItem(StorageKey.DISPLAY_TIME_ZONE));
  } catch {
    return UTC_ZONE;
  }
};

/** Saves the display zone (invalid names are stored as UTC) and returns what was stored. */
export const setDisplayTimeZone = (zone: string): string => {
  const next = parseDisplayTimeZone(zone);

  try {
    PersistenceManager.getInstance().saveItem(StorageKey.DISPLAY_TIME_ZONE, next);
  } catch {
    // Storage unavailable: the choice just does not persist.
  }

  return next;
};

/** Choices offered in the header chip: UTC and the browser's own zone. A saved named zone is added so it stays selectable. */
export const getDisplayZoneChoices = (current: string = getDisplayTimeZone()): string[] => {
  const choices = [UTC_ZONE];
  const browser = browserTimeZone();

  if (!isUtcZone(browser)) {
    choices.push(browser);
  }
  if (!choices.includes(current)) {
    choices.push(current);
  }

  return choices;
};

/** Short label for the chip and table headers: "UTC", or the zone abbreviation plus offset, e.g. "EST (UTC-05:00)". */
export const describeZoneAt = (ms: number, zone: string): string => {
  if (isUtcZone(zone)) {
    return UTC_ZONE;
  }
  try {
    const abbr = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? zone;

    return `${abbr} (${zoneOffsetLabel(ms, zone)})`;
  } catch {
    return zone;
  }
};

/** Numeric offset of `zone` at `ms` as "UTC+hh:mm" / "UTC-hh:mm". */
export const zoneOffsetLabel = (ms: number, zone: string): string => {
  const { date, time } = formatInTimeZone(ms, zone);
  const asUtc = Date.parse(`${date}T${time}Z`);
  const minutes = Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);

  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};

/**
 * Extra table/CSV columns for one UTC instant: nothing when the display zone is UTC, otherwise the
 * wall clock in the display zone, its numeric offset and the zone name. The UTC value itself is never
 * replaced; callers keep their UTC column and append these.
 */
export const displayZoneColumns = (ms: number, zone: string = getDisplayTimeZone()): { local: string; offset: string; zone: string } | null => {
  if (isUtcZone(zone) || !Number.isFinite(ms)) {
    return null;
  }
  const { date, time } = formatInTimeZone(ms, zone);

  return { local: `${date} ${time}`, offset: zoneOffsetLabel(ms, zone), zone };
};

/** Header cells to append after the UTC time columns when the display zone is not UTC. */
export const displayZoneHeaders = (label: string, zone: string = getDisplayTimeZone()): string[] => (isUtcZone(zone) ? [] : [`${label} (${zone})`, `${label} offset`]);
