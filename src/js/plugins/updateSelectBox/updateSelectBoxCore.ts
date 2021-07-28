import { DEG2RAD, cKmPerMs } from '@app/js/lib/constants.js';
import { keepTrackApi } from '@app/js/api/externalApi';

const updateSelectBoxCore = {
  sensorInfo: {
    isLoaded: false,
    cbName: 'sensorInfo',
    cb: (sat: any) => {
      const { satellite, missileManager, timeManager, settingsManager, objectManager, sensorManager, uiManager } = keepTrackApi.programs;

      if (!sat.missile) {
        if (keepTrackApi.programs.objectManager.isSensorManagerLoaded) {
          sat.getTEARR();
        }
      } else {
        satellite.setTEARR(missileManager.getMissileTEARR(sat));
      }
      if (satellite.degreesLong(satellite.currentTEARR.lon) >= 0) {
        $('#sat-longitude').html(satellite.degreesLong(satellite.currentTEARR.lon).toFixed(3) + '°E');
      } else {
        $('#sat-longitude').html((satellite.degreesLong(satellite.currentTEARR.lon) * -1).toFixed(3) + '°W');
      }
      if (satellite.degreesLat(satellite.currentTEARR.lat) >= 0) {
        $('#sat-latitude').html(satellite.degreesLat(satellite.currentTEARR.lat).toFixed(3) + '°N');
      } else {
        $('#sat-latitude').html((satellite.degreesLat(satellite.currentTEARR.lat) * -1).toFixed(3) + '°S');
      }
      var jday = timeManager.getDayOfYear(timeManager.propTimeVar);
      $('#jday').html(jday);

      if (settingsManager.plugins.stereoMap && keepTrackApi.programs.mapManager.isMapMenuOpen && timeManager.now > settingsManager.lastMapUpdateTime + 30000) {
        keepTrackApi.programs.mapManager.updateMap();
        settingsManager.lastMapUpdateTime = timeManager.now;
      }

      if (!sat.missile) {
        $('#sat-altitude').html(sat.getAltitude().toFixed(2) + ' km');
        $('#sat-velocity').html(sat.velocity.total.toFixed(2) + ' km/s');
      } else {
        $('#sat-altitude').html(satellite.currentTEARR.alt.toFixed(2) + ' km');
      }

      if (objectManager.isSensorManagerLoaded) {
        if (satellite.currentTEARR.inview) {
          $('#sat-azimuth').html(satellite.currentTEARR.az.toFixed(0) + '°'); // Convert to Degrees
          $('#sat-elevation').html(satellite.currentTEARR.el.toFixed(1) + '°');
          $('#sat-range').html(satellite.currentTEARR.rng.toFixed(2) + ' km');
          let beamwidthString = sensorManager.currentSensor.beamwidth ? (satellite.currentTEARR.rng * Math.sin(DEG2RAD * sensorManager.currentSensor.beamwidth)).toFixed(2) + ' km' : 'Unknown';
          $('#sat-beamwidth').html(beamwidthString);
          $('#sat-maxTmx').html(((satellite.currentTEARR.rng / cKmPerMs) * 2).toFixed(2) + ' ms'); // Time for RF to hit target and bounce back
        } else {
          $('#sat-azimuth').html('Out of FOV');
          $('#sat-azimuth').prop('title', 'Azimuth: ' + satellite.currentTEARR.az.toFixed(0) + '°');
          $('#sat-elevation').html('Out of FOV');
          $('#sat-elevation').prop('title', 'Elevation: ' + satellite.currentTEARR.el.toFixed(1) + '°');
          $('#sat-range').html('Out of FOV');
          $('#sat-range').prop('title', 'Range: ' + satellite.currentTEARR.rng.toFixed(2) + ' km');
          let beamwidthString = sensorManager.currentSensor.beamwidth ? sensorManager.currentSensor.beamwidth + '°' : 'Unknown';
          $('#sat-beamwidth').html('Out of FOV');
          $('#sat-beamwidth').prop('title', beamwidthString);
          $('#sat-maxTmx').html('Out of FOV');
        }
      } else {
        $('#sat-azimuth').parent().hide();
        $('#sat-elevation').parent().hide();
        $('#sat-range').parent().hide();
        $('#sat-beamwidth').parent().hide();
        $('#sat-maxTmx').parent().hide();
      }

      if (objectManager.isSensorManagerLoaded) {
        if (sensorManager.checkSensorSelected()) {
          // If we didn't just calculate next pass time for this satellite and sensor combination do it
          if (objectManager.selectedSat !== uiManager.lastNextPassCalcSatId && sensorManager.currentSensor.shortName !== uiManager.lastNextPassCalcSensorId && !sat.missile) {
            $('#sat-nextpass').html(satellite.nextpass(sat));

            // IDEA: Code isInSun()
            //sun.getXYZ();
            //lineManager.create('ref',[sun.sunvar.position.x,sun.sunvar.position.y,sun.sunvar.position.z]);
          }
          uiManager.lastNextPassCalcSatId = objectManager.selectedSat;
          uiManager.lastNextPassCalcSensorId = sensorManager.currentSensor.shortName;
        } else {
          $('#sat-nextpass').html('Unavailable');
        }
      } else {
        $('#sat-nextpass').parent().hide();
      }
    },
  },
};

export const init = (): void => {
  // Register updateSelectBox
  keepTrackApi.register({
    method: 'updateSelectBox',
    cbName: 'sensorInfo',
    cb: updateSelectBoxCore.sensorInfo.cb,
  });
};
