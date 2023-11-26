import { CatalogObject } from './../interfaces';
/* */

import { CatalogManager, SatObject, UiManager } from '@app/js/interfaces';
import { GroupType, ObjectGroup } from '@app/js/singletons/object-group';
import { SpaceObjectType } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { slideInDown, slideOutUp } from '../lib/slide';
import { TopMenu } from '../plugins/top-menu/top-menu';
import { LegendManager } from '../static/legend-manager';
import { UrlManager } from '../static/url-manager';

interface SearchResult {
  isBus: any;
  satId: number;
  type: SpaceObjectType;
  isON: boolean;
  strIndex: number;
  patlen: number;
  isSccNum: boolean;
  isIntlDes: boolean;
}

/**
 * The `SearchManager` class is responsible for managing the search functionality in the UI.
 * It provides methods for performing searches, hiding search results, and retrieving information
 * about the current search state.
 */
export class SearchManager {
  private resultsOpen_ = false;
  private lastResultGroup_ = <ObjectGroup>null;
  private uiManager_: UiManager;

  constructor(uiManager: UiManager) {
    this.uiManager_ = uiManager;
    const uiWrapper = getEl('ui-wrapper');
    const searchResults = document.createElement('div');
    searchResults.id = TopMenu.SEARCH_RESULT_ID;
    uiWrapper.prepend(searchResults);
  }

  /**
   * Returns a boolean indicating whether the search results box is currently open.
   */
  public getLastResultGroup(): ObjectGroup {
    return this.lastResultGroup_;
  }

  /**
   * Returns the current search string entered by the user.
   */
  public getCurrentSearch(): string {
    return this.resultsOpen_ ? (<HTMLInputElement>getEl('search')).value : '';
  }

  public isResultsOpen(): boolean {
    return this.resultsOpen_;
  }

