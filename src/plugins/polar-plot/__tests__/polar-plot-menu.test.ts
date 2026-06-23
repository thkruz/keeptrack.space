/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PolarPlotPlugin } from '@app/plugins/polar-plot/polar-plot';
import { PolarPass } from '@app/plugins/polar-plot/polar-plot-pass';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const fakePass = (maxEl = 40): PolarPass => ({
  samples: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { t: new Date('2026-05-31T00:00:00Z'), az: 100 as any, el: 5 as any, rng: 800 as any },
  ],
  aos: new Date('2026-05-31T00:00:00Z'),
  los: new Date('2026-05-31T00:05:00Z'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maxEl: maxEl as any,
  culmination: new Date('2026-05-31T00:02:30Z'),
  durationMs: 5 * 60 * 1000,
});

describe('PolarPlotPlugin updatePlot_/renderCurrent_', () => {
  let plugin: PolarPlotPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new PolarPlotPlugin();
    websiteInit(plugin);
  });

  afterEach(() => vi.restoreAllMocks());

  it('stores the found passes and renders the first one', () => {
    vi.spyOn(plugin as never, 'computePasses_' as never).mockReturnValue([fakePass(), fakePass()] as never);
    const render = vi.spyOn(plugin as never, 'renderCurrent_' as never).mockImplementation(() => undefined);

    p().updatePlot_();

    expect(p().passes_).toHaveLength(2);
    expect(p().currentIndex_).toBe(0);
    expect(render).toHaveBeenCalled();
  });

  it('shows the not-in-view warning when there is no current pass', () => {
    const warn = vi.spyOn(plugin as never, 'showWarning_' as never).mockImplementation(() => undefined);

    p().passes_ = [];
    p().currentIndex_ = 0;
    p().renderCurrent_();

    expect(warn).toHaveBeenCalled();
  });
});

describe('PolarPlotPlugin stepPass_', () => {
  let plugin: PolarPlotPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new PolarPlotPlugin();
    websiteInit(plugin);
    vi.spyOn(plugin as never, 'renderCurrent_' as never).mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('clamps the index at both ends', () => {
    p().passes_ = [fakePass(), fakePass(), fakePass()];
    p().currentIndex_ = 0;

    p().stepPass_(-1);
    expect(p().currentIndex_).toBe(0);

    p().stepPass_(1);
    expect(p().currentIndex_).toBe(1);

    p().stepPass_(1);
    p().stepPass_(1);
    expect(p().currentIndex_).toBe(2);
  });

  it('does nothing when there are no passes', () => {
    p().passes_ = [];
    p().currentIndex_ = 0;

    p().stepPass_(1);
    expect(p().currentIndex_).toBe(0);
  });
});

describe('PolarPlotPlugin togglePolarPlot_ (P shortcut)', () => {
  let plugin: PolarPlotPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const toggle = () => plugin.getKeyboardShortcuts().find((s) => s.key === 'P')!.callback();

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new PolarPlotPlugin();
    websiteInit(plugin);
    vi.spyOn(plugin as never, 'updatePlot_' as never).mockImplementation(() => undefined);
    vi.spyOn(plugin, 'openSideMenu').mockImplementation(() => undefined);
    vi.spyOn(plugin, 'closeSideMenu').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('does nothing when no sensor is selected', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);

    toggle();

    expect(plugin.openSideMenu).not.toHaveBeenCalled();
  });

  it('opens the menu when a sensor is selected and the menu is closed', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(true);
    p().isMenuButtonActive = false;

    toggle();

    expect(plugin.openSideMenu).toHaveBeenCalled();
  });

  it('closes the menu when it is already open', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(true);
    p().isMenuButtonActive = true;

    toggle();

    expect(plugin.closeSideMenu).toHaveBeenCalled();
  });
});
