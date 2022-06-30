import { RAD2DEG } from '@app/js/lib/constants';
import { ecf2rae, eci2ecf } from '.';
import { EciArr3, SensorObject } from '../../api/keepTrackTypes';
import { calculateTimeVariables } from '../calc/calculateTimeVariables';

export const eci2rae = (now: Date, eci: EciArr3, sensor: SensorObject) => {
  now = new Date(now);
  const { gmst } = calculateTimeVariables(now);

  let positionEcf = eci2ecf(eci, gmst); // positionEci.position is called positionEci originally
  let lookAngles = ecf2rae(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az: az, el: el, rng: rng };
};
