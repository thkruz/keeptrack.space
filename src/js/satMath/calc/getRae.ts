import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants';
import { Sgp4 } from 'ootk';
import { SatRec } from 'satellite.js';
import { SensorObject } from '../../api/keepTrackTypes';
import { ecf2rae, eci2ecf } from '../transforms';
import { calculateTimeVariables } from './calculateTimeVariables';

export const getRae = (now: Date, satrec: SatRec, sensor: SensorObject) => {
  const { gmst, m } = calculateTimeVariables(now, satrec);
  let positionEci = Sgp4.propagate(satrec, m);
  let positionEcf = eci2ecf(positionEci.position, gmst); // positionEci.position is called positionEci originally
  sensor.observerGd ??= { lat: sensor.lat * DEG2RAD, lon: sensor.lon * DEG2RAD, alt: sensor.alt };

  let lookAngles = ecf2rae(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az, el, rng };
};
