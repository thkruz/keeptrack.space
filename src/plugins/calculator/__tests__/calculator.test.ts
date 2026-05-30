import { vi } from 'vitest';
import { Calculator } from '@app/plugins/calculator/calculator';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { KeepTrack } from '@app/keeptrack';

describe('Calculator_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    window.M.AutoInit = vi.fn();
  });

  standardPluginSuite(Calculator);
  standardPluginMenuButtonTests(Calculator);
});

interface CalcInternals {
  outputFormat_: string;
  getInputFieldDefs_(frame: string): { id: string; default: string }[];
  getOutputFieldDefs_(frame: string): { id: string }[];
  getVelocityFieldDefs_(): { id: string; default: string }[];
  formatValue_(value: number, isAngle?: boolean): string;
}

describe('Calculator pure helpers', () => {
  let calc: CalcInternals;

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
    window.M.AutoInit = vi.fn();
    calc = new Calculator() as unknown as CalcInternals;
  });

  const toDms = (Calculator as unknown as { toDms_(d: number): string }).toDms_;

  it('toDms_ formats degrees as sign/deg/min/sec', () => {
    expect(toDms(0)).toBe('0° 0\' 0.00"');
    expect(toDms(30.5)).toBe('30° 30\' 0.00"');
    expect(toDms(-1.5)).toBe('-1° 30\' 0.00"');
  });

  it('getInputFieldDefs_ returns the right fields per frame', () => {
    expect(calc.getInputFieldDefs_('J2000').map((f) => f.id)).toEqual(['x', 'y', 'z']);
    expect(calc.getInputFieldDefs_('LLA').map((f) => f.id)).toEqual(['lat', 'lon', 'alt']);
    expect(calc.getInputFieldDefs_('RAE').map((f) => f.id)).toEqual(['sensor', 'r', 'a', 'e']);
    expect(calc.getInputFieldDefs_('Classical').map((f) => f.id)).toEqual(['sma', 'ecc', 'inc', 'raan', 'argpe', 'nu']);
    expect(calc.getInputFieldDefs_('BOGUS')).toEqual([]);
  });

  it('getOutputFieldDefs_ includes derived Classical fields and is empty for unknown frames', () => {
    expect(calc.getOutputFieldDefs_('J2000').map((f) => f.id)).toContain('j2000-vz');
    const ce = calc.getOutputFieldDefs_('Classical').map((f) => f.id);

    expect(ce).toEqual(expect.arrayContaining(['ce-sma', 'ce-period', 'ce-apogee', 'ce-perigee']));
    expect(calc.getOutputFieldDefs_('BOGUS')).toEqual([]);
  });

  it('getVelocityFieldDefs_ returns vx/vy/vz with the orbital-velocity default', () => {
    const vel = calc.getVelocityFieldDefs_();

    expect(vel.map((f) => f.id)).toEqual(['vx', 'vy', 'vz']);
    expect(vel.find((f) => f.id === 'vy')?.default).toBe('7.67');
  });

  it('formatValue_ honors the selected output format', () => {
    calc.outputFormat_ = '4';
    expect(calc.formatValue_(1.23456789)).toBe('1.2346');
    calc.outputFormat_ = '6';
    expect(calc.formatValue_(1.23456789)).toBe('1.234568');
    calc.outputFormat_ = 'sci';
    expect(calc.formatValue_(1234.5)).toBe('1.234500e+3');
    calc.outputFormat_ = 'dms';
    expect(calc.formatValue_(30.5, true)).toBe('30° 30\' 0.00"');
    // DMS only applies to angles; non-angles fall back to fixed-4.
    expect(calc.formatValue_(30.5, false)).toBe('30.5000');
  });
});
