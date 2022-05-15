import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { cKmPerMs, DEG2RAD } from '@app/js/lib/constants';

export const updateSelectBoxCoreCallback = async (sat: SatObject) => {
  // NOSONAR
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
      document.getElementById('sat-longitude').innerHTML = satellite.degreesLong(satellite.currentTEARR.lon).toFixed(3) + '°E';
    } else {
      document.getElementById('sat-longitude').innerHTML = (satellite.degreesLong(satellite.currentTEARR.lon) * -1).toFixed(3) + '°W';
    }
    if (satellite.degreesLat(satellite.currentTEARR.lat) >= 0) {
      document.getElementById('sat-latitude').innerHTML = satellite.degreesLat(satellite.currentTEARR.lat).toFixed(3) + '°N';
    } else {
      document.getElementById('sat-latitude').innerHTML = (satellite.degreesLat(satellite.currentTEARR.lat) * -1).toFixed(3) + '°S';
    }
    const jday = timeManager.getDayOfYear(timeManager.simulationTimeObj);
    document.getElementById('jday').innerHTML = jday.toString();

    if (settingsManager.plugins?.stereoMap && keepTrackApi.programs.mapManager.isMapMenuOpen && timeManager.realTime > settingsManager.lastMapUpdateTime + 30000) {
      keepTrackApi.programs.mapManager.updateMap();
      settingsManager.lastMapUpdateTime = timeManager.realTime;
    }

    if (!sat.missile) {
      document.getElementById('sat-altitude').innerHTML = sat.getAltitude().toFixed(2) + ' km';
      document.getElementById('sat-velocity').innerHTML = sat.velocity.total.toFixed(2) + ' km/s';
    } else {
      document.getElementById('sat-altitude').innerHTML = satellite.currentTEARR.alt.toFixed(2) + ' km';
    }

    if (objectManager.isSensorManagerLoaded) {
      if (satellite.currentTEARR.inView) {
        document.getElementById('sat-azimuth').innerHTML = satellite.currentTEARR.az.toFixed(0) + '°'; // Convert to Degrees
        document.getElementById('sat-elevation').innerHTML = satellite.currentTEARR.el.toFixed(1) + '°';
        document.getElementById('sat-range').innerHTML = satellite.currentTEARR.rng.toFixed(2) + ' km';
        const beamwidthString = sensorManager.currentSensor[0].beamwidth
          ? (satellite.currentTEARR.rng * Math.sin(DEG2RAD * sensorManager.currentSensor[0].beamwidth)).toFixed(2) + ' km'
          : 'Unknown';
        document.getElementById('sat-beamwidth').innerHTML = beamwidthString;
        document.getElementById('sat-maxTmx').innerHTML = ((satellite.currentTEARR.rng / cKmPerMs) * 2).toFixed(2) + ' ms'; // Time for RF to hit target and bounce back
      } else {
        document.getElementById('sat-azimuth').innerHTML = 'Out of FOV';
        document.getElementById('sat-azimuth').title = 'Azimuth: ' + satellite.currentTEARR.az.toFixed(0) + '°';
        document.getElementById('sat-elevation').innerHTML = 'Out of FOV';
        document.getElementById('sat-elevation').title = 'Elevation: ' + satellite.currentTEARR.el.toFixed(1) + '°';
        document.getElementById('sat-range').innerHTML = 'Out of FOV';
        document.getElementById('sat-range').title = 'Range: ' + satellite.currentTEARR.rng.toFixed(2) + ' km';
        const beamwidthString = sensorManager.currentSensor[0].beamwidth ? sensorManager.currentSensor[0].beamwidth + '°' : 'Unknown';
        document.getElementById('sat-beamwidth').innerHTML = 'Out of FOV';
        document.getElementById('sat-beamwidth').title = beamwidthString;
        document.getElementById('sat-maxTmx').innerHTML = 'Out of FOV';
      }
    } else {
      document.getElementById('sat-azimuth').parentElement.style.display = 'none';
      document.getElementById('sat-elevation').parentElement.style.display = 'none';
      document.getElementById('sat-range').parentElement.style.display = 'none';
      document.getElementById('sat-beamwidth').parentElement.style.display = 'none';
      document.getElementById('sat-maxTmx').parentElement.style.display = 'none';
    }

    if (objectManager.secondarySat !== -1 && document.getElementById('secondary-sat-info')?.style?.display === 'none') {
      document.getElementById('secondary-sat-info').style.display = 'block';
    } else if (objectManager.secondarySat === -1 && document.getElementById('secondary-sat-info')?.style?.display !== 'none') {
      document.getElementById('secondary-sat-info').style.display = 'none';
    }

    if (objectManager.secondarySat !== -1) {
      const ric = satellite.sat2ric(objectManager.secondarySatObj, sat);
      const dist = satellite.distance(sat, objectManager.secondarySatObj).split(' ')[2];
      document.getElementById('sat-sec-dist').innerHTML = `${dist} km`;
      document.getElementById('sat-sec-rad').innerHTML = `${ric.position[0].toFixed(2)}km`;
      document.getElementById('sat-sec-intrack').innerHTML = `${ric.position[1].toFixed(2)}km`;
      document.getElementById('sat-sec-crosstrack').innerHTML = `${ric.position[2].toFixed(2)}km`;
    }

    if (objectManager.isSensorManagerLoaded) {
      if (sensorManager.checkSensorSelected()) {
        // If we didn't just calculate next pass time for this satellite and sensor combination do it
        // TODO: Make new logic for this to allow it to be updated while selected
        if ((objectManager.selectedSat !== uiManager.lastNextPassCalcSatId || sensorManager.currentSensor[0].shortName !== uiManager.lastNextPassCalcSensorId) && !sat.missile) {
          if (sat.perigee > sensorManager.currentSensor[0].obsmaxrange) {
            document.getElementById('sat-nextpass').innerHTML = 'Beyond Max Range';
          } else {
            document.getElementById('sat-nextpass').innerHTML = satellite.nextpass(sat, sensorManager.currentSensor, 2, 5);
          }

          // IDEA: Code isInSun()
          //sun.getXYZ();
          //lineManager.create('ref',[sun.sunvar.position.x,sun.sunvar.position.y,sun.sunvar.position.z]);
        }
        uiManager.lastNextPassCalcSatId = objectManager.selectedSat;
        uiManager.lastNextPassCalcSensorId = sensorManager.currentSensor[0].shortName;
      } else {
        document.getElementById('sat-nextpass').innerHTML = 'Unavailable';
      }
    } else {
      document.getElementById('sat-nextpass').parentElement.style.display = 'none';
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
