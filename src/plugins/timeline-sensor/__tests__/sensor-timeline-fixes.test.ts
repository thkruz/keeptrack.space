import { SatMath } from '@app/app/analysis/sat-math';
import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SensorTimeline } from '@app/plugins/timeline-sensor/sensor-timeline';
import { Kilometers, Sun } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/** 12:00 UTC: 05:00 MST at Socorro and 02:00 HST at Maui, both before sunrise. */
const NIGHT = new Date('2026-10-27T12:00:00Z');
/** 19:00 UTC: about local noon at Socorro (107 W). */
const SOCORRO_NOON = new Date('2026-10-27T19:00:00Z');
/** 22:00 UTC: about local noon at Maui (156 W). */
const MAUI_NOON = new Date('2026-10-27T22:00:00Z');

const cloneSensor = (sensor: DetailedSensor, over: Partial<DetailedSensor> = {}): DetailedSensor =>
  Object.assign(Object.create(Object.getPrototypeOf(sensor)), sensor, over) as DetailedSensor;

/** Place the satellite 7000 km from Earth's centre on the sunward side: a lit LEO satellite. */
const litLeoEci = (now: Date) => {
  const sun = Sun.eci(now);
  const d = Math.hypot(sun.x, sun.y, sun.z);
  const k = 7000 / d;

  return { position: { x: (sun.x * k) as Kilometers, y: (sun.y * k) as Kilometers, z: (sun.z * k) as Kilometers }, velocity: { x: 0, y: 0, z: 0 } };
};

const mockCtx = () =>
  new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'canvas') {
          return { width: 800, height: 400 };
        }

        return prop === 'measureText' ? vi.fn(() => ({ width: 10 })) : vi.fn();
      },
      set: () => true,
    }
  );

describe('SensorTimeline station night (B2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['Socorro', sensors.GEODDSSOC],
    ['Maui', sensors.GEODDSMAU],
  ])('%s is in night at 2026-10-27T12:00Z', (_name, sensor) => {
    expect(SensorTimeline.checkStationInNight(NIGHT, cloneSensor(sensor))).toBe(true);
  });

  it('neither site is in night at its local noon', () => {
    expect(SensorTimeline.checkStationInNight(SOCORRO_NOON, cloneSensor(sensors.GEODDSSOC))).toBe(false);
    expect(SensorTimeline.checkStationInNight(MAUI_NOON, cloneSensor(sensors.GEODDSMAU))).toBe(false);
  });

  it('an optical site in night observes a lit LEO satellite, and not at local noon', () => {
    vi.spyOn(SatMath, 'getEci').mockImplementation(((_sat: unknown, now: Date) => litLeoEci(now)) as never);

    expect(SensorTimeline.checkSatinSun(NIGHT, defaultSat)).toBe(true);
    expect(SensorTimeline.checkObservable(NIGHT, defaultSat, cloneSensor(sensors.GEODDSSOC))).toBe(true);
    expect(SensorTimeline.checkObservable(SOCORRO_NOON, defaultSat, cloneSensor(sensors.GEODDSSOC))).toBe(false);
  });
});