  /**
   * Hides the search results box and clears the selected satellite group.
   * Also updates the color scheme if necessary.
   */
  public hideResults(): void {
    try {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const dotsManagerInstance = keepTrackApi.getDotsManager();
      const groupManagerInstance = keepTrackApi.getGroupsManager();
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

      slideOutUp(getEl('search-results'), 1000);
      groupManagerInstance.clearSelect();
      this.resultsOpen_ = false;

      settingsManager.lastSearch = '';
      settingsManager.lastSearchResults = [];
      dotsManagerInstance.updateSizeBuffer(catalogManagerInstance.satData.length, catalogManagerInstance.selectedSat);

      if (colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.group) {
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
      } else if (colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.groupCountries) {
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.countries, true);
      } else {
        colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme, true);
      }
    } catch (error) {
      console.warn(error);
    }
  }

  public static doArraySearch(catalogManagerInstance: CatalogManager, array: number[]) {
    return array.reduce((searchStr, i) => `${searchStr}${(<SatObject>catalogManagerInstance.satData[i])?.sccNum},`, '').slice(0, -1);
  }

  public doSearch(searchString: string, isPreventDropDown?: boolean): void {
    if (searchString == '') {
      this.hideResults();
      return;
    }

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    if (catalogManagerInstance.satData.length === 0) throw new Error('No sat data loaded! Check if TLEs are corrupted!');

    if (searchString.length === 0) {
      settingsManager.lastSearch = '';
      settingsManager.lastSearchResults = [];
      dotsManagerInstance.updateSizeBuffer(catalogManagerInstance.satData.length, catalogManagerInstance.selectedSat);
      (<HTMLInputElement>getEl('search')).value = '';
      this.hideResults();
      return;
    }

    (<HTMLInputElement>getEl('search')).value = searchString;

    // Don't search for things until at least the minimum characters
    // are typed otherwise there are just too many search results.
    if (searchString.length <= settingsManager.minimumSearchCharacters && searchString !== 'RV_') {
      return;
    }

    // Uppercase to make this search not case sensitive
    searchString = searchString.toUpperCase();

    // NOTE: We are no longer using spaces because it is difficult
    // to predict when a space is part of satellite name.

    // Split string into array using comma or space as delimiter
    // let searchList = searchString.split(/(?![0-9]+)\s(?=[0-9]+)|,/u);

    // Split string into array using comma
    let searchList = searchString.split(/,/u);

    // Update last search with the most recent search results
    settingsManager.lastSearch = searchList;

    // Initialize search results
    const satData = catalogManagerInstance.satData as SatObject[];
    let results = [];
    searchList.forEach((searchStringIn) => {
      satData.every((sat, i) => {
        if (results.length >= settingsManager.searchLimit) return false;
        if (i > catalogManagerInstance.missileSats) return false;
        const len = searchStringIn.length;
        if (len === 0) return true; // Skip empty strings
        if (sat.static && sat.type !== SpaceObjectType.STAR) return true; // Skip static dots (Maybe these should be searchable?)
        if (sat.marker) return false; // Stop searching once you reach the markers
        if (settingsManager.isSatOverflyModeOn && sat.type !== SpaceObjectType.PAYLOAD) return true; // Skip Debris and Rocket Bodies if In Satelltie FOV Mode
        if (!sat.active) return true; // Skip inactive missiles.
        if (sat.country == 'ANALSAT' && !sat.active) return true; // Skip Fake Analyst satellites
        if (!sat.name) return true; // Everything has a name. If it doesn't then assume it isn't what we are searching for.

        if (sat.name.toUpperCase().indexOf(searchStringIn) !== -1 && !sat.name.includes('Vimpel')) {
          results.push({
            strIndex: sat.name.indexOf(searchStringIn),
            type: sat.type,
            isON: true,
            patlen: len,
            satId: i,
          });
          return true; // Prevent's duplicate results
        }

        if (typeof sat.bus !== 'undefined' && sat.bus.toUpperCase().indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.bus.indexOf(searchStringIn),
            type: sat.type,
            isBus: true,
            patlen: len,
            satId: i,
          });
          return true; // Prevent's duplicate results
        }

        if (!sat.desc) {
          // Do nothing there is no description property
        } else if (sat.desc.toUpperCase().indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.desc.indexOf(searchStringIn),
            isMissile: true,
            patlen: len,
            satId: i,
          });
          return true; // Prevent's duplicate results
        } else {
          return true; // Last check for missiles
        }

        if (sat.sccNum && sat.sccNum.indexOf(searchStringIn) !== -1) {
          // Ignore Notional Satellites unless all 6 characters are entered
          if (sat.name.includes(' Notional)') && searchStringIn.length < 6) return true;

          results.push({
            strIndex: sat.sccNum.indexOf(searchStringIn),
            isSccNum: true,
            patlen: len,
            satId: i,
          });
          return true; // Prevent's duplicate results
        }

        if (sat.intlDes && sat.intlDes.indexOf(searchStringIn) !== -1) {
          // Ignore Notional Satellites
          if (sat.name.includes(' Notional)')) return true;

          results.push({
            strIndex: sat.intlDes.indexOf(searchStringIn),
            isIntlDes: true,
            patlen: len,
            satId: i,
          });
          return true; // Prevent's duplicate results
        }

        if (sat.launchVehicle && sat.launchVehicle.toUpperCase().indexOf(searchStringIn) !== -1) {
          results.push({
            strIndex: sat.launchVehicle.indexOf(searchStringIn),
            isLV: true,
            patlen: len,
            satId: i,
          });
          return true; // Prevent's duplicate results
        }

        return true; // No match
      });
    });
    // Remove any results greater than the maximum allowed
    results = results.splice(0, settingsManager.searchLimit);

    // Make a group to hilight results
    const idList = results.map((sat) => sat.satId);
    settingsManager.lastSearchResults = idList;

    dotsManagerInstance.updateSizeBuffer(catalogManagerInstance.satData.length);

    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const uiManagerInstance = keepTrackApi.getUiManager();

    const dispGroup = groupManagerInstance.createGroup(GroupType.ID_LIST, idList);
    this.lastResultGroup_ = dispGroup;
    groupManagerInstance.selectGroup(dispGroup);

    if (!isPreventDropDown) this.fillResultBox(results, catalogManagerInstance);

    if (idList.length === 0) {
      if (settingsManager.lastSearch?.length > settingsManager.minimumSearchCharacters) {
        uiManagerInstance.toast('No Results Found', 'serious', false);
      }
      this.hideResults();
      return;
    }

    if (settingsManager.isSatOverflyModeOn) {
      catalogManagerInstance.satCruncher.postMessage({
        typ: 'satelliteSelected',
        satelliteSelected: idList,
      });
    }
    // Don't let the search overlap with the legend
    LegendManager.change('clear');
    UrlManager.updateURL();
  }

  public fillResultBox(results: SearchResult[], catalogManagerInstance: CatalogManager) {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    let satData = catalogManagerInstance.satData;
    getEl('search-results').innerHTML = results.reduce((html, result) => {
      const sat = <CatalogObject>satData[result.satId];
      html += '<div class="search-result" data-obj-id="' + sat.id + '">';
      html += '<div class="truncate-search">';
      if (sat.missile) {
        html += sat.name;
      } else if (result.isON) {
        // If the name matched - highlight it
        html += sat.name.substring(0, result.strIndex);
        html += '<span class="search-hilight">';
        html += sat.name.substring(result.strIndex, result.strIndex + result.patlen);
        html += '</span>';
        html += sat.name.substring(result.strIndex + result.patlen);
      } else {
        // If not, just write the name
        html += sat.name;
      }
      html += '</div>';
      html += '<div class="search-result-scc">';
      if (sat.missile) {
        html += sat.desc;
      } else if (result.isSccNum) {
        // If the object number matched
        result.strIndex = result.strIndex || 0;
        result.patlen = result.patlen || 5;

        html += sat.sccNum.substring(0, result.strIndex);
        html += '<span class="search-hilight">';
        html += sat.sccNum.substring(result.strIndex, result.strIndex + result.patlen);
        html += '</span>';
        html += sat.sccNum.substring(result.strIndex + result.patlen);
      } else if (result.isIntlDes) {
        // If the international designator matched
        result.strIndex = result.strIndex || 0;
        result.patlen = result.patlen || 5;

        html += sat.intlDes.substring(0, result.strIndex);
        html += '<span class="search-hilight">';
        html += sat.intlDes.substring(result.strIndex, result.strIndex + result.patlen);
        html += '</span>';
        html += sat.intlDes.substring(result.strIndex + result.patlen);
      } else if (result.isBus) {
        // If the object number matched
        result.strIndex = result.strIndex || 0;
        result.patlen = result.patlen || 5;

        html += sat.bus.substring(0, result.strIndex);
        html += '<span class="search-hilight">';
        html += sat.bus.substring(result.strIndex, result.strIndex + result.patlen);
        html += '</span>';
        html += sat.bus.substring(result.strIndex + result.patlen);
      } else if (result.type === SpaceObjectType.STAR) {
        html += 'Star';
      } else {
        // Don't Write the lift vehicle - maybe it should?
        html += sat.sccNum;
      }
      html += '</div></div>';
      return html;
    }, '');
    slideInDown(getEl('search-results'), 1000);
    this.resultsOpen_ = true;

    if (
      colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.groupCountries ||
      colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.countries
    ) {
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.groupCountries, true);
    } else {
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.group, true);
    }
  }

  private isSearchOpen = false;
  private forceClose = false;
  private forceOpen = false;

  public searchToggle(force?: boolean) {
    // Reset Force Options
    this.forceClose = false;
    this.forceOpen = false;

    // Pass false to force close and true to force open
    if (typeof force != 'undefined') {
      if (!force) this.forceClose = true;
      if (force) this.forceOpen = true;
    }

    if ((!this.isSearchOpen && !this.forceClose) || this.forceOpen) {
      this.isSearchOpen = true;
      getEl('search-holder').classList.remove('search-slide-up');
      getEl('search-holder').classList.add('search-slide-down');
      getEl('search-icon').classList.add('search-icon-search-on');
      getEl('fullscreen-icon').classList.add('top-menu-icons-search-on');
      getEl('tutorial-icon').classList.add('top-menu-icons-search-on');
      getEl('legend-icon').classList.add('top-menu-icons-search-on');
      getEl('sound-icon').classList.add('top-menu-icons-search-on');

      const curSearch = (<HTMLInputElement>getEl('search')).value;
      if (curSearch.length > settingsManager.minimumSearchCharacters) {
        this.doSearch(curSearch);
      }
    } else {
      this.isSearchOpen = false;
      getEl('search-holder').classList.remove('search-slide-down');
      getEl('search-holder').classList.add('search-slide-up');
      getEl('search-icon').classList.remove('search-icon-search-on');
      setTimeout(function () {
        getEl('fullscreen-icon').classList.remove('top-menu-icons-search-on');
        getEl('tutorial-icon').classList.remove('top-menu-icons-search-on');
        getEl('legend-icon').classList.remove('top-menu-icons-search-on');
        getEl('sound-icon').classList.remove('top-menu-icons-search-on');
      }, 500);
      this.uiManager_.hideSideMenus();
      this.hideResults();
      // getEl('menu-space-stations').classList.remove('bmenu-item-selected');
      // This is getting called too much. Not sure what it was meant to prevent?
      // colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true);
      // this.uiManager_.colorSchemeChangeAlert(settingsManager.currentColorScheme);
    }
  }
}
