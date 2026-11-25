/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * visible-tonight-ics.ts builds a one-event iCalendar (RFC 5545) file for a
 * visible pass, so "Add to calendar" works in every calendar app with no server.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

export interface IcsEvent {
  /** Stable id, so re-adding the same pass updates the event instead of duplicating it. */
  uid: string;
  startMs: number;
  endMs: number;
  summary: string;
  description: string;
  /** Minutes before the start for a reminder; omitted when not positive. */
  alarmMinutesBefore?: number;
  /** Creation time; defaults to now. Injected by tests. */
  stampMs?: number;
}

/** UTC basic format (20261116T194200Z): no time zone tables needed, every client converts it. */
export const toIcsUtc = (epochMs: number): string => `${new Date(Math.floor(epochMs / 1000) * 1000).toISOString().replace(/[-:]/gu, '').replace('.000', '')}`;

/** Escapes TEXT values (RFC 5545 3.3.11). */
export const escapeIcsText = (value: string): string => value.replace(/\\/gu, '\\\\').replace(/;/gu, '\\;').replace(/,/gu, '\\,').replace(/\r?\n/gu, '\\n');

/** Folds a content line to 75 octets (RFC 5545 3.1), never splitting a UTF-8 character. */
export const foldIcsLine = (line: string): string => {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let limit = 75;

  for (const char of line) {
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
      // Continuation lines start with a space, which counts toward their 75 octets.
      limit = 74;
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts.join('\r\n ');
};

/** One-event iCalendar file (CRLF lines, folded to 75 octets), with an optional display reminder. */
export const buildIcs = (event: IcsEvent): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KeepTrack//Visible Tonight//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsUtc(event.stampMs ?? Date.now())}`,
    `DTSTART:${toIcsUtc(event.startMs)}`,
    // A zero-length event is legal but some clients hide it; keep at least one minute.
    `DTEND:${toIcsUtc(Math.max(event.endMs, event.startMs + 60_000))}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    'TRANSP:TRANSPARENT',
  ];

  if (event.alarmMinutesBefore && event.alarmMinutesBefore > 0) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcsText(event.summary)}`, `TRIGGER:-PT${Math.round(event.alarmMinutesBefore)}M`, 'END:VALARM');
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
};

/** A file name every OS accepts: "iss-2026-11-16-1942.ics". */
export const icsFileName = (name: string, startMs: number): string => {
  const slug =
    name
      .toLowerCase()
      .replace(/\(.*?\)/gu, '')
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '') || 'pass';
  const stamp = new Date(startMs).toISOString().slice(0, 16).replace('T', '-').replace(':', '');

  return `${slug}-${stamp}.ics`;
};
