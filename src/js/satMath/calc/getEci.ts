import { Sgp4 } from 'ootk';
import { SatObject } from '../../api/keepTrackTypes';
import { calculateTimeVariables } from './calculateTimeVariables';

export const getEci = (sat: SatObject, now: Date) => {
  try {
    let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
    const { m } = calculateTimeVariables(now, satrec);

    return Sgp4.propagate(satrec, m);
  } catch {
    return { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
  }
};
