import { GroupType, ObjectGroup } from '@app/app/data/object-group';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { DetailedSatellite, SpaceObjectType, Star } from '@ootk/src/main';
import searchPng from '@public/img/icons/search.png';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl } from '../../engine/utils/get-el';
import { slideInDown, slideOutUp } from '../../engine/utils/slide';
import { TopMenu } from '../../plugins/top-menu/top-menu';
import { CatalogManager } from '../data/catalog-manager';
import { MissileObject } from '../data/catalog-manager/MissileObject';

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
}

/**
 * The `SearchManager` class is responsible for managing the search functionality in the UI.
 * It provides methods for performing searches, hiding search results, and retrieving information
 * about the current search state.
 */
export class SearchManager {
  isSearchOpen = false;
  isResultsOpen = false;
  private lastResultGroup_: ObjectGroup<GroupType> | null = null;

  init() {
    const uiWrapper = getEl('ui-wrapper');
    const searchResults = document.createElement('div');

    searchResults.id = TopMenu.SEARCH_RESULT_ID;
    uiWrapper!.prepend(searchResults);

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.addListeners_.bind(this));

    this.setupTopMenu_();
    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === 'F' && !isRepeat) {
        this.toggleSearch();
        if (this.isSearchOpen) {
          setTimeout(() => {
            getEl('search')?.focus();
          }, 1000);
        }
      }
    });
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
      const satId = SearchManager.getSatIdFromSearchResults_(evt);

      if (isNaN(satId) || satId === -1) {
        return;
      }

      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const obj = catalogManagerInstance.getObject(satId);

      if (obj?.type === SpaceObjectType.STAR) {
        ServiceLocator.getMainCamera().lookAtStar(obj as Star);
      } else {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
      }
    });
    getEl('search-results')?.addEventListener('mouseover', (evt) => {
      const satId = SearchManager.getSatIdFromSearchResults_(evt);

      if (isNaN(satId) || satId === -1) {
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
    });
    getEl('search-icon')?.addEventListener('click', () => {
      this.toggleSearch();
    });
  }

  private static getSatIdFromSearchResults_(evt: Event) {
    let satId = -1;

    if ((<HTMLElement>evt.target).classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).dataset.objId;

      satId = satIdStr ? parseInt(satIdStr) : -1;
    } else if ((<HTMLElement>evt.target).parentElement?.classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).parentElement?.dataset.objId;

      satId = satIdStr ? parseInt(satIdStr) : -1;
    } else if ((<HTMLElement>evt.target).parentElement?.parentElement?.classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).parentElement?.parentElement?.dataset.objId;

      satId = satIdStr ? parseInt(satIdStr) : -1;
    }

    return satId;
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

      slideOutUp(getEl('search-results')!, 1000);
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
      const detailedSatellite = <DetailedSatellite>catalogManagerInstance.objectCache[i];

      // Use the sccNum unless it is missing (Vimpel), then use name
      return detailedSatellite?.sccNum.length > 0 ? `${searchStr}${detailedSatellite.sccNum},` : `${searchStr}${detailedSatellite.name},`;
    }, '').slice(0, -1);
  }

  doSearch(searchString: string, isPreventDropDown?: boolean): void {
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

    let results = <SearchResult[]>[];
    // If so, then do a number only search

    if ((/^[0-9,]+$/u).test(searchString)) {
      results = SearchManager.doNumOnlySearch_(searchString);
    } else {
      // If not, then do a regular search
      results = SearchManager.doRegularSearch_(searchString);
    }

    EventBus.getInstance().emit(EventBusEvent.searchUpdated, searchString_, results.length, settingsManager.searchLimit);

    // Remove any results greater than the maximum allowed
    results = results.splice(0, settingsManager.searchLimit);

    // Make a group to hilight results
    const idList = results.map((sat) => sat.id);

    settingsManager.lastSearchResults = idList;

    dotsManagerInstance.updateSizeBuffer(catalogManagerInstance.objectCache.length);

    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const uiManagerInstance = ServiceLocator.getUiManager();

    const dispGroup = groupManagerInstance.createGroup(GroupType.ID_LIST, idList);

    this.lastResultGroup_ = dispGroup;
    groupManagerInstance.selectGroup(dispGroup);

    if (!isPreventDropDown && idList.length > 0) {
      this.fillResultBox(results, catalogManagerInstance);
    }

    if (idList.length === 0) {
      if (settingsManager.lastSearch?.length > settingsManager.minimumSearchCharacters) {
        uiManagerInstance.toast('No Results Found', ToastMsgType.serious, false);
      }
      this.hideResults();
    }
  }

  private static doRegularSearch_(searchString: string) {
    const results: SearchResult[] = [];

    // Split string into array using comma
    const searchList = searchString.split(/,/u);

    // Update last search with the most recent search results
    settingsManager.lastSearch = searchList;

    // Initialize search results
    const satData = SearchManager.getSearchableObjects_(true) as (DetailedSatellite & MissileObject)[];

    searchList.forEach((searchStringIn) => {
      satData.every((sat) => {
        if (results.length >= settingsManager.searchLimit) {
          return false;
        }
        const len = searchStringIn.length;

        if (len === 0) {
          return true;
        } // Skip empty strings
        // TODO: #855 Allow searching for other types of objects
        if (!sat.isMissile() && !sat.isSatellite()) {
          return true;
        } // Skip non satellites and missiles

        // TODO: Vimpel additions may slow things down - perhaps make it a setting?
        if ((sat.name.toUpperCase().indexOf(searchStringIn) !== -1 && !sat.name.includes('Vimpel'))) { // || sat.name.toUpperCase() === searchStringIn) {
          results.push({
            strIndex: sat.name.indexOf(searchStringIn),
            searchType: SearchResultType.OBJECT_NAME,
            patlen: len,
            id: sat.id,
          });

          return true; // Prevent's duplicate results
        }

        if (sat.altName && sat.altName.toUpperCase().indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.altName.toUpperCase().indexOf(searchStringIn),
            searchType: SearchResultType.ALT_NAME,
            patlen: len,
            id: sat.id,
          });

          return true; // Prevent's duplicate results
        }

        if (typeof sat.bus !== 'undefined' && sat.bus.toUpperCase().indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.bus.toUpperCase().indexOf(searchStringIn),
            searchType: SearchResultType.BUS,
            patlen: len,
            id: sat.id,
          });

          return true; // Prevent's duplicate results
        }

        if (!sat.desc) {
          // Do nothing there is no description property
        } else if (sat.desc.toUpperCase().indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.desc.toUpperCase().indexOf(searchStringIn),
            searchType: SearchResultType.MISSILE,
            patlen: len,
            id: sat.id,
          });

          return true; // Prevent's duplicate results
        } else {
          return true; // Last check for missiles
        }

        if (sat.sccNum && sat.sccNum.indexOf(searchStringIn) !== -1) {
          // Ignore Notional Satellites unless all 6 characters are entered
          if (sat.name.includes(' Notional)') && searchStringIn.length < 6) {
            return true;
          }

          results.push({
            strIndex: sat.sccNum.indexOf(searchStringIn),
            searchType: SearchResultType.NORAD_ID,
            patlen: len,
            id: sat.id,
          });

          return true; // Prevent's duplicate results
        }

        if (sat.intlDes && sat.intlDes.indexOf(searchStringIn) !== -1 && !sat.name.includes('Vimpel')) {
          // Ignore Notional Satellites
          if (sat.name.includes(' Notional)')) {
            return true;
          }

          results.push({
            strIndex: sat.intlDes.indexOf(searchStringIn),
            searchType: SearchResultType.INTLDES,
            patlen: len,
            id: sat.id,
          });

          return true; // Prevent's duplicate results
        }

        if (sat.launchVehicle && sat.launchVehicle.toUpperCase().indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.launchVehicle.toUpperCase().indexOf(searchStringIn),
            searchType: SearchResultType.LAUNCH_VEHICLE,
            patlen: len,
            id: sat.id,
          });

          return true; // Prevent's duplicate results
        }

        return true;
      });
    });

    return results;
  }

  private static doNumOnlySearch_(searchString: string) {
    let results: SearchResult[] = [];

    // Split string into array using comma
    let searchList = searchString.split(/,/u).filter((str) => str.length > 0);
    // Sort the numbers so that the lowest numbers are searched first

    searchList = searchList.sort((a, b) => parseInt(a) - parseInt(b));

    // Update last search with the most recent search results
    settingsManager.lastSearch = searchList;

    // Initialize search results
    const satData = (SearchManager.getSearchableObjects_(false) as DetailedSatellite[]).sort((a, b) => parseInt(a.sccNum6) - parseInt(b.sccNum6));

    let i = 0;
    let lastFoundI = 0;

    searchList.forEach((searchStringIn) => {
      // Don't search for things until at least the minimum characters
      if (searchStringIn.length <= settingsManager.minimumSearchCharacters) {
        return;
      }
      // Last one never got found
      if (i >= satData.length) {
        i = lastFoundI;
      }

      for (; i < satData.length; i++) {
        if (results.length >= settingsManager.searchLimit) {
          break;
        }

        const sat = satData[i];
        // Ignore Notional Satellites unless all 6 characters are entered

        if (sat.type === SpaceObjectType.NOTIONAL && searchStringIn.length < 6) {
          continue;
        }

        // Check if matches 6Digit
        if (sat.sccNum6 && sat.sccNum6.indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.sccNum.indexOf(searchStringIn),
            patlen: searchStringIn.length,
            id: sat.id,
            searchType: SearchResultType.NORAD_ID,
          });
          lastFoundI = i;

          if (searchStringIn.length === 6) {
            break;
          }
        }
      }
    });

    // Remove any duplicates in results
    results = results.filter((result, index, self) => index === self.findIndex((t) => t.id === result.id));

    return results;
  }

  private static getSearchableObjects_(isIncludeMissiles = true): (DetailedSatellite | MissileObject)[] | DetailedSatellite[] {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const searchableObjects = (
      catalogManagerInstance.objectCache.filter((obj) => {
        if (obj.isSensor() || obj.isMarker() || obj.isGroundObject() || obj.isStar()) {
          return false;
        } // Skip static dots (Maybe these should be searchable?)
        if (!isIncludeMissiles && obj.isMissile()) {
          return false;
        } // Skip missiles (if not searching for missiles

        // Skip Debris and Rocket Bodies if In Satelltie FOV Mode
        if (!(obj as MissileObject).active) {
          return false;
        } // Skip inactive missiles.
        if ((obj as DetailedSatellite).country === 'ANALSAT' && !obj.active) {
          return false;
        } // Skip Fake Analyst satellites
        if (!obj.name) {
          return false;
        } // Everything has a name. If it doesn't then assume it isn't what we are searching for.

        return true;
      }) as (DetailedSatellite & MissileObject)[]
    ).sort((a, b) => {
      // Sort by sccNum
      if ((a as DetailedSatellite).sccNum && (b as DetailedSatellite).sccNum) {
        return parseInt((a as DetailedSatellite).sccNum) - parseInt((b as DetailedSatellite).sccNum);
      }

      return 0;

    });

    return isIncludeMissiles ? (searchableObjects as (DetailedSatellite | MissileObject)[]) : (searchableObjects as DetailedSatellite[]);
  }

  fillResultBox(results: SearchResult[], catalogManagerInstance: CatalogManager) {
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    const satData = catalogManagerInstance.objectCache;

    const resultsBox = getEl('search-results', true);
    const htmlStr = results.reduce((html, result) => {
      const obj = <DetailedSatellite | OemSatellite | MissileObject>satData[result.id];

      html += `<div class="search-result" data-obj-id="${obj.id}">`;
      html += '<div class="truncate-search">';

      // Left half of search results
      if (obj.isMissile()) {
        html += obj.name;
      } else if (result.searchType === SearchResultType.OBJECT_NAME) {
        // If the name matched - highlight it
        html += obj.name.substring(0, result.strIndex);
        html += '<span class="search-hilight">';
        html += obj.name.substring(result.strIndex, result.strIndex + result.patlen);
        html += '</span>';
        html += obj.name.substring(result.strIndex + result.patlen);
      } else if (obj.isSatellite() && result.searchType === SearchResultType.ALT_NAME) {
        const sat = obj as DetailedSatellite;

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
            const sat = obj as DetailedSatellite;

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
            const sat = obj as DetailedSatellite;
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
            const sat = obj as DetailedSatellite;
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
            const sat = obj as DetailedSatellite;

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
        default:
          if (obj instanceof MissileObject) {
            html += obj.desc;
          } else if (obj instanceof Star) {
            html += 'Star';
          } else if (obj instanceof OemSatellite) {
            html += (obj as OemSatellite).OemDataBlocks[0]?.metadata.OBJECT_ID;
          } else {
            html += (obj as DetailedSatellite).sccNum;
          }
          break;
      }

      html += '</div></div>';

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

    if (!settingsManager.isEmbedMode) {
      const searchResultsEl = getEl('search-results', true);

      if (searchResultsEl) {
        slideInDown(searchResultsEl, 1000);
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
    if (!this.isSearchOpen && !isForce) {
      return;
    }

    this.isSearchOpen = false;
    getEl('search-holder')?.classList.remove('search-slide-down');
    getEl('search-holder')?.classList.add('search-slide-up');
    ServiceLocator.getUiManager().hideSideMenus();
    this.hideResults();
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
