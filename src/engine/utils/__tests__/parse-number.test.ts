import { parseLocalizedNumber } from '@app/engine/utils/parse-number';

describe('parseLocalizedNumber', () => {
  it('parses period-decimal input', () => {
    expect(parseLocalizedNumber('5943.5')).toBe(5943.5);
  });

  it('parses comma-decimal (locale) input', () => {
    expect(parseLocalizedNumber('5943,5')).toBe(5943.5);
  });

  it('parses plain integers', () => {
    expect(parseLocalizedNumber('42')).toBe(42);
  });

  it('parses negative values', () => {
    expect(parseLocalizedNumber('-3,25')).toBe(-3.25);
  });

  it('parses a leading numeric prefix', () => {
    expect(parseLocalizedNumber('12.5abc')).toBe(12.5);
  });

  it('returns NaN for non-numeric input', () => {
    expect(parseLocalizedNumber('abc')).toBeNaN();
  });
});
