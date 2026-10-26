/* eslint-disable camelcase */
import { CatalogLoader } from '@app/app/data/catalog-loader';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { CatalogBrowserPlugin } from '@app/plugins/catalog-browser/catalog-browser';
import { CatalogEntry } from '@app/plugins/catalog-browser/catalog-browser-data';
import { CelesTrakNoDataError } from '@app/plugins/catalog-browser/celestrak-no-data-error';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const fakeSat = (over: Record<string, unknown> = {}) => ({
  isSatellite: () => true,
  tle1: '1 25544U ...',
  tle2: '2 25544 ...',
  name: 'ISS',
  sccNum: '25544',
  rcs: 99.05,
  ...over,
});

const ACTIVE_ENTRY: CatalogEntry = { id: 'active', queryParam: 'GROUP=active', nameKey: 'active' };
const ISS_ENTRY: CatalogEntry = { id: 'iss-supgp', queryParam: 'FILE=iss', nameKey: 'iss' };

/** A swap mock that finishes the way the real loader does: catalogReloaded once the worker is ready. */
const reloadThatSettles = () => {
  EventBus.getInstance().emit(EventBusEvent.catalogReloaded);

  return Promise.resolve();
};

describe('CatalogBrowserPlugin behavior', () => {
  let plugin: CatalogBrowserPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new CatalogBrowserPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('classifyFetchError_', () => {
    it('maps known HTTP statuses to transient cautions', () => {
      expect(p().classifyFetchError_({ status: 403 }).isTransient).toBe(true);
      expect(p().classifyFetchError_({ status: 403 }).toastType).toBe(ToastMsgType.caution);
      expect(p().classifyFetchError_({ status: 429 }).isTransient).toBe(true);
      expect(p().classifyFetchError_({ status: 503 }).isTransient).toBe(true);
    });

    it('maps a TypeError to a non-transient network error and other errors to a generic failure', () => {
      const network = p().classifyFetchError_(new TypeError('fetch failed'));

      expect(network.isTransient).toBe(false);
      expect(network.toastType).toBe(ToastMsgType.critical);

      const generic = p().classifyFetchError_(new Error('weird'));

      expect(generic.isTransient).toBe(false);
    });

    it('maps a CelesTrak no-data body to a transient caution (#1447)', () => {
      const noData = p().classifyFetchError_(new CelesTrakNoDataError('No GP data found'));

      expect(noData.isTransient).toBe(true);
      expect(noData.toastType).toBe(ToastMsgType.caution);
      expect(noData.messageKey).toBe('plugins.CatalogBrowserPlugin.errorMsgs.NoData');
    });
  });

  it('buildCelesTrackUrl_ picks the supplemental endpoint for FILE= queries', () => {
    expect(p().buildCelesTrackUrl_('GROUP=active')).toContain('NORAD/elements/gp.php?GROUP=active&FORMAT=3LE');
    expect(p().buildCelesTrackUrl_('FILE=starlink')).toContain('supplemental/sup-gp.php?FILE=starlink&FORMAT=3LE');
  });

  it('getCommandPaletteCommands includes the keeptrack catalogs and data-driven entries', () => {
    const commands = plugin.getCommandPaletteCommands();
    const ids = commands.map((c) => c.id);

    expect(ids).toContain('CatalogBrowserPlugin.load.default');
    expect(ids).toContain('CatalogBrowserPlugin.load.celestrak-only');
    expect(commands.length).toBeGreaterThan(3);
  });

  it('ensureCatalogCached_ snapshots satellites once', () => {
    ServiceLocator.getCatalogManager().objectCache = [fakeSat({ sccNum: '25544' }), { isSatellite: () => false }] as never;

    p().ensureCatalogCached_();
    expect(p().cachedCatalog_).toHaveLength(1);

    // Second call is a no-op (cache already present).
    const firstRef = p().cachedCatalog_;

    p().ensureCatalogCached_();
    expect(p().cachedCatalog_).toBe(firstRef);
  });

  it('mergeWithCache_ updates cached TLEs and appends new incoming satellites', () => {
    p().cachedCatalog_ = [{ tle1: 'old1', tle2: 'old2', name: 'ISS', sccNum: '25544' }];
    vi.spyOn(CatalogLoader, 'parseTceContent').mockReturnValue([
      { SCC: '25544', TLE1: 'new1', TLE2: 'new2', ON: 'ISS' },
      { SCC: '40000', TLE1: 'a1', TLE2: 'a2', ON: 'NEWSAT' },
    ] as never);
    vi.spyOn(CatalogLoader, 'canonicalSccKey').mockImplementation((scc: string) => scc);

    const merged = p().mergeWithCache_('whatever');

    expect(merged).toHaveLength(2);
    expect(merged.find((m: { sccNum?: string }) => m.sccNum === '25544').tle1).toBe('new1');
    expect(merged.find((m: { name: string }) => m.name === 'NEWSAT')).toBeDefined();
  });

  it('the orbital-data-only toggle updates the mode flag', () => {
    const toggle = getEl('cb-orbital-data-only') as HTMLInputElement;

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));

    expect(p().orbitalDataOnly_).toBe(true);
  });

  it('clicking a catalog list item dispatches to the matching loader', () => {
    const ktSpy = vi.spyOn(p(), 'loadKeepTrackCatalog_').mockResolvedValue(undefined);
    const fetchSpy = vi.spyOn(p(), 'fetchAndLoadCatalog_').mockResolvedValue(undefined);

    const list = getEl('cb-catalog-list')!;

    (list.querySelector('[data-query="DEFAULT"]') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ktSpy).toHaveBeenCalledWith('DEFAULT');

    const groupItem = list.querySelector('[data-query^="GROUP="]') as HTMLElement | null;

    if (groupItem) {
      groupItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(fetchSpy).toHaveBeenCalled();
    }
  });

  it('fetchAndLoadCatalog_ loads TLE content and toasts success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('1 25544U\n2 25544') }))
    );
    const reloadSpy = vi.spyOn(CatalogLoader, 'reloadCatalog').mockImplementation(reloadThatSettles);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    await p().fetchAndLoadCatalog_(ACTIVE_ENTRY);

    expect(reloadSpy).toHaveBeenCalled();
    // The toast names the source by its display name, not the raw query value ("active").
    expect(toastSpy).toHaveBeenCalledWith('Loaded Active Satellites', ToastMsgType.normal);
  });

  it('VIMPEL_ONLY routes parsed vimpel.json through reloadVimpelCatalog, not reloadCatalog', async () => {
    const vimpelData = [
      { TLE1: '1      V 12104    25007.20347222 +.00000000 +00000+0 +00000-0 0 29990', TLE2: '2       064.8350 009.7330 1627170 165.9900 359.1946 12.12185514 00010' },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(vimpelData) }))
    );
    const vimpelSpy = vi.spyOn(CatalogLoader, 'reloadVimpelCatalog').mockImplementation(reloadThatSettles);
    const asciiSpy = vi.spyOn(CatalogLoader, 'reloadCatalog').mockResolvedValue(undefined as never);

    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    await p().loadKeepTrackCatalog_('VIMPEL_ONLY');

    expect(vimpelSpy).toHaveBeenCalledWith(vimpelData);
    expect(asciiSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['All Data', false],
    ['Orbital Only', true],
  ])('fetchAndLoadCatalog_ (%s) toasts a caution and reports nothing when CelesTrak returns 200 with a non-TLE body (#1447)', async (_label, orbitalDataOnly) => {
    p().orbitalDataOnly_ = orbitalDataOnly;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('No GP data found\n') }))
    );
    const reloadSpy = vi.spyOn(CatalogLoader, 'reloadCatalog').mockResolvedValue(undefined as never);
    const reloadFromDataSpy = vi.spyOn(CatalogLoader, 'reloadCatalogFromData').mockResolvedValue(undefined as never);
    const errorSpy = vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    await p().fetchAndLoadCatalog_(ACTIVE_ENTRY);

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(reloadFromDataSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(expect.anything(), ToastMsgType.caution);
  });

  it('fetchAndLoadCatalog_ surfaces a forbidden error as a caution toast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('') }))
    );
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    await p().fetchAndLoadCatalog_(ACTIVE_ENTRY);

    expect(toastSpy).toHaveBeenCalledWith(expect.anything(), ToastMsgType.caution);
  });

  describe('catalog swaps (gap-batch-1 catalog-browser)', () => {
    let fakeSelectSat: { secondarySat: number; selectSat: ReturnType<typeof vi.fn>; setSecondarySat: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      vi.clearAllMocks();
      fakeSelectSat = { secondarySat: -1, selectSat: vi.fn(), setSecondarySat: vi.fn() };
      const realGetPlugin = PluginRegistry.getPlugin.bind(PluginRegistry);

      vi.spyOn(PluginRegistry, 'getPlugin').mockImplementation(((cls: unknown) =>
        cls === SelectSatManager ? fakeSelectSat : realGetPlugin(cls as never)) as typeof PluginRegistry.getPlugin);
      vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);
    });

    const currentRowIds = () => Array.from(getEl('cb-catalog-list')!.querySelectorAll<HTMLElement>('[aria-current="true"]')).map((row) => row.dataset.id);

    it('deselects the primary and secondary object before restoring the default catalog', async () => {
      fakeSelectSat.secondarySat = 7;
      const order: string[] = [];

      fakeSelectSat.selectSat.mockImplementation(() => order.push('deselect'));
      vi.spyOn(CatalogLoader, 'load').mockImplementation(() => {
        order.push('load');

        return reloadThatSettles();
      });
      vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      await p().loadKeepTrackCatalog_('DEFAULT');

      expect(fakeSelectSat.selectSat).toHaveBeenCalledWith(-1);
      expect(fakeSelectSat.setSecondarySat).toHaveBeenCalledWith(-1, true);
      expect(order).toEqual(['deselect', 'load']);
    });

    it.each(['DEFAULT', 'CELESTRAK_ONLY'])('%s reports success only after the worker has positions (catalogReloaded)', async (mode) => {
      vi.spyOn(CatalogLoader, 'load').mockResolvedValue(undefined);
      const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      const loading = p().loadKeepTrackCatalog_(mode);

      await vi.waitFor(() => expect(CatalogLoader.load).toHaveBeenCalled());
      await Promise.resolve();
      expect(toastSpy).not.toHaveBeenCalled();
      expect(p().isLoading_).toBe(true);

      EventBus.getInstance().emit(EventBusEvent.catalogReloaded);
      await loading;

      expect(toastSpy).toHaveBeenCalledWith(expect.any(String), ToastMsgType.normal);
      expect(p().isLoading_).toBe(false);
    });

    it('clears #search and its result rows on a swap', async () => {
      // Mirror the top-menu search markup (input#search + div#search-results).
      document.getElementById('search')?.remove();
      document.getElementById('search-results')?.remove();
      document.body.insertAdjacentHTML('beforeend', '<input id="search" /><div id="search-results"></div>');
      const searchInput = getEl('search') as HTMLInputElement;
      const results = getEl('search-results')!;

      searchInput.value = '25544';
      results.innerHTML = '<div class="search-result" data-obj-id="0">ISS (ZARYA)</div>';
      const doSearchSpy = vi.spyOn(ServiceLocator.getUiManager().searchManager, 'doSearch').mockImplementation(() => undefined);
      const closeSearchSpy = vi.spyOn(ServiceLocator.getUiManager().searchManager, 'closeSearch');

      vi.spyOn(CatalogLoader, 'load').mockImplementation(reloadThatSettles);
      vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      await p().loadKeepTrackCatalog_('DEFAULT');

      expect(searchInput.value).toBe('');
      expect(results.querySelectorAll('.search-result')).toHaveLength(0);
      expect(doSearchSpy).toHaveBeenCalledWith('');
      // closeSearch also hides every side menu, so the swap must not use it.
      expect(closeSearchSpy).not.toHaveBeenCalled();
    });

    it('marks the loaded catalog row and moves the marker on the next swap', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('1 25544U\n2 25544') }))
      );
      vi.spyOn(CatalogLoader, 'reloadCatalog').mockImplementation(reloadThatSettles);
      vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      // The default catalog is what boots.
      expect(currentRowIds()).toEqual(['default']);
      expect(getEl('cb-catalog-list')!.querySelector('[data-id="default"] .cb-chip-current')?.textContent).toBe('Current');

      await p().fetchAndLoadCatalog_(ISS_ENTRY);

      expect(currentRowIds()).toEqual(['iss-supgp']);
      expect(getEl('cb-catalog-list')!.querySelectorAll('.cb-chip-current')).toHaveLength(1);
      expect(getEl('cb-catalog-list')!.querySelector('[data-id="default"]')!.classList.contains('cb-catalog-item-current')).toBe(false);
    });

    it('drops the marker when another tool reloads the catalog', () => {
      EventBus.getInstance().emit(EventBusEvent.catalogReloaded);

      expect(currentRowIds()).toEqual([]);
    });

    it('a failed load keeps the marker on the previous catalog', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('') }))
      );
      vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      await p().fetchAndLoadCatalog_(ISS_ENTRY);

      expect(currentRowIds()).toEqual(['default']);
    });

    it.each([
      ['DEFAULT', 'Failed to restore default catalog'],
      ['CELESTRAK_ONLY', 'Failed to load the CelesTrak catalog'],
      ['VIMPEL_ONLY', 'Failed to load the JSC Vimpel catalog'],
    ])('a failing %s load names that source in the toast', async (mode, text) => {
      vi.spyOn(CatalogLoader, 'load').mockRejectedValue(new Error('boom'));
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve([]) }))
      );
      const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      await p().loadKeepTrackCatalog_(mode);

      expect(toastSpy).toHaveBeenCalledWith(text, ToastMsgType.critical);
    });

    it('reopens the menu when the swap deselection closed it', async () => {
      p().isMenuButtonActive = true;
      // Deselecting can make another plugin emit hideSideMenus, which closes this menu.
      fakeSelectSat.selectSat.mockImplementation(() => {
        p().isMenuButtonActive = false;
      });
      vi.spyOn(CatalogLoader, 'load').mockImplementation(reloadThatSettles);
      vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
      const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

      await p().loadKeepTrackCatalog_('DEFAULT');

      expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, 'menu-catalog-browser');
    });

    it('does not open the menu for a palette load made while it was closed', async () => {
      p().isMenuButtonActive = false;
      vi.spyOn(CatalogLoader, 'load').mockImplementation(reloadThatSettles);
      vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
      const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

      await p().loadKeepTrackCatalog_('DEFAULT');

      expect(emitSpy).not.toHaveBeenCalledWith(EventBusEvent.bottomMenuClick, expect.anything());
    });

    it('Orbital Only reports success only after the worker has positions for the merged catalog', async () => {
      p().orbitalDataOnly_ = true;
      p().cachedCatalog_ = [{ tle1: 'old1', tle2: 'old2', name: 'ISS (ZARYA)', country: 'ISS', sccNum: '25544' }];
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('E2E-ISS\n1 25544U\n2 25544') }))
      );
      vi.spyOn(CatalogLoader, 'parseTceContent').mockReturnValue([{ SCC: '25544', TLE1: 'new1', TLE2: 'new2', ON: 'E2E-ISS' }] as never);
      vi.spyOn(CatalogLoader, 'canonicalSccKey').mockImplementation((scc: string | number) => String(scc));
      const reloadSpy = vi.spyOn(CatalogLoader, 'reloadCatalogFromData').mockResolvedValue(undefined);
      const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      const loading = p().fetchAndLoadCatalog_(ISS_ENTRY);

      await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalled());
      // Merged with the cached metadata: the catalog name and country survive, the TLE is new.
      expect(reloadSpy.mock.calls[0][0]).toEqual([expect.objectContaining({ name: 'ISS (ZARYA)', country: 'ISS', tle1: 'new1', tle2: 'new2' })]);
      await Promise.resolve();
      expect(toastSpy).not.toHaveBeenCalled();
      expect(p().isLoading_).toBe(true);

      EventBus.getInstance().emit(EventBusEvent.catalogReloaded);
      await loading;

      expect(toastSpy).toHaveBeenCalledWith('Loaded ISS', ToastMsgType.normal);
      expect(p().isLoading_).toBe(false);
    });
  });
});
