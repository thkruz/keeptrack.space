import { ageLevel, formatDays, POOR_AGE_DAYS } from '@app/plugins/epoch-age/epoch-age-core';

describe('ageLevel', () => {
  it('maps the 3 / 7 / 14 day boundaries (inclusive on the lower level)', () => {
    expect(ageLevel(0)).toBe('ok');
    expect(ageLevel(3)).toBe('ok');
    expect(ageLevel(3.0001)).toBe('caution');
    expect(ageLevel(7)).toBe('caution');
    expect(ageLevel(7.0001)).toBe('low');
    expect(ageLevel(14)).toBe('low');
    expect(ageLevel(14.0001)).toBe('poor');
    expect(POOR_AGE_DAYS).toBe(14);
  });

  it('treats negative ages (sim time before epoch) by magnitude', () => {
    expect(ageLevel(-3)).toBe('ok');
    expect(ageLevel(-3.0001)).toBe('caution');
    expect(ageLevel(-7.0001)).toBe('low');
    expect(ageLevel(-14.0001)).toBe('poor');
  });
});

describe('formatDays', () => {
  it('formats signed days with one decimal', () => {
    expect(formatDays(5.2)).toBe('+5.2 d');
    expect(formatDays(-1)).toBe('-1.0 d');
    expect(formatDays(0)).toBe('+0.0 d');
    // 10.04 * 10 = 100.4 rounds to 100 -> 10.0; -14.96 * 10 = -149.6 rounds to -150 -> -15.0
    expect(formatDays(10.04)).toBe('+10.0 d');
    expect(formatDays(-14.96)).toBe('-15.0 d');
  });
});
