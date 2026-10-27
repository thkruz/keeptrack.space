/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
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

  const fakeSat = { id: 0, name: 'SAT-A', period: 90 };
  const otherSat = { id: 7, name: 'SAT-B', period: 120 };

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

  it('a lone selected satellite is plotted once (no duplicate series)', () => {
    p().selectSatManager_.selectedSat = 0;
    // lastSelectedSat() tracks the current primary; it must not add a second copy.
    p().selectSatManager_.lastSelectedSat(0);

    const data = plugin.getPlotData();

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('SAT-A');
    expect(data[0].value![0]).toEqual([1, 2, 3, expect.any(String)]);
  });

  it('adds a second series only for a secondary that is a different object', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySatObj = otherSat;
    p().selectSatManager_.lastSelectedSat(0);

    const data = plugin.getPlotData();

    expect(data.map((d) => d.name)).toEqual(['SAT-A', 'SAT-B']);
  });

  it('skips a secondary that is the primary itself', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySatObj = fakeSat;

    expect(plugin.getPlotData()).toHaveLength(1);
  });

  it('labels each sample with its time over one period of that satellite', () => {
    p().selectSatManager_.selectedSat = 0;
    p().selectSatManager_.secondarySatObj = otherSat;

    const [primary, secondary] = plugin.getPlotData();

    expect(primary.value![0][3]).toBe(new Date(NOW).toISOString());
    expect(primary.value![1][3]).toBe(new Date(NOW + ((90 * 60) / 100) * 1000).toISOString());
    expect(secondary.value![1][3]).toBe(new Date(NOW + ((120 * 60) / 100) * 1000).toISOString());
  });

  it('returns no series when the primary is missing from the catalog', () => {
    vi.mocked(ServiceLocator.getCatalogManager().getObject).mockReturnValue(null as never);
    p().selectSatManager_.selectedSat = 0;

    expect(plugin.getPlotData()).toEqual([]);
  });

  describe('selection changes while open', () => {
    const mountCanvas = () => {
      const canvas = document.createElement('div');

      canvas.id = plugin.plotCanvasId;
      document.body.appendChild(canvas);
    };

    beforeEach(() => {
      plugin.addHtml();
      mountCanvas();
    });

    afterEach(() => {
      document.getElementById(plugin.plotCanvasId)?.remove();
    });

    it('redraws when a new primary is selected', () => {
      p().selectSatManager_.selectedSat = 0;
      const spy = vi.spyOn(plugin, 'createPlot');

      EventBus.getInstance().emit(EventBusEvent.selectSatData, fakeSat as never, 0);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('redraws when the secondary changes', () => {
      p().selectSatManager_.selectedSat = 0;
      const spy = vi.spyOn(plugin, 'createPlot');

      p().selectSatManager_.secondarySatObj = otherSat;
      EventBus.getInstance().emit(EventBusEvent.setSecondarySat, otherSat as never, 7);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].map((d) => d.name)).toEqual(['SAT-A', 'SAT-B']);
    });

    it('does not redraw while closed or after the primary is cleared', () => {
      const spy = vi.spyOn(plugin, 'createPlot');

      p().isMenuButtonActive = false;
      p().selectSatManager_.selectedSat = 0;
      EventBus.getInstance().emit(EventBusEvent.selectSatData, fakeSat as never, 0);

      p().isMenuButtonActive = true;
      p().selectSatManager_.selectedSat = -1;
      EventBus.getInstance().emit(EventBusEvent.selectSatData, undefined as never, undefined as never);

      expect(spy).not.toHaveBeenCalled();
    });
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