describe('SensorTimeline fixes', () => {
  let plugin: SensorTimeline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    ServiceLocator.getSensorManager().getSensorList = vi.fn((name: string) => (name === 'mw' || name === 'ssn' ? [defaultSensor] : [])) as never;
    plugin = new SensorTimeline();
    websiteInit(plugin);
    p().ctx_ = mockCtx();
    p().ctxStatic_ = mockCtx();
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
    vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'getSelectedSat').mockReturnValue(defaultSat);
    // A fresh Date per call: calculatePasses_ mutates it with setMinutes.
    vi.spyOn(ServiceLocator.getTimeManager(), 'getOffsetTimeObj').mockImplementation(() => new Date(NIGHT));
    vi.spyOn(SatMath, 'getEci').mockImplementation(((_sat: unknown, now: Date) => litLeoEci(now)) as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('B2: Detailed Plot gives Socorro a Station in Eclipse bar from the window start', async () => {
    p().enabledSensors_ = [cloneSensor(sensors.GEODDSSOC)];
    p().useWeather = false;
    p().detailedPlot = true;
    p().lengthOfLookAngles_ = 2;
    p().angleCalculationInterval_ = 300;

    const [, , , nights] = await p().calculatePasses_();

    expect(nights[0].passes.length).toBeGreaterThanOrEqual(1);
    expect(nights[0].passes[0].start.toISOString()).toBe(NIGHT.toISOString());
  });

  it('B3: a failed weather fetch leaves the optical sensor in every list with unknown weather', async () => {
    p().enabledSensors_ = [cloneSensor(sensors.GEODDSSOC)];
    p().useWeather = true;
    p().lengthOfLookAngles_ = 1;
    p().angleCalculationInterval_ = 600;
    vi.spyOn(p(), 'getWeather_').mockResolvedValue(null);

    const passes = await p().calculatePasses_();

    expect(passes).toHaveLength(5);
    for (const list of passes) {
      expect(list).toHaveLength(1);
    }
    // Unknown weather: never "clear", so no observable pass and no clear-skies bar.
    expect(passes[0][0].passes).toEqual([]);
    expect(passes[4][0].passes).toEqual([]);
  });

  it('B4: a sensor skipped for range keeps all five lists aligned, and the sunlight row is still drawn', async () => {
    const shortRange = cloneSensor(defaultSensor, { maxRng: 1 as Kilometers, maxRng2: undefined });
    const optical = cloneSensor(sensors.GEODDSSOC);

    p().enabledSensors_ = [shortRange, optical];
    p().useWeather = false;
    p().detailedPlot = true;
    p().lengthOfLookAngles_ = 1;
    p().angleCalculationInterval_ = 600;

    const passes = await p().calculatePasses_();

    for (const list of passes) {
      expect(list.map((entry: { sensor: DetailedSensor }) => entry.sensor)).toEqual([shortRange, optical]);
    }
    // The satellite sits on the sunward side the whole window: one sunlit period, the same for every sensor.
    expect(passes[2][0].passes).toHaveLength(1);
    expect(passes[2][1].passes).toBe(passes[2][0].passes);
  });

  it('B4: Detailed Plot with every sensor out of range still draws the sunlight row', async () => {
    p().enabledSensors_ = [cloneSensor(defaultSensor, { maxRng: 1 as Kilometers, maxRng2: undefined })];
    p().isMenuButtonActive = true;
    p().useWeather = false;
    p().detailedPlot = true;
    p().lengthOfLookAngles_ = 1;
    p().angleCalculationInterval_ = 600;
    const draw = vi.spyOn(p(), 'drawPasses_');
    const info = vi.spyOn(errorManagerInstance, 'info');

    // drawEmptyPlot_ clones the canvas and asks for a new 2d context, which jsdom does not provide.
    vi.spyOn(Object.getPrototypeOf(p().canvas_) as HTMLCanvasElement, 'getContext').mockImplementation(() => mockCtx() as never);

    await plugin.updateTimeline();

    expect(info).not.toHaveBeenCalled();
    expect(draw.mock.calls.map((call) => (call[0] as { type: string }).type)).toEqual(['can Observe', 'Satellite in Sunlight']);
  });

  describe('settings validation', () => {
    const setVal = (id: string, value: string) => {
      const el = getEl(id) as HTMLInputElement;

      el.value = value;
      el.dispatchEvent(new Event('change'));

      return el;
    };

    beforeEach(() => {
      PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1; // updateTimeline early-returns
    });

    it('Calculation Interval 0 is rejected with a toast and the previous value restored', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
      const update = vi.spyOn(plugin, 'updateTimeline');
      const el = setVal('sensor-timeline-setting-interval', '0');

      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast.mock.calls[0][0]).toMatch(/greater than zero/u);
      expect(p().angleCalculationInterval_).toBe(30);
      expect(el.value).toBe('30');
      expect(update).not.toHaveBeenCalled();
    });

    it('a non-numeric Calculation Length is rejected and keeps 24 h', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
      const el = setVal('sensor-timeline-setting-total-length', 'abc');

      expect(toast).toHaveBeenCalledTimes(1);
      expect(p().lengthOfLookAngles_).toBe(24);
      expect(el.value).toBe('24');
    });

    it('negative pass thresholds are rejected; positive ones are kept', () => {
      setVal('sensor-timeline-setting-bad-length', '-1');
      expect(p().lengthOfBadPass_).toBe(120);
      setVal('sensor-timeline-setting-avg-length', '300');
      expect(p().lengthOfAvgPass_).toBe(300);
    });
  });

  it('CSV sensorName is the display name (uiName), quoted when it holds a comma', () => {
    const onePass = { start: new Date('2026-10-27T12:00:00Z'), end: new Date('2026-10-27T12:10:00Z') };
    const csv = plugin.convertSensorPassesToCSV([
      { sensor: { sensorId: 7, objName: 'BLEAFB', uiName: 'Beale AFB' }, passes: [onePass] },
      { sensor: { sensorId: 8, objName: 'X', uiName: 'Maui, Hawaii' }, passes: [onePass] },
    ] as never);

    expect(csv).toContain('7,Beale AFB,2026-10-27T12:00:00.000Z,2026-10-27T12:10:00.000Z');
    expect(csv).toContain('8,"Maui, Hawaii",');
    expect(csv).not.toContain('BLEAFB');
  });

  it('clicking a pass jumps the clock and sets the sensor without deselecting the satellite', () => {
    const timeManager = ServiceLocator.getTimeManager();
    const jump = vi.spyOn(timeManager, 'changeSimulationTime').mockImplementation(() => undefined);

    vi.spyOn(timeManager, 'calculateSimulationTime').mockImplementation(() => undefined as never);
    const setSensor = vi.spyOn(ServiceLocator.getSensorManager(), 'setSensor').mockImplementation(() => undefined);
    const selectSat = vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'selectSat');
    const start = new Date('2026-10-27T12:00:00Z');

    p().leftOffset = 0;
    p().xScale = 1;
    p().drawPasses_({ sensor: defaultSensor, type: 'can Observe', passes: [{ start, end: new Date(start.getTime() + 600_000) }] }, 0, 0, start.getTime(), 10, 20, 5);
    p().canvas_.dispatchEvent(new MouseEvent('click', { clientX: 5, clientY: 10 }));

    expect(jump).toHaveBeenCalledWith(start.getTime());
    expect(setSensor).toHaveBeenCalledWith(defaultSensor);
    expect(jump.mock.invocationCallOrder[0]).toBeLessThan(setSensor.mock.invocationCallOrder[0]);
    expect(selectSat).not.toHaveBeenCalled();
  });
});
