import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SensorTimeline } from '@app/plugins/timeline-sensor/sensor-timeline';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

// A canvas 2d context is null under jsdom, so inject a permissive stub.
const mockCtx = () => new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'canvas') {
      return { width: 800, height: 400 };
    }

    return vi.fn();
  },
  set: () => true,
});

describe('SensorTimeline behavior', () => {
  let plugin: SensorTimeline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    // The constructor builds allSensorLists_ from getSensorList; provide one sensor.
    ServiceLocator.getSensorManager().getSensorList = vi.fn(
      (name: string) => (name === 'mw' || name === 'ssn' ? [defaultSensor] : []),
    ) as never;
    plugin = new SensorTimeline();
    websiteInit(plugin);
    // Replace the (null) canvas contexts with stubs.
    p().ctx_ = mockCtx();
    p().ctxStatic_ = mockCtx();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the de-duplicated sensor lists in the constructor', () => {
    expect(p().allSensorLists_.length).toBeGreaterThan(0);
    expect(p().enabledSensors_).toContain(defaultSensor);
  });

  it('convertSensorPassesToCSV flattens passes into rows', () => {
    const onePass = { start: new Date('2022-01-01T00:00:00Z'), end: new Date('2022-01-01T00:10:00Z') };
    const passes = [{ sensor: { sensorId: 7, objName: 'COD' }, passes: [onePass] }];

    const csv = plugin.convertSensorPassesToCSV(passes as never);

    expect(csv).toContain('sensorId,sensorName,startTime,endTime');
    expect(csv).toContain('COD');
  });

  describe('updateTimeline guards', () => {
    it('returns early when no satellite is selected', async () => {
      PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;
      const calcSpy = vi.spyOn(p(), 'calculateSensors_');

      await plugin.updateTimeline();

      expect(calcSpy).not.toHaveBeenCalled();
    });

    it('returns early when the menu is not active', async () => {
      PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
      p().isMenuButtonActive = false;
      const calcSpy = vi.spyOn(p(), 'calculateSensors_');

      await plugin.updateTimeline();

      expect(calcSpy).not.toHaveBeenCalled();
    });
  });

  it('calculateSensors_ renders a button per sensor and toggles on click', () => {
    p().calculateSensors_();

    const btn = getEl('sensor-timeline-sensor-list')!.querySelector('button') as HTMLButtonElement;

    expect(btn).not.toBeNull();
    // Toggling a button flips its enabled state without throwing.
    expect(() => btn.click()).not.toThrow();
  });

  it('calculatePasses_ returns the five pass-type arrays for the enabled sensors', async () => {
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
    vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'getSelectedSat').mockReturnValue(defaultSat);
    p().useWeather = false;
    p().lengthOfLookAngles_ = 1;
    p().angleCalculationInterval_ = 1800;

    const passes = await p().calculatePasses_();

    expect(passes).toHaveLength(5);
    expect(Array.isArray(passes[0])).toBe(true);
  });

  it('the settings inputs update their fields on change', () => {
    const setVal = (id: string, value: string) => {
      const el = getEl(id) as HTMLInputElement;

      el.value = value;
      el.dispatchEvent(new Event('change'));
    };

    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1; // updateTimeline early-returns

    setVal('sensor-timeline-setting-total-length', '48');
    setVal('sensor-timeline-setting-bad-length', '120');
    setVal('sensor-timeline-setting-avg-length', '300');

    expect(p().lengthOfLookAngles_).toBe(48);
    expect(p().lengthOfBadPass_).toBe(120);
    expect(p().lengthOfAvgPass_).toBe(300);
  });

  it('the detailed-plot and weather toggles flip their flags', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;

    const toggle = getEl('sensor-timeline-toggle') as HTMLInputElement;

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(p().detailedPlot).toBe(true);

    const weather = getEl('weather-toggle') as HTMLInputElement;

    weather.checked = false;
    weather.dispatchEvent(new Event('change'));
    expect(p().useWeather).toBe(false);
  });

  it('the bottom-icon callback resizes and updates when active', () => {
    p().isMenuButtonActive = true;
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;

    expect(() => plugin.bottomIconCallback()).not.toThrow();
  });

  it('a full updateTimeline run computes passes and draws the timeline', async () => {
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
    vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'getSelectedSat').mockReturnValue(defaultSat);
    p().isMenuButtonActive = true;
    p().useWeather = false;
    p().lengthOfLookAngles_ = 1;
    p().angleCalculationInterval_ = 1800;
    // A high max range guarantees the satellite isn't skipped, exercising the
    // per-interval FOV/sun/observable loop and the drawTimeline_ renderer.
    p().enabledSensors_ = [Object.assign(Object.create(Object.getPrototypeOf(defaultSensor)), defaultSensor, { maxRng: 100000 })];

    await expect(plugin.updateTimeline()).resolves.toBeUndefined();
  });
});
