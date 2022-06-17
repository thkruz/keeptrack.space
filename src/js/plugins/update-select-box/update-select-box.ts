import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { cKmPerMs, DEG2RAD } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/helpers';

export const updateSelectBoxCoreCallback = async (sat: SatObject) => { // NOSONAR
  try {
    const { satellite, missileManager, timeManager, objectManager, sensorManager, uiManager } = keepTrackApi.programs;

    if (typeof sat === 'undefined' || sat == null) throw new Error('updateSelectBoxCoreCallback: sat is undefined');

    if (!sat.missile) {
      if (keepTrackApi.programs.objectManager.isSensorManagerLoaded) {
        sat.getTEARR();
      }
    } else {
      satellite.setTEARR(missileManager.getMissileTEARR(sat));
    }
    if (satellite.degreesLong(satellite.currentTEARR.lon) >= 0) {
      getEl('sat-longitude').innerHTML = satellite.degreesLong(satellite.currentTEARR.lon).toFixed(3) + '°E';
    } else {
      getEl('sat-longitude').innerHTML = (satellite.degreesLong(satellite.currentTEARR.lon) * -1).toFixed(3) + '°W';
    }
    if (satellite.degreesLat(satellite.currentTEARR.lat) >= 0) {
      getEl('sat-latitude').innerHTML = satellite.degreesLat(satellite.currentTEARR.lat).toFixed(3) + '°N';
    } else {
      getEl('sat-latitude').innerHTML = (satellite.degreesLat(satellite.currentTEARR.lat) * -1).toFixed(3) + '°S';
    }
    const jday = timeManager.getDayOfYear(timeManager.simulationTimeObj);
    getEl('jday').innerHTML = jday.toString();

    if (settingsManager.plugins?.stereoMap && keepTrackApi.programs.mapManager.isMapMenuOpen && timeManager.realTime > settingsManager.lastMapUpdateTime + 30000) {
      keepTrackApi.programs.mapManager.updateMap();
      settingsManager.lastMapUpdateTime = timeManager.realTime;
    }

    if (!sat.missile) {
      getEl('sat-altitude').innerHTML = sat.getAltitude().toFixed(2) + ' km';
      getEl('sat-velocity').innerHTML = sat.velocity.total.toFixed(2) + ' km/s';
    } else {
      getEl('sat-altitude').innerHTML = satellite.currentTEARR.alt.toFixed(2) + ' km';
    }

    if (objectManager.isSensorManagerLoaded) {
      if (satellite.currentTEARR.inView) {
        getEl('sat-azimuth').innerHTML = satellite.currentTEARR.az.toFixed(0) + '°'; // Convert to Degrees
        getEl('sat-elevation').innerHTML = satellite.currentTEARR.el.toFixed(1) + '°';
        getEl('sat-range').innerHTML = satellite.currentTEARR.rng.toFixed(2) + ' km';
        const beamwidthString = sensorManager.currentSensor[0].beamwidth
          ? (satellite.currentTEARR.rng * Math.sin(DEG2RAD * sensorManager.currentSensor[0].beamwidth)).toFixed(2) + ' km'
          : 'Unknown';
        getEl('sat-beamwidth').innerHTML = beamwidthString;
        getEl('sat-maxTmx').innerHTML = ((satellite.currentTEARR.rng / cKmPerMs) * 2).toFixed(2) + ' ms'; // Time for RF to hit target and bounce back
      } else {
        getEl('sat-azimuth').innerHTML = 'Out of FOV';
        getEl('sat-azimuth').title = 'Azimuth: ' + satellite.currentTEARR.az.toFixed(0) + '°';
        getEl('sat-elevation').innerHTML = 'Out of FOV';
        getEl('sat-elevation').title = 'Elevation: ' + satellite.currentTEARR.el.toFixed(1) + '°';
        getEl('sat-range').innerHTML = 'Out of FOV';
        getEl('sat-range').title = 'Range: ' + satellite.currentTEARR.rng.toFixed(2) + ' km';
        const beamwidthString = sensorManager.currentSensor[0].beamwidth ? sensorManager.currentSensor[0].beamwidth + '°' : 'Unknown';
        getEl('sat-beamwidth').innerHTML = 'Out of FOV';
        getEl('sat-beamwidth').title = beamwidthString;
        getEl('sat-maxTmx').innerHTML = 'Out of FOV';
      }
    } else {
      getEl('sat-azimuth').parentElement.style.display = 'none';
      getEl('sat-elevation').parentElement.style.display = 'none';
      getEl('sat-range').parentElement.style.display = 'none';
      getEl('sat-beamwidth').parentElement.style.display = 'none';
      getEl('sat-maxTmx').parentElement.style.display = 'none';
    }

    if (objectManager.secondarySat !== -1 && getEl('secondary-sat-info')?.style?.display === 'none') {
      getEl('secondary-sat-info').style.display = 'block';
    } else if (objectManager.secondarySat === -1 && getEl('secondary-sat-info')?.style?.display !== 'none') {
      getEl('secondary-sat-info').style.display = 'none';
    }

    if (objectManager.secondarySat !== -1) {
      const ric = satellite.sat2ric(objectManager.secondarySatObj, sat);
      const dist = satellite.distance(sat, objectManager.secondarySatObj).split(' ')[2];
      getEl('sat-sec-dist').innerHTML = `${dist} km`;
      getEl('sat-sec-rad').innerHTML = `${ric.position[0].toFixed(2)}km`;
      getEl('sat-sec-intrack').innerHTML = `${ric.position[1].toFixed(2)}km`;
      getEl('sat-sec-crosstrack').innerHTML = `${ric.position[2].toFixed(2)}km`;
    }

    if (objectManager.isSensorManagerLoaded) {
      if (sensorManager.checkSensorSelected()) {
        // If we didn't just calculate next pass time for this satellite and sensor combination do it
        // TODO: Make new logic for this to allow it to be updated while selected
        if ((objectManager.selectedSat !== uiManager.lastNextPassCalcSatId || sensorManager.currentSensor[0].shortName !== uiManager.lastNextPassCalcSensorId) && !sat.missile) {
          if (sat.perigee > sensorManager.currentSensor[0].obsmaxrange) {
            getEl('sat-nextpass').innerHTML = 'Beyond Max Range';
          } else {
            getEl('sat-nextpass').innerHTML = satellite.nextpass(sat, sensorManager.currentSensor, 2, 5);
          }

          // IDEA: Code isInSun()
          //sun.getXYZ();
          //lineManager.create('ref',[sun.sunvar.position.x,sun.sunvar.position.y,sun.sunvar.position.z]);
        }
        uiManager.lastNextPassCalcSatId = objectManager.selectedSat;
        uiManager.lastNextPassCalcSensorId = sensorManager.currentSensor[0].shortName;
      } else {
        getEl('sat-nextpass').innerHTML = 'Unavailable';
      }
    } else {
      getEl('sat-nextpass').parentElement.style.display = 'none';
    }
  } catch (e) {
    console.error(e);
  }
};

export const init = (): void => {
  // Register updateSelectBox
  keepTrackApi.register({
    method: 'updateSelectBox',
    cbName: 'updateSelectBoxCore',
    cb: updateSelectBoxCoreCallback,
  });
};
