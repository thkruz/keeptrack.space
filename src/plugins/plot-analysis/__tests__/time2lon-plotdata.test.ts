/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatMathApi } from '@app/engine/math/sat-math-api';
import { Time2LonPlots } from '@app/plugins/plot-analysis/time2lon';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CatalogSource, PayloadStatus, SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const NOW = Date.UTC(2026, 4, 31);

const baseFilters = (over: Record<string, unknown> = {}) => ({
  activePayloads: true,
  inactivePayloads: false,
  rocketBodies: false,
  debris: false,
  celestrak: true,
  vimpel: false,
  minInclination: 0,
  maxInclination: 10,
  maxEccentricity: 0.1,
  minPeriod: 1340,
  maxPeriod: 1540,
  samplePoints: 24,
  maxTimeMin: 1440,
  ...over,
});

const geoSat = (over: Record<string, unknown> = {}) => ({
  isSatellite: () => true,
  type: SpaceObjectType.PAYLOAD,
  status: PayloadStatus.OPERATIONAL,
  eccentricity: 0.001,
  period: 1436,
  inclination: 5,
  source: CatalogSource.CELESTRAK,
  country: 'US',
  name: 'GEOSAT',
  id: 1,
  ...over,
});

describe('Time2LonPlots getPlotDataAsync_', () => {
  let plugin: Time2LonPlots;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  const stubCatalog = (sats: unknown[]) => {
    const catalog = ServiceLocator.getCatalogManager();

    (catalog as unknown as { objectCache: unknown[] }).objectCache = sats;
    vi.spyOn(catalog, 'getObject').mockImplementation((i: number) => sats[i] as never);
    const tm = ServiceLocator.getTimeManager();

    (tm as unknown as { simulationTimeObj: Date }).simulationTimeObj = new Date(NOW);
  };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new Time2LonPlots();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    // One in-window point, one in the past, one beyond the horizon.
    vi.spyOn(SatMathApi, 'getLlaOfCurrentOrbit').mockReturnValue([
      { time: NOW + 60_000, lon: 100, lat: 0, alt: 35786 },
      { time: NOW - 60_000, lon: 110, lat: 0, alt: 35786 },
      { time: NOW + 5_000 * 60_000, lon: 120, lat: 0, alt: 35786 },
    ] as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns one line per GEO payload, keeping only in-window points', async () => {
    stubCatalog([geoSat()]);

    const data = await p().getPlotDataAsync_(baseFilters());

    expect(data).toHaveLength(1);
    expect(data[0].satName).toBe('GEOSAT');
    expect(data[0].points).toHaveLength(1);
    expect(data[0].country).toBeDefined();
  });

  it('excludes payloads when no payload type is selected', async () => {
    stubCatalog([geoSat()]);

    const data = await p().getPlotDataAsync_(baseFilters({ activePayloads: false, inactivePayloads: false }));

    expect(data).toHaveLength(0);
  });

  it('drops non-satellites, high-eccentricity, off-period and out-of-inclination objects', async () => {
    stubCatalog([
      { isSatellite: () => false },
      geoSat({ eccentricity: 0.5 }),
      geoSat({ period: 95 }),
      geoSat({ inclination: 60 }),
    ]);

    const data = await p().getPlotDataAsync_(baseFilters());

    expect(data).toHaveLength(0);
  });

  it('honors the active/inactive payload status filters', async () => {
    stubCatalog([geoSat({ status: PayloadStatus.NONOPERATIONAL })]);

    // Inactive sat excluded when only active payloads are requested...
    const activeOnly = await p().getPlotDataAsync_(baseFilters({ activePayloads: true, inactivePayloads: false }));

    expect(activeOnly).toHaveLength(0);

    // ...but included when inactive payloads are requested.
    const inactive = await p().getPlotDataAsync_(baseFilters({ activePayloads: false, inactivePayloads: true }));

    expect(inactive).toHaveLength(1);
  });

  it('applies the VIMPEL source filter', async () => {
    stubCatalog([geoSat({ source: CatalogSource.VIMPEL })]);

    const withoutVimpel = await p().getPlotDataAsync_(baseFilters({ vimpel: false }));

    expect(withoutVimpel).toHaveLength(0);

    const withVimpel = await p().getPlotDataAsync_(baseFilters({ vimpel: true, celestrak: true }));

    expect(withVimpel).toHaveLength(1);
  });
});

describe('Time2LonPlots onBottomIconDeselect', () => {
  let plugin: Time2LonPlots;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new Time2LonPlots();
    websiteInit(plugin);
  });

  afterEach(() => vi.restoreAllMocks());

  it('detaches the resize handler when no chart is present', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    p().chart = null;
    p().resizeHandler_ = () => undefined;

    plugin.onBottomIconDeselect();

    expect(p().resizeHandler_).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
