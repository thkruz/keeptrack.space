import { vi } from 'vitest';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { Calculator } from '@app/plugins/calculator/calculator';
import { toDms } from '@app/plugins/calculator/calculator-core';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { KeepTrack } from '@app/keeptrack';

describe('Calculator_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();
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
    calc = new Calculator() as unknown as CalcInternals;
  });

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

describe('Calculator conversion engine', () => {
  let plugin: Calculator;

  const setFrame = (frame: string) => {
    const sel = getEl('calc-input-frame') as HTMLSelectElement;

    sel.value = frame;
    sel.dispatchEvent(new Event('change'));
  };
  const setInput = (id: string, value: string) => {
    (getEl(`calc-in-${id}`) as HTMLInputElement).value = value;
  };
  const convert = () => getEl('calc-convert-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    localStorage.clear();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new Calculator();
    websiteInit(plugin);
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts J2000 cartesian input into every other frame', () => {
    // J2000 is the default frame; fill position and run.
    setInput('x', '6778');
    setInput('y', '100');
    setInput('z', '200');
    convert();

    // ITRF/TEME/LLA/RADEC/Classical output cells get populated.
    expect(getEl('calc-out-itrf-x')!.textContent).not.toBe('-');
    expect(getEl('calc-out-lla-lat')!.textContent).not.toBe('-');
    expect(getEl('calc-out-radec-ra')!.textContent).not.toBe('-');
  });

  it('enabling velocity yields real classical elements instead of "Needs velocity"', () => {
    setInput('x', '6778');
    setInput('y', '0');
    setInput('z', '0');

    const velCheck = getEl('calc-show-velocity') as HTMLInputElement;

    velCheck.checked = true;
    velCheck.dispatchEvent(new Event('change'));
    setInput('vx', '0');
    setInput('vy', '7.67');
    setInput('vz', '1');
    convert();

    expect(getEl('calc-out-ce-period')!.textContent).not.toBe('Needs velocity');
    expect(getEl('calc-out-ce-sma')!.textContent).not.toBe('-');
  });

  const fillFields = (fields: Record<string, string>) => {
    for (const [id, value] of Object.entries(fields)) {
      setInput(id, value);
    }
  };

  it.each([
    ['ITRF', { x: '6778', y: '100', z: '200' }],
    ['TEME', { x: '6778', y: '100', z: '200' }],
    ['LLA', { lat: '28.5', lon: '-80.5', alt: '400' }],
    ['RaDec', { ra: '45', dec: '20', range: '7000' }],
    ['Classical', { sma: '6778', ecc: '0.001', inc: '51.6', raan: '10', argpe: '20', nu: '30' }],
  ])('converts %s input into J2000 output', (frame, fields) => {
    setFrame(frame);
    fillFields(fields);
    convert();

    expect(getEl('calc-out-j2000-x')!.textContent).not.toBe('-');
  });

  it('converts RAE input using the selected sensor', () => {
    setFrame('RAE');
    setInput('r', '3000');
    setInput('a', '45');
    setInput('e', '30');
    convert();

    expect(getEl('calc-out-j2000-x')!.textContent).not.toBe('-');
  });

  it('warns and aborts when RAE input has no sensor selected', () => {
    ServiceLocator.getSensorManager().currentSensors = [];
    setFrame('RAE');
    setInput('r', '3000');
    setInput('a', '45');
    setInput('e', '30');

    // convert_ swallows the "requires a sensor" error and warns rather than throwing.
    expect(() => convert()).not.toThrow();
  });

  it('re-applies the output format to the last conversion on format change', () => {
    setInput('x', '6778');
    setInput('y', '0');
    setInput('z', '0');
    convert();

    const fmt = getEl('calc-output-format') as HTMLSelectElement;

    fmt.value = 'sci';
    fmt.dispatchEvent(new Event('change'));

    expect(getEl('calc-out-itrf-x')!.textContent).toContain('e');
  });

  it('drawLine_ warns without a prior RAE result and draws after one', () => {
    const warnSpy = vi.spyOn(ServiceLocator.getLineManager(), 'createSensorToRae').mockImplementation(() => undefined as never);

    // No conversion yet → draw button handler warns, does not draw.
    getEl('calc-draw-line-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(warnSpy).not.toHaveBeenCalled();

    // Run a J2000 conversion with a sensor so RAE output (and lastRae_) is set.
    setInput('x', '6778');
    setInput('y', '100');
    setInput('z', '200');
    convert();
    getEl('calc-draw-line-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(warnSpy).toHaveBeenCalled();
  });

  describe('loadSelectedSatellite_', () => {
    it('warns when no satellite is selected', () => {
      const selectSat = PluginRegistry.getPlugin(SelectSatManager)!;

      selectSat.selectedSat = -1;

      expect(() => getEl('calc-load-sat-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      // Nothing populated because it bailed.
      expect(getEl('calc-out-itrf-x')!.textContent).toBe('-');
    });

    it('loads the selected satellite, fills inputs, and auto-converts', () => {
      const selectSat = PluginRegistry.getPlugin(SelectSatManager)!;

      selectSat.selectedSat = 0;
      vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(defaultSat);

      getEl('calc-load-sat-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // The J2000 X input is filled from the propagated state and outputs populate.
      expect((getEl('calc-in-x') as HTMLInputElement).value).not.toBe('6778');
      expect(getEl('calc-out-itrf-x')!.textContent).not.toBe('-');
    });
  });
});
