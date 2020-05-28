/* global
  $
  groups
  selectSat
  updateUrl

  satSet
  orbitDisplay
  selectedSat
  settingsManager
*/
(function () {
  var searchBox = {};
  var satData;

  var hovering = false;
  var hoverSatId = -1;

  var resultsOpen = false;
  var lastResultGroup;

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
  searchBox.isHovering = function () {
    return hovering;
  };
  searchBox.getHoverSat = function () {
    return hoverSatId;
  };
  searchBox.hideResults = function () {
    $('#search-results').slideUp();
    groups.clearSelect();
    resultsOpen = false;

    if (settingsManager.currentColorScheme === ColorScheme.group) {
      satSet.setColorScheme(ColorScheme.default, true);
    } else {
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
    }
  };

  searchBox.doSearch = function (searchString, isPreventDropDown) {
    if (searchString.length === 0) {
      $('#search').val('');
      searchBox.hideResults();
      selectSat(-1);
      // satSet.setColorScheme(ColorScheme.default, true);
      return;
    }

    // Uppercase to make this search not case sensitive
    searchString = searchString.toUpperCase();
    var searchList = searchString.split(',');

    var results = [];

    for (var i = 0; i < satSet.missileSats; i++) { // Stop once you get to the markers to save time
      var sat = satData[i];
      for (var j = 0; j < searchList.length; j++) {
        // Move one search string at a time (separated by ',')
        searchString = searchList[j];

        // Don't search for things until at least the minimum characters
        // are typed otherwise there are just too many search results.
        if (searchString.length <= settingsManager.minimumSearchCharacters && searchString !== 'RV_') { return; }
        var len = searchList[j].length; // How many characters is in this search string

        // Skip static dots (Maybe these should be searchable?)
        if (sat.static) { continue; }
        // Stop searching once you reach the markers
        if (sat.marker) { break; }
        // Skip Debris and Rocket Bodies if In Satelltie FOV Mode
        if (settingsManager.isSatOverflyModeOn && sat.OT > 1) { continue; }
        // Skip inactive missiles.
        if (sat.missile && !sat.active) { continue; }

        // Skip Fake Analyst satellites
        if (sat.C == 'ANALSAT') { continue; }

        // Everything has a name. If it doesn't then assume it isn't what we are
        // searching for.
        if (!sat.ON) { continue; }

        //
        if (sat.ON.toUpperCase().indexOf(searchString) !== -1) {
          results.push({
            strIndex: sat.ON.indexOf(searchString),
            isON: true,
            patlen: len,
            satId: i
          });
          continue; // Prevent's duplicate results
        }

        if (!sat.desc) { // Do nothing there is no description property
        } else if (sat.desc.toUpperCase().indexOf(searchString) !== -1) {
          results.push({
            strIndex: sat.desc.indexOf(searchString),
            isMissile: true,
            patlen: len,
            satId: i
          });
          continue; // Prevent's duplicate results
        } else {
          continue; // Last check for missiles
        }

        if (sat.SCC_NUM.indexOf(searchString) !== -1) {
          results.push({
            strIndex: sat.SCC_NUM.indexOf(searchString),
            isSCC_NUM: true,
            patlen: len,
            satId: i
          });
          continue; // Prevent's duplicate results
        }

        if (sat.intlDes.indexOf(searchString) !== -1) {
            results.push({
              strIndex: sat.intlDes.indexOf(searchString),
              isIntlDes: true,
              patlen: len,
              satId: i
            });
          continue; // Prevent's duplicate results
        }

        if (sat.LV.toUpperCase().indexOf(searchString) !== -1) {
          results.push({
            strIndex: sat.LV.indexOf(searchString),
            isLV: true,
            patlen: len,
            satId: i
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
    for (i = 0; i < results.length; i++) {
      idList.push(results[i].satId);
    }
    var dispGroup = new groups.SatGroup('idList', idList);
    lastResultGroup = dispGroup;
    selectSat(-1);
    if (settingsManager.isSatOverflyModeOn) {
      satCruncher.postMessage({
        satelliteSelected: idList
      });
    }
    groups.selectGroup(dispGroup);

    // Don't let the search overlap with the legend
    uiManager.legendMenuChange('clear');

    if (!isPreventDropDown) {
      searchBox.fillResultBox(results);
    }

    updateUrl();
    settingsManager.themes.retheme();
  };


  searchBox.fillResultBox = function (results) {
    var resultBox = $('#search-results');
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var sat = satData[results[i].satId];
      html += '<div class="search-result" data-sat-id="' + sat.id + '">';
      html += '<div class="truncate-search">';
      if (sat.missile) {
        html += sat.ON;
      } else if (results[i].isON) { // If the name matched - highlight it
        html += sat.ON.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.ON.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.ON.substring(results[i].strIndex + results[i].patlen);
      } else { // If not, just write the name
        html += sat.ON;
      }
      html += '</div>';
      html += '<div class="search-result-scc">';
      if (sat.missile) {
        html += sat.desc;
      } else if (results[i].isSCC_NUM) { // If the object number matched
        results[i].strIndex = results[i].strIndex || 0;
        results[i].patlen = results[i].patlen || 5;

        html += sat.SCC_NUM.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.SCC_NUM.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.SCC_NUM.substring(results[i].strIndex + results[i].patlen);
      } else if (results[i].isIntlDes) { // If the international designator matched
        results[i].strIndex = results[i].strIndex || 0;
        results[i].patlen = results[i].patlen || 5;

        html += sat.intlDes.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.intlDes.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.intlDes.substring(results[i].strIndex + results[i].patlen);
      } else { // Don't Write the lift vehicle - maybe it should?
        html += sat.SCC_NUM;
      }
      html += '</div></div>';
    }
    resultBox[0].innerHTML = html;
    resultBox.slideDown();
    settingsManager.themes.retheme();
    resultsOpen = true;
    satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
  };

  searchBox.init = function (_satData) {
    satData = _satData; // Copies satData to searchBox. Might be a more efficient way to access satData
    $('#search-results').on('click', '.search-result', function (evt) {
      var satId = $(this).data('sat-id');
      selectSat(satId);
    });

    $('#search-results').on('mouseover', '.search-result', function (evt) {
      var satId = $(this).data('sat-id');
      orbitDisplay.setHoverOrbit(satId);
      satSet.setHover(satId);

      hovering = true;
      hoverSatId = satId;
    });
    $('#search-results').on("mouseout", function () {
      orbitDisplay.clearHoverOrbit();
      satSet.setHover(-1);
      hovering = false;
    });

    $('#search').on('input', function () {
      var searchStr = $('#search').val();
      searchBox.doSearch(searchStr);
    });

    $('#all-objects-link').on("click", function () {
      if (selectedSat === -1) {
        return;
      }
      var intldes = satSet.getSatExtraOnly(selectedSat).intlDes;
      var searchStr = intldes.slice(0, 8);
      searchBox.doSearch(searchStr);
      $('#search').val(searchStr);
    });
    $('#near-objects-link').on("click", function () {
      if (selectedSat === -1) {
        return;
      }
      var sat = selectedSat;
      var SCCs = [];
      var pos = satSet.getSatPosOnly(sat).position;
      var posXmin = pos.x - 100;
      var posXmax = pos.x + 100;
      var posYmin = pos.y - 100;
      var posYmax = pos.y + 100;
      var posZmin = pos.z - 100;
      var posZmax = pos.z + 100;
      $('#search').val('');
      for (var i = 0; i < satSet.numSats; i++) {
        pos = satSet.getSatPosOnly(i).position;
        if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
          SCCs.push(satSet.getSatExtraOnly(i).SCC_NUM);
        }
      }

      for (i = 0; i < SCCs.length; i++) {
        if (i < SCCs.length - 1) {
          $('#search').val($('#search').val() + SCCs[i] + ',');
        } else {
          $('#search').val($('#search').val() + SCCs[i]);
        }
      }

      searchBox.doSearch($('#search').val());
    });
  };

  window.searchBox = searchBox;
})();
