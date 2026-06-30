/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { RicPlot } from '@app/plugins/plot-analysis/ric-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import * as echarts from 'echarts';
import { vi } from 'vitest';

const NOW = Date.UTC(2026, 4, 31);

describe('RicPlot getPlotData / createPlot', () => {
  let plugin: RicPlot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const satP = { name: 'PRIMARY', period: 90 };
  const satS = { name: 'SECONDARY', period: 90 };

  const stubEnv = () => {
    const catalog = ServiceLocator.getCatalogManager();

    vi.spyOn(catalog, 'getObject').mockReturnValue(satP as never);
    const tm = ServiceLocator.getTimeManager();

    (tm as unknown as { simulationTimeObj: Date }).simulationTimeObj = new Date(NOW);
    vi.spyOn(SatMathApi, 'getRicOfCurrentOrbit').mockReturnValue([
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
    ] as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new RicPlot();
    p().isMenuButtonActive = true;
    stubEnv();
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns an empty data set when no secondary satellite is selected', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySat = -1;

    expect(plugin.getPlotData()).toEqual([]);
  });

  it('warns and returns empty data when satellite objects are missing', () => {
    const warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySat = 1;
    p().selectSatManager_.secondarySatObj = null;

    expect(plugin.getPlotData()).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('builds a RIC-over-time series for the secondary', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySat = 1;
    p().selectSatManager_.secondarySatObj = satS;

    const data = plugin.getPlotData();

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ t: 0, r: 1, i: 2, c: 3 });
    expect(data[0].range).toBeCloseTo(Math.sqrt(1 + 4 + 9));
    expect(data[1]).toMatchObject({ r: 4, i: 5, c: 6 });
    expect(data[1].t).toBeGreaterThan(0);
  });

  it('propagates the selected number of orbits (default 5, 100 points each)', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySat = 1;
    p().selectSatManager_.secondarySatObj = satS;

    plugin.getPlotData();
    expect(SatMathApi.getRicOfCurrentOrbit).toHaveBeenLastCalledWith(satS, satP, 500, 5);

    p().orbits_ = 10;
    plugin.getPlotData();
    expect(SatMathApi.getRicOfCurrentOrbit).toHaveBeenLastCalledWith(satS, satP, 1000, 10);
  });

  it('renders the chart via echarts and exercises the tooltip formatter', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySat = 1;
    p().selectSatManager_.secondarySatObj = satS;
    const chartDom = document.createElement('div');

    plugin.createPlot(plugin.getPlotData(), chartDom);

    expect(echarts.init).toHaveBeenCalledWith(chartDom);
    const chart = vi.mocked(echarts.init).mock.results.at(-1)!.value;
    const opt = vi.mocked(chart.setOption).mock.calls.at(-1)![0];

    const tip = opt.tooltip.formatter([{ axisValue: 0, value: [0, 1], color: '#fff', seriesName: 'Radial' }]);

    expect(tip).toContain('Radial: <b>1.00');
  });

  it('disposes the previous chart before re-initializing', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySat = 1;
    p().selectSatManager_.secondarySatObj = satS;
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

  it('toasts when no primary satellite is selected', () => {
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

    p().selectSatManager_.selectedSat = -1;
    plugin.bottomIconCallback();

    expect(toast).toHaveBeenCalled();
  });

  it('toasts when no secondary satellite is selected', () => {
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySatObj = null;
    plugin.bottomIconCallback();

    expect(toast).toHaveBeenCalled();
  });

  it('bottomIconCallback re-plots when both satellites are selected', () => {
    const canvas = document.createElement('div');

    canvas.id = plugin.plotCanvasId;
    document.body.appendChild(canvas);
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySat = 1;
    p().selectSatManager_.secondarySatObj = satS;
    const spy = vi.spyOn(plugin, 'createPlot');

    plugin.bottomIconCallback();

    expect(spy).toHaveBeenCalled();
  });
});
