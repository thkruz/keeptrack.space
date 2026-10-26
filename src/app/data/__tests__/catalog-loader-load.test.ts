import * as apiFetchMod from '@app/app/data/api-fetch';
import { CatalogLoader } from '@app/app/data/catalog-loader';
import { orgDataService } from '@app/app/data/catalogs/org-data-service';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CL = CatalogLoader as any;

const makeSettings = (over: Record<string, unknown> = {}) => ({
  dataSources: {
    tle: 'https://api.keeptrack.space/v4/sats',
    tleDebris: 'https://example.test/debris',
    externalTLEs: '',
    externalTLEsOnly: false,
    isSupplementExternal: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...((over.dataSources as any) ?? {}),
  },
  limitSats: '',
  isUseDebrisCatalog: false,
  offlineMode: false,
  isEnableJscCatalog: false,
  isDisableExtraCatalog: true,
  isDisableAsciiCatalog: true,
  installDirectory: '/',
  ...over,
});

const okResponse = (body: unknown = [], text = '') => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(text),
});

describe('CatalogLoader.load orchestration', () => {
  let parseSpy: ReturnType<typeof vi.spyOn>;
  let apiFetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setupStandardEnvironment();
    vi.spyOn(orgDataService, 'init').mockImplementation(() => undefined as never);
    parseSpy = vi.spyOn(CatalogLoader, 'parse').mockResolvedValue(undefined as never);
    apiFetchSpy = vi.spyOn(apiFetchMod, 'apiFetch').mockResolvedValue(okResponse() as never);
    // Default fetch returns not-ok so the ascii/external getters short-circuit.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(okResponse()))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const setSettings = (over: Record<string, unknown> = {}) => {
    const s = makeSettings(over);

    window.settingsManager = s as never;
    (globalThis as { settingsManager?: unknown }).settingsManager = s;
  };

  it('loads the primary catalog by default and rewrites the api URL with format', async () => {
    setSettings({ limitSats: '25544' });

    await CatalogLoader.load();

    expect(apiFetchSpy).toHaveBeenCalled();
    // The api.keeptrack.space URL gets the limitSats + ?format=keeptrack suffix.
    expect(apiFetchSpy.mock.calls[0][0] as string).toContain('format=keeptrack');
    expect(parseSpy).toHaveBeenCalled();
  });

  it('loads external-only when externalTLEsOnly is set', async () => {
    setSettings({ dataSources: { externalTLEs: 'https://x/tle', externalTLEsOnly: true } });

    await CatalogLoader.load();

    expect(parseSpy).toHaveBeenCalled();
    // Without isSupplementExternal it parses the external catalog directly (no apiFetch).
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it('supplements the external catalog with the keeptrack db when isSupplementExternal', async () => {
    setSettings({ dataSources: { externalTLEs: 'https://x/tle', externalTLEsOnly: true, isSupplementExternal: true } });

    await CatalogLoader.load();

    expect(apiFetchSpy).toHaveBeenCalled();
    expect(parseSpy).toHaveBeenCalled();
  });

  it('loads the debris catalog when isUseDebrisCatalog is set', async () => {
    setSettings({ isUseDebrisCatalog: true });

    await CatalogLoader.load();

    expect(apiFetchSpy.mock.calls[0][0] as string).toContain('debris');
  });

  it('loads from the install directory in offline mode', async () => {
    setSettings({ offlineMode: true });

    await CatalogLoader.load();

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('tle/tle.json'));
    expect(parseSpy).toHaveBeenCalled();
  });

  it('falls back to the offline catalog when the primary fetch returns 401', async () => {
    apiFetchSpy.mockResolvedValue({ ...okResponse(), status: 401 } as never);
    setSettings();

    await CatalogLoader.load();

    // The 401 throws "Failed to fetch" and the catch fetches the local tle.json.
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('tle/tle.json'));
  });

  describe('live catalog swap', () => {
    it('at boot (nothing propagated yet) loads directly, without the swap scaffolding', async () => {
      setSettings({ cruncherReady: false });
      const reloadSpy = vi.spyOn(CL, 'reloadWith_');

      await CatalogLoader.load();

      expect(reloadSpy).not.toHaveBeenCalled();
      expect(parseSpy).toHaveBeenCalled();
    });

    it('after boot routes through the reload scaffolding (deselect, rebuild, catalogReloaded)', async () => {
      setSettings({ cruncherReady: true });
      const reloadSpy = vi.spyOn(CL, 'reloadWith_').mockImplementation(async (runParse: unknown) => {
        await (runParse as () => Promise<void>)();
      });

      await CatalogLoader.load();

      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(parseSpy).toHaveBeenCalledTimes(1);
    });

    it('the scaffolding deselects and emits catalogReloaded only once the new positions arrive', async () => {
      const { EventBus } = await import('@app/engine/events/event-bus');
      const { EventBusEvent } = await import('@app/engine/events/event-bus-events');
      const { PluginRegistry } = await import('@app/engine/core/plugin-registry');
      const { ServiceLocator } = await import('@app/engine/core/service-locator');

      setSettings({ cruncherReady: true });
      const selectSat = vi.fn();

      vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat } as never);
      const orbitManager = ServiceLocator.getOrbitManager();

      for (const fn of ['clearSelectOrbit', 'clearHoverOrbit', 'clearInViewOrbit', 'resetForCatalogSwap'] as const) {
        vi.spyOn(orbitManager, fn as never).mockImplementation((() => undefined) as never);
      }
      (orbitManager as unknown as { orbitCache: Map<number, unknown> }).orbitCache = new Map();
      vi.spyOn(ServiceLocator, 'getHoverManager').mockReturnValue({ setHoverId: vi.fn() } as never);
      vi.spyOn(ServiceLocator.getDotsManager(), 'resetForCatalogSwap').mockImplementation(() => undefined as never);
      vi.spyOn(ServiceLocator.getDotsManager(), 'initBuffers').mockImplementation(() => undefined as never);
      vi.spyOn(ServiceLocator.getColorSchemeManager(), 'resetForCatalogSwap').mockImplementation(() => undefined as never);
      const reloaded = vi.fn();

      EventBus.getInstance().on(EventBusEvent.catalogReloaded, reloaded);

      await CatalogLoader.load();

      expect(selectSat).toHaveBeenCalledWith(-1);
      expect(parseSpy).toHaveBeenCalledTimes(1);
      expect(reloaded).not.toHaveBeenCalled();

      EventBus.getInstance().emit(EventBusEvent.onCruncherReady);

      expect(reloaded).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CatalogLoader.getAdditionalCatalogs_', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(okResponse()))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns extraSats only in offline mode with the extra catalog enabled', () => {
    const result = CL.getAdditionalCatalogs_(makeSettings({ offlineMode: true, isDisableExtraCatalog: false }));

    expect(result.extraSats).not.toBeNull();
  });

  it('returns asciiCatalog when external TLEs are off and ascii is enabled', () => {
    const result = CL.getAdditionalCatalogs_(makeSettings({ isDisableAsciiCatalog: false }));

    expect(result.asciiCatalog).not.toBeNull();
  });

  it('returns jsCatalog when the JSC catalog is enabled', () => {
    const result = CL.getAdditionalCatalogs_(makeSettings({ isEnableJscCatalog: true }));

    expect(result.jsCatalog).not.toBeNull();
  });

  it('returns externalCatalog when external TLEs are configured', () => {
    const result = CL.getAdditionalCatalogs_(makeSettings({ dataSources: { externalTLEs: 'https://x/tle' } }));

    expect(result.externalCatalog).not.toBeNull();
  });
});

describe('CatalogLoader fetch-based getters', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('getAsciiCatalog_ parses a two-line TLE text file', async () => {
    const tle1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991';
    const tle2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053';

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(okResponse([], `${tle1}\n${tle2}`)))
    );

    const out = await CL.getAsciiCatalog_(makeSettings());

    expect(out.length).toBeGreaterThan(0);
    expect(out[0].SCC).toBe('25544');
  });

  it('getExternalCatalog_ reverts to internal TLEs when the fetch is not ok', async () => {
    const settings = makeSettings({ dataSources: { externalTLEs: 'https://x/tle' } });

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false }))
    );

    const out = await CL.getExternalCatalog_(settings);

    expect(out).toEqual([]);
    expect(settings.dataSources.externalTLEs).toBe('');
  });

  it('getExternalCatalog_ parses a 3LE external file', async () => {
    const name = 'ISS (ZARYA)';
    const tle1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991';
    const tle2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053';

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(okResponse([], `${name}\n${tle1}\n${tle2}`)))
    );

    const out = await CL.getExternalCatalog_(makeSettings({ dataSources: { externalTLEs: 'https://x/tle' } }));

    expect(Array.isArray(out)).toBe(true);
  });
});
