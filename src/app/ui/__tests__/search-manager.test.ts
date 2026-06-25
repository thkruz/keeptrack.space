import { vi } from 'vitest';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { GroupsManager } from '@app/app/data/groups-manager';
import { SearchManager, SearchResultType } from '@app/app/ui/search-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { DotsManager } from '@app/engine/rendering/dots-manager';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { settingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import { defaultMisl, defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('SearchManager', () => {
  let searchManager: SearchManager;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="ui-wrapper">
        <div id="search-holder"></div>
        <input id="search" />
        <div id="search-results"></div>
        <div id="search-icon"></div>
      </div>
    `;

    searchManager = new SearchManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should toggle search open and close', () => {
    searchManager.toggleSearch();
    expect(searchManager.isSearchOpen).toBe(true);
    expect(document.getElementById('search-holder')?.classList.contains('search-slide-down')).toBe(true);

    searchManager.toggleSearch();
    expect(searchManager.isSearchOpen).toBe(false);
    expect(document.getElementById('search-holder')?.classList.contains('search-slide-up')).toBe(true);
  });

  it('should open search and perform search if input exists', () => {
    const searchInput = document.getElementById('search') as HTMLInputElement;

    searchInput.value = 'test';

    vi.spyOn(searchManager, 'doSearch');

    searchManager.openSearch();
    expect(searchManager.isSearchOpen).toBe(true);
    expect(searchManager.doSearch).toHaveBeenCalledWith('test');
  });

  it('should close search and hide results', () => {
    vi.spyOn(searchManager, 'hideResults');

    searchManager.openSearch();
    expect(searchManager.isSearchOpen).toBe(true);
    searchManager.closeSearch();
    expect(searchManager.isSearchOpen).toBe(false);
    expect(searchManager.hideResults).toHaveBeenCalled();
  });

  it('should hide results and clear search state', () => {
    const mockCatalogManager = {
      objectCache: [],
    } as unknown as CatalogManager;
    const mockDotsManager = {
      updateSizeBuffer: vi.fn(),
    } as unknown as DotsManager;
    const mockGroupManager = {
      clearSelect: vi.fn(),
    } as unknown as GroupsManager;
    const mockColorSchemeManager = {
      calculateColorBuffers: vi.fn(),
    } as unknown as ColorSchemeManager;

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue(mockCatalogManager);
    vi.spyOn(ServiceLocator, 'getDotsManager').mockReturnValue(mockDotsManager);
    vi.spyOn(ServiceLocator, 'getGroupsManager').mockReturnValue(mockGroupManager);
    vi.spyOn(ServiceLocator, 'getColorSchemeManager').mockReturnValue(mockColorSchemeManager);

    searchManager.hideResults();

    expect(mockGroupManager.clearSelect).toHaveBeenCalled();
    expect(mockDotsManager.updateSizeBuffer).toHaveBeenCalledWith(mockCatalogManager.objectCache.length);
    expect(mockColorSchemeManager.calculateColorBuffers).toHaveBeenCalledWith(true);
  });

  it('should perform a search and populate results', () => {
    const mockCatalogManager = {
      objectCache: [
        new Satellite({ ...defaultSat, id: 0, name: 'Satellite A' }),
        new Satellite({ ...defaultSat, id: 1, name: 'Satellite B' }),
      ],
      getObject: vi.fn().mockReturnValue(new Satellite({ ...defaultSat, id: 0, name: 'Satellite A' })),
    } as unknown as CatalogManager;
    const mockDotsManager = {
      updateSizeBuffer: vi.fn(),
    } as unknown as DotsManager;
    const mockGroupManager = {
      createGroup: vi.fn().mockReturnValue({}),
      selectGroup: vi.fn(),
    } as unknown as GroupsManager;

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue(mockCatalogManager);
    vi.spyOn(ServiceLocator, 'getDotsManager').mockReturnValue(mockDotsManager);
    vi.spyOn(ServiceLocator, 'getGroupsManager').mockReturnValue(mockGroupManager);

    searchManager.doSearch('Satellite');

    expect(mockDotsManager.updateSizeBuffer).toHaveBeenCalledWith(mockCatalogManager.objectCache.length);
    expect(mockGroupManager.createGroup).toHaveBeenCalled();
    expect(mockGroupManager.selectGroup).toHaveBeenCalled();
  });

  it('should handle empty search input gracefully', () => {
    vi.spyOn(searchManager, 'hideResults');

    searchManager.doSearch('');
    expect(searchManager.hideResults).toHaveBeenCalled();
  });

  // Numeric-only search drives the dropdown when users paste a list of NORAD
  // IDs. The fix on commit 5adefb87 made sccNum6 the matchKey so 6-digit IDs
  // (alpha-5 6-digit form, supplemental CelesTrak ranges) match too — but
  // we also need to confirm 9-digit extended IDs and the alpha-5 6-digit
  // equivalent both find the right sat.
  describe('numeric-only search across all sccNum forms', () => {
    let sats: Satellite[];

    const buildCatalog = (testSats: Satellite[]) => ({
      objectCache: testSats,
      numSatellites: testSats.length,
      getObject: (id: number) => testSats[id],
    }) as unknown as CatalogManager;

    const wireUpServiceLocator = (catalog: CatalogManager) => {
      vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue(catalog);
      vi.spyOn(ServiceLocator, 'getDotsManager').mockReturnValue({
        updateSizeBuffer: vi.fn(),
        inViewData: new Int8Array(sats.length),
      } as unknown as DotsManager);
      vi.spyOn(ServiceLocator, 'getGroupsManager').mockReturnValue({
        createGroup: vi.fn().mockReturnValue({}),
        selectGroup: vi.fn(),
      } as unknown as GroupsManager);
    };

    beforeEach(() => {
      settingsManager.minimumSearchCharacters = 0;
      settingsManager.searchLimit = 100;
      settingsManager.lastSearch = [];
      settingsManager.lastSearchResults = [];
      settingsManager.searchableFields = { name: true, altName: true, bus: true, noradId: true, intlDes: true, launchVehicle: true };
    });

    it('finds a 5-digit sat by its sccNum', () => {
      sats = [new Satellite({ ...defaultSat, id: 0, sccNum: '25544' })];
      wireUpServiceLocator(buildCatalog(sats));

      searchManager.doSearch('25544');
      expect(settingsManager.lastSearchResults).toEqual([0]);
    });

    it('finds an alpha-5 sat via its 6-digit numeric form (sccNum6)', () => {
      // For an alpha-5 sat constructed via fromOmm-style with sccNum='T0001',
      // sccNum5='T0001' and sccNum6='270001'. The numeric-only search box
      // accepts digit-only input only, so the user types "270001" to find it.
      sats = [new Satellite({ ...defaultSat, id: 0, sccNum: 'T0001' })];
      wireUpServiceLocator(buildCatalog(sats));

      searchManager.doSearch('270001');
      expect(settingsManager.lastSearchResults).toEqual([0]);
    });

    it('finds a 9-digit extended sat via its full canonical sccNum', () => {
      // sccNum6 is null for extended; the matchKey fallback chain (sccNum6
      // ?? sccNum) lands on sccNum so the lookup still succeeds.
      sats = [new Satellite({ ...defaultSat, id: 0, sccNum: '799500766' })];
      wireUpServiceLocator(buildCatalog(sats));

      searchManager.doSearch('799500766');
      expect(settingsManager.lastSearchResults).toEqual([0]);
    });

    it('finds an extended sat by a partial substring of its sccNum', () => {
      sats = [new Satellite({ ...defaultSat, id: 0, sccNum: '799500766' })];
      wireUpServiceLocator(buildCatalog(sats));

      // Substring of the canonical sccNum should hit via indexOf.
      searchManager.doSearch('500766');
      expect(settingsManager.lastSearchResults).toEqual([0]);
    });

    it('handles a comma-separated mix of all three forms in one search', () => {
      sats = [
        new Satellite({ ...defaultSat, id: 0, sccNum: '25544' }),
        new Satellite({ ...defaultSat, id: 1, sccNum: 'T0001' }),
        new Satellite({ ...defaultSat, id: 2, sccNum: '799500766' }),
      ];
      wireUpServiceLocator(buildCatalog(sats));

      // For T0001 the numeric matcher only matches via sccNum6 ("270001"),
      // so the user supplies digit-only forms for each.
      searchManager.doSearch('25544,270001,799500766');
      expect(settingsManager.lastSearchResults.sort((a, b) => a - b)).toEqual([0, 1, 2]);
    });

    it('respects the NORAD ID field toggle for numeric searches', () => {
      sats = [new Satellite({ ...defaultSat, id: 0, sccNum: '25544' })];
      wireUpServiceLocator(buildCatalog(sats));

      // With NORAD ID matching disabled, a pure-number search must not hit the
      // sccNum (it falls through to the regular search, which checks other fields).
      settingsManager.searchableFields = { ...settingsManager.searchableFields, noradId: false };
      searchManager.doSearch('25544');
      expect(settingsManager.lastSearchResults).toEqual([]);

      // Re-enabling finds it again.
      settingsManager.searchableFields = { ...settingsManager.searchableFields, noradId: true };
      searchManager.doSearch('25544');
      expect(settingsManager.lastSearchResults).toEqual([0]);
    });

    it('does not crash when a satellite has an undefined sccNum (defensive coverage)', () => {
      // Some catalog paths can leave sccNum empty for a brief window after
      // catalog reload. Pre-fix, the sort compare called localeCompare on
      // undefined and crashed; the null-safe fallback now handles it.
      const bareSat = new Satellite({ ...defaultSat, id: 0, sccNum: '25544' });

      // Simulate the post-reload state by clearing sccNum on the live object.
      (bareSat as unknown as { sccNum: string | undefined }).sccNum = undefined;
      (bareSat as unknown as { sccNum6: string | null }).sccNum6 = null;
      sats = [bareSat, new Satellite({ ...defaultSat, id: 1, sccNum: '99999' })];
      wireUpServiceLocator(buildCatalog(sats));

      expect(() => searchManager.doSearch('99999')).not.toThrow();
    });
  });
});

describe('SearchManager interactions', () => {
  let mgr: SearchManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => mgr as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, TopMenu]);
    // Provide the search DOM the interactive paths read, as queryable body nodes.
    for (const id of ['ui-wrapper', 'search-holder', 'search', 'search-results', 'search-icon']) {
      document.getElementById(id)?.remove();
    }
    document.body.insertAdjacentHTML('beforeend',
      '<div id="ui-wrapper"></div><div id="search-holder"></div><input id="search" />' +
      '<div id="search-results"></div><div id="search-icon"></div>');
    // jsdom does not implement scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
    mgr = new SearchManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('init wires the top-menu button and keyboard shortcut without throwing', () => {
    expect(() => mgr.init()).not.toThrow();

    const topMenu = PluginRegistry.getPlugin(TopMenu);

    expect(topMenu?.navItems.some((n) => n.id === 'search-btn')).toBe(true);
  });

  it('doArraySearch builds a comma-separated list of sccNums', () => {
    const catalog = {
      objectCache: [
        new Satellite({ ...defaultSat, id: 0, sccNum: '00005' }),
        new Satellite({ ...defaultSat, id: 1, sccNum: '25544' }),
      ],
    } as unknown as CatalogManager;

    // The Satellite constructor normalizes leading zeros: '00005' -> '5'.
    expect(SearchManager.doArraySearch(catalog, [0, 1])).toBe('5,25544');
  });

  it('getCurrentSearch reflects the input only when results are open', () => {
    (document.getElementById('search') as HTMLInputElement).value = 'ISS';

    mgr.isResultsOpen = false;
    expect(mgr.getCurrentSearch()).toBe('');

    mgr.isResultsOpen = true;
    expect(mgr.getCurrentSearch()).toBe('ISS');
  });

  it('getLastResultGroup returns the cached group', () => {
    const group = { foo: 'bar' };

    p().lastResultGroup_ = group;
    expect(mgr.getLastResultGroup()).toBe(group);
  });

  it('fillResultBox renders a highlighted row for each search-result type', () => {
    const sat = new Satellite({ ...defaultSat, id: 0, sccNum: '25544', intlDes: '1998-067A', launchVehicle: 'Proton-K' });

    Object.assign(sat, { altName: 'ZARYA', bus: 'BoeingBus' });
    ServiceLocator.getCatalogManager().objectCache = [sat, defaultMisl] as never;
    ServiceLocator.getDotsManager().positionData = null as never;

    const results = [
      { id: 0, searchType: SearchResultType.OBJECT_NAME, strIndex: 0, patlen: 3 },
      { id: 0, searchType: SearchResultType.NORAD_ID, strIndex: 0, patlen: 5 },
      { id: 0, searchType: SearchResultType.INTLDES, strIndex: 0, patlen: 4 },
      { id: 0, searchType: SearchResultType.ALT_NAME, strIndex: 0, patlen: 2 },
      { id: 0, searchType: SearchResultType.LAUNCH_VEHICLE, strIndex: 0, patlen: 6 },
      { id: 0, searchType: SearchResultType.BUS, strIndex: 0, patlen: 6 },
      { id: 1, searchType: SearchResultType.MISSILE, strIndex: 0, patlen: 5 },
      { id: 0, searchType: SearchResultType.STAR, strIndex: 0, patlen: 4 },
    ];

    expect(() => mgr.fillResultBox(results, ServiceLocator.getCatalogManager(), 50)).not.toThrow();

    const rows = document.getElementById('search-results')!.querySelectorAll('.search-result');

    expect(rows.length).toBe(results.length);
    // totalFound (50) > results.length renders the "showing N of M" banner.
    expect(document.getElementById('search-results')!.querySelector('.search-result-limit')).not.toBeNull();
  });

  it('addListeners_ routes the input event to doSearch and the icon click to toggleSearch', () => {
    p().addListeners_();
    const searchSpy = vi.spyOn(mgr, 'doSearch').mockImplementation(() => undefined);
    const toggleSpy = vi.spyOn(mgr, 'toggleSearch').mockImplementation(() => undefined);

    (document.getElementById('search') as HTMLInputElement).value = 'abc';
    document.getElementById('search')!.dispatchEvent(new Event('input'));
    expect(searchSpy).toHaveBeenCalledWith('abc');

    document.getElementById('search-icon')!.dispatchEvent(new Event('click'));
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('keyboard ArrowDown selects the first result row', () => {
    document.getElementById('search-results')!.innerHTML =
      '<div class="search-result" data-obj-id="0"></div><div class="search-result" data-obj-id="1"></div>';
    p().addListeners_();

    const evt = new KeyboardEvent('keydown', { key: 'ArrowDown' });

    document.getElementById('search')!.dispatchEvent(evt);

    expect(p().selectedIndex_).toBe(0);
  });

  it('updateSelectedResult_ marks the selected row and updates hover', () => {
    document.getElementById('search-results')!.innerHTML =
      '<div class="search-result" data-obj-id="7"></div><div class="search-result" data-obj-id="9"></div>';
    const rows = document.querySelectorAll('.search-result');

    rows.forEach((r) => {
      (r as HTMLElement).scrollIntoView = vi.fn();
    });
    vi.spyOn(ServiceLocator, 'getHoverManager').mockReturnValue({ setHoverId: vi.fn() } as never);
    p().selectedIndex_ = 1;
    p().updateSelectedResult_(rows);

    expect((rows[1] as HTMLElement).classList.contains('search-result--selected')).toBe(true);
  });
});
