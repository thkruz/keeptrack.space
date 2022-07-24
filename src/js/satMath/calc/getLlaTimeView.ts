import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { RAD2DEG } from '@app/js/lib/constants';
import { dateFormat } from '@app/js/lib/external/dateFormat';
import { calcSatrec } from '@app/js/satSet/catalogSupport/calcSatrec';
import { EciVec3, Sgp4 } from 'ootk';
import { checkIsInView } from '../lookangles/checkIsInView';
import { ecf2rae, eci2ecf, eci2lla, getDegLat, getDegLon } from '../transforms';
import { calculateTimeVariables } from './calculateTimeVariables';

export const getLlaTimeView = (now: Date, sat: SatObject): { lat: number; lon: number; time: string; inView: boolean } => {
  const { sensorManager } = keepTrackApi.programs;
  const satrec = calcSatrec(sat);

  const { m, gmst } = calculateTimeVariables(now, satrec);
  const positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;

  if (!positionEci) {
    console.error('No ECI position for', sat.sccNum, 'at', now);
    return { lat: 0, lon: 0, time: 'Invalid', inView: false };
  }

  const gpos = eci2lla(positionEci, gmst);
  const lat = getDegLat(gpos.lat);
  const lon = getDegLon(gpos.lon);
  const time = dateFormat(now, 'isoDateTime', true);

  const positionEcf = eci2ecf(positionEci, gmst);
  const lookAngles = ecf2rae(sensorManager.currentSensor[0].observerGd, positionEcf);
  const az = lookAngles.az * RAD2DEG;
  const el = lookAngles.el * RAD2DEG;
  const rng = lookAngles.rng;
  const inView = checkIsInView(sensorManager.currentSensor[0], { az, el, rng });

  return { lat, lon, time, inView };
};
