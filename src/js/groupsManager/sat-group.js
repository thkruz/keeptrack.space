class SatGroup {
  constructor(groupType, data, satSet) {
    var satId;
    var i = 0;
    this.sats = [];
    if (groupType === 'all') {
      data = satSet.getSatData();
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) break;
        if (typeof data[i].SCC_NUM == 'undefined') continue;
        this.sats.push({
          satId: data[i].id,
          isIntlDes: true,
        });
      }
    }
    if (groupType === 'year') {
      data = satSet.searchYear(data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i],
        });
      }
    } else if (groupType === 'yearOrLess') {
      data = satSet.searchYearOrLess(data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i],
        });
      }
    } else if (groupType === 'intlDes') {
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        var theSatId = satSet.getIdFromIntlDes(data[i]);
        if (theSatId === null) continue;
        this.sats.push({
          satId: theSatId,
          isIntlDes: true,
        });
      }
    } else if (groupType === 'nameRegex') {
      data = satSet.searchNameRegex(data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i],
        });
      }
    } else if (groupType === 'countryRegex') {
      data = satSet.searchCountryRegex(data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i],
        });
      }
    } else if (groupType === 'objNum') {
      for (i = 0; i < data.length; i++) {
        satId = satSet.getIdFromObjNum(data[i]);
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        if (satId === null) continue;
        this.sats.push({
          satId: satId,
          isObjnum: true,
        });
      }
    } else if (groupType === 'idList') {
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i],
        });
      }
    }

    this.hasSat = (id) => {
      var len = this.sats.length;
      for (var i = 0; i < len; i++) {
        if (this.sats[i].satId === id) return true;
      }
      return false;
    };
    this.updateOrbits = (orbitManager) => {
      // What calls the orbit buffer when selected a group from the menu.
      for (var i = 0; i < this.sats.length; i++) {
        if (this.sats[i].missile) {
          orbitManager.updateOrbitBuffer(this.sats[i].id, null, null, null, true, this.sats[i].latList, this.sats[i].lonList, this.sats[i].altList, this.sats[i].startTime);
        } else {
          orbitManager.updateOrbitBuffer(this.sats[i].satId);
        }
      }
    };
    this.forEach = (callback) => {
      for (var i = 0; i < this.sats.length; i++) {
        callback(this.sats[i].satId);
      }
    };
  }
}

export { SatGroup };
