import numeric from 'numeric';
import { Sgp4 } from 'ootk';
import { SatObject, SensorObject, SunObject } from '../../api/keepTrackTypes';
import { satellite } from '../satMath';

export const calculateVisMag = (sat: SatObject, sensor: SensorObject, propTime: Date, sun: SunObject): number => {
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const rae = satellite.getRae(propTime, satrec, sensor);
  const distanceToSatellite = rae.rng; //This is in KM

  const theta = Math.acos(
    <number>numeric.dot([-sat.position.x, -sat.position.y, -sat.position.z], [sat.position.x + sun.eci.x, -sat.position.y + sun.eci.y, -sat.position.z + sun.eci.z]) /
      (Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2)) *
        Math.sqrt(Math.pow(-sat.position.x + sun.eci.x, 2) + Math.pow(-sat.position.y + sun.eci.y, 2) + Math.pow(-sat.position.z + sun.eci.z, 2)))
  );

  // Note sometimes -1.3 is used for this calculation.
  //-1.8 is std. mag for iss
  const intrinsicMagnitude = -1.8;

  const term2 = 5.0 * Math.log10(distanceToSatellite);

  const arg = Math.sin(theta) + (Math.PI - theta) * Math.cos(theta);
  const term3 = -2.5 * Math.log10(arg);

  return intrinsicMagnitude + term2 + term3;
};
