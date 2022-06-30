import { RAD2DEG } from '@app/js/lib/constants';
import { Sgp4 } from 'ootk';
import { keepTrackApi } from '../../api/keepTrackApi';
import { SatObject, SensorObject } from '../../api/keepTrackTypes';
import { satellite } from '../satMath';
import { ecf2rae, eci2ecf } from '../transforms';
import { calculateTimeVariables } from './calculateTimeVariables';
import { getSunDirection } from './getSunDirection';
import { verifySensors } from './verifySensors';

export const getSunTimes = (sat: SatObject, sensors?: SensorObject[], searchLength?: number, interval?: number) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  sensors = verifySensors(sensors, sensorManager);
  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  // If length and interval not set try to use defaults
  searchLength ??= satellite.lookanglesLength;
  interval ??= satellite.lookanglesInterval;

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  let minDistanceApart = 100000000000; // Arbitrarily large number

  // var minDistTime;
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    const { m, j, gmst } = calculateTimeVariables(now, satrec);

    const [sunX, sunY, sunZ] = getSunDirection(j);
    const eci = Sgp4.propagate(satrec, m).position;

    const distX = Math.pow(sunX - eci.x, 2);
    const distY = Math.pow(sunY - eci.y, 2);
    const distZ = Math.pow(sunZ - eci.z, 2);
    const dist = Math.sqrt(distX + distY + distZ);

    const positionEcf = eci2ecf(eci, gmst);
    const lookAngles = ecf2rae(sensor.observerGd, positionEcf);

    const az = lookAngles.az * RAD2DEG;
    const el = lookAngles.el * RAD2DEG;
    const rng = lookAngles.rng;

    if (sensor.obsminaz > sensor.obsmaxaz) {
      if (
        ((az >= sensor.obsminaz || az <= sensor.obsmaxaz) && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
        ((az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
      ) {
        if (dist < minDistanceApart) {
          minDistanceApart = dist;
        }
      }
    } else {
      if (
        (az >= sensor.obsminaz && az <= sensor.obsmaxaz && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
        (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2 && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
      ) {
        if (dist < minDistanceApart) {
          minDistanceApart = dist;
        }
      }
    }
  }
};
