/* eslint-disable dot-notation */

import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Lat2LonPlots } from '@app/plugins/plot-analysis/lat2lon';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';
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
    vi.spyOn(Lat2LonPlots, 'propagatedSubpoint').mockReturnValue({ lon: 100, lat: 5, inclinationDeg: 5 });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('groups a GEO payload under its mapped country', () => {
    stubCatalog([mkSat()]);

    const data = Lat2LonPlots.getPlotData();

    expect(data['United States']).toHaveLength(1);
    expect(data['United States'][0].value).toEqual([100, 5]);
    expect(data['United States'][0].name).toBe('GEOSAT');
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

  it('skips satellites with no finite subpoint (deep-space probes, failed propagation)', () => {
    stubCatalog([mkSat()]);
    vi.mocked(Lat2LonPlots.propagatedSubpoint).mockReturnValue(null);

    expect(Lat2LonPlots.getPlotData()).toEqual({});
  });

  it('a deep-space probe without a TLE (SGP4 fails, zero state) is not plotted', () => {
    const catalog = ServiceLocator.getCatalogManager();
    const probe = mkSat({ name: 'Voyager 1', eccentricity: 0, country: 'US' });

    (catalog as unknown as { objectCache: unknown[] }).objectCache = [probe];
    vi.spyOn(catalog, 'getObject').mockReturnValue(probe as never);

    expect(Lat2LonPlots.getPlotData(new Date(Date.UTC(2026, 9, 26, 12)))).toEqual({});
  });

  it('filters on the inclination of the propagated state, not only the TLE inclination', () => {
    stubCatalog([mkSat({ id: 0, name: 'KEPT' }), mkSat({ id: 1, name: 'DRIFTED' })]);
    vi.mocked(Lat2LonPlots.propagatedSubpoint).mockImplementation((sat) =>
      sat.name === 'DRIFTED' ? { lon: 99, lat: 25.6, inclinationDeg: 25.7 } : { lon: 100, lat: 5, inclinationDeg: 5 }
    );

    const names = Object.values(Lat2LonPlots.getPlotData()).flatMap((pts) => pts.map((pt) => pt.name));

    expect(names).toEqual(['KEPT']);
  });

  it('propagates every satellite at the snapshot time it is given', () => {
    stubCatalog([mkSat()]);
    const snapshot = new Date(Date.UTC(2026, 9, 26, 12));

    Lat2LonPlots.getPlotData(snapshot);

    expect(Lat2LonPlots.propagatedSubpoint).toHaveBeenCalledWith(expect.anything(), snapshot);
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

describe('Lat2LonPlots.propagatedSubpoint', () => {
  // EKRAN 5 (11890): last TLE epoch 1994, mean inclination 11.33 deg at that epoch.
  const ekran5 = () =>
    new Satellite({
      id: 0,
      name: 'EKRAN 5',
      tle1: '1 11890U 80060A   94073.86217760 -.00000273 +00000-0 +10000-3 0  9990' as TleLine1,
      tle2: '2 11890 011.3266 045.7592 0017224 051.2216 120.4220 01.00239918022968' as TleLine2,
    });

  it('returns a finite subpoint whose |lat| never exceeds the propagated inclination', () => {
    const sat = ekran5();
    const result = Lat2LonPlots.propagatedSubpoint(sat, new Date(Date.UTC(2026, 9, 26, 12)))!;

    expect(result).not.toBeNull();
    expect(Number.isFinite(result.lat)).toBe(true);
    expect(Number.isFinite(result.lon)).toBe(true);
    expect(Math.abs(result.lat)).toBeLessThanOrEqual(result.inclinationDeg + 0.2);
  });

  it('at the TLE epoch the propagated inclination equals the TLE inclination', () => {
    const sat = ekran5();
    const result = Lat2LonPlots.propagatedSubpoint(sat, new Date(Date.UTC(1994, 2, 14, 20, 41)))!;

    expect(result.inclinationDeg).toBeCloseTo(11.33, 0);
  });

  it('EKRAN 5 propagated 32 years past its stale TLE leaves the inclination <= 17 deg filter', () => {
    const sat = ekran5();
    const result = Lat2LonPlots.propagatedSubpoint(sat, new Date(Date.UTC(2026, 9, 26, 12)))!;

    expect(sat.inclination).toBeLessThan(17);
    expect(result.inclinationDeg).toBeGreaterThan(17);
  });

  it('returns null for a zero (failed) SGP4 state', () => {
    vi.spyOn(SatMath, 'getEci').mockReturnValue({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } } as never);

    expect(Lat2LonPlots.propagatedSubpoint(ekran5(), new Date())).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('Lat2LonPlots.snapshotSubtitle', () => {
  it('names the snapshot time in UTC', () => {
    const text = Lat2LonPlots.snapshotSubtitle(new Date(Date.UTC(2026, 9, 26, 12, 0, 5)));

    expect(text).toContain('2026-10-26 12:00:05');
    expect(text).toContain('UTC');
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

  it('shows the snapshot sim time (UTC) as the chart subtitle', () => {
    plugin.createPlot({}, document.createElement('div'), new Date(Date.UTC(2026, 9, 26, 12)));
    const chart = vi.mocked(echarts.init).mock.results.at(-1)!.value;
    const opt = vi.mocked(chart.setOption).mock.calls.at(-1)![0];

    expect(opt.title.subtext).toContain('2026-10-26 12:00:00');
    expect(opt.title.subtext).toContain('UTC');
  });
});
