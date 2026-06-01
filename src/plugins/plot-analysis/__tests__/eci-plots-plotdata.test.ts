/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { EciPlot } from '@app/plugins/plot-analysis/eci-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import * as echarts from 'echarts';
import { vi } from 'vitest';

const NOW = Date.UTC(2026, 4, 31);

describe('EciPlot getPlotData / createPlot', () => {
  let plugin: EciPlot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const fakeSat = { name: 'SAT-A', period: 90 };

  const stubEnv = () => {
    const catalog = ServiceLocator.getCatalogManager();

    vi.spyOn(catalog, 'getObject').mockReturnValue(fakeSat as never);
    const tm = ServiceLocator.getTimeManager();

    (tm as unknown as { simulationTimeObj: Date }).simulationTimeObj = new Date(NOW);
    vi.spyOn(SatMathApi, 'getEciOfCurrentOrbit').mockReturnValue([
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
    ] as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new EciPlot();
    p().isMenuButtonActive = true;
    stubEnv();
  });

  afterEach(() => vi.restoreAllMocks());

  it('builds plot data for the primary (and last-selected) satellite', () => {
    p().selectSatManager_.selectedSat = 0;

    const data = plugin.getPlotData();

    // primary + last-selected (lastSelectedSat defaults to -1 but the eci guard is `!== null`)
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].name).toBe('SAT-A');
    expect(data[0].value![0]).toEqual([1, 2, 3, expect.any(String)]);
  });

  it('adds a series for the secondary satellite when present', () => {
    p().selectSatManager_.selectedSat = 0;
    const withoutSecondary = plugin.getPlotData().length;

    p().selectSatManager_.secondarySatObj = fakeSat;
    const withSecondary = plugin.getPlotData().length;

    expect(withSecondary).toBe(withoutSecondary + 1);
  });

  it('renders the chart via echarts and exercises the tooltip formatter', () => {
    p().selectSatManager_.selectedSat = 0;
    const chartDom = document.createElement('div');

    plugin.createPlot(plugin.getPlotData(), chartDom);

    expect(echarts.init).toHaveBeenCalledWith(chartDom);
    const chart = vi.mocked(echarts.init).mock.results.at(-1)!.value;
    const opt = vi.mocked(chart.setOption).mock.calls.at(-1)![0];

    expect(typeof opt.tooltip.formatter).toBe('function');
    const tip = opt.tooltip.formatter({ value: [1, 2, 3, '2026-05-31'], color: '#fff', seriesName: 'X' });

    expect(tip).toContain('X: 1.00 km');
  });

  it('disposes the previous chart before re-initializing', () => {
    p().selectSatManager_.selectedSat = 0;
    const chartDom = document.createElement('div');

    plugin.createPlot(plugin.getPlotData(), chartDom);
    const existing = plugin.chart;

    plugin.createPlot(plugin.getPlotData(), chartDom);

    expect(echarts.dispose).toHaveBeenCalledWith(existing);
  });

  it('does nothing when the menu button is inactive', () => {
    p().isMenuButtonActive = false;

    plugin.createPlot([], document.createElement('div'));

    expect(echarts.init).not.toHaveBeenCalled();
  });

  it('bottomIconCallback re-plots while the menu is active', () => {
    p().selectSatManager_.selectedSat = 0;
    const canvas = document.createElement('div');

    canvas.id = plugin.plotCanvasId;
    document.body.appendChild(canvas);
    const spy = vi.spyOn(plugin, 'createPlot');

    plugin.bottomIconCallback();

    expect(spy).toHaveBeenCalled();
  });
});
