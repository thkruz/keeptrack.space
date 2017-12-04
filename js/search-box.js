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
  };

  searchBox.doSearch = function (str) {
    selectSat(-1);

    if (str.length === 0) {
      searchBox.hideResults();
      return;
    }

    var bigstr = str.toUpperCase();
    var arr = str.split(',');

    var bigarr = bigstr.split(',');
    var results = [];

    for (var i = 0; i < satData.length; i++) {
      for (var j = 0; j < arr.length; j++) {
        bigstr = bigarr[j];
        str = arr[j];
        if (str.length <= 2) { return; }
        var len = arr[j].length;
        if (satData[i].static) { continue; }
        if (satData[i].missile && !satData[i].active) { continue; }
        if (!satData[i].ON) { continue; }
        if ((satData[i].ON.indexOf(str) !== -1) || (satData[i].ON.indexOf(bigstr) !== -1)) {
          results.push({
            isIntlDes: false,
            isInView: satData[i].inview,
            isObjnum: false,
            strIndex: satData[i].ON.indexOf(str),
            SCC_NUM: satData[i].SCC_NUM,
            desc: satData[i].desc,
            patlen: len,
            satId: i
          });
        }
        if (satData[i].missile) { continue; }

        if (satData[i].intlDes.indexOf(str) !== -1) {
          if (satData[i].SCC_NUM.indexOf(str) !== -1) {
            results.push({
              isInView: satData[i].inview,
              strIndex: satData[i].intlDes.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          } else {
            results.push({
              isInView: satData[i].inview,
              strIndex: satData[i].intlDes.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          }
        } else if (satData[i].SCC_NUM.indexOf(str) !== -1) {
          if (satData[i].intlDes.indexOf(str) !== -1) {
            results.push({
              isInView: satData[i].inview,
              strIndex: satData[i].intlDes.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          } else {
            results.push({
              isInView: satData[i].inview,
              strIndex: satData[i].SCC_NUM.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          }
        }
        if (parseInt(satData[i].SCC_NUM) >= 80000) { continue; }
        if ((satData[i].LV.indexOf(str) !== -1) || (satData[i].LV.indexOf(bigstr) !== -1)) {
          results.push({
            isInView: satData[i].inview,
            strIndex: satData[i].LV.indexOf(str),
            SCC_NUM: satData[i].SCC_NUM,
            patlen: len,
            satId: i
          });
        }
      }
    }

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
    groups.selectGroup(dispGroup);

    searchBox.fillResultBox(results);
    $('#legend-hover-menu').hide();
    // searchBox.filterInView(results);
    updateUrl();
  };
  searchBox.fillResultBox = function (results) {
    var resultBox = $('#search-results');
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var sat = satData[results[i].satId];
      html += '<div class="search-result" data-sat-id="' + sat.id + '">';
      if (results[i].isIntlDes || results[i].isObjnum) {
        html += sat.ON;
      } else {
        html += sat.ON.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.ON.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.ON.substring(results[i].strIndex + results[i].patlen);
      }
      html += '<div class="search-result-scc">';
      if (results[i].isObjnum) {
        html += sat.SCC_NUM.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.SCC_NUM.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.SCC_NUM.substring(results[i].strIndex + results[i].patlen);
      } else if (results[i].desc) {
        html += sat.desc;
      } else {
        html += sat.SCC_NUM;
      }
      html += '</div></div>';
    }
    resultBox[0].innerHTML = html;
    resultBox.slideDown();
    if (settingsManager.redTheme) {
      $('.search-hilight').css('color', 'DarkRed');
      $('#search-results').css('background', 'LightCoral');
      $('#search-result:hover').css('background', 'DarkRed');
    }
    resultsOpen = true;
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
    $('#search-results').mouseout(function () {
      orbitDisplay.clearHoverOrbit();
      satSet.setHover(-1);
      hovering = false;
    });

    $('#search').on('input', function () {
      var searchStr = $('#search').val();
      searchBox.doSearch(searchStr);
    });

    $('#all-objects-link').click(function () {
      if (selectedSat === -1) {
        return;
      }
      var intldes = satSet.getSat(selectedSat).intlDes;
      var searchStr = intldes.slice(0, 8);
      searchBox.doSearch(searchStr);
      $('#search').val(searchStr);
    });
    $('#near-objects-link').click(function () {
      if (selectedSat === -1) {
        return;
      }
      var sat = selectedSat;
      var SCCs = [];
      var pos = satSet.getSat(sat).position;
      var posXmin = pos.x - 100;
      var posXmax = pos.x + 100;
      var posYmin = pos.y - 100;
      var posYmax = pos.y + 100;
      var posZmin = pos.z - 100;
      var posZmax = pos.z + 100;
      $('#search').val('');
      for (var i = 0; i < satSet.numSats; i++) {
        pos = satSet.getSat(i).position;
        if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
          SCCs.push(satSet.getSat(i).SCC_NUM);
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
