import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { Camera, SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { satellite } from '@app/js/satMath/satMath';
import $ from 'jquery';

let isselectedSatNegativeOne = false;
const selectSatManager = {
  init: () => {
    // Nothing yet
  },

  selectSat: (satId: number, mainCamera: Camera) => {
    const { objectManager, satSet, sensorManager } = keepTrackApi.programs;

    let sat: SatObject;

    // If selecting an object
    if (satId !== -1) {
      // Get the satellite object
      sat = satSet.getSat(satId);
      // Selecting a star does nothing
      if (sat.type == SpaceObjectType.STAR) return;
      // Selecting a non-missile non-sensor object does nothing
      if ((sat.active == false || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') return;
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
      if (settingsManager.currentColorScheme === keepTrackApi.programs.colorSchemeManager.group || (typeof $('#search').val() !== 'undefined' && $('#search').val().length >= 3)) {
        // If group selected
        $('#menu-sat-fov').removeClass('bmenu-item-disabled');
      } else {
        $('#menu-sat-fov').removeClass('bmenu-item-selected');
        $('#menu-sat-fov').addClass('bmenu-item-disabled');
        settingsManager.isSatOverflyModeOn = false;
        satSet.satCruncher.postMessage({
          isShowSatOverfly: 'reset',
        });
      }
    }

    const searchResultDom = $('#search-results');

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

      if (settingsManager.plugins.topMenu) {
        if (typeof $('#search').val() !== 'undefined' && $('#search').val().length > 0) {
          if (searchResultDom.css('display') === 'block') {
            searchResultDom.attr('style', 'display: block; max-height:auto');
          } else {
            searchResultDom.attr('style', 'max-height:auto');
          }
        }
      }
    } else if (satId !== -1) {
      if (mainCamera.cameraType.current == mainCamera.cameraType.Default) {
        mainCamera.ecLastZoom = mainCamera.zoomLevel();
        if (!sat.static) {
          mainCamera.cameraType.set(mainCamera.cameraType.FixedToSat);
        } else if (typeof sat.staticNum !== 'undefined') {
          sensorManager.setSensor(null, sat.staticNum);
          mainCamera.lookAtLatLon(sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, sensorManager.selectedSensor.zoom, keepTrackApi.programs.timeManager.selectedDate);
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

      if (searchResultDom.css('display') === 'block') {
        if (window.innerWidth > 1000) {
          if (typeof $('#search').val() !== 'undefined' && $('#search').val().length > 0) {
            searchResultDom.attr('style', 'display:block; max-height:27%');
          }
          if (mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
            // Unclear why this was needed...
            // uiManager.legendMenuChange('default')
          }
        }
      } else {
        if (window.innerWidth > 1000) {
          if (settingsManager.plugins.topMenu) {
            if ($('#search').val().length > 0) {
              searchResultDom.attr('style', 'max-height:27%');
            }
          }
          if (mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
            // Unclear why this was needed...
            // uiManager.legendMenuChange('default')
          }
        }
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
};

export { selectSatManager, isselectedSatNegativeOne };
