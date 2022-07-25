import { MILLISECONDS_PER_DAY, MINUTES_PER_DAY } from '@app/js/lib/constants';
import { SatelliteRecord, Sgp4 } from 'ootk';
import { jday } from '../../timeManager/transforms';

export const calculateTimeVariables = (now: Date, satrec?: SatelliteRecord): { gmst: number; m: number; j: number } => {
  const j =
    jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()) +
    now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  const gmst = Sgp4.gstime(j);

  const m = satrec ? (j - satrec.jdsatepoch) * MINUTES_PER_DAY : null;

  return { gmst, m, j };
};
