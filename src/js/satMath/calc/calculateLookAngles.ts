import { DEG2RAD } from '@app/js/lib/constants';
import { Sgp4 } from 'ootk';
import { keepTrackApi } from '../../api/keepTrackApi';
import { SatObject, SensorObject, TearrData } from '../../api/keepTrackTypes';
import { satellite } from '../satMath';
import { getTearData } from './getTearData';

export const calculateLookAngles = (sat: SatObject, sensors: SensorObject[]): TearrData[] => {
  const { sensorManager, timeManager } = keepTrackApi.programs;

  (function _inputValidation() {
    // Check if there is a sensor
    if (typeof sensors == 'undefined') {
      // Try using the current sensor if there is one
      if (sensorManager.checkSensorSelected()) {
        sensors = sensorManager.currentSensor;
      } else {
        console.debug('getlookangles2 requires a sensor!');
        return;
      }
      // Simple Error Checking
    } else {
      if (typeof sensors[0].obsminaz == 'undefined') {
        console.debug('sensors[0] format incorrect');
        return;
      }
      sensors[0].observerGd = {
        // Array to calculate look angles in propagate()
        lat: sensors[0].lat * DEG2RAD,
        lon: sensors[0].lon * DEG2RAD,
        alt: sensors[0].alt,
      };
    }

    if (typeof sat == 'undefined') {
      console.debug('sat parameter required!');
    } else {
      if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
        console.debug('sat parameter invalid format!');
      }
    }

    if (typeof satellite.isRiseSetLookangles == 'undefined') {
      satellite.isRiseSetLookangles = false;
    }
  })();

  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  var satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table
  var tempLookanglesInterval;

  if (satellite.isRiseSetLookangles) {
    tempLookanglesInterval = satellite.lookanglesInterval;
    satellite.lookanglesInterval = 1;
  }

  for (var i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
    // satellite.lookanglesInterval in seconds
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      const _lookanglesRow = getTearData(now, satrec, [sensor], satellite.isRiseSetLookangles);
      if (_lookanglesRow.time !== '') {
        lookanglesTable.push(_lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }
    }
  }

  if (satellite.isRiseSetLookangles) {
    satellite.lookanglesInterval = tempLookanglesInterval;
  }
  return lookanglesTable;
};
