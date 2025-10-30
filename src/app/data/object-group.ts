import { BaseObject, DetailedSatellite } from '@ootk/src/main';
import { MissileObject } from './catalog-manager/MissileObject';
import { CatalogSearch } from './catalog-search';
import { getCountryMapList } from './catalogs/countries';
import { ServiceLocator } from '@app/engine/core/service-locator';

export enum GroupType {
  ALL = 0,
  YEAR = 1,
  YEAR_OR_LESS = 2,
  INTLDES = 3,
  NAME_REGEX = 4,
  COUNTRY = 5,
  COUNTRY_REGEX = 6,
  SHAPE_STRING = 7,
  BUS_STRING = 8,
  SCC_NUM = 9,
  ID_LIST = 10,
  PAYLOAD_NAME_REGEX = 11,
}

export type GroupData = {
  [GroupType.ALL]: undefined;
  [GroupType.YEAR]: number;
  [GroupType.YEAR_OR_LESS]: number;
  [GroupType.INTLDES]: string[];
  [GroupType.NAME_REGEX]: RegExp
  [GroupType.COUNTRY]: string;
  [GroupType.COUNTRY_REGEX]: RegExp;
  [GroupType.SHAPE_STRING]: string;
  [GroupType.BUS_STRING]: string;
  [GroupType.SCC_NUM]: number[];
  [GroupType.ID_LIST]: number[];
  [GroupType.PAYLOAD_NAME_REGEX]: RegExp;
};

export class ObjectGroup<T extends GroupType> {
  ids: number[] = [];

  constructor(type: T, data: GroupData[T] | null = null) {
    const objData = ServiceLocator.getCatalogManager().objectCache;

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
        this.ids = CatalogSearch.year(ServiceLocator.getCatalogManager().getSats(), data as GroupData[GroupType.YEAR])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: DetailedSatellite) => typeof sat.id !== 'undefined' && !sat.isStatic())
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.YEAR_OR_LESS:
        this.ids = CatalogSearch.yearOrLess(ServiceLocator.getCatalogManager().getSats(), data as GroupData[GroupType.YEAR_OR_LESS])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: DetailedSatellite) => typeof sat.id !== 'undefined' && !sat.isStatic())
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.INTLDES:
        this.ids = (data as GroupData[GroupType.INTLDES])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((intlDes: string) => ServiceLocator.getCatalogManager().intlDes2id(intlDes))
          .filter((id: number | null) => id !== null);
        break;
      case GroupType.NAME_REGEX:
        this.ids = CatalogSearch.objectName(objData, data as GroupData[GroupType.NAME_REGEX])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((obj: BaseObject) => obj.id);
        break;
      case GroupType.PAYLOAD_NAME_REGEX:
        this.ids = CatalogSearch.objectName(objData, data as GroupData[GroupType.PAYLOAD_NAME_REGEX])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((obj: BaseObject) => obj.id)
          .filter((id: number) => objData[id].isPayload());
        break;
      case GroupType.COUNTRY:
        this.createGroupByCountry_(data as GroupData[GroupType.COUNTRY], ServiceLocator.getCatalogManager().getSats());
        break;
      case GroupType.COUNTRY_REGEX:
        this.ids = CatalogSearch.country(ServiceLocator.getCatalogManager().getSats(), data as GroupData[GroupType.COUNTRY_REGEX])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((obj: BaseObject) => obj.id);
        break;
      case GroupType.SHAPE_STRING:
        this.ids = CatalogSearch.shape(ServiceLocator.getCatalogManager().getSats(), data as GroupData[GroupType.SHAPE_STRING])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.BUS_STRING:
        this.ids = CatalogSearch.bus(ServiceLocator.getCatalogManager().getSats(), data as GroupData[GroupType.BUS_STRING])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: DetailedSatellite) => sat.id);
        break;
      case GroupType.SCC_NUM:
        this.ids = (data as GroupData[GroupType.SCC_NUM])
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sccNum: number) => ServiceLocator.getCatalogManager().sccNum2Id(sccNum))
          .filter((id: number | null) => id !== null);
        break;
      case GroupType.ID_LIST:
        this.ids = (data as GroupData[GroupType.ID_LIST]).slice(0, settingsManager.maxOribtsDisplayed).map((id: number) => id);
        break;
      default:
        throw new Error('Unknown group type');
    }
  }

  hasObject = (id: number) => this.ids.findIndex((id_) => id_ === id) !== -1;

  // What calls the orbit buffer when selected a group from the menu.
  updateOrbits = (): this => {
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    this.ids.forEach((id) => {
      const obj = ServiceLocator.getCatalogManager().objectCache[id];

      if (obj.isMissile()) {
        orbitManagerInstance.updateOrbitBuffer(obj.id, obj as MissileObject);
      } else {
        orbitManagerInstance.updateOrbitBuffer(id);
      }
    });

    return this;
  };

  private createGroupByCountry_(data: GroupData[GroupType.COUNTRY], satData: DetailedSatellite[]) {
    // Map country name to country code
    const expandedData = data.split('|').map((countryName: string) => getCountryMapList()[countryName]);
    // Concat data with expandedData using | as a delimiter

    data = `${data}|${expandedData.join('|')}`;
    this.ids = satData
      .filter((sat: DetailedSatellite) => data.split('|').includes(sat.country) && !sat.sccNum5.startsWith('T'))
      // .slice(0, settingsManager.maxOribtsDisplayed)
      // eslint-disable-next-line arrow-body-style
      .map((sat: DetailedSatellite) => {
        return sat.id;
      });
  }
}
