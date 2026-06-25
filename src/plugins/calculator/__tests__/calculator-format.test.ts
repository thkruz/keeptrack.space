import { OutputFormat, formatValue, toDms } from '@app/plugins/calculator/calculator-core';

/*
 * Calculator's value formatting is pure and lives in calculator-core: toDms
 * (decimal degrees -> D M S) and formatValue (dispatch on the output format).
 */
describe('calculator-core toDms', () => {
  it('converts positive decimal degrees to D M S', () => {
    expect(toDms(45.5)).toBe('45° 30\' 0.00"');
  });

  it('carries the sign into negative angles', () => {
    expect(toDms(-1.25)).toBe('-1° 15\' 0.00"');
  });
});

describe('calculator-core formatValue', () => {
  const fmt = (format: OutputFormat, value: number, isAngle = false): string => formatValue(value, format, isAngle);

  it.each([
    [OutputFormat.FIXED_4, 3.14159265, '3.1416'],
    [OutputFormat.FIXED_6, 3.14159265, '3.141593'],
    [OutputFormat.FIXED_8, 3.14159265, '3.14159265'],
  ])('formats fixed precision %s', (format, value, expected) => {
    expect(fmt(format, value)).toBe(expected);
  });

  it('formats scientific notation', () => {
    expect(fmt(OutputFormat.SCIENTIFIC, 12345.678)).toBe('1.234568e+4');
  });

  it('uses DMS for angles and fixed-4 for non-angles in DMS mode', () => {
    expect(fmt(OutputFormat.DMS, 45.5, true)).toBe('45° 30\' 0.00"');
    expect(fmt(OutputFormat.DMS, 45.5, false)).toBe('45.5000');
  });
});
