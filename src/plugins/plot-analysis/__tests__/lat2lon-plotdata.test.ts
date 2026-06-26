/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { Lat2LonPlots } from '@app/plugins/plot-analysis/lat2lon';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import * as echarts from 'echarts';
import { vi } from 'vitest';

const mkSat = (over: Record<string, unknown> = {}) => ({
  id: 0,
  type: SpaceObjectType.PAYLOAD,
  eccentricity: 0.001,
  period: 1436,
  inclination: 5,
  country: 'US',
  name: 'GEOSAT',
  ...over,
});

describe('Lat2LonPlots.getPlotData', () => {
  const stubCatalog = (sats: ReturnType<typeof mkSat>[]) => {
    const catalog = ServiceLocator.getCatalogManager();

    (catalog as unknown as { objectCache: unknown[] }).objectCache = sats;
    vi.spyOn(catalog, 'getObject').mockImplementation((id: number) => sats.find((s) => s.id === id) as never);
    vi.spyOn(SatMathApi, 'getLlaOfCurrentOrbit').mockReturnValue([{ lon: 100, lat: 5, alt: 35786 }] as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('groups a GEO payload under its mapped country', () => {
    stubCatalog([mkSat()]);

    const data = Lat2LonPlots.getPlotData();

    expect(data.USA).toHaveLength(1);
    expect(data.USA[0].value).toEqual([100, 5]);
    expect(data.USA[0].name).toBe('GEOSAT');
  });

  it('excludes non-payloads and non-GEO objects', () => {
    stubCatalog([
      mkSat({ id: 0, type: SpaceObjectType.ROCKET_BODY }),
      mkSat({ id: 1, eccentricity: 0.5 }),
      mkSat({ id: 2, period: 95 }),
      mkSat({ id: 3, period: 5000 }),
      mkSat({ id: 4, inclination: 60 }),
    ]);

    expect(Lat2LonPlots.getPlotData()).toEqual({});
  });

  it('skips satellites with no LLA points', () => {
    const catalog = ServiceLocator.getCatalogManager();
    const sats = [mkSat()];

    (catalog as unknown as { objectCache: unknown[] }).objectCache = sats;
    vi.spyOn(catalog, 'getObject').mockImplementation((id: number) => sats.find((s) => s.id === id) as never);
    vi.spyOn(SatMathApi, 'getLlaOfCurrentOrbit').mockReturnValue([] as never);

    expect(Lat2LonPlots.getPlotData()).toEqual({});
  });

  it('maps each recognized country code and falls back to Other', () => {
    stubCatalog([
      mkSat({ id: 0, country: 'F' }),
      mkSat({ id: 1, country: 'RU' }),
      mkSat({ id: 2, country: 'CN' }),
      mkSat({ id: 3, country: 'IN' }),
      mkSat({ id: 4, country: 'J' }),
      mkSat({ id: 5, country: 'XYZ' }),
    ]);

    const data = Lat2LonPlots.getPlotData();

    expect(Object.keys(data).sort((a, b) => a.localeCompare(b))).toEqual(['China', 'France', 'India', 'Japan', 'Other', 'Russia']);
  });
});

describe('Lat2LonPlots.createPlot', () => {
  let plugin: Lat2LonPlots;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    vi.clearAllMocks();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new Lat2LonPlots();
    p().isMenuButtonActive = true;
  });

  afterEach(() => vi.restoreAllMocks());

  it('does nothing when the menu button is inactive', () => {
    p().isMenuButtonActive = false;

    plugin.createPlot({}, document.createElement('div'));

    expect(echarts.init).not.toHaveBeenCalled();
  });

  it('initializes the chart once, wires the click handler, and renders series', () => {
    const selectSpy = vi.spyOn(p().selectSatManager_, 'selectSat').mockImplementation(() => undefined);
    const chartDom = document.createElement('div');
    const data = { USA: [{ name: 'GEOSAT', satId: 5, value: [100, 5] as [number, number] }] };

    plugin.createPlot(data, chartDom);

    expect(echarts.init).toHaveBeenCalledTimes(1);
    const chart = vi.mocked(echarts.init).mock.results.at(-1)!.value;

    // The registered click handler should forward the satId to the select manager.
    const clickHandler = vi.mocked(chart.on).mock.calls.find((c: unknown[]) => c[0] === 'click')![1];

    clickHandler({ data: { satId: 5 } });
    expect(selectSpy).toHaveBeenCalledWith(5);

    // Tooltip formatter renders the point's lat/lon.
    const opt = vi.mocked(chart.setOption).mock.calls.at(-1)![0];
    const tip = opt.tooltip.formatter({ data: { name: 'GEOSAT', value: [100, 5] }, color: '#fff' });

    expect(tip).toContain('100.000');

    // A second call must reuse the existing chart (no second init).
    plugin.createPlot(data, chartDom);
    expect(echarts.init).toHaveBeenCalledTimes(1);
  });
});
