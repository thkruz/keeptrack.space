import { CatalogManager, MissileObject, OrbitManager, SatGroupCollection, SatObject } from '../api/keepTrackTypes';

export class SatGroup {
  sats: SatGroupCollection[];
  hasSat: any;
  updateOrbits: any;
  forEach: any;

  constructor(groupType: string, data: any[], satSet: CatalogManager) {
    switch (groupType) {
      case 'all':
        this.sats = [];
        satSet.satData.every((sat) => {
          if (typeof sat.sccNum !== 'undefined') {
            this.sats.push({
              satId: sat.id,
              isIntlDes: true,
            });
          }
          return !(this.sats.length > settingsManager.maxOribtsDisplayed);
        });
        break;
      case 'year':
        this.sats = satSet
          .searchYear(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'yearOrLess':
        this.sats = satSet
          .searchYearOrLess(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'intlDes':
        this.sats = data
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((intlDes: string) => satSet.getIdFromIntlDes(intlDes))
          .filter((sccNUm: number | null) => sccNUm !== null)
          .map((sccNUm: number) => ({
            satId: sccNUm,
            isIntlDes: true,
          }));
        break;
      case 'nameRegex':
        this.sats = satSet
          .searchNameRegex(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'countryRegex':
        this.sats = satSet
          .searchCountryRegex(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'objNum':
        this.sats = data
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((id: number) => satSet.getIdFromObjNum(id))
          .filter((sccNUm: number | null) => sccNUm !== null)
          .map((sccNUm: number) => ({
            satId: sccNUm,
            isObjnum: true,
          }));
        break;
      case 'idList':
        this.sats = data.slice(0, settingsManager.maxOribtsDisplayed).map((id: number) => ({
          satId: id,
        }));
        break;
      default:
        throw new Error('Unknown group type');
    }

    this.hasSat = (id: number) => this.sats.findIndex((sat) => sat.satId === id) !== -1;

    // What calls the orbit buffer when selected a group from the menu.
    this.updateOrbits = (orbitManager: OrbitManager) => {
      this.sats.forEach((sat) => {
        if (sat.missile) {
          const missile = <MissileObject>(<unknown>sat);
          orbitManager.updateOrbitBuffer(missile.id, null, null, null, true, missile.latList, missile.lonList, missile.altList, missile.startTime);
        } else {
          orbitManager.updateOrbitBuffer(sat.satId);
        }
      });
    };

    this.forEach = (callback: any) => {
      for (var i = 0; i < this.sats.length; i++) {
        callback(this.sats[i]?.satId);
      }
    };
  }
}
