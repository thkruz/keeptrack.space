import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ScenarioManagementPlugin } from '@app/plugins/scenario-management/scenario-management';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import * as bandsCore from '@app/plugins/time-slider/slider-bands-core';
import { TimeSlider } from '@app/plugins/time-slider/time-slider';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

vi.mock('@app/plugins/time-slider/slider-bands-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@app/plugins/time-slider/slider-bands-core')>();

  return { ...actual, bandsToGradient: vi.fn(actual.bandsToGradient) };
});

// Canonical Vallado SGP4 ISS test TLE, epoch 2008-09-20 12:25:40 UTC.
const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927' as TleLine1;
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537' as TleLine2;

describe('TimeSlider bands', () => {
  let plugin: TimeSlider;
  let selected: Satellite | null;

  beforeEach(() => {
    vi.useFakeTimers();
    setupStandardEnvironment([ScenarioManagementPlugin, TopMenu]);
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="time-slider-container-slider"><div id="${TimeSlider.BAND_LAYER_ID}"></div><span class="ui-slider-handle"></span></div>`
    );

    selected = null;
    vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation(((cls: unknown) => {
      if (cls === SelectSatManager) {
        return { primarySatObj: selected } as never;
      }

      return { scenario: null } as never;
    }) as typeof PluginRegistry.getPlugin);

    const timeManager = ServiceLocator.getTimeManager();

    // Two days after the element epoch: inside the "ok" trust range.
    timeManager.simulationTimeObj = new Date(Date.UTC(2008, 8, 22, 12, 0, 0));

    plugin = new TimeSlider();
    plugin.addJs();
    vi.mocked(bandsCore.bandsToGradient).mockClear();
  });

  afterEach(() => {
    document.getElementById('time-slider-container-slider')?.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rebuilds once, after the debounce, when a satellite is selected', () => {
    selected = new Satellite({ id: 0, tle1: TLE1, tle2: TLE2 });

    EventBus.getInstance().emit(EventBusEvent.selectSatData, selected, 0);
    EventBus.getInstance().emit(EventBusEvent.selectSatData, selected, 0);

    expect(bandsCore.bandsToGradient).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TimeSlider.BAND_DEBOUNCE_MS);

    // One rebuild renders the two layers: one bandsToGradient call each for eclipse and trust.
    expect(bandsCore.bandsToGradient).toHaveBeenCalledTimes(2);
    expect(vi.mocked(bandsCore.bandsToGradient).mock.calls.map((c) => c[1])).toEqual(['var(--time-slider-eclipse-rgb)', 'var(--time-slider-trust-rgb)']);

    // ISS eclipses every orbit, so the eclipse layer is painted.
    const layer = document.getElementById(TimeSlider.BAND_LAYER_ID) as HTMLElement;

    expect(layer.style.backgroundImage).toContain('linear-gradient');
  });

  it('skips the rebuild when nothing is selected', () => {
    EventBus.getInstance().emit(EventBusEvent.selectSatData, null as never, -1);
    vi.advanceTimersByTime(TimeSlider.BAND_DEBOUNCE_MS);

    expect(bandsCore.bandsToGradient).not.toHaveBeenCalled();
  });

  it('does not resample when the window and selection are unchanged', () => {
    selected = new Satellite({ id: 0, tle1: TLE1, tle2: TLE2 });
    const sampleSpy = vi.spyOn(TimeSlider, 'sampleEclipse');

    EventBus.getInstance().emit(EventBusEvent.selectSatData, selected, 0);
    vi.advanceTimersByTime(TimeSlider.BAND_DEBOUNCE_MS);
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, 0);
    vi.advanceTimersByTime(TimeSlider.BAND_DEBOUNCE_MS);

    expect(sampleSpy).toHaveBeenCalledTimes(1);
  });
});

describe('TimeSlider.sampleEclipse', () => {
  it('finds the ISS eclipse at about one per 91.6 min orbit', () => {
    const sat = new Satellite({ id: 0, tle1: TLE1, tle2: TLE2 });
    const start = Date.UTC(2008, 8, 20, 0, 0, 0);
    const end = start + 1439 * 60e3;
    const bands = bandsCore.eclipseBands(TimeSlider.sampleEclipse(sat, start, end), start, end);
    const umbra = bands.filter((b) => b.kind === 'umbra');

    // Period from the mean motion 15.72125391 rev/day: 1440 / 15.72125 = 91.60 min, so a
    // 1439 min window holds 15 or 16 umbra spans.
    expect(umbra.length).toBeGreaterThanOrEqual(15);
    expect(umbra.length).toBeLessThanOrEqual(16);

    // Each umbra span lasts at most the cylinder bound for a ~350 km orbit:
    // 2 * asin(6378 / 6728) / (2 pi) * 91.6 min = 0.4022 * 91.6 = 36.8 min.
    for (const b of umbra) {
      expect((b.endFrac - b.startFrac) * 1439).toBeLessThan(37);
    }
  });
});
