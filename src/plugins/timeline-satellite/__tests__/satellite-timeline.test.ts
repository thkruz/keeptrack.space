import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatelliteTimeline } from '@app/plugins/timeline-satellite/satellite-timeline';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const mockCtx = () =>
  new Proxy(
    {},
    {
      get: (_t, prop) => (prop === 'canvas' ? { width: 800, height: 400 } : vi.fn()),
      set: () => true,
    }
  );

describe('SatelliteTimeline_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSmokeSuite(SatelliteTimeline, 'SatelliteTimeline');
});

describe('SatelliteTimeline behavior', () => {
  let plugin: SatelliteTimeline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const highRangeSensor = () => Object.assign(Object.create(Object.getPrototypeOf(defaultSensor)), defaultSensor, { maxRng: 100000 });

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, WatchlistPlugin]);
    plugin = new SatelliteTimeline();
    websiteInit(plugin);
    p().ctx_ = mockCtx();
    p().ctxStatic_ = mockCtx();
    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.isSensorSelected = vi.fn(() => true) as never;
    sensorManager.getSensor = vi.fn(() => highRangeSensor()) as never;
    ServiceLocator.getCatalogManager().getSat = vi.fn(() => defaultSat) as never;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('propagateMultiSite (static)', () => {
    it('returns a record with az/el/time fields', () => {
      const out = SatelliteTimeline.propagateMultiSite(new Date('2022-01-01T00:00:00Z'), defaultSat.satrec, highRangeSensor() as never);

      expect(out).toHaveProperty('time');
      expect(out).toHaveProperty('az');
    });
  });

  describe('updateTimeline', () => {
    it('returns early when no sensor is selected', () => {
      ServiceLocator.getSensorManager().isSensorSelected = vi.fn(() => false) as never;
      const drawSpy = vi.spyOn(p(), 'drawTimeline_');

      plugin.updateTimeline();

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it('returns early when the menu is not active', () => {
      p().isMenuButtonActive = false;
      const drawSpy = vi.spyOn(p(), 'drawTimeline_');

      plugin.updateTimeline();

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it('computes passes and draws when active with a selection', () => {
      p().isMenuButtonActive = true;
      PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
      p().lengthOfLookAngles_ = 1;
      p().angleCalculationInterval_ = 1800;

      expect(() => plugin.updateTimeline()).not.toThrow();
    });
  });

  it('calculatePasses_ returns a pass list for the watchlist + selected satellite', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
    p().lengthOfLookAngles_ = 1;
    p().angleCalculationInterval_ = 1800;

    const passes = p().calculatePasses_();

    expect(Array.isArray(passes)).toBe(true);
    expect(passes.length).toBeGreaterThan(0);
  });

  it('calculatePasses_ returns empty without a sensor', () => {
    ServiceLocator.getSensorManager().getSensor = vi.fn(() => null) as never;

    expect(p().calculatePasses_()).toEqual([]);
  });

  describe('bottomIconCallback', () => {
    it('does nothing without a sensor selected', () => {
      vi.spyOn(plugin, 'verifySensorSelected').mockReturnValue(false);

      expect(() => plugin.bottomIconCallback()).not.toThrow();
    });

    it('toasts when neither a watchlist nor a selected satellite exists', () => {
      vi.spyOn(plugin, 'verifySensorSelected').mockReturnValue(true);
      PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;
      PluginRegistry.getPlugin(WatchlistPlugin)!.watchlistList = [];
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

      plugin.bottomIconCallback();

      expect(toast).toHaveBeenCalled();
    });
  });

  it('onWatchlistUpdated_ disables the icon for an empty list with no selection', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;
    const disable = vi.spyOn(plugin, 'setBottomIconToDisabled').mockImplementation(() => undefined);

    p().onWatchlistUpdated_([]);

    expect(disable).toHaveBeenCalled();
  });

  it('downloadIconCb exports the canvas as a PNG link', () => {
    const canvas = getEl('satellite-timeline-canvas') as HTMLCanvasElement;

    canvas.toDataURL = vi.fn(() => 'data:image/png;base64,xxx') as never;
    // jsdom defines click() on HTMLElement.prototype, which the <a> inherits.
    const click = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => undefined);

    plugin.downloadIconCb();

    expect(canvas.toDataURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it('the settings inputs update their fields on change', () => {
    ServiceLocator.getSensorManager().isSensorSelected = vi.fn(() => false) as never; // updateTimeline early-returns
    const setVal = (id: string, value: string) => {
      const el = getEl(id) as HTMLInputElement;

      el.value = value;
      el.dispatchEvent(new Event('change'));
    };

    setVal('satellite-timeline-setting-total-length', '48');
    setVal('satellite-timeline-setting-interval', '60');
    setVal('satellite-timeline-setting-bad-length', '120');
    setVal('satellite-timeline-setting-avg-length', '300');

    expect(p().lengthOfLookAngles_).toBe(48);
    expect(p().angleCalculationInterval_).toBe(60);
    expect(p().lengthOfBadPass_).toBe(120);
    expect(p().lengthOfAvgPass_).toBe(300);
  });
});
