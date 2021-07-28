/* */

import $ from 'jquery';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { keepTrackApi } from '@app/js/api/externalApi';
import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';

var hoverSatId = -1;
var searchBox = {};

var hovering = false;

var resultsOpen = false;
var lastResultGroup;

var i;

searchBox.isResultBoxOpen = function () {
  return resultsOpen;
};
searchBox.getLastResultGroup = function () {
  return lastResultGroup;
};
searchBox.getCurrentSearch = function () {
  if (resultsOpen) {
    return $('#search').val();
  } else {
    return null;
  }
};
searchBox.isHovering = function (val) {
  if (typeof val == 'undefined') return hovering;
  hovering = val;
};
searchBox.setHoverSat = function (satId) {
  hoverSatId = satId;
};
searchBox.getHoverSat = function () {
  return hoverSatId;
};
searchBox.hideResults = function () {
  try {
    $('#search-results').slideUp();
    groupsManager.clearSelect();
    resultsOpen = false;

    settingsManager.lastSearch = '';
    settingsManager.lastSearchResults = [];
    dotsManager.updateSizeBuffer(satSet.satData);

    if (settingsManager.currentColorScheme === ColorScheme.group) {
      satSet.setColorScheme(ColorScheme.default, true);
    } else {
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
    }
  } catch (error) {
    console.warn(error);
  }
};

searchBox.doArraySearch = (array) => {
  let searchStr = '';
  let satData = satSet.getSatData();
  for (var i = 0; i < array.length; i++) {
    if (i == array.length - 1) {
      searchStr += `${satData[array[i]].SCC_NUM}`;
    } else {
      searchStr += `${satData[array[i]].SCC_NUM},`;
    }
  }
  return searchStr;
};

searchBox.doSearch = function (searchString, isPreventDropDown, satSet) {
  if (searchString.length === 0) {
    settingsManager.lastSearch = '';
    settingsManager.lastSearchResults = [];
    dotsManager.updateSizeBuffer(satSet.satData);
    $('#search').val('');
    searchBox.hideResults();
    return;
  }

  $('#search').val(searchString);

  // Uppercase to make this search not case sensitive
  searchString = searchString.toUpperCase();
  // Split string into array using comma or space as delimiter
  let searchList = searchString.split(/[,\s]/u);
  // Update last search with the most recent search results
  settingsManager.lastSearch = searchList;

  // Initialize search results
  const results = [];
  const satData = satSet.getSatData();
  for (let i = 0; i < satSet.missileSats; i++) {
    // Stop once you get to the markers to save time
    var sat = satData[i];
    if (typeof sat == 'undefined') {
      // console.debug(`Undefined sat in searchBox.doSearch() - ${i}`);
      continue;
    }
    for (var j = 0; j < searchList.length; j++) {
      // Move one search string at a time (separated by ',')
      searchString = searchList[j];

      // Don't search for things until at least the minimum characters
      // are typed otherwise there are just too many search results.
      if (searchString.length <= settingsManager.minimumSearchCharacters && searchString !== 'RV_') {
        return;
      }
      var len = searchList[j].length; // How many characters is in this search string

      // Skip static dots (Maybe these should be searchable?)
      if (sat.static) {
        continue;
      }
      // Stop searching once you reach the markers
      if (sat.marker) {
        break;
      }
      // Skip Debris and Rocket Bodies if In Satelltie FOV Mode
      if (settingsManager.isSatOverflyModeOn && sat.OT > 1) {
        continue;
      }
      // Skip inactive missiles.
      if (sat.missile && !sat.active) {
        continue;
      }

      // Skip Fake Analyst satellites
      if (sat.C == 'ANALSAT' && !sat.active) {
        continue;
      }

      // Everything has a name. If it doesn't then assume it isn't what we are
      // searching for.
      if (!sat.ON) {
        continue;
      }

      //
      if (sat.ON.toUpperCase().indexOf(searchString) !== -1) {
        results.push({
          strIndex: sat.ON.indexOf(searchString),
          isON: true,
          patlen: len,
          satId: i,
        });
        continue; // Prevent's duplicate results
      }

      if (!sat.desc) {
        // Do nothing there is no description property
      } else if (sat.desc.toUpperCase().indexOf(searchString) !== -1) {
        results.push({
          strIndex: sat.desc.indexOf(searchString),
          isMissile: true,
          patlen: len,
          satId: i,
        });
        continue; // Prevent's duplicate results
      } else {
        continue; // Last check for missiles
      }

      if (sat.SCC_NUM.indexOf(searchString) !== -1) {
        results.push({
          strIndex: sat.SCC_NUM.indexOf(searchString),
          // eslint-disable-next-line camelcase
          isSCC_NUM: true,
          patlen: len,
          satId: i,
        });
        continue; // Prevent's duplicate results
      }

      if (sat.intlDes.indexOf(searchString) !== -1) {
        results.push({
          strIndex: sat.intlDes.indexOf(searchString),
          isIntlDes: true,
          patlen: len,
          satId: i,
        });
        continue; // Prevent's duplicate results
      }

      if (sat.LV.toUpperCase().indexOf(searchString) !== -1) {
        results.push({
          strIndex: sat.LV.indexOf(searchString),
          isLV: true,
          patlen: len,
          satId: i,
        });
        continue; // Prevent's duplicate results
      }

      // At this point the item didn't match our search
    }
  }

  // Removing this can result in a heavy performance lag
  if (results.length > settingsManager.searchLimit) {
    results.length = settingsManager.searchLimit;
  }

  // Make a group to hilight results
  var idList = [];
  for (let i = 0; i < results.length; i++) {
    idList.push(results[i].satId);
  }

  settingsManager.lastSearchResults = idList;

  dotsManager.updateSizeBuffer(satSet.satData);

  var dispGroup = groupsManager.createGroup('idList', idList);
  lastResultGroup = dispGroup;
  groupsManager.selectGroup(dispGroup, orbitManager);

  if (!isPreventDropDown) {
    searchBox.fillResultBox(results, satSet);
  }

  return idList;
};

