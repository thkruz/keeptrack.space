import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText, foldIcsLine, icsFileName, toIcsUtc } from '../visible-tonight-ics';

const START = Date.UTC(2026, 10, 16, 23, 42, 17);

describe('visible-tonight ics', () => {
  it('formats UTC basic date-times, dropping milliseconds', () => {
    expect(toIcsUtc(START + 999)).toBe('20261116T234217Z');
  });

  it('escapes TEXT values', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe(String.raw`a\,b\;c\\d\ne`);
  });

  it('folds long lines at 75 octets without splitting characters', () => {
    const folded = foldIcsLine(`DESCRIPTION:${'°'.repeat(80)}`);
    const encoder = new TextEncoder();

    for (const [i, part] of folded.split('\r\n').entries()) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
      if (i > 0) {
        expect(part.startsWith(' ')).toBe(true);
      }
    }
    expect(folded.replace(/\r\n /gu, '')).toBe(`DESCRIPTION:${'°'.repeat(80)}`);
  });

  it('builds a valid single-event calendar with a reminder', () => {
    const ics = buildIcs({
      uid: '25544-1@visible-tonight.keeptrack.space',
      startMs: START,
      endMs: START + 6 * 60_000,
      summary: 'ISS passes overhead',
      description: 'Look SW at 6:42 PM, then NE.',
      alarmMinutesBefore: 10,
      stampMs: START - 3_600_000,
    });
    const lines = ics.split('\r\n');

    expect(ics.endsWith('\r\n')).toBe(true);
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('DTSTART:20261116T234217Z');
    expect(lines).toContain('DTEND:20261116T234817Z');
    expect(lines).toContain('DTSTAMP:20261116T224217Z');
    expect(lines).toContain('DESCRIPTION:Look SW at 6:42 PM\\, then NE.');
    expect(lines).toContain('TRIGGER:-PT10M');
    expect(ics.match(/BEGIN:VEVENT/gu)).toHaveLength(1);
    expect(lines.filter((l) => l.startsWith('BEGIN:')).length).toBe(lines.filter((l) => l.startsWith('END:')).length);
  });

  it('never writes a zero-length event', () => {
    const ics = buildIcs({ uid: 'x', startMs: START, endMs: START, summary: 's', description: 'd', stampMs: START });

    expect(ics).toContain('DTEND:20261116T234317Z');
    expect(ics).not.toContain('VALARM');
  });

  it('makes safe file names', () => {
    expect(icsFileName('ISS (ZARYA)', START)).toBe('iss-2026-11-16-2342.ics');
    expect(icsFileName('CSS (TIANHE)', START)).toBe('css-2026-11-16-2342.ics');
    expect(icsFileName('???', START)).toBe('pass-2026-11-16-2342.ics');
  });
});
