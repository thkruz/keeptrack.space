import { calcSatrec } from '@app/js/satSet/catalogSupport/calcSatrec';
import { Sgp4 } from 'ootk';
import { SatObject } from '../../api/keepTrackTypes';
import { calculateTimeVariables } from './calculateTimeVariables';

export const getEci = (sat: SatObject, now: Date) => {
  try {
    let satrec = calcSatrec(sat);
    const { m } = calculateTimeVariables(now, satrec);

    return Sgp4.propagate(satrec, m);
  } catch {
    return { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
  }
};
