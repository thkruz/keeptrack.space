/* global
  $

  ga
  ColorScheme
  selectSat

  satSet
  orbitDisplay
  settingsManager
  searchBox
  lookangles
*/
(function () {
  var groups = {};
  var i;
  groups.selectedGroup = null;
  groups.SatGroup = SatGroup;

  function SatGroup (groupType, data) {
    var satId;
    this.sats = [];
    this.sats2 = [];
    if (groupType === 'intlDes') {
      for (i = 0; i < data.length; i++) {
        var theSatId = getIdFromIntlDes(data[i]);
        if (theSatId === null) continue;
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isIntlDes: true
        });
        this.sats2[theSatId] = {
          satId: data[i],
          isIntlDes: true
        };
      }
    } else if (groupType === 'nameRegex') {
      data = searchNameRegex(data);
      for (i = 0; i < data.length; i++) {
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[data[i]] = {
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    } else if (groupType === 'countryRegex') {
      data = searchCountryRegex(data);
      for (i = 0; i < data.length; i++) {
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[data[i]] = {
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    } else if (groupType === 'objNum') {
      for (i = 0; i < data.length; i++) {
        satId = getIdFromObjNum(data[i]);
        if (satId === null) continue;
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: satId,
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[satId] = {
          satId: satId,
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    } else if (groupType === 'idList') {
      for (i = 0; i < data.length; i++) {
        // TODO: Ugly Fix Later
        this.sats.push({
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        });
        this.sats2[data[i]] = {
          satId: data[i],
          isSCC_NUM: true //Forces Highlighting of Obj Num
        };
      }
    }
  }

  groups.hasSat = function (id) {
      if (groups.selectedGroup.sats2[id]) {
        return true;
      } else {
        return false;
      }
    // var len = groups.selectedGroup.sats.length;
    // for (var i = 0; i < len; i++) {
    //   if (groups.selectedGroup.sats[i].satId === id) return true;
    // }
    // return false;
  };
  groups.updateOrbits = function (group) {
    // What calls the orbit buffer when selected a group from the menu.
    for (var i = 0; i < group.sats.length; i++) {
      orbitDisplay.updateOrbitBuffer(group.sats[i].satId);
    }
  };
  groups.forEach = function (callback, group) {
    for (var i = 0; i < group.sats.length; i++) {
      callback(group.sats[i].satId);
    }
  };

  groups.selectGroup = function (group) {
    if (group === null || group === undefined) {
      return;
    }
    groups.selectedGroup = group;
    groups.updateOrbits(groups.selectedGroup);
    satSet.setColorScheme(ColorScheme.group);
  };
  groups.clearSelect = function () {
    groups.selectedGroup = null;
    if (satSet.currentThe)
    if (settingsManager.currentColorScheme === ColorScheme.default || settingsManager.currentColorScheme === ColorScheme.onlyFOV) {
      if (settingsManager.isOnlyFOVChecked) { satSet.setColorScheme(ColorScheme.onlyFOV, true); }
      if (!settingsManager.isOnlyFOVChecked) { satSet.setColorScheme(ColorScheme.default, true); }
    }
  };
  groups.init = function () {
    groupsCruncher = new Worker('js/group-cruncher.js');
    groupsCruncher.onmessage = function (m) {
      groups.Canada = m.data.Canada;
      groups.China = m.data.China;
      groups.France = m.data.France;
      groups.India = m.data.India;
      groups.Israel = m.data.Israel;
      groups.Japan = m.data.Japan;
      groups.Russia = m.data.Russia;
      groups.UnitedKingdom = m.data.UnitedKingdom;
      groups.UnitedStates = m.data.UnitedStates;
      groups.SpaceStations = m.data.SpaceStations;
      groups.GlonassGroup = m.data.GlonassGroup;
      groups.GalileoGroup = m.data.GalileoGroup;
      groups.GPSGroup = m.data.GPSGroup;
      groups.AmatuerRadio = m.data.AmatuerRadio;
      groups.MilitarySatellites = m.data.MilitarySatellites;
      $('#countries-menu-button').show();
      groupsCruncher.terminate();
    };

  };

  window.groups = groups;
})();
