import { BaseObject, DetailedSatellite } from 'ootk';
import { countryMapList } from '../catalogs/countries';
import { CatalogSearch } from '../static/catalog-search';
import { keepTrackApi } from './../keepTrackApi';
import { MissileObject } from './catalog-manager/MissileObject';

export enum GroupType {
  ALL = 0,
  YEAR = 1,
  YEAR_OR_LESS = 2,
  INTLDES = 3,
  NAME_REGEX = 4,
  COUNTRY = 5,
  COUNTRY_REGEX = 6,
  SHAPE_REGEX = 7,
  BUS_REGEX = 8,
  SCC_NUM = 9,
  ID_LIST = 10,
}

export class ObjectGroup {
  ids: number[] = [];

  constructor(type: GroupType, data: any) {
    const objData = keepTrackApi.getCatalogManager().objectCache;
    switch (type) {
      case GroupType.ALL:
        objData.every((sat) => {
          if (sat.isSatellite()) {
            this.ids.push(sat.id);
          }
          // Stop when we hit the max number of orbits to display
          return this.ids.length <= Math.min(settingsManager.maxOribtsDisplayed, settingsManager.maxOribtsDisplayedDesktopAll);
        });
        break;
      case GroupType.YEAR:
        this.ids = CatalogSearch.year(keepTrackApi.getCatalogManager().getSats(), data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: DetailedSatellite) => typeof sat.id !== 'undefined' && !sat.isStatic())
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.YEAR_OR_LESS:
        this.ids = CatalogSearch.yearOrLess(keepTrackApi.getCatalogManager().getSats(), data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: DetailedSatellite) => typeof sat.id !== 'undefined' && !sat.isStatic())
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.INTLDES:
        this.ids = data
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((intlDes: string) => keepTrackApi.getCatalogManager().intlDes2id(intlDes))
          .filter((id: number | null) => id !== null);
        break;
      case GroupType.NAME_REGEX:
        this.ids = CatalogSearch.objectName(objData, data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((obj: BaseObject) => obj.id);
        break;
      case GroupType.COUNTRY:
        this.createGroupByCountry_(data, keepTrackApi.getCatalogManager().getSats());
        break;
      case GroupType.COUNTRY_REGEX:
        this.ids = CatalogSearch.country(keepTrackApi.getCatalogManager().getSats(), data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((obj: BaseObject) => obj.id);
        break;
      case GroupType.SHAPE_REGEX:
        this.ids = CatalogSearch.shape(keepTrackApi.getCatalogManager().getSats(), data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.BUS_REGEX:
        this.ids = CatalogSearch.bus(keepTrackApi.getCatalogManager().getSats(), data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.SCC_NUM:
        this.ids = data
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sccNum: number) => keepTrackApi.getCatalogManager().sccNum2Id(sccNum))
          .filter((id: number | null) => id !== null);
        break;
      case GroupType.ID_LIST:
        this.ids = data.slice(0, settingsManager.maxOribtsDisplayed).map((id: number) => id);
        break;
      default:
        throw new Error('Unknown group type');
    }
  }

  hasObject = (id: number) => this.ids.findIndex((id_) => id_ === id) !== -1;

  // What calls the orbit buffer when selected a group from the menu.
  updateOrbits = (): this => {
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    this.ids.forEach((id) => {
      const obj = keepTrackApi.getCatalogManager().objectCache[id];
      if (obj.isMissile()) {
        orbitManagerInstance.updateOrbitBuffer(obj.id, obj as MissileObject);
      } else {
        orbitManagerInstance.updateOrbitBuffer(id);
      }
    });

    return this;
  };

  private createGroupByCountry_(data: any, satData: DetailedSatellite[]) {
    // Map country name to country code
    const expandedData = data.split('|').map((countryName: string) => countryMapList[countryName]);
    // Concat data with expandedData using | as a delimiter
    data = `${data}|${expandedData.join('|')}`;
    this.ids = satData
      .filter((sat: DetailedSatellite) => data.split('|').includes(sat.country))
      // .slice(0, settingsManager.maxOribtsDisplayed)
      // eslint-disable-next-line arrow-body-style
      .map((sat: DetailedSatellite) => {
        return sat.id;
      });
  }
}
