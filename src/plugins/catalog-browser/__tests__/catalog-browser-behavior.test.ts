/* eslint-disable camelcase */
import { CatalogLoader } from '@app/app/data/catalog-loader';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { CatalogBrowserPlugin } from '@app/plugins/catalog-browser/catalog-browser';
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
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('1 25544U\n2 25544') })));
    const reloadSpy = vi.spyOn(CatalogLoader, 'reloadCatalog').mockResolvedValue(undefined as never);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    await p().fetchAndLoadCatalog_('GROUP=active');

    expect(reloadSpy).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalled();
  });

  it('fetchAndLoadCatalog_ surfaces a forbidden error as a caution toast', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('') })));
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    await p().fetchAndLoadCatalog_('GROUP=active');

    expect(toastSpy).toHaveBeenCalledWith(expect.anything(), ToastMsgType.caution);
  });
});
