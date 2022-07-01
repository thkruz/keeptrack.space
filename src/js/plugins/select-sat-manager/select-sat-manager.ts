import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { Camera, SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { getEl } from '@app/js/lib/helpers';
import { satellite } from '@app/js/satMath/satMath';
import $ from 'jquery';

export let isselectedSatNegativeOne = false;
export const selectSatManager = {
  init: () => {
    keepTrackApi.register({
      method: 'updateLoop',
      cbName: 'gamepad',
      cb: checkIfSelectSatVisible,
    });
  },

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  // prettier-ignore
  selectSat: (satId: number, mainCamera: Camera) => { // NOSONAR
    const { objectManager, satSet, sensorManager, uiManager } = keepTrackApi.programs;

    let sat: SatObject | any;

    // If selecting an object
    if (satId !== -1) {
      // Get the satellite object
      sat = satSet.getSat(satId);
      // Selecting a star does nothing
      if (sat.type == SpaceObjectType.STAR) return;
      // Selecting a non-missile non-sensor object does nothing
      if ((!sat.active || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') {
        if (sat.type == SpaceObjectType.PAYLOAD_OWNER || sat.type == SpaceObjectType.PAYLOAD_MANUFACTURER) {
          const searchStr = satSet.satData
            .filter((_sat) => _sat.owner === sat.Code || _sat.manufacturer === sat.Code)
            .map((_sat) => _sat.sccNum)
            .join(', ');
          uiManager.searchBox.doSearch(searchStr);
        }
        return;
      }
      // stop rotation if it is on
      mainCamera.autoRotate(false);
    }

    mainCamera.isCamSnapMode = false;
    // Don't select -1 twice
    if (!(satId === -1 && isselectedSatNegativeOne)) {
      satSet.selectSat(satId);
    }

    // If deselecting an object
    if (satId === -1) {
      if (
        settingsManager.currentColorScheme === keepTrackApi.programs.colorSchemeManager.group ||
        (typeof (<HTMLInputElement>getEl('search')).value !== 'undefined' && (<HTMLInputElement>getEl('search')).value.length >= 3)
      ) {
        // If group selected
        getEl('menu-sat-fov')?.classList.remove('bmenu-item-disabled');
      } else {
        getEl('menu-sat-fov')?.classList.remove('bmenu-item-selected');
        getEl('menu-sat-fov')?.classList.add('bmenu-item-disabled');
        settingsManager.isSatOverflyModeOn = false;
        satSet.satCruncher.postMessage({
          typ: 'isShowSatOverfly',
          isShowSatOverfly: 'reset',
        });
      }
    }

    // If we deselect an object but had previously selected one then disable/hide stuff
    if (satId === -1 && !isselectedSatNegativeOne) {
      mainCamera.fts2default();
      isselectedSatNegativeOne = true;

      $('#sat-infobox').fadeOut();

      // Add Grey Out
      getEl('menu-lookanglesmultisite')?.classList.add('bmenu-item-disabled');
      getEl('menu-lookangles')?.classList.add('bmenu-item-disabled');
      getEl('menu-satview')?.classList.add('bmenu-item-disabled');
      getEl('menu-editSat')?.classList.add('bmenu-item-disabled');
      getEl('menu-map')?.classList.add('bmenu-item-disabled');
      getEl('menu-newLaunch')?.classList.add('bmenu-item-disabled');
      getEl('menu-breakup')?.classList.add('bmenu-item-disabled');
      getEl('menu-plot-analysis')?.classList.add('bmenu-item-disabled');
      getEl('menu-plot-analysis2')?.classList.add('bmenu-item-disabled');
      getEl('menu-plot-analysis3')?.classList.add('bmenu-item-disabled');
      keepTrackApi.methods.selectSatData(null, satId);
    } else if (satId !== -1) {
      if (mainCamera.cameraType.current == mainCamera.cameraType.Default) {
        mainCamera.ecLastZoom = mainCamera.zoomLevel();
        if (!sat.static) {
          mainCamera.cameraType.set(mainCamera.cameraType.FixedToSat);
        } else if (typeof sat.staticNum !== 'undefined') {
          sensorManager.setSensor(null, sat.staticNum);
          mainCamera.lookAtLatLon(
            sensorManager.selectedSensor.lat,
            sensorManager.selectedSensor.lon,
            sensorManager.selectedSensor.zoom,
            keepTrackApi.programs.timeManager.selectedDate
          );
        }
      }
      isselectedSatNegativeOne = false;
      objectManager.setSelectedSat(satId);
      sat = satSet.getSatExtraOnly(satId);
      if (!sat) return;
      if (sat.type === SpaceObjectType.STAR) {
        selectSatManager.selectSat(-1, mainCamera);
        return;
      }
      if (sat.static) {
        if (typeof sat.staticNum == 'undefined') return;
        sat = satSet.getSat(satId);
        if (objectManager.isSensorManagerLoaded) sensorManager.setSensor(null, sat.staticNum); // Pass staticNum to identify which sensor the user clicked

        // Todo: Needs to run uiManager.getsensorinfo();

        if (objectManager.isSensorManagerLoaded) sensorManager.curSensorPositon = [sat.position.x, sat.position.y, sat.position.z];
        objectManager.setSelectedSat(-1);
        getEl('menu-sensor-info')?.classList.remove('bmenu-item-disabled');
        getEl('menu-fov-bubble')?.classList.remove('bmenu-item-disabled');
        getEl('menu-surveillance')?.classList.remove('bmenu-item-disabled');
        getEl('menu-planetarium')?.classList.remove('bmenu-item-disabled');
        getEl('menu-astronomy')?.classList.remove('bmenu-item-disabled');
        if (objectManager.selectedSat !== -1) {
          getEl('menu-lookangles')?.classList.remove('bmenu-item-disabled');
        }
        return;
      }
      mainCamera.camZoomSnappedOnSat = true;
      mainCamera.camAngleSnappedOnSat = true;

      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null) {
        getEl('menu-lookangles')?.classList.remove('bmenu-item-disabled');
      }

      getEl('menu-lookanglesmultisite')?.classList.remove('bmenu-item-disabled');
      getEl('menu-satview')?.classList.remove('bmenu-item-disabled');
      getEl('menu-editSat')?.classList.remove('bmenu-item-disabled');
      getEl('menu-sat-fov')?.classList.remove('bmenu-item-disabled');
      getEl('menu-map')?.classList.remove('bmenu-item-disabled');
      getEl('menu-newLaunch')?.classList.remove('bmenu-item-disabled');
      getEl('menu-plot-analysis')?.classList.remove('bmenu-item-disabled');
      getEl('menu-plot-analysis2')?.classList.remove('bmenu-item-disabled');
      if (objectManager.secondarySat !== -1) {
        getEl('menu-plot-analysis3')?.classList.remove('bmenu-item-disabled');
      }

      $('#sat-infobox').fadeIn();

      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null) {
        if (keepTrackApi.programs.sensorManager.isLookanglesMenuOpen) {
          satellite.getlookangles(sat);
        }
      }

      keepTrackApi.methods.selectSatData(sat, satId);
    }

    objectManager.setSelectedSat(satId);
  },
  lastCssStyle: '',
  searchResultDom: null,
};

export const checkIfSelectSatVisible = () => {
  if (settingsManager.plugins.topMenu) {
    selectSatManager.searchResultDom ??= $('#search-results');

    const { objectManager, searchBox } = keepTrackApi.programs;
    const searchVal = searchBox.getCurrentSearch();

    // Base CSS Style based on if the search box is open or not
    let cssStyle = searchVal.length > 0 ? 'display: block; max-height:auto;' : 'display: none; max-height:auto;';

    // If a satellite is selected on a desktop computer then shrink the search box
    if (window.innerWidth > 1000 && objectManager.selectedSat !== -1) cssStyle = cssStyle.replace('max-height:auto', 'max-height:27%');

    // Avoid unnecessary dom updates
    if (cssStyle !== selectSatManager.lastCssStyle && selectSatManager.searchResultDom) {
      selectSatManager.lastCssStyle = cssStyle;
    }
  }
};
