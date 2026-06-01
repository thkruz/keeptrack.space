/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PolarPlotPlugin } from '@app/plugins/polar-plot/polar-plot';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/** A 2D context double covering every method/property polar-plot's draw chain touches. */
const makeCtx = () => ({
  canvas: { width: 1000, height: 1000 },
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  clearRect: vi.fn(),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  textAlign: '',
  textBaseline: '',
  lineWidth: 0,
  imageSmoothingEnabled: false,
});

describe('PolarPlotPlugin drawPlot_', () => {
  let plugin: PolarPlotPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new PolarPlotPlugin();
    websiteInit(plugin);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders the full polar plot (axes, labels, orbit line, endpoints and title)', () => {
    const ctx = makeCtx();
    const canvas = document.getElementById('polar-plot') as HTMLCanvasElement;

    canvas.getContext = vi.fn(() => ctx) as never;

    p().plotData_ = [[10, 20], [30, 40], [50, 60]];
    p().passStartTime_ = new Date('2026-05-31T01:02:03Z');
    p().passStopTime_ = new Date('2026-05-31T02:03:04Z');
    vi.spyOn(p().selectSatManager_, 'getSelectedSat').mockReturnValue({ sccNum: '25544' } as never);
    vi.spyOn(ServiceLocator.getSensorManager(), 'getSensor').mockReturnValue({ name: 'TEST SENSOR', isSensor: () => true } as never);

    p().drawPlot_();

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled(); // start/end dots
    expect(ctx.fillText).toHaveBeenCalledWith('TEST SENSOR', 10, 10);
    // distanceUnit_ is derived from the canvas size during setupCanvas_.
    expect(p().distanceUnit_).toBeGreaterThan(0);
  });

  it('falls back to placeholder sensor/time text when those are unavailable', () => {
    const ctx = makeCtx();
    const canvas = document.getElementById('polar-plot') as HTMLCanvasElement;

    canvas.getContext = vi.fn(() => ctx) as never;

    p().plotData_ = [[10, 20], [30, 40]];
    p().passStartTime_ = null;
    p().passStopTime_ = null;
    vi.spyOn(p().selectSatManager_, 'getSelectedSat').mockReturnValue({ sccNum: '25544' } as never);
    vi.spyOn(ServiceLocator.getSensorManager(), 'getSensor').mockReturnValue(null as never);

    p().drawPlot_();

    expect(ctx.fillText).toHaveBeenCalledWith('Unknown Sensor', 10, 10);
  });
});

describe('PolarPlotPlugin updatePlot_', () => {
  let plugin: PolarPlotPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new PolarPlotPlugin();
    websiteInit(plugin);
  });

  afterEach(() => vi.restoreAllMocks());

  it('draws the plot when data is available', () => {
    vi.spyOn(plugin as never, 'generatePlotData_' as never).mockReturnValue(true as never);
    const drawSpy = vi.spyOn(plugin as never, 'drawPlot_' as never).mockImplementation(() => undefined);

    p().updatePlot_();

    expect(drawSpy).toHaveBeenCalled();
  });

  it('shows the not-in-view warning when there is no data', () => {
    vi.spyOn(plugin as never, 'generatePlotData_' as never).mockReturnValue(false as never);
    const drawSpy = vi.spyOn(plugin as never, 'drawPlot_' as never).mockImplementation(() => undefined);

    p().updatePlot_();

    expect(drawSpy).not.toHaveBeenCalled();
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
