import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { Camera, SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { satellite } from '@app/js/satMath/satMath';
import $ from 'jquery';

let isselectedSatNegativeOne = false;
const selectSatManager = {
  init: () => {
    keepTrackApi.register({
      method: 'updateLoop',
      cbName: 'gamepad',
      cb: checkIfSelectSatVisible,
    });
  },

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  selectSat: (satId: number, mainCamera: Camera) => { // NOSONAR
    const { objectManager, satSet, sensorManager } = keepTrackApi.programs;

    let sat: SatObject;

    // If selecting an object
    if (satId !== -1) {
      // Get the satellite object
      sat = satSet.getSat(satId);
      // Selecting a star does nothing
      if (sat.type == SpaceObjectType.STAR) return;
      // Selecting a non-missile non-sensor object does nothing
      if ((!sat.active || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') return;
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
        (typeof $('#search').val() !== 'undefined' && $('#search').val().length >= 3)
      ) {
        // If group selected
        $('#menu-sat-fov').removeClass('bmenu-item-disabled');
      } else {
        $('#menu-sat-fov').removeClass('bmenu-item-selected');
        $('#menu-sat-fov').addClass('bmenu-item-disabled');
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
      $('#menu-lookanglesmultisite').addClass('bmenu-item-disabled');
      $('#menu-lookangles').addClass('bmenu-item-disabled');
      $('#menu-satview').addClass('bmenu-item-disabled');
      $('#menu-editSat').addClass('bmenu-item-disabled');
      $('#menu-map').addClass('bmenu-item-disabled');
      $('#menu-newLaunch').addClass('bmenu-item-disabled');
      $('#menu-breakup').addClass('bmenu-item-disabled');
      $('#menu-plot-analysis').addClass('bmenu-item-disabled');
      $('#menu-plot-analysis2').addClass('bmenu-item-disabled');
      $('#menu-plot-analysis3').addClass('bmenu-item-disabled');
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

        if (objectManager.isSensorManagerLoaded)
          sensorManager.curSensorPositon = [sat.position.x, sat.position.y, sat.position.z];
        objectManager.setSelectedSat(-1);
        $('#menu-sensor-info').removeClass('bmenu-item-disabled');
        $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
        $('#menu-surveillance').removeClass('bmenu-item-disabled');
        $('#menu-planetarium').removeClass('bmenu-item-disabled');
        $('#menu-astronomy').removeClass('bmenu-item-disabled');
        if (objectManager.selectedSat !== -1) {
          $('#menu-lookangles').removeClass('bmenu-item-disabled');
        }
        return;
      }
      mainCamera.camZoomSnappedOnSat = true;
      mainCamera.camAngleSnappedOnSat = true;

      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null) {
        $('#menu-lookangles').removeClass('bmenu-item-disabled');
      }

      $('#menu-lookanglesmultisite').removeClass('bmenu-item-disabled');
      $('#menu-satview').removeClass('bmenu-item-disabled');
      $('#menu-editSat').removeClass('bmenu-item-disabled');
      $('#menu-sat-fov').removeClass('bmenu-item-disabled');
      $('#menu-map').removeClass('bmenu-item-disabled');
      $('#menu-newLaunch').removeClass('bmenu-item-disabled');
      $('#menu-plot-analysis').removeClass('bmenu-item-disabled');
      $('#menu-plot-analysis2').removeClass('bmenu-item-disabled');
      if (objectManager.secondarySat !== -1) {
        $('#menu-plot-analysis3').removeClass('bmenu-item-disabled');
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
    if (window.innerWidth > 1000 && objectManager.selectedSat !== -1)
      cssStyle = cssStyle.replace('max-height:auto', 'max-height:27%');

    // Avoid unnecessary dom updates
    if (cssStyle !== selectSatManager.lastCssStyle && selectSatManager.searchResultDom) {
      selectSatManager.searchResultDom.attr('style', cssStyle);
      selectSatManager.lastCssStyle = cssStyle;
    }
  }
};

export { selectSatManager, isselectedSatNegativeOne };
