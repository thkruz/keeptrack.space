import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants';
import { EciVec3, SatelliteRecord, Sgp4 } from 'ootk';
import { SensorObject } from '../../api/keepTrackTypes';
import { ecf2rae, eci2ecf } from '../transforms';
import { calculateTimeVariables } from './calculateTimeVariables';

export const getRae = (now: Date, satrec: SatelliteRecord, sensor: SensorObject) => {
  const { gmst, m } = calculateTimeVariables(now, satrec);
  let positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
  if (!positionEci) {
    console.error('No ECI position for', satrec.satnum, 'at', now);
    return { az: 0, el: 0, rng: 0 };
  }
  let positionEcf = eci2ecf(positionEci, gmst); // positionEci.position is called positionEci originally
  sensor.observerGd ??= { lat: sensor.lat * DEG2RAD, lon: sensor.lon * DEG2RAD, alt: sensor.alt };

  let lookAngles = ecf2rae(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az, el, rng };
};
