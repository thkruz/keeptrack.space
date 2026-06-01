import { vi } from 'vitest';
/* eslint-disable dot-notation */
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { TimeSlider } from '@app/plugins/time-slider/time-slider';
import { ScenarioManagementPlugin } from '@app/plugins/scenario-management/scenario-management';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('TimeSlider', () => {
  beforeEach(() => {
    setupStandardEnvironment([ScenarioManagementPlugin, TopMenu]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TimeSlider, 'TimeSlider');
});

describe('TimeSlider behavior', () => {
  let plugin: TimeSlider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const setScenario = (scenario: unknown) => vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ scenario } as never);

  beforeEach(() => {
    setupStandardEnvironment([ScenarioManagementPlugin, TopMenu]);
    plugin = new TimeSlider();
    vi.spyOn(ServiceLocator.getTimeManager(), 'changeStaticOffset').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getSliderValue maps a time of day to a percentage when there are no bounds', () => {
    setScenario(null);

    const noon = new Date(Date.UTC(2022, 0, 1, 12, 0, 0));

    expect(plugin.getSliderValue(noon)).toBeCloseTo((12 * 60 / 1439) * 100, 1);
  });

  it('getSliderValue interpolates within scenario bounds', () => {
    setScenario({ startTime: new Date(0), endTime: new Date(1000) });

    expect(plugin.getSliderValue(new Date(500))).toBeCloseTo(50, 1);
  });

  it('sliderWithoutBounds shifts the simulation time and emits an update', () => {
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    p().sliderWithoutBounds(50);

    expect(ServiceLocator.getTimeManager().changeStaticOffset).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(EventBusEvent.updateDateTime, expect.any(Date));
  });

  it('sliderWithBounds maps the slider value into the scenario window', () => {
    plugin.scenario = { startTime: new Date(0), endTime: new Date(10000) } as never;
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');

    p().sliderWithBounds(25);

    expect(ServiceLocator.getTimeManager().changeStaticOffset).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(EventBusEvent.updateDateTime, expect.any(Date));
  });

  it('updateSliderPosition moves the handle when the slider exists', () => {
    setScenario(null);
    document.body.insertAdjacentHTML('beforeend',
      '<div id="time-slider-container-slider"><span class="ui-slider-handle"></span></div>');

    expect(() => plugin.updateSliderPosition()).not.toThrow();
    const handle = document.querySelector('#time-slider-container-slider .ui-slider-handle') as HTMLElement;

    expect(handle.style.left).toContain('%');
  });

  it('attaches pointer/touch slider events that drive the update function', () => {
    setScenario(null);
    document.body.insertAdjacentHTML('beforeend',
      '<div id="time-slider-container-slider" data-min="0" data-max="100" data-step="0.1"><span class="ui-slider-handle"></span></div>');

    const updateFn = vi.fn();

    p().attachSliderEvents('time-slider-container-slider', updateFn);

    const slider = document.getElementById('time-slider-container-slider')!;

    slider.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    const touch = { clientX: 30 } as Touch;

    slider.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));

    expect(updateFn).toHaveBeenCalled();
  });

  it('wires uiManagerFinal and date-change handlers in addJs', () => {
    setScenario({ startTime: undefined, endTime: undefined });
    document.body.insertAdjacentHTML('beforeend',
      '<div id="time-slider-container-slider" data-min="0" data-max="100" data-step="0.1"><span class="ui-slider-handle"></span></div>');

    const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

    plugin.addJs();
    const handlers = onSpy.mock.calls.filter(([evt]) => evt === EventBusEvent.uiManagerFinal ||
      evt === EventBusEvent.selectedDateChange ||
      evt === EventBusEvent.staticOffsetChange ||
      evt === EventBusEvent.scenarioBoundsChanged).map((c) => c[1] as () => void);

    expect(() => handlers.forEach((h) => h())).not.toThrow();

    // The uiManagerFinal handler wired the real slider callback; dragging exercises the
    // bounds check that picks sliderWithoutBounds vs sliderWithBounds.
    const slider = document.getElementById('time-slider-container-slider')!;

    slider.dispatchEvent(new MouseEvent('mousedown', { clientX: 5, bubbles: true }));

    setScenario({ startTime: new Date(0), endTime: new Date(10000) });
    slider.dispatchEvent(new MouseEvent('mousedown', { clientX: 8, bubbles: true }));

    expect(ServiceLocator.getTimeManager().changeStaticOffset).toHaveBeenCalled();
  });
});
