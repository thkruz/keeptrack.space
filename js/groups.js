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
  groups.selectedGroup = null;
  groups.SatGroup = SatGroup;

  function SatGroup (groupType, data) {
    var satId;
    var i = 0;
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
          isObjnum: true
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

  // Make this available to other functions without renamming it
  groups.SatGroup = SatGroup;

  groups.selectGroup = function (group) {
    if (group === null || group === undefined) { return; }
    groups.updateIsInGroup(groups.selectedGroup, group);
    groups.selectedGroup = group;
    group.updateOrbits();
    settingsManager.currentColorScheme = ColorScheme.group;
  };
  groups.updateIsInGroup = function (oldgroup, newgroup) {
    var sat;
    if (oldgroup !== null && oldgroup !== undefined) {
      for (i = 0; i < oldgroup.sats.length; i++) {
        sat = satSet.getSatExtraOnly(oldgroup.sats[i].satId);
        sat.isInGroup = false;
      }
    }

    if (newgroup === null || newgroup === undefined) { return; }

    for (i = 0; i < newgroup.sats.length; i++) {
      sat = satSet.getSatExtraOnly(newgroup.sats[i].satId);
      sat.isInGroup = true;
    }
  };
  groups.clearSelect = function () {
    groups.updateIsInGroup(groups.selectedGroup, null);
    groups.selectedGroup = null;
  };
  groups.init = function () {
    // Might not be needed anymore
  };

  window.groups = groups;
})();
