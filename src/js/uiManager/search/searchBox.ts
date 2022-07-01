/* */

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { CatalogManager, SearchBox } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { SatGroup } from '@app/js/groupsManager/sat-group';
import { getEl, slideInDown, slideOutUp } from '@app/js/lib/helpers';

let hoverSatId = -1;
let hovering = false;
let resultsOpen = false;
let lastResultGroup: SatGroup;

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

export const isResultBoxOpen = (): boolean => resultsOpen;
export const getLastResultGroup = () => lastResultGroup;
export const getHoverSat = () => hoverSatId;
export const isHovering = (val?: boolean): boolean => (hovering = typeof val !== 'undefined' ? val : hovering);
export const setHoverSat = (satId: number): number => (hoverSatId = satId);
export const getCurrentSearch = () => (resultsOpen ? (<HTMLInputElement>getEl('search')).value : '');

export const hideResults = () => {
  try {
    const { colorSchemeManager, groupsManager, dotsManager, satSet } = keepTrackApi.programs;
    slideOutUp(getEl('search-results'), 1000);
    groupsManager.clearSelect();
    resultsOpen = false;

    settingsManager.lastSearch = '';
    settingsManager.lastSearchResults = [];
    dotsManager.updateSizeBuffer(satSet.satData.length);

    if (settingsManager.currentColorScheme === colorSchemeManager.group) {
      satSet.setColorScheme(colorSchemeManager.default, true);
    } else {
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
    }
  } catch (error) {
    console.warn(error);
  }
};

export const doArraySearch = (array: string[]) => array.reduce((searchStr, i) => `${searchStr}${keepTrackApi.programs.satSet.satData[i].sccNum},`, '').slice(0, -1);

// prettier-ignore
export const doSearch = (searchString: string, isPreventDropDown?: boolean): number[] => { // NOSONAR
  const { satSet, dotsManager, groupsManager } = keepTrackApi.programs;
  if (satSet.satData.length === 0) throw new Error('No sat data loaded! Check if TLEs are corrupted!');

  if (searchString.length === 0) {
    settingsManager.lastSearch = '';
    settingsManager.lastSearchResults = [];
    dotsManager.updateSizeBuffer(satSet.satData.length);
    (<HTMLInputElement>getEl('search')).value = '';
    searchBox.hideResults();
    return [];
  }

  (<HTMLInputElement>getEl('search')).value = searchString;

  // Don't search for things until at least the minimum characters
  // are typed otherwise there are just too many search results.
  if (searchString.length <= settingsManager.minimumSearchCharacters && searchString !== 'RV_') {
    return [];
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
  const satData = satSet.satData;
  let results = [];
  searchList.forEach((searchStringIn) => {
    satData.every((sat, i) => {
      if (i > satSet.missileSats) return false;
      const len = searchStringIn.length;
      if (sat.static && sat.type !== SpaceObjectType.STAR) return true; // Skip static dots (Maybe these should be searchable?)
      if (sat.marker) return false; // Stop searching once you reach the markers
      if (settingsManager.isSatOverflyModeOn && sat.type !== SpaceObjectType.PAYLOAD) return true; // Skip Debris and Rocket Bodies if In Satelltie FOV Mode
      if (sat.missile && !sat.active) return true; // Skip inactive missiles.
      if (sat.country == 'ANALSAT' && !sat.active) return true; // Skip Fake Analyst satellites
      if (!sat.name) return true; // Everything has a name. If it doesn't then assume it isn't what we are searching for.

      if (sat.name.toUpperCase().indexOf(searchStringIn) !== -1) {
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
        results.push({
          strIndex: sat.sccNum.indexOf(searchStringIn),
          isSccNum: true,
          patlen: len,
          satId: i,
        });
        return true; // Prevent's duplicate results
      }

      if (sat.intlDes && sat.intlDes.indexOf(searchStringIn) !== -1) {
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

  dotsManager.updateSizeBuffer(satSet.satData.length);

  const dispGroup = groupsManager.createGroup('idList', idList);
  lastResultGroup = dispGroup;
  groupsManager.selectGroup(dispGroup);

  if (!isPreventDropDown) searchBox.fillResultBox(results, satSet);
  return idList;
};

export const fillResultBox = (results: SearchResult[], satSet: CatalogManager) => {
  let satData = satSet.satData;
  getEl('search-results').innerHTML = results.reduce((html, result) => {
    const sat = satData[result.satId];
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
  resultsOpen = true;
  satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
};

export const searchBox: SearchBox = {
  isResultBoxOpen,
  getLastResultGroup,
  getCurrentSearch,
  isHovering,
  setHoverSat,
  getHoverSat,
  hideResults,
  doArraySearch,
  doSearch,
  fillResultBox,
};
