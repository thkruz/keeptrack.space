import { formatUtcDateTime, parseUtcDateTime } from '@app/plugins/date-time-manager/parse-utc-date-time';

describe('parseUtcDateTime', () => {
  it('parses the full YYYY-MM-DD HH:MM:SS form as UTC', () => {
    expect(parseUtcDateTime('2024-08-15 12:34:56')?.toISOString()).toBe('2024-08-15T12:34:56.000Z');
  });

  it('accepts a T separator, milliseconds and a trailing Z', () => {
    expect(parseUtcDateTime('2024-08-15T12:34:56.5Z')?.toISOString()).toBe('2024-08-15T12:34:56.500Z');
  });

  it('defaults missing time fields to zero', () => {
    expect(parseUtcDateTime('2024-08-15')?.toISOString()).toBe('2024-08-15T00:00:00.000Z');
    expect(parseUtcDateTime(' 2024-08-15 07:05 ')?.toISOString()).toBe('2024-08-15T07:05:00.000Z');
  });

  it('keeps early years literal instead of mapping them to 19xx', () => {
    expect(parseUtcDateTime('0050-01-01')?.getUTCFullYear()).toBe(50);
  });

  it.each(['', 'yesterday', '2024-13-01', '2024-02-30', '2024-08-15 24:00:00', '2024-08-15 12:60', '24-08-15', '2024/08/15'])('rejects "%s"', (val) => {
    expect(parseUtcDateTime(val)).toBeNull();
  });

  it('formats a date in the same UTC shape it parses', () => {
    const date = new Date(Date.UTC(2024, 7, 15, 1, 2, 3, 456));

    expect(formatUtcDateTime(date)).toBe('2024-08-15 01:02:03');
    expect(parseUtcDateTime(formatUtcDateTime(date))?.getTime()).toBe(Date.UTC(2024, 7, 15, 1, 2, 3));
  });
});
