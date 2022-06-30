import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { RAD2DEG } from '@app/js/lib/constants';
import { dateFormat } from '@app/js/lib/external/dateFormat';
import { Sgp4 } from 'ootk';
import { checkIsInView } from '../lookangles/checkIsInView';
import { ecf2rae, eci2ecf, eci2lla, getDegLat, getDegLon } from '../transforms';
import { calculateTimeVariables } from './calculateTimeVariables';

export const getLlaTimeView = (now: Date, sat: SatObject) => {
  const { sensorManager } = keepTrackApi.programs;
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

  const { m, gmst } = calculateTimeVariables(now, satrec);
  const positionEci = Sgp4.propagate(satrec, m);

  const gpos = eci2lla(positionEci.position, gmst);
  const lat = getDegLat(gpos.lat);
  const lon = getDegLon(gpos.lon);
  const time = dateFormat(now, 'isoDateTime', true);

  const positionEcf = eci2ecf(positionEci.position, gmst); // positionEci.position is called positionEci originally
  const lookAngles = ecf2rae(sensorManager.currentSensor[0].observerGd, positionEcf);
  const az = lookAngles.az * RAD2DEG;
  const el = lookAngles.el * RAD2DEG;
  const rng = lookAngles.rng;
  const inView = checkIsInView(sensorManager.currentSensor[0], { az, el, rng });

  return { lat, lon, time, inView };
};
