/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { EcfPlot } from '@app/plugins/plot-analysis/ecf-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import * as echarts from 'echarts';
import { vi } from 'vitest';

const NOW = Date.UTC(2026, 4, 31);

describe('EcfPlot getPlotData / createPlot', () => {
  let plugin: EcfPlot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const fakeSat = { name: 'SAT-A', period: 90 };

  const stubEnv = () => {
    const catalog = ServiceLocator.getCatalogManager();

    vi.spyOn(catalog, 'getObject').mockReturnValue(fakeSat as never);
    const tm = ServiceLocator.getTimeManager();

    (tm as unknown as { simulationTimeObj: Date }).simulationTimeObj = new Date(NOW);
    vi.spyOn(SatMathApi, 'getEcfOfCurrentOrbit').mockReturnValue([
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
    ] as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new EcfPlot();
    p().isMenuButtonActive = true;
    stubEnv();
  });

  afterEach(() => vi.restoreAllMocks());

  it('builds plot data for the primary satellite only by default', () => {
    p().selectSatManager_.selectedSat = 0;

    const data = plugin.getPlotData();

    // last-selected defaults to -1 and the ecf guard is `!== -1`, so only the primary is plotted.
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('SAT-A');
    expect(data[0].value![0]).toEqual([1, 2, 3, expect.any(String)]);
  });

  it('adds series for the secondary and last-selected satellites', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySatObj = fakeSat;
    p().selectSatManager_.lastSelectedSat(2);

    const data = plugin.getPlotData();

    expect(data).toHaveLength(3);
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
