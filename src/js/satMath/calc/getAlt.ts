import { EciVec3, Sgp4 } from 'ootk';
import { eci2lla } from '../transforms';
import { calculateTimeVariables } from './calculateTimeVariables';

export const getAlt = (tle1: string, tle2: string, now: Date) => {
  const satrec = Sgp4.createSatrec(tle1, tle2); // perform and store sat init calcs
  const { m, gmst } = calculateTimeVariables(now, satrec);
  let positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
  if (!positionEci) {
    console.error('No ECI position for', satrec.satnum, 'at', now);
    return 0;
  }

  let alt: number;
  try {
    alt = eci2lla(positionEci, gmst).alt;
  } catch (e) {
    return 0; // Auto fail the altitude check
  }
  return alt;
};
