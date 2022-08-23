import { SunObject } from '@app/js/drawManager/sceneManager/sun';
import { calcSatrec } from '@app/js/satSet/catalogSupport/calcSatrec';
import numeric from 'numeric';
import { SatObject, SensorObject } from '../../api/keepTrackTypes';
import { satellite } from '../satMath';

export const calculateVisMag = (sat: SatObject, sensor: SensorObject, propTime: Date, sun: SunObject): number => {
  const satrec = calcSatrec(sat);
  const rae = satellite.getRae(propTime, satrec, sensor);
  const distanceToSatellite = rae.rng; //This is in KM

  const phaseAngle = Math.acos(
    <number>numeric.dot([-sat.position.x, -sat.position.y, -sat.position.z], [sat.position.x + sun.eci.x, -sat.position.y + sun.eci.y, -sat.position.z + sun.eci.z]) /
      (Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2)) *
        Math.sqrt(Math.pow(-sat.position.x + sun.eci.x, 2) + Math.pow(-sat.position.y + sun.eci.y, 2) + Math.pow(-sat.position.z + sun.eci.z, 2)))
  );

  //standard magnitude
  // DEBUG:
  // if (!sat.vmag) console.debug('No standard magnitude in the database defaulting to 8');
  const intrinsicMagnitude = sat.vmag || 8;

  const term2 = 5.0 * Math.log10(distanceToSatellite / 1000);

  const arg = Math.sin(phaseAngle) + (Math.PI - phaseAngle) * Math.cos(phaseAngle);
  const term3 = -2.5 * Math.log10(arg);

  return intrinsicMagnitude + term2 + term3;
};
