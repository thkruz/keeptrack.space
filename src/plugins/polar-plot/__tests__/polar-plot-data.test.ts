/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PolarPlotPlugin } from '@app/plugins/polar-plot/polar-plot';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('PolarPlotPlugin generatePlotData_', () => {
  let plugin: PolarPlotPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const fakeSat = (over: Record<string, unknown> = {}) => ({
    isSatellite: () => true,
    perigee: 400,
    apogee: 500,
    ...over,
  });

  const fakeSensor = (over: Record<string, unknown> = {}) => ({
    isSensor: () => true,
    maxRng: 100_000,
    minRng: 0,
    isSatInFov: vi.fn(),
    rae: vi.fn(() => ({ az: 120, el: 45, rng: 800 })),
    ...over,
  });

  const useSat = (sat: unknown) => vi.spyOn(p().selectSatManager_, 'getSelectedSat').mockReturnValue(sat as never);
  const useSensor = (sensor: unknown) => vi.spyOn(ServiceLocator.getSensorManager(), 'getSensor').mockReturnValue(sensor as never);

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new PolarPlotPlugin();
    websiteInit(plugin);
    vi.spyOn(ServiceLocator.getTimeManager(), 'getOffsetTimeObj').mockReturnValue(new Date('2026-05-31T00:00:00Z'));
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns false when no sensor is selected', () => {
    useSensor(null);
    useSat(fakeSat());

    expect(p().generatePlotData_()).toBe(false);
  });

  it('returns false when no satellite is selected', () => {
    useSensor(fakeSensor());
    useSat({ isSatellite: () => false });

    expect(p().generatePlotData_()).toBe(false);
  });

  it('returns false when the satellite is out of range', () => {
    useSensor(fakeSensor({ maxRng: 100, minRng: 0 }));
    useSat(fakeSat({ perigee: 400, apogee: 500 }));

    expect(p().generatePlotData_()).toBe(false);
  });

  it('collects az/el samples while in view and stops once the pass ends', () => {
    let calls = 0;
    const sensor = fakeSensor({ isSatInFov: vi.fn(() => calls++ < 3) });

    useSensor(sensor);
    useSat(fakeSat());

    const result = p().generatePlotData_();

    expect(result).toBe(true);
    expect(p().plotData_).toStrictEqual([[120, 45], [120, 45], [120, 45]]);
    expect(p().passStartTime_).not.toBeNull();
    expect(p().passStopTime_).not.toBeNull();
  });

  it('skips a sample when rae returns null', () => {
    let calls = 0;
    const sensor = fakeSensor({
      isSatInFov: vi.fn(() => calls++ < 2),
      rae: vi.fn().mockReturnValueOnce(null).mockReturnValue({ az: 90, el: 30, rng: 500 }),
    });

    useSensor(sensor);
    useSat(fakeSat());

    expect(p().generatePlotData_()).toBe(true);
    // First sample was dropped (rae null), so only one point lands.
    expect(p().plotData_).toStrictEqual([[90, 30]]);
  });
});

describe('PolarPlotPlugin drawDot_', () => {
  let plugin: PolarPlotPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new PolarPlotPlugin();
    websiteInit(plugin);
  });

  afterEach(() => vi.restoreAllMocks());

  it('projects polar coordinates and draws a filled dot', () => {
    const ctx = {
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    };

    p().ctx_ = ctx;
    p().centerX_ = 200;
    p().centerY_ = 200;
    p().distanceUnit_ = 1;

    p().drawDot_(45, 120, 'red');

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillStyle).toBe('red');
    const [x, y, r] = ctx.arc.mock.calls[0];

    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
    expect(r).toBe(15);
  });
});
