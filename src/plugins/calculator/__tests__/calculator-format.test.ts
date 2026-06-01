import { Calculator } from '@app/plugins/calculator/calculator';

/*
 * Calculator's value formatting is pure: toDms_ (decimal degrees -> D M S) and
 * formatValue_ (dispatch on the selected output format). Both are private, so
 * they're reached via casts; the output format is a private string enum
 * ('4' | '6' | '8' | 'sci' | 'dms').
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CalcStatic = Calculator as any;

describe('Calculator.toDms_', () => {
  it('converts positive decimal degrees to D M S', () => {
    expect(CalcStatic.toDms_(45.5)).toBe('45° 30\' 0.00"');
  });

  it('carries the sign into negative angles', () => {
    expect(CalcStatic.toDms_(-1.25)).toBe('-1° 15\' 0.00"');
  });
});

describe('Calculator.formatValue_', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmt = (format: string, value: number, isAngle = false): string => {
    const calc = new Calculator();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (calc as any).outputFormat_ = format;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (calc as any).formatValue_(value, isAngle);
  };

  it.each([
    ['4', 3.14159265, '3.1416'],
    ['6', 3.14159265, '3.141593'],
    ['8', 3.14159265, '3.14159265'],
  ])('formats fixed precision %s', (format, value, expected) => {
    expect(fmt(format, value)).toBe(expected);
  });

  it('formats scientific notation', () => {
    expect(fmt('sci', 12345.678)).toBe('1.234568e+4');
  });

  it('uses DMS for angles and fixed-4 for non-angles in DMS mode', () => {
    expect(fmt('dms', 45.5, true)).toBe('45° 30\' 0.00"');
    expect(fmt('dms', 45.5, false)).toBe('45.5000');
  });
});
