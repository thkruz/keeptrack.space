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
  groups.list = {};
  groups.SatGroup = SatGroup;

  function SatGroup (groupType, data) {
    var satId;
    this.sats = [];
    if (groupType === 'intlDes') {
      for (i = 0; i < data.length; i++) {
        var theSatId = satSet.getIdFromIntlDes(data[i]);
        if (theSatId === null) continue;
        this.sats.push({
          satId: theSatId,
          isIntlDes: true
        });
      }
    } else if (groupType === 'nameRegex') {
      data = satSet.searchNameRegex(data);
      for (i = 0; i < data.length; i++) {
        this.sats.push({
          satId: data[i]
        });
      }
    } else if (groupType === 'countryRegex') {
      data = satSet.searchCountryRegex(data);
      for (i = 0; i < data.length; i++) {
        this.sats.push({
          satId: data[i]
        });
      }
    } else if (groupType === 'objNum') {
      for (i = 0; i < data.length; i++) {
        satId = satSet.getIdFromObjNum(data[i]);
        if (satId === null) continue;
        this.sats.push({
          satId: satId,
          isSCC_NUM: true
        });
      }
    } else if (groupType === 'idList') {
      for (i = 0; i < data.length; i++) {
        this.sats.push({
          satId: data[i]
        });
      }
    }
  }

  SatGroup.prototype.hasSat = function (id) {
    var len = this.sats.length;
    for (var i = 0; i < len; i++) {
      if (this.sats[i].satId === id) return true;
    }
    return false;
  };
  SatGroup.prototype.updateOrbits = function () {
    // What calls the orbit buffer when selected a group from the menu.
    for (var i = 0; i < this.sats.length; i++) {
      orbitDisplay.updateOrbitBuffer(this.sats[i].satId);
    }
  };
  SatGroup.prototype.forEach = function (callback) {
    for (var i = 0; i < this.sats.length; i++) {
      callback(this.sats[i].satId);
    }
  };

  groups.selectGroup = function (group) {
    if (group === null || group === undefined) {
      return;
    }
    groups.selectedGroup = group;
    group.updateOrbits();
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
    var $search = $('#search');
    groupsCruncher = new Worker('js/group-cruncher.js');
    groupsCruncher.onmessage = function (m) {
      groups.list = m.data;
      // TODO: This should enable groups in the UI
      groupsCruncher.terminate();
    };

  };

  window.groups = groups;
})();
