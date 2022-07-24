import { CatalogManager, MissileObject, OrbitManager, SatGroupCollection, SatObject } from '../api/keepTrackTypes';
import { country } from '../satSet/search';

export class SatGroup {
  sats: SatGroupCollection[];

  constructor(groupType: string, data: any, satSet: CatalogManager) {
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
          return this.sats.length <= Math.min(settingsManager.maxOribtsDisplayed, settingsManager.maxOribtsDisplayedDesktopAll);
        });
        break;
      case 'year':
        this.sats = satSet.search
          .year(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: SatObject) => typeof sat.id !== 'undefined' && !sat.static)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'yearOrLess':
        this.sats = satSet.search
          .yearOrLess(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: SatObject) => typeof sat.id !== 'undefined' && !sat.static)
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
        this.sats = satSet.search
          .name(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'countryRegex':
        this.sats = country(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'shapeRegex':
        this.sats = satSet.search
          .shape(satSet.satData, data)
          .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => ({
            satId: sat.id,
          }));
        break;
      case 'busRegex':
        this.sats = satSet.search
          .bus(satSet.satData, data)
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
  }

  public hasSat = (id: number) => this.sats.findIndex((sat) => sat.satId === id) !== -1;

  // What calls the orbit buffer when selected a group from the menu.
  public updateOrbits = (orbitManager: OrbitManager) => {
    this.sats.forEach((sat) => {
      if (sat.missile) {
        const missile = <MissileObject>(<unknown>sat);
        orbitManager.updateOrbitBuffer(missile.id, null, null, null, {
          missile: true,
          latList: missile.latList,
          lonList: missile.lonList,
          altList: missile.altList,
        });
      } else {
        orbitManager.updateOrbitBuffer(sat.satId);
      }
    });
  };

  public forEach = (callback: any) => {
    for (let i = 0; i < this.sats.length; i++) {
      callback(this.sats[i]?.satId);
    }
  };
}