searchBox.fillResultBox = function (results, satSet) {
  let satData = satSet.getSatData();
  var resultBox = $('#search-results');
  var html = '';
  for (i = 0; i < results.length; i++) {
    var sat = satData[results[i].satId];
    html += '<div class="search-result" data-sat-id="' + sat.id + '">';
    html += '<div class="truncate-search">';
    if (sat.missile) {
      html += sat.ON;
    } else if (results[i].isON) {
      // If the name matched - highlight it
      html += sat.ON.substring(0, results[i].strIndex);
      html += '<span class="search-hilight">';
      html += sat.ON.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
      html += '</span>';
      html += sat.ON.substring(results[i].strIndex + results[i].patlen);
    } else {
      // If not, just write the name
      html += sat.ON;
    }
    html += '</div>';
    html += '<div class="search-result-scc">';
    if (sat.missile) {
      html += sat.desc;
    } else if (results[i].isSCC_NUM) {
      // If the object number matched
      results[i].strIndex = results[i].strIndex || 0;
      results[i].patlen = results[i].patlen || 5;

      html += sat.SCC_NUM.substring(0, results[i].strIndex);
      html += '<span class="search-hilight">';
      html += sat.SCC_NUM.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
      html += '</span>';
      html += sat.SCC_NUM.substring(results[i].strIndex + results[i].patlen);
    } else if (results[i].isIntlDes) {
      // If the international designator matched
      results[i].strIndex = results[i].strIndex || 0;
      results[i].patlen = results[i].patlen || 5;

      html += sat.intlDes.substring(0, results[i].strIndex);
      html += '<span class="search-hilight">';
      html += sat.intlDes.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
      html += '</span>';
      html += sat.intlDes.substring(results[i].strIndex + results[i].patlen);
    } else {
      // Don't Write the lift vehicle - maybe it should?
      html += sat.SCC_NUM;
    }
    html += '</div></div>';
  }
  resultBox[0].innerHTML = html;
  resultBox.slideDown();
  resultsOpen = true;
  satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
};

let satSet, groupsManager, orbitManager, dotsManager;
searchBox.init = function () {
  if (settingsManager.disableUI) return;
  satSet = keepTrackApi.programs.satSet;
  groupsManager = keepTrackApi.programs.groupsManager;
  orbitManager = keepTrackApi.programs.orbitManager;
  dotsManager = keepTrackApi.programs.dotsManager;
};

export { searchBox };
