import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';
import { satellite } from '@app/js/lib/lookangles.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';

let isselectedSatNegativeOne = false;
const selectSatManager = {
  init: () => {
    // Nothing yet
  },

  selectSat: (satId, cameraManager) => {
    const objectManager = keepTrackApi.programs.objectManager;
    const satSet = keepTrackApi.programs.satSet;
    const sensorManager = keepTrackApi.programs.sensorManager;

    let sat;

    // If selecting an object
    if (satId !== -1) {
      // Get the satellite object
      sat = satSet.getSat(satId);
      // Selecting a star does nothing
      if (sat.type == 'Star') return;
      // Selecting a non-missile non-sensor object does nothing
      if ((sat.active == false || typeof sat.active == 'undefined') && typeof sat.staticNum == 'undefined') return;
      // stop rotation if it is on
      cameraManager.rotateEarth(false);
    }

    cameraManager.camSnapMode = false;
    // Don't select -1 twice
    if (!(satId === -1 && isselectedSatNegativeOne)) {
      satSet.selectSat(satId);
    }

    // If deselecting an object
    if (satId === -1) {
      if (settingsManager.currentColorScheme === keepTrackApi.programs.ColorScheme.group || (typeof $('#search').val() !== 'undefined' && $('#search').val().length >= 3)) {
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

    // If we deselect an object but had previously selected one then disable/hide stuff
    if (satId === -1 && !isselectedSatNegativeOne) {
      cameraManager.fts2default();
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
          $('#search-results').attr('style', 'display: block; max-height:auto');
        }
      }
    } else if (satId !== -1) {
      if (cameraManager.cameraType.current == cameraManager.cameraType.default) {
        cameraManager.ecLastZoom = cameraManager.zoomLevel;
        if (!sat.static) {
          cameraManager.cameraType.set(cameraManager.cameraType.fixedToSat);
        } else if (typeof sat.staticNum !== 'undefined') {
          sensorManager.setSensor(null, sat.staticNum);
          cameraManager.lookAtSensor(sensorManager.selectedSensor.zoom, sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, keepTrackApi.programs.timeManager.selectedDate);
        }
      }
      isselectedSatNegativeOne = false;
      objectManager.setSelectedSat(satId);
      sat = satSet.getSatExtraOnly(satId);
      if (!sat) return;
      if (sat.type == 'Star') {
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
      cameraManager.camZoomSnappedOnSat = true;
      cameraManager.camAngleSnappedOnSat = true;

      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
        $('#menu-lookangles').removeClass('bmenu-item-disabled');
      }

      $('#menu-lookanglesmultisite').removeClass('bmenu-item-disabled');
      $('#menu-satview').removeClass('bmenu-item-disabled');
      $('#menu-editSat').removeClass('bmenu-item-disabled');
      $('#menu-sat-fov').removeClass('bmenu-item-disabled');
      $('#menu-map').removeClass('bmenu-item-disabled');
      $('#menu-newLaunch').removeClass('bmenu-item-disabled');

      if ($('#search-results').css('display') === 'block') {
        if (window.innerWidth > 1000) {
          if ($('#search').val().length > 0) {
            $('#search-results').attr('style', 'display:block; max-height:27%');
          }
          if (cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
            // Unclear why this was needed...
            // uiManager.legendMenuChange('default')
          }
        }
      } else {
        if (window.innerWidth > 1000) {
          if (settingsManager.plugins.topMenu) {
            if ($('#search').val().length > 0) {
              $('#search-results').attr('style', 'display:block; max-height:auto');
            }
          }
          if (cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
            // Unclear why this was needed...
            // uiManager.legendMenuChange('default')
          }
        }
      }

      $('#sat-infobox').fadeIn();

      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
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
