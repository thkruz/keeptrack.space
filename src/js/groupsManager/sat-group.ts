import { CatalogManager, MissileObject, OrbitManager } from '../api/keepTrack';

export class SatGroup {
  sats: any;
  hasSat: any;
  updateOrbits: any;
  forEach: any;

  constructor(groupType: string, data: any, satSet: CatalogManager) {
    var satId;
    var i = 0;
    this.sats = [];
    if (groupType === 'all') {
      data = satSet.satData;
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
      data = satSet.searchYear(satSet.satData, data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i].id,
        });
      }
    } else if (groupType === 'yearOrLess') {
      data = satSet.searchYearOrLess(satSet.satData, data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i].id,
        });
      }
    } else if (groupType === 'intlDes') {
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        const satId = satSet.getIdFromIntlDes(data[i]);
        if (satId === null) continue;
        this.sats.push({
          satId: satId,
          isIntlDes: true,
        });
      }
    } else if (groupType === 'nameRegex') {
      data = satSet.searchNameRegex(satSet.satData, data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i],
        });
      }
    } else if (groupType === 'countryRegex') {
      data = satSet.searchCountryRegex(satSet.satData, data);
      for (i = 0; i < data.length; i++) {
        if (this.sats.length > settingsManager.maxOribtsDisplayed) continue;
        this.sats.push({
          satId: data[i].id,
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

    this.hasSat = (id: number) => {
      const len = this.sats.length;
      for (let i = 0; i < len; i++) {
        if (this.sats[i].satId === id) return true;
      }
      return false;
    };
    this.updateOrbits = (orbitManager: OrbitManager) => {
      // What calls the orbit buffer when selected a group from the menu.
      for (var i = 0; i < this.sats.length; i++) {
        if (this.sats[i].missile) {
          const missile: MissileObject = this.sats[i];
          orbitManager.updateOrbitBuffer(missile.id, null, null, null, true, missile.latList, missile.lonList, missile.altList, missile.startTime);
        } else {
          orbitManager.updateOrbitBuffer(this.sats[i]?.satId);
        }
      }
    };
    this.forEach = (callback: any) => {
      for (var i = 0; i < this.sats.length; i++) {
        callback(this.sats[i]?.satId);
      }
    };
  }
}
