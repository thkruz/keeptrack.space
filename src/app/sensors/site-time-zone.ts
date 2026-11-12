/**
 * Site time zone helpers.
 *
 * A site (sensor) may carry an optional IANA time zone name typed by the user
 * (for example "America/New_York"). Nothing is derived from longitude: political
 * zones and daylight saving cannot be guessed from coordinates. An empty value means
 * "use the browser's zone". Everything here relies on Intl.DateTimeFormat only.
 *
 * @license AGPL-3.0-or-later
 */

/** True when the runtime's Intl database knows `zone` as a time zone name. */
export const isValidTimeZone = (zone: string): boolean => {
  if (!zone) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });

    return true;
  } catch {
    return false;
  }
};

/** Trimmed zone name, or undefined when the field is empty or not a known zone. */
export const normalizeTimeZone = (zone: unknown): string | undefined => {
  const trimmed = typeof zone === 'string' ? zone.trim() : '';

  return trimmed && isValidTimeZone(trimmed) ? trimmed : undefined;
};

/** The browser's own zone name, or "UTC" when the runtime cannot tell. */
export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** The zone to report in for a site: its own valid zone, else the browser's. */
export const resolveSiteTimeZone = (zone: string | null | undefined): string => normalizeTimeZone(zone) ?? browserTimeZone();

/** Date ("YYYY-MM-DD") and time ("HH:MM:SS") of an instant on the wall clock of `zone`. */
export const formatInTimeZone = (ms: number, zone: string): { date: string; time: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';

  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}:${get('second')}` };
};
