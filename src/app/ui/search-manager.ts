import { GroupType, ObjectGroup } from '@app/app/data/object-group';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyboardComponent } from '@app/engine/plugins/components/keyboard/keyboard-component';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { BaseObject, Satellite, SpaceObjectType, Star, ZoomValue } from '@ootk/src/main';
import searchPng from '@public/img/icons/search.png';
import { settingsManager } from '@app/settings/settings';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl } from '../../engine/utils/get-el';
import { slideInDown, slideOutUp } from '../../engine/utils/slide';
import { TopMenu } from '../../plugins/top-menu/top-menu';
import { CatalogManager } from '../data/catalog-manager';
import { LaunchSite } from '../data/catalog-manager/LaunchFacility';
import { MissileObject } from '../data/catalog-manager/MissileObject';
import { runNumOnlySearch, runRegularSearch } from './search-query';

export interface SearchResult {
  id: number; // Catalog Index
  searchType: SearchResultType; // Type of search result
  strIndex: number; // Index of the search string in the name
  patlen: number; // Length of the search string
}

export enum SearchResultType {
  BUS,
  OBJECT_NAME,
  ALT_NAME,
  NORAD_ID,
  INTLDES,
  LAUNCH_VEHICLE,
  MISSILE,
  STAR,
  SENSOR,
  LAUNCH_SITE,
  PLANET,
}

/**
 * The `SearchManager` class is responsible for managing the search functionality in the UI.
 * It provides methods for performing searches, hiding search results, and retrieving information
 * about the current search state.
 */
const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  [SearchResultType.BUS]: 'BUS',
  [SearchResultType.OBJECT_NAME]: 'NAME',
  [SearchResultType.ALT_NAME]: 'ALT',
  [SearchResultType.NORAD_ID]: 'NORAD',
  [SearchResultType.INTLDES]: 'INTL',
  [SearchResultType.LAUNCH_VEHICLE]: 'LV',
  [SearchResultType.MISSILE]: 'MISSILE',
  [SearchResultType.STAR]: 'STAR',
  [SearchResultType.SENSOR]: 'SENSOR',
  [SearchResultType.LAUNCH_SITE]: 'SITE',
  [SearchResultType.PLANET]: 'PLANET',
};

export class SearchManager {
  isSearchOpen = false;
  isResultsOpen = false;
  private lastResultGroup_: ObjectGroup<GroupType> | null = null;
  private selectedIndex_ = -1;

  init() {
    const uiWrapper = getEl('ui-wrapper');
    const searchResults = document.createElement('div');

    searchResults.id = TopMenu.SEARCH_RESULT_ID;
    uiWrapper!.prepend(searchResults);

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.addListeners_.bind(this));

