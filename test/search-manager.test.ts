import { keepTrackApi } from '@app/keepTrackApi';
import { CatalogManager } from '@app/singletons/catalog-manager';
import { ColorSchemeManager } from '@app/singletons/color-scheme-manager';
import { DotsManager } from '@app/singletons/dots-manager';
import { GroupsManager } from '@app/singletons/groups-manager';
import { SearchManager } from '@app/singletons/search-manager';
import { UiManager } from '@app/singletons/uiManager';
import { DetailedSatellite } from 'ootk';
import { defaultSat } from './environment/apiMocks';

describe('SearchManager', () => {
  let searchManager: SearchManager;
  let mockUiManager: UiManager;

  beforeEach(() => {
    mockUiManager = {
      hideSideMenus: jest.fn(),
      searchHoverSatId: -1,
    } as unknown as UiManager;

    document.body.innerHTML = `
      <div id="ui-wrapper">
        <div id="search-holder"></div>
        <input id="search" />
        <div id="search-results"></div>
        <div id="search-icon"></div>
      </div>
    `;

    searchManager = new SearchManager(mockUiManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    jest.spyOn(searchManager, 'doSearch');

    searchManager.openSearch();
    expect(searchManager.isSearchOpen).toBe(true);
    expect(searchManager.doSearch).toHaveBeenCalledWith('test');
  });

  it('should close search and hide results', () => {
    jest.spyOn(searchManager, 'hideResults');

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
      updateSizeBuffer: jest.fn(),
    } as unknown as DotsManager;
    const mockGroupManager = {
      clearSelect: jest.fn(),
    } as unknown as GroupsManager;
    const mockColorSchemeManager = {
      calculateColorBuffers: jest.fn(),
    } as unknown as ColorSchemeManager;

    jest.spyOn(keepTrackApi, 'getCatalogManager').mockReturnValue(mockCatalogManager);
    jest.spyOn(keepTrackApi, 'getDotsManager').mockReturnValue(mockDotsManager);
    jest.spyOn(keepTrackApi, 'getGroupsManager').mockReturnValue(mockGroupManager);
    jest.spyOn(keepTrackApi, 'getColorSchemeManager').mockReturnValue(mockColorSchemeManager);

    searchManager.hideResults();

    expect(mockGroupManager.clearSelect).toHaveBeenCalled();
    expect(mockDotsManager.updateSizeBuffer).toHaveBeenCalledWith(mockCatalogManager.objectCache.length);
    expect(mockColorSchemeManager.calculateColorBuffers).toHaveBeenCalledWith(true);
  });

  it('should perform a search and populate results', () => {
    const mockCatalogManager = {
      objectCache: [
        new DetailedSatellite({ ...defaultSat, id: 0, name: 'Satellite A' }),
        new DetailedSatellite({ ...defaultSat, id: 1, name: 'Satellite B' }),
      ],
      getObject: jest.fn().mockReturnValue(new DetailedSatellite({ ...defaultSat, id: 0, name: 'Satellite A' })),
    } as unknown as CatalogManager;
    const mockDotsManager = {
      updateSizeBuffer: jest.fn(),
    } as unknown as DotsManager;
    const mockGroupManager = {
      createGroup: jest.fn().mockReturnValue({}),
      selectGroup: jest.fn(),
    } as unknown as GroupsManager;

    jest.spyOn(keepTrackApi, 'getCatalogManager').mockReturnValue(mockCatalogManager);
    jest.spyOn(keepTrackApi, 'getDotsManager').mockReturnValue(mockDotsManager);
    jest.spyOn(keepTrackApi, 'getGroupsManager').mockReturnValue(mockGroupManager);

    searchManager.doSearch('Satellite');

    expect(mockDotsManager.updateSizeBuffer).toHaveBeenCalledWith(mockCatalogManager.objectCache.length);
    expect(mockGroupManager.createGroup).toHaveBeenCalled();
    expect(mockGroupManager.selectGroup).toHaveBeenCalled();
  });

  it('should handle empty search input gracefully', () => {
    jest.spyOn(searchManager, 'hideResults');

    searchManager.doSearch('');
    expect(searchManager.hideResults).toHaveBeenCalled();
  });
});
