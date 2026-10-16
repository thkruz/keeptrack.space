/**
 * Pattern for a typed UTC date/time: `YYYY-MM-DD`, optionally followed (after a
 * space or `T`) by `HH:MM`, `HH:MM:SS` or `HH:MM:SS.sss`, and an optional `Z`.
 */
const UTC_DATE_TIME_PATTERN = /^(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})(?:[\sT]+(?<hour>\d{1,2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.(?<ms>\d{1,3}))?)?)?\s*Z?$/u;

/**
 * Parses a typed date/time string as UTC (never local time).
 *
 * Accepts `YYYY-MM-DD`, `YYYY-MM-DD HH:MM`, `YYYY-MM-DD HH:MM:SS` and
 * `YYYY-MM-DD HH:MM:SS.sss`, with a space or `T` separator and an optional
 * trailing `Z`. Out-of-range fields (month 13, Feb 30, hour 24, ...) are
 * rejected rather than silently rolled over.
 * @param input The raw text the user typed.
 * @returns The parsed UTC instant, or null when the text is not a valid date/time.
 */
export const parseUtcDateTime = (input: string): Date | null => {
  const match = UTC_DATE_TIME_PATTERN.exec(input.trim());

  if (!match?.groups) {
    return null;
  }

  const { year, month, day, hour, minute, second, ms } = match.groups;
  const y = parseInt(year, 10);
  const mo = parseInt(month, 10) - 1;
  const d = parseInt(day, 10);
  const h = hour ? parseInt(hour, 10) : 0;
  const mi = minute ? parseInt(minute, 10) : 0;
  const s = second ? parseInt(second, 10) : 0;
  const msec = ms ? parseInt(ms.padEnd(3, '0'), 10) : 0;

  const date = new Date(Date.UTC(y, mo, d, h, mi, s, msec));

  // Date.UTC maps years 0-99 to 1900-1999; pin the literal year instead.
  date.setUTCFullYear(y);

  // Reject rollover (e.g. 2024-02-30 -> 2024-03-01, 25:00 -> next day).
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h ||
    date.getUTCMinutes() !== mi ||
    date.getUTCSeconds() !== s
  ) {
    return null;
  }

  return date;
};

/**
 * Formats a date as the UTC `YYYY-MM-DD HH:MM:SS` string the typed-entry field shows.
 * @param date The instant to format.
 * @returns The formatted UTC string.
 */
export const formatUtcDateTime = (date: Date): string => date.toISOString().slice(0, 19).replace('T', ' ');
