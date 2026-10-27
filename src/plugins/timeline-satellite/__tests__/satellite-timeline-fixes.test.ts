import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatelliteTimeline } from '@app/plugins/timeline-satellite/satellite-timeline';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { Kilometers } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const mockCtx = () =>
  new Proxy(
    {},
    {
      get: (_t, prop) => (prop === 'canvas' ? { width: 800, height: 400 } : vi.fn()),
      set: () => true,
    }
  );

describe('SatelliteTimeline fixes', () => {
  let plugin: SatelliteTimeline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const sensorWithRange = (maxRng: number) => Object.assign(Object.create(Object.getPrototypeOf(defaultSensor)), defaultSensor, { maxRng, maxRng2: undefined });

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, WatchlistPlugin]);
    plugin = new SatelliteTimeline();
    websiteInit(plugin);
    p().ctx_ = mockCtx();
    p().ctxStatic_ = mockCtx();
    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.isSensorSelected = vi.fn(() => true) as never;
    sensorManager.getSensor = vi.fn(() => sensorWithRange(100000)) as never;
    ServiceLocator.getCatalogManager().getSat = vi.fn(() => defaultSat) as never;
    p().lengthOfLookAngles_ = 1;
    p().angleCalculationInterval_ = 1800;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('B1: with nothing to plot the open is refused after the caution toast', () => {
    vi.spyOn(plugin, 'verifySensorSelected').mockReturnValue(true);
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;
    PluginRegistry.getPlugin(WatchlistPlugin)!.watchlistList = [];
    p().isMenuButtonActive = true; // the base click handler opened the menu before the callback runs
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
    const unselect = vi.spyOn(plugin, 'setBottomIconToUnselected');

    plugin.bottomIconCallback();

    expect(toast).toHaveBeenCalledTimes(1);
    expect(unselect).toHaveBeenCalled();
    expect(p().isMenuButtonActive).toBe(false);
  });

  it('B1: choosing a sensor with nothing to plot keeps the icon disabled and explains why', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;
    PluginRegistry.getPlugin(WatchlistPlugin)!.watchlistList = [];
    p().isIconDisabled = true;

    plugin.setBottomIconToEnabled();

    expect(p().isIconDisabled).toBe(true);
    expect(plugin.getDisabledReason()).toBe('Add Satellites to List or Select a Satellite');

    // A selection gives it something to plot: the icon enables and there is no reason left.
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
    plugin.setBottomIconToEnabled();

    expect(p().isIconDisabled).toBe(false);
    expect(plugin.getDisabledReason()).toBeNull();
  });

  it('B1: without a sensor the disabled reason is left to the base plugin', () => {
    ServiceLocator.getSensorManager().isSensorSelected = vi.fn(() => false) as never;
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = -1;
    PluginRegistry.getPlugin(WatchlistPlugin)!.watchlistList = [];

    expect(plugin.getDisabledReason()).toBeNull();
  });

  it('B2: a selected satellite that is also on the watchlist gets one row', () => {
    vi.spyOn(PluginRegistry.getPlugin(WatchlistPlugin)!, 'getSatellites').mockReturnValue([0]);
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;

    const passes = p().calculatePasses_();

    expect(passes).toHaveLength(1);
  });

  it('B3: a clock jump while open redraws once (coalesced); while closed it does not', () => {
    vi.useFakeTimers();
    const update = vi.spyOn(plugin, 'updateTimeline').mockImplementation(() => undefined);

    p().isMenuButtonActive = false;
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 0);
    vi.advanceTimersByTime(1000);
    expect(update).not.toHaveBeenCalled();

    p().isMenuButtonActive = true;
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 1000);
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 2000);
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 3000);
    vi.advanceTimersByTime(1000);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('a satellite whose perigee is above the sensor range keeps an empty "No Passes" row', () => {
    ServiceLocator.getSensorManager().getSensor = vi.fn(() => sensorWithRange(1 as Kilometers)) as never;
    vi.spyOn(PluginRegistry.getPlugin(WatchlistPlugin)!, 'getSatellites').mockReturnValue([]);
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;

    const passes = p().calculatePasses_();

    expect(passes).toHaveLength(1);
    expect(passes[0].satellite).toBe(defaultSat);
    expect(passes[0].passes).toEqual([]);
  });

  describe('settings validation', () => {
    const setVal = (id: string, value: string) => {
      const el = getEl(id) as HTMLInputElement;

      el.value = value;
      el.dispatchEvent(new Event('change'));

      return el;
    };

    beforeEach(() => {
      ServiceLocator.getSensorManager().isSensorSelected = vi.fn(() => false) as never; // updateTimeline early-returns
      p().lengthOfLookAngles_ = 6;
      p().angleCalculationInterval_ = 30;
    });

    it.each([
      ['satellite-timeline-setting-total-length', 'lengthOfLookAngles_', '0', 6],
      ['satellite-timeline-setting-interval', 'angleCalculationInterval_', 'abc', 30],
      ['satellite-timeline-setting-bad-length', 'lengthOfBadPass_', '-10', 120],
      ['satellite-timeline-setting-avg-length', 'lengthOfAvgPass_', '', 240],
    ])('%s rejects %j: toast, previous value restored', (id, field, bad, previous) => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
      const el = setVal(id, String(bad));

      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast.mock.calls[0][0]).toMatch(/greater than zero/u);
      expect(p()[field]).toBe(previous);
      expect(el.value).toBe(String(previous));
    });

    it('accepts a positive value', () => {
      setVal('satellite-timeline-setting-interval', '60');
      expect(p().angleCalculationInterval_).toBe(60);
    });
  });
});