    this.setupTopMenu_();
    this.setupKeyboardShortcut_();
  }

  private setupKeyboardShortcut_() {
    const keyboard = new KeyboardComponent('SearchManager', [
      {
        key: 'F',
        ctrl: false,
        callback: () => {
          this.toggleSearch();
          if (this.isSearchOpen) {
            setTimeout(() => {
              getEl('search')?.focus();
            }, 200);
          }
        },
      },
    ]);

    keyboard.init();
  }

  private setupTopMenu_() {
    // This needs to happen immediately so the sound button is in the menu
    PluginRegistry.getPlugin(TopMenu)?.navItems.push({
      id: 'search-btn',
      order: 5,
      class: 'top-menu-icons__blue-img',
      icon: searchPng,
      tooltip: 'Search',
    });
  }

  private addListeners_() {
    getEl('search-results')?.addEventListener('click', (evt: Event) => {
      // Don't allow clicking on decayed results
      const targetEl = evt.target as HTMLElement;
      const resultEl = targetEl.closest('.search-result');

      if (resultEl?.classList.contains('search-result-decayed')) {
        return;
      }

      const satId = SearchManager.getSatIdFromSearchResults_(evt);

      if (satId === -1) {
        return;
      }

      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const obj = catalogManagerInstance.getObject(satId);

      if (obj) {
        SearchManager.lookAtSearchResult_(obj, satId);
      }
    });
    getEl('search-results')?.addEventListener('mouseover', (evt) => {
      const targetEl = evt.target as HTMLElement;

      if (targetEl.closest('.search-result-decayed')) {
        return;
      }

      const satId = SearchManager.getSatIdFromSearchResults_(evt);

      if (satId === -1) {
        return;
      }

      ServiceLocator.getHoverManager().setHoverId(satId);
      ServiceLocator.getUiManager().searchHoverSatId = satId;
    });
    getEl('search-results')?.addEventListener('mouseout', () => {
      ServiceLocator.getHoverManager().setHoverId(-1);
      ServiceLocator.getUiManager().searchHoverSatId = -1;
    });
    getEl('search')?.addEventListener('input', () => {
      const searchStr = (<HTMLInputElement>getEl('search')).value;

      this.doSearch(searchStr);
    });
    getEl('search')?.addEventListener('blur', () => {
      if (this.isSearchOpen && this.getCurrentSearch().length === 0) {
        this.toggleSearch();
      }

      // Force shift key to be released when search box is exited to prevent getting stuck in shift mode after using shift + click to select text in the search box
      ServiceLocator.getInputManager().keyboard.keyStates.set('Shift', false);
    });
    getEl('search-icon')?.addEventListener('click', () => {
      this.toggleSearch();
    });

    // Keyboard navigation within search results
    getEl('search')?.addEventListener('keydown', (evt: KeyboardEvent) => {
      const results = document.querySelectorAll('.search-result:not(.search-result-decayed)');

      if (results.length === 0) {
        return;
      }

      switch (evt.key) {
        case 'ArrowDown':
          evt.preventDefault();
          this.selectedIndex_ = Math.min(this.selectedIndex_ + 1, results.length - 1);
          this.updateSelectedResult_(results);
          break;
        case 'ArrowUp':
          evt.preventDefault();
          this.selectedIndex_ = Math.max(this.selectedIndex_ - 1, 0);
          this.updateSelectedResult_(results);
          break;
        case 'Enter':
          if (this.selectedIndex_ >= 0 && this.selectedIndex_ < results.length) {
            evt.preventDefault();
            (results[this.selectedIndex_] as HTMLElement).click();
          }
          break;
        case 'Escape':
          evt.preventDefault();
          this.closeSearch(true);
          (getEl('search') as HTMLInputElement | null)?.blur();
          break;
        default:
          break;
      }
    });

    // Add keyboard hint to search placeholder (skip on mobile — no keyboard)
    if (!settingsManager.isMobileModeEnabled) {
      const searchInput = getEl('search') as HTMLInputElement | null;

      if (searchInput) {
        const currentPlaceholder = searchInput.placeholder;

        if (!currentPlaceholder.includes('(F)')) {
          searchInput.placeholder = `${currentPlaceholder} (F)`;
        }
      }
    }
  }

  private updateSelectedResult_(results: NodeListOf<Element>): void {
    results.forEach((el, i) => {
      el.classList.toggle('search-result--selected', i === this.selectedIndex_);
    });

    // Scroll selected result into view
    const selectedEl = results[this.selectedIndex_] as HTMLElement | undefined;

    selectedEl?.scrollIntoView({ block: 'nearest' });

    // Update hover preview for selected result
    const satIdStr = selectedEl?.dataset.objId;

    if (satIdStr) {
      const satId = Number.parseInt(satIdStr, 10);

      ServiceLocator.getHoverManager().setHoverId(satId);
      ServiceLocator.getUiManager().searchHoverSatId = satId;
    }
  }

  private static getSatIdFromSearchResults_(evt: Event): number {
    let satId = -1;

    if ((<HTMLElement>evt.target).classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).dataset.objId;

      satId = satIdStr ? Number.parseInt(satIdStr, 10) : -1;
    } else if ((<HTMLElement>evt.target).parentElement?.classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).parentElement?.dataset.objId;

      satId = satIdStr ? Number.parseInt(satIdStr, 10) : -1;
    } else if ((<HTMLElement>evt.target).parentElement?.parentElement?.classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).parentElement?.parentElement?.dataset.objId;

      satId = satIdStr ? Number.parseInt(satIdStr, 10) : -1;
    }

    return satId;
  }

  /**
   * Point the camera at a clicked search result. Stars use lookAtStar; sensors
   * and launch sites are ground-fixed, so the camera rotates to their lat/lon.
   * Everything else (satellites, missiles, planets) routes through selectSat,
   * which performs its own camera move.
   */
  private static lookAtSearchResult_(obj: BaseObject, satId: number): void {
    const camera = ServiceLocator.getMainCamera();

    if (obj.isStar()) {
      camera.lookAtStar(obj as Star);

      return;
    }

    if (obj.isSensor() || obj.type === SpaceObjectType.LAUNCH_SITE) {
      const ground = obj as DetailedSensor;

      camera.lookAtLatLon(ground.lat, ground.lon, ground.zoom ?? ZoomValue.GEO, ServiceLocator.getTimeManager().selectedDate);
      // Sensors carry selection side-effects (menus, FOV); launch sites no-op harmlessly.
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);

      return;
    }

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
  }

  /**
   * Returns a boolean indicating whether the search results box is currently open.
   */
  getLastResultGroup(): ObjectGroup<GroupType> | null {
    return this.lastResultGroup_;
  }

  /**
   * Returns the current search string entered by the user.
   */
  getCurrentSearch(): string {
    if (this.isResultsOpen) {
      const searchDom = <HTMLInputElement>getEl('search', true);

      if (searchDom) {
        return searchDom.value;
      }
    }

    return '';
  }

  /**
   * Hides the search results box and clears the selected satellite group.
   * Also updates the color scheme if necessary.
   */
  hideResults(): void {
    try {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const dotsManagerInstance = ServiceLocator.getDotsManager();
      const groupManagerInstance = ServiceLocator.getGroupsManager();
      const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

      slideOutUp(getEl('search-results')!, 200);
      groupManagerInstance.clearSelect();
      this.isResultsOpen = false;

      settingsManager.lastSearch = '';
      settingsManager.lastSearchResults = [];
      dotsManagerInstance.updateSizeBuffer(catalogManagerInstance.objectCache.length);

      colorSchemeManagerInstance.isUseGroupColorScheme = false;
      colorSchemeManagerInstance.calculateColorBuffers(true);
    } catch (error) {
      errorManagerInstance.log(error);
    }
  }

  static doArraySearch(catalogManagerInstance: CatalogManager, array: number[]) {
    return array.reduce((searchStr, i) => {
      const detailedSatellite = catalogManagerInstance.objectCache[i] as Satellite;

      // Use the sccNum unless it is missing (Vimpel), then use name
      return detailedSatellite?.sccNum.length > 0 ? `${searchStr}${detailedSatellite.sccNum},` : `${searchStr}${detailedSatellite.name},`;
    }, '').slice(0, -1);
  }

  doSearch(searchString: string, isPreventDropDown?: boolean): void {
    this.selectedIndex_ = -1;

    if (searchString === '') {
      this.hideResults();
      EventBus.getInstance().emit(EventBusEvent.searchUpdated, searchString, 0, settingsManager.searchLimit);

      return;
    }

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    if (catalogManagerInstance.objectCache.length === 0) {
      throw new Error('No sat data loaded! Check if TLEs are corrupted!');
    }

    if (searchString.length === 0) {
      settingsManager.lastSearch = '';
      settingsManager.lastSearchResults = [];
      dotsManagerInstance.updateSizeBuffer(catalogManagerInstance.objectCache.length);
      (<HTMLInputElement>getEl('search')).value = '';
      this.hideResults();
      EventBus.getInstance().emit(EventBusEvent.searchUpdated, searchString, 0, settingsManager.searchLimit);

      return;
    }

    const searchDom = <HTMLInputElement>getEl('search');

    if (searchDom) {
      searchDom.value = searchString;
    }

    /*
     * Don't search for things until at least the minimum characters
     * are typed otherwise there are just too many search results.
     */
    if (searchString.length <= settingsManager.minimumSearchCharacters && searchString !== 'RV_') {
      return;
    }

    // Cache the search before it is modified
    const searchString_ = searchString;

    // Uppercase to make this search not case sensitive
    searchString = searchString.toUpperCase();

    /*
     * NOTE: We are no longer using spaces because it is difficult
     * to predict when a space is part of satellite name.
     */

    /*
     * Split string into array using comma or space as delimiter
     * let searchList = searchString.split(/(?![0-9]+)\s(?=[0-9]+)|,/u);
     */

    let searchResult: { results: SearchResult[]; totalFound: number };

    /*
     * A pure-number search uses the fast NORAD-only path, but only when NORAD ID
     * matching is enabled. With it disabled, fall through to the regular search so
     * the toggle actually takes effect (other fields like the intl. designator can
     * still match the digits).
     */
    if ((/^[0-9,]+$/u).test(searchString) && settingsManager.searchableFields.noradId) {
      searchResult = runNumOnlySearch(searchString);
    } else {
      // If not, then do a regular search
      searchResult = runRegularSearch(searchString);
    }

    const { results, totalFound } = searchResult;

    EventBus.getInstance().emit(EventBusEvent.searchUpdated, searchString_, totalFound, settingsManager.searchLimit);

    // Make a group to hilight results
    const idList = results.map((sat) => Number(sat.id));

    settingsManager.lastSearchResults = idList;

    dotsManagerInstance.updateSizeBuffer(catalogManagerInstance.objectCache.length);

    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const uiManagerInstance = ServiceLocator.getUiManager();

    const dispGroup = groupManagerInstance.createGroup(GroupType.ID_LIST, idList);

    this.lastResultGroup_ = dispGroup;
    groupManagerInstance.selectGroup(dispGroup);

    if (!isPreventDropDown && idList.length > 0) {
      this.fillResultBox(results, catalogManagerInstance, totalFound);
    }

    if (idList.length === 0) {
      if (settingsManager.lastSearch?.length > settingsManager.minimumSearchCharacters) {
        uiManagerInstance.toast('No Results Found', ToastMsgType.serious, false);
      }
      this.hideResults();
    }
  }

  /** Result types whose match landed on the object's name, so the name should be highlighted. */
  private static isNameHighlightType_(searchType: SearchResultType): boolean {
    return searchType === SearchResultType.OBJECT_NAME ||
      searchType === SearchResultType.STAR ||
      searchType === SearchResultType.SENSOR ||
      searchType === SearchResultType.LAUNCH_SITE ||
      searchType === SearchResultType.PLANET;
  }

  fillResultBox(results: SearchResult[], catalogManagerInstance: CatalogManager, totalFound?: number) {
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    const satData = catalogManagerInstance.objectCache;

    const resultsBox = getEl('search-results', true);
    let htmlStr = '';

    if (totalFound && totalFound > results.length) {
      htmlStr += `<div class="search-result-limit">Showing ${results.length} results of ${totalFound} found</div>`;
    }

    htmlStr += results.reduce((html, result) => {
      const obj = <Satellite | OemSatellite | MissileObject>satData[result.id];
      const pos = dotsManagerInstance.positionData ? dotsManagerInstance.getCurrentPosition(Number(obj.id)) : null;
      const isDecayed = pos?.x === 0 && pos?.y === 0 && pos?.z === 0;
      const decayedClass = isDecayed ? ' search-result-decayed' : '';

      html += `<div class="search-result${decayedClass}" data-obj-id="${obj.id}">`;
      html += `<span class="search-type-badge">${SEARCH_TYPE_LABELS[result.searchType] ?? ''}</span>`;
      html += '<div class="truncate-search">';

      // Left half of search results
      if (obj.isMissile()) {
        html += obj.name;
      } else if (SearchManager.isNameHighlightType_(result.searchType)) {
        // If the name matched - highlight it
        html += obj.name.substring(0, result.strIndex);
        html += '<span class="search-hilight">';
        html += obj.name.substring(result.strIndex, result.strIndex + result.patlen);
        html += '</span>';
        html += obj.name.substring(result.strIndex + result.patlen);
      } else if (obj.isSatellite() && result.searchType === SearchResultType.ALT_NAME) {
        const sat = obj as Satellite;

        // If the alternate name matched - highlight it
        html += sat.altName.substring(0, result.strIndex);
        html += '<span class="search-hilight">';
        html += sat.altName.substring(result.strIndex, result.strIndex + result.patlen);
        html += '</span>';
        html += sat.altName.substring(result.strIndex + result.patlen);
      } else {
        // If not, just write the name
        html += obj.name;
      }
      html += '</div>';
      html += '<div class="search-result-scc">';

      // Right half of search results
      switch (result.searchType) {
        case SearchResultType.NORAD_ID:
          {
            const sat = obj as Satellite;

            // If the object number matched
            result.strIndex = result.strIndex || 0;
            result.patlen = result.patlen || 5;

            html += sat.sccNum.substring(0, result.strIndex);
            html += '<span class="search-hilight">';
            html += sat.sccNum.substring(result.strIndex, result.strIndex + result.patlen);
            html += '</span>';
            html += sat.sccNum.substring(result.strIndex + result.patlen);
          }
          break;
        case SearchResultType.INTLDES:
          {
            const sat = obj as Satellite;
            // If the international designator matched

            result.strIndex = result.strIndex || 0;
            result.patlen = result.patlen || 5;

            html += sat.intlDes.substring(0, result.strIndex);
            html += '<span class="search-hilight">';
            html += sat.intlDes.substring(result.strIndex, result.strIndex + result.patlen);
            html += '</span>';
            html += sat.intlDes.substring(result.strIndex + result.patlen);
          }
          break;
        case SearchResultType.BUS:
          {
            const sat = obj as Satellite;
            // If the object number matched

            result.strIndex = result.strIndex || 0;
            result.patlen = result.patlen || 5;

            html += sat.bus.substring(0, result.strIndex);
            html += '<span class="search-hilight">';
            html += sat.bus.substring(result.strIndex, result.strIndex + result.patlen);
            html += '</span>';
            html += sat.bus.substring(result.strIndex + result.patlen);
          }
          break;
        case SearchResultType.LAUNCH_VEHICLE:
          {
            const sat = obj as Satellite;

            result.strIndex = result.strIndex || 0;
            result.patlen = result.patlen || 5;

            html += sat.launchVehicle.substring(0, result.strIndex);
            html += '<span class="search-hilight">';
            html += sat.launchVehicle.substring(result.strIndex, result.strIndex + result.patlen);
            html += '</span>';
            html += sat.launchVehicle.substring(result.strIndex + result.patlen);
          }
          break;
        case SearchResultType.MISSILE:
          {
            const misl = obj as MissileObject;

            html += misl.desc;
          }
          break;
        case SearchResultType.STAR:
          html += 'Star';
          break;
        case SearchResultType.SENSOR:
          html += (obj as unknown as DetailedSensor).country ?? 'Sensor';
          break;
        case SearchResultType.LAUNCH_SITE:
          html += (obj as unknown as LaunchSite).country ?? 'Launch Site';
          break;
        case SearchResultType.PLANET:
          html += 'Planet';
          break;
        default:
          if (obj instanceof MissileObject) {
            html += obj.desc;
          } else if (obj instanceof Star) {
            html += 'Star';
          } else if (obj instanceof OemSatellite) {
            html += (obj as OemSatellite).OemDataBlocks[0]?.metadata.OBJECT_ID;
          } else {
            html += (obj as Satellite).sccNum;
          }
          break;
      }

      html += '</div>';
      if (isDecayed) {
        html += '<div class="search-result-decayed-badge">Decayed</div>';
      }
      html += '</div>';

      return html;
    }, '');

    if (resultsBox) {
      resultsBox.innerHTML = htmlStr;
    }
    const satInfoboxDom = getEl('sat-infobox', true);
    const satInfoBoxPlugin = PluginRegistry.getPlugin(SatInfoBox);

    if (satInfoBoxPlugin && satInfoboxDom) {
      satInfoBoxPlugin.initPosition(satInfoboxDom, false);
    }

    if (!settingsManager.isEmbedMode && !this.isResultsOpen) {
      const searchResultsEl = getEl('search-results', true);

      if (searchResultsEl) {
        slideInDown(searchResultsEl, 200);
        this.isResultsOpen = true;
      }
    }

    colorSchemeManagerInstance.isUseGroupColorScheme = true;
    colorSchemeManagerInstance.calculateColorBuffers(true);
  }

  toggleSearch() {
    if (!this.isSearchOpen) {
      this.openSearch();
    } else {
      this.closeSearch();
    }
  }

  closeSearch(isForce = false) {
    // On mobile the search bar is always visible — never close it
    if (settingsManager.isMobileModeEnabled) {
      return;
    }

    if (!this.isSearchOpen && !isForce) {
      return;
    }

    this.isSearchOpen = false;
    getEl('search-holder')?.classList.remove('search-slide-down');
    getEl('search-holder')?.classList.add('search-slide-up');
    ServiceLocator.getUiManager().hideSideMenus();
    this.hideResults();

    const searchDom = <HTMLInputElement>getEl('search');

    if (searchDom) {
      searchDom.value = '';
    }
  }

  openSearch(isForce = false) {
    if (this.isSearchOpen && !isForce) {
      return;
    }

    this.isSearchOpen = true;
    getEl('search-holder')?.classList.remove('search-slide-up');
    getEl('search-holder')?.classList.add('search-slide-down');

    const searchDom = <HTMLInputElement>getEl('search');

    if (searchDom) {
      const curSearch = searchDom.value;

      if (curSearch.length > settingsManager.minimumSearchCharacters) {
        this.doSearch(curSearch);
      }
    }
  }
}
