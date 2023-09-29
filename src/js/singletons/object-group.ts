import { keepTrackContainer } from '../container';
import { CatalogManager, GetSatType, MissileObject, OrbitManager, SatObject, Singletons } from '../interfaces';
import { CatalogSearch } from '../static/catalog-search';

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
  objects: number[] = [];

  constructor(type: GroupType, data: any) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    switch (type) {
      case GroupType.ALL:
        catalogManagerInstance.satData.every((sat) => {
          if (typeof sat.sccNum !== 'undefined') {
            this.objects.push(sat.id);
          }
          // Stop when we hit the max number of orbits to display
          return this.objects.length <= Math.min(settingsManager.maxOribtsDisplayed, settingsManager.maxOribtsDisplayedDesktopAll);
        });
        break;
      case GroupType.YEAR:
        this.objects = CatalogSearch.year(catalogManagerInstance.satData, data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: SatObject) => typeof sat.id !== 'undefined' && !sat.static)
          .map((sat: SatObject) => sat.id);
        break;
      case GroupType.YEAR_OR_LESS:
        this.objects = CatalogSearch.yearOrLess(catalogManagerInstance.satData, data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .filter((sat: SatObject) => typeof sat.id !== 'undefined' && !sat.static)
          .map((sat: SatObject) => sat.id);
        break;
      case GroupType.INTLDES:
        this.objects = data
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((intlDes: string) => catalogManagerInstance.getIdFromIntlDes(intlDes))
          .filter((id: number | null) => id !== null);
        break;
      case GroupType.NAME_REGEX:
        this.objects = CatalogSearch.objectName(catalogManagerInstance.satData, data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => sat.id);
        break;
      case GroupType.COUNTRY:
        this.objects = catalogManagerInstance.satData
          .filter((sat: SatObject) => data.split('|').includes(sat.country))
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => sat.id);
        break;
      case GroupType.COUNTRY_REGEX:
        this.objects = CatalogSearch.country(catalogManagerInstance.satData, data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => sat.id);
        break;
      case GroupType.SHAPE_REGEX:
        this.objects = CatalogSearch.shape(catalogManagerInstance.satData, data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => sat.id);
        break;
      case GroupType.BUS_REGEX:
        this.objects = CatalogSearch.bus(catalogManagerInstance.satData, data)
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sat: SatObject) => sat.id);
        break;
      case GroupType.SCC_NUM:
        this.objects = data
          // .slice(0, settingsManager.maxOribtsDisplayed)
          .map((sccNum: number) => catalogManagerInstance.getIdFromObjNum(sccNum))
          .filter((id: number | null) => id !== null);
        break;
      case GroupType.ID_LIST:
        this.objects = data.slice(0, settingsManager.maxOribtsDisplayed).map((id: number) => id);
        break;
      default:
        throw new Error('Unknown group type');
    }
  }

  public hasObject = (id: number) => this.objects.findIndex((id_) => id_ === id) !== -1;

  // What calls the orbit buffer when selected a group from the menu.
  public updateOrbits = (): ObjectGroup => {
    const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    this.objects.forEach((id) => {
      if (catalogManagerInstance.satData[id].missile) {
        const missile = <MissileObject>(<unknown>id);
        orbitManagerInstance.updateOrbitBuffer(missile.id, {
          missile: true,
          latList: missile.latList,
          lonList: missile.lonList,
          altList: missile.altList,
        });
      } else {
        orbitManagerInstance.updateOrbitBuffer(id);
      }
    });

    return this;
  };

  public updateIsInGroup(): ObjectGroup {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    this.objects.forEach((id: number) => {
      catalogManagerInstance.getSat(id, GetSatType.EXTRA_ONLY).isInGroup = true;
    });

    return this;
  }

  public clear(): ObjectGroup {
    if (this.objects.length === 0) return this;
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    this.objects.forEach((id: number) => {
      catalogManagerInstance.getSat(id, GetSatType.EXTRA_ONLY).isInGroup = false;
    });

    return this;
  }
}
