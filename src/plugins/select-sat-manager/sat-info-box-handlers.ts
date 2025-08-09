import { GetSatType, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { openColorbox } from '@app/lib/colorbox';
import { getEl, hideEl } from '@app/lib/get-el';
import { lineManagerInstance } from '@app/singletons/draw-manager/line-manager';
import { LineColors } from '@app/singletons/draw-manager/line-manager/line';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { SearchManager } from '@app/singletons/search-manager';
import { CatalogSearch } from '@app/static/catalog-search';
import { BaseObject, DetailedSatellite } from 'ootk';
import { SoundNames } from '../sounds/SoundNames';
import { WatchlistPlugin } from '../watchlist/watchlist';
import { SatInfoBox } from './sat-info-box';
import { SelectSatManager } from './select-sat-manager';

export class SatInfoBoxHandlers {
  static nearObjectsLinkClick_(distance: number = 100): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (keepTrackApi.getPlugin(SelectSatManager)!.selectedSat === -1) {
      return;
    }
    const selectedSatelliteId = keepTrackApi.getPlugin(SelectSatManager)!.selectedSat;
    const sat = catalogManagerInstance.getObject(selectedSatelliteId, GetSatType.POSITION_ONLY);

    if (!sat) {
      errorManagerInstance.warn('No satellite selected!');

      return;
    }

    const SccNums: string[] = [];
    let pos = sat.position;
    const posXmin = pos.x - distance;
    const posXmax = pos.x + distance;
    const posYmin = pos.y - distance;
    const posYmax = pos.y + distance;
    const posZmin = pos.z - distance;
    const posZmax = pos.z + distance;

    (<HTMLInputElement>getEl('search')).value = '';
    for (let i = 0; i < catalogManagerInstance.numSatellites; i++) {
      const satelliteAtIndex = catalogManagerInstance.getObject(i, GetSatType.POSITION_ONLY);

      if (!satelliteAtIndex) {
        errorManagerInstance.debug(`No satellite at index ${i}`);
        continue;
      }

      pos = satelliteAtIndex.position;
      if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
        const sat = catalogManagerInstance.getSat(i, GetSatType.EXTRA_ONLY);

        if (sat) {
          SccNums.push(sat.sccNum);
        }
      }
    }

    for (let i = 0; i < SccNums.length; i++) {
      (<HTMLInputElement>getEl('search')).value += i < SccNums.length - 1 ? `${SccNums[i]},` : SccNums[i];
    }

    keepTrackApi.getUiManager().doSearch((<HTMLInputElement>getEl('search')).value.toString());
  }

  static nearOrbitsLink_() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const selectedSatellite = catalogManagerInstance.getSat(keepTrackApi.getPlugin(SelectSatManager)!.selectedSat);

    if (!selectedSatellite) {
      errorManagerInstance.warn('No satellite selected!');

      return;
    }

    const nearbyObjects = CatalogSearch.findObjsByOrbit(catalogManagerInstance.getSats(), selectedSatellite);
    const searchStr = SearchManager.doArraySearch(catalogManagerInstance, nearbyObjects);

    keepTrackApi.getUiManager().searchManager.doSearch(searchStr, false);
  }

  static allObjectsLink_(): void {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const selectedSatelliteData = catalogManagerInstance.getSat(keepTrackApi.getPlugin(SelectSatManager)!.selectedSat, GetSatType.EXTRA_ONLY);

    if (!selectedSatelliteData) {
      return;
    }
    const searchStr = selectedSatelliteData.intlDes.slice(0, 8);

    keepTrackApi.getUiManager().doSearch(searchStr);
    (<HTMLInputElement>getEl('search')).value = searchStr;
  }

  static drawLineToSun_() {
    lineManagerInstance.createSat2Sun(keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj);
  }

  static drawRicLines_() {
    lineManagerInstance.createSatRicFrame(keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj);
  }

  static drawLineToEarth_() {
    lineManagerInstance.createSatToRef(keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj, [0, 0, 0], LineColors.PURPLE);
  }

  static drawLineToSat_() {
    if (keepTrackApi.getPlugin(SelectSatManager)!.secondarySat === -1) {
      keepTrackApi.getUiManager().toast('No Secondary Satellite Selected', ToastMsgType.caution);

      return;
    }

    lineManagerInstance.createObjToObj(keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj, keepTrackApi.getPlugin(SelectSatManager)!.secondarySatObj, LineColors.BLUE);
  }

  static openKayhanLink_(e: MouseEvent): void {
    e.preventDefault();

    const obj = keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj;

    if (obj instanceof DetailedSatellite) {
      openColorbox(`https://www.satcat.com/sats/${obj.sccNum6}`, {
        title: `Satcat by Kayhan Space - ${obj.name}`,
      });
    } else {
      keepTrackApi.toast('Selected object is not a satellite.', ToastMsgType.caution);
    }
  }

  static openCelestrakLink_(e: MouseEvent): void {
    e.preventDefault();

    const obj = keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj;

    if (obj instanceof DetailedSatellite) {
      const sccNum6 = obj.sccNum6.replace(/^0+/u, '');

      openColorbox(`https://celestrak.org/satcat/table-satcat.php?CATNR=${sccNum6}&MAX=500`, {
        title: `CelesTrak - ${obj.name}`,
      });
    } else {
      keepTrackApi.toast('Selected object is not a satellite.', ToastMsgType.caution);
    }
  }

  static openHeavensAboveLink_(e: MouseEvent): void {
    e.preventDefault();

    const obj = keepTrackApi.getPlugin(SelectSatManager)!.primarySatObj;
    const sensor = keepTrackApi.getSensorManager().currentSensors[0];
    const sensorNameSlug = sensor ? sensor.name.replace(/\s+/gu, '-') : 'Unknown';

    if (obj instanceof DetailedSatellite) {
      const sensorInfo = sensor ? `&lat=${sensor.lat}&lng=${sensor.lon}&loc=${sensorNameSlug}&alt=${sensor.alt}` : '';

      openColorbox(`https://www.heavens-above.com/PassSummary.aspx?satid=${obj.sccNum6}${sensorInfo}&tz=UCT`, {
        title: `Heavens Above - ${obj.name}`,
      });
    } else {
      keepTrackApi.toast('Selected object is not a satellite.', ToastMsgType.caution);
    }
  }

  static addRemoveWatchlist_() {
    const watchlistPlugin = keepTrackApi.getPlugin(WatchlistPlugin);

    if (watchlistPlugin) {
      const id = keepTrackApi.getPlugin(SelectSatManager)!.selectedSat;

      keepTrackApi.getSoundManager().play(SoundNames.CLICK);
      if (watchlistPlugin.isOnWatchlist(id)) {
        watchlistPlugin.removeSat(id);
      } else {
        watchlistPlugin.addSat(id);
      }
    }
  }

  /**
   * Selects a satellite, missile, or sensor object and updates the satellite info box accordingly.
   *
   * @param obj - The satellite, missile, or sensor object to be selected.
   */
  static selectSat(satInfoBox: SatInfoBox, obj?: BaseObject): void {
    if (obj) {
      if (obj.isSensor()) {
        return;
      }

      satInfoBox.show();

      const satInfoBoxDom = getEl(SatInfoBox.containerId_);
      // Get the height of the DOM
      const searchBoxHeight = keepTrackApi.getUiManager().searchManager.isResultsOpen ? satInfoBoxDom?.getBoundingClientRect().height : 0;
      const bottomMenuTopVar = document.documentElement.style.getPropertyValue('--bottom-menu-top').split('px')[0];
      const curVal = document.documentElement.style.getPropertyValue('--search-box-bottom');

      if (curVal !== `${searchBoxHeight + bottomMenuTopVar}px`) {
        document.documentElement.style.setProperty('--search-box-bottom', `${searchBoxHeight + bottomMenuTopVar}px`);
      }

      if (obj.isSatellite()) {
        SatInfoBoxHandlers.setSatInfoBoxSatellite_();
      } else {
        SatInfoBoxHandlers.setSatInfoBoxMissile_();
      }
    }
  }

  private static setSatInfoBoxMissile_() {
    // TODO: There is an interdependency with SatCoreInfoBox and SelectSatManager.
    ['sat-apogee', 'sat-perigee', 'sat-inclination', 'sat-eccentricity', 'sat-raan', 'sat-argPe', 'sat-stdmag', 'sat-configuration', 'sat-elset-age', 'sat-period'].forEach(
      (id) => {
        const el = getEl(id, true);

        if (!el?.parentElement) {
          return;
        }
        hideEl(el.parentElement);
      },
    );

    const satMissionData = getEl('sat-mission-data', true);

    if (satMissionData) {
      satMissionData.style.display = 'none';
    }

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'none';
    }
  }

  private static setSatInfoBoxSatellite_() {
    // TODO: There is an interdependency with SatCoreInfoBox and SelectSatManager.
    ['sat-apogee', 'sat-perigee', 'sat-inclination', 'sat-eccentricity', 'sat-raan', 'sat-argPe', 'sat-stdmag', 'sat-configuration', 'sat-elset-age', 'sat-period'].forEach(
      (id) => {
        const el = getEl(id, true);

        if (!el?.parentElement) {
          return;
        }
        el.parentElement.style.display = 'flex';
      },
    );

    const satMissionData = getEl('sat-mission-data', true);

    if (settingsManager.isMissionDataEnabled) {
      satMissionData!.style.display = 'block';
    } else {
      satMissionData!.style.display = 'none';
    }

    const satIdentifierData = getEl('sat-identifier-data', true);

    if (satIdentifierData) {
      satIdentifierData.style.display = 'block';
    }
  }

  static onKeyDownLowerI(satInfoBox: SatInfoBox, key: string): void {
    if (key !== 'i') {
      return;
    }

    satInfoBox.toggle();
  }
}
