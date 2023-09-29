import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, GetSatType, SatObject, SensorManager, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { fadeIn, fadeOut } from '@app/js/lib/fade';
import { getEl } from '@app/js/lib/get-el';
import { SpaceObjectType } from '@app/js/lib/space-object-type';
import { CameraType, mainCameraInstance } from '@app/js/singletons/camera';
import { TimeManager } from '@app/js/singletons/time-manager';

import { StandardColorSchemeManager } from '@app/js/singletons/color-scheme-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { TopMenu } from '../top-menu/top-menu';

/**
 * This is the class that manages the selection of objects.
 * It should update the UI on initial selection of a satellite/missile.
 */
export class SelectSatManager extends KeepTrackPlugin {
  lastCssStyle = '';
  isselectedSatNegativeOne = false;
  static PLUGIN_NAME = 'Select Sat Manager';

  constructor() {
    super(SelectSatManager.PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      method: 'updateLoop',
      cbName: 'selectSatManager',
      cb: this.checkIfSelectSatVisible.bind(this),
    });
  }

  checkIfSelectSatVisible() {
    if (keepTrackApi.getPlugin(TopMenu)) {
      const searchVal = keepTrackApi.getUiManager().searchManager.getCurrentSearch();

      // Base CSS Style based on if the search box is open or not
      let cssStyle = searchVal.length > 0 ? 'display: block; max-height:auto;' : 'display: none; max-height:auto;';

      // If a satellite is selected on a desktop computer then shrink the search box
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
      if (window.innerWidth > 1000 && catalogManagerInstance.selectedSat !== -1) cssStyle = cssStyle.replace('max-height:auto', 'max-height:27%');

      // Avoid unnecessary dom updates
      if (cssStyle !== this.lastCssStyle && getEl(TopMenu.SEARCH_RESULT_ID)) {
        this.lastCssStyle = cssStyle;
      }
    }
  }

  selectSat(satId: number) {
    if (settingsManager.isDisableSelectSat) return;
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

    let sat: SatObject | any;

    // If selecting an object
    if (satId !== -1) {
      // Get the satellite object
      sat = catalogManagerInstance.getSat(satId);
      // Selecting a star does nothing
      if (sat.type == SpaceObjectType.STAR) return;
      // Selecting a non-missile non-sensor object does nothing
      if ((!sat.active || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') {
        if (sat.type == SpaceObjectType.PAYLOAD_OWNER || sat.type == SpaceObjectType.PAYLOAD_MANUFACTURER) {
          const searchStr = catalogManagerInstance.satData
            .filter((_sat) => _sat.owner === sat.Code || _sat.manufacturer === sat.Code)
            .map((_sat) => _sat.sccNum)
            .join(',');
          const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
          uiManagerInstance.searchManager.doSearch(searchStr);
          mainCameraInstance.changeZoom(0.9);
        }
        return;
      }
      // stop rotation if it is on
      mainCameraInstance.autoRotate(false);
      mainCameraInstance.panCurrent = {
        x: 0,
        y: 0,
        z: 0,
      };
    }

    mainCameraInstance.isCamSnapMode = false;
    // Don't select -1 twice
    if (!(satId === -1 && this.isselectedSatNegativeOne)) {
      catalogManagerInstance.selectSat(satId);
    }

    // If deselecting an object
    if (satId === -1) {
      const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);
      if (
        colorSchemeManagerInstance.currentColorScheme === colorSchemeManagerInstance.group ||
        (typeof (<HTMLInputElement>getEl('search'))?.value !== 'undefined' && (<HTMLInputElement>getEl('search')).value.length >= 3)
      ) {
        // If group selected
        getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-disabled');
      } else {
        getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-selected');
        getEl('menu-sat-fov', true)?.classList.add('bmenu-item-disabled');
        settingsManager.isSatOverflyModeOn = false;
        catalogManagerInstance.satCruncher.postMessage({
          typ: 'isShowSatOverfly',
          isShowSatOverfly: 'reset',
        });
      }
    }

    // If we deselect an object but had previously selected one then disable/hide stuff
    if (satId === -1 && !this.isselectedSatNegativeOne) {
      mainCameraInstance.fts2default();
      this.isselectedSatNegativeOne = true;

      const rootElement = document.querySelector(':root') as HTMLElement;
      rootElement.style.setProperty('--search-box-bottom', `0px`);
      fadeOut(getEl('sat-infobox', true));

      // Add Grey Out
      getEl('menu-satview', true)?.classList.add('bmenu-item-disabled');
      getEl('menu-editSat', true)?.classList.add('bmenu-item-disabled');
      getEl('menu-map', true)?.classList.add('bmenu-item-disabled');
      getEl('menu-newLaunch', true)?.classList.add('bmenu-item-disabled');
      getEl('menu-breakup', true)?.classList.add('bmenu-item-disabled');
      getEl('menu-plot-analysis', true)?.classList.add('bmenu-item-disabled');
      getEl('menu-plot-analysis2', true)?.classList.add('bmenu-item-disabled');
      getEl('menu-plot-analysis3', true)?.classList.add('bmenu-item-disabled');
    } else if (satId !== -1) {
      if (mainCameraInstance.cameraType == CameraType.DEFAULT) {
        mainCameraInstance.ecLastZoom = mainCameraInstance.zoomLevel();
        if (!sat.static) {
          mainCameraInstance.cameraType = CameraType.FIXED_TO_SAT;
        } else if (typeof sat.staticNum !== 'undefined') {
          sensorManagerInstance.setSensor(null, sat.staticNum);

          if (sensorManagerInstance.currentSensors.length === 0) throw new Error('No sensors found');
          const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
          mainCameraInstance.lookAtLatLon(
            sensorManagerInstance.currentSensors[0].lat,
            sensorManagerInstance.currentSensors[0].lon,
            sensorManagerInstance.currentSensors[0].zoom,
            timeManagerInstance.selectedDate
          );
        }
      }
      this.isselectedSatNegativeOne = false;
      catalogManagerInstance.setSelectedSat(satId);
      sat = catalogManagerInstance.getSat(satId, GetSatType.EXTRA_ONLY);
      if (!sat) return;
      if (sat.type === SpaceObjectType.STAR) {
        this.selectSat(-1);
        return;
      }
      if (sat.static) {
        if (typeof sat.staticNum == 'undefined') return;
        sat = catalogManagerInstance.getSat(satId);
        if (catalogManagerInstance.isSensorManagerLoaded) sensorManagerInstance.setSensor(null, sat.staticNum); // Pass staticNum to identify which sensor the user clicked

        // Todo: Needs to run uiManager.getsensorinfo();

        // if (catalogManagerInstance.isSensorManagerLoaded) sensorManager.curSensorPositon = [sat.position.x, sat.position.y, sat.position.z];
        catalogManagerInstance.setSelectedSat(-1);
        getEl('menu-sensor-info', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-fov-bubble', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-surveillance', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-planetarium', true)?.classList.remove('bmenu-item-disabled');
        getEl('menu-astronomy', true)?.classList.remove('bmenu-item-disabled');
        if (catalogManagerInstance.selectedSat !== -1) {
          getEl('menu-lookangles', true)?.classList.remove('bmenu-item-disabled');
        }
        return;
      }
      mainCameraInstance.camZoomSnappedOnSat = true;
      mainCameraInstance.camDistBuffer = mainCameraInstance.minDistanceFromSatellite;
      mainCameraInstance.camAngleSnappedOnSat = true;

      if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.isSensorSelected()) {
        getEl('menu-lookangles', true)?.classList.remove('bmenu-item-disabled');
      }

      getEl('menu-satview', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-editSat', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-sat-fov', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-map', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-newLaunch', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-plot-analysis', true)?.classList.remove('bmenu-item-disabled');
      getEl('menu-plot-analysis2', true)?.classList.remove('bmenu-item-disabled');
      if (catalogManagerInstance.secondarySat !== -1) {
        getEl('menu-plot-analysis3', true)?.classList.remove('bmenu-item-disabled');
      }
    }

    catalogManagerInstance.setSelectedSat(satId);

    if (satId !== -1) {
      // NOTE: This has to come after keepTrackApi.methods.selectSatData in catalogManagerInstance.setSelectedSat.
      const rootElement = document.querySelector(':root') as HTMLElement;
      const searchBoxHeight = getEl('sat-infobox')?.clientHeight;
      rootElement.style.setProperty('--search-box-bottom', `${searchBoxHeight}px`);
      fadeIn(getEl('sat-infobox'));
    }
  }
}
