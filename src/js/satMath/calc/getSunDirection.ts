import { DEG2RAD, DISTANCE_TO_SUN } from '@app/js/lib/constants';
import { EciArr3 } from '../../api/keepTrackTypes';

export const getSunDirection = (jd: number): EciArr3 => {
  const n = jd - 2451545;
  let L = 280.46 + 0.9856474 * n; // mean longitude of sun
  let g = 357.528 + 0.9856003 * n; // mean anomaly
  L = L % 360.0;
  g = g % 360.0;

  const ecLon = L + 1.915 * Math.sin(g * DEG2RAD) + 0.02 * Math.sin(2 * g * DEG2RAD);

  const t = (jd - 2451545) / 3652500;

  const obliq =
    84381.448 -
    4680.93 * t -
    1.55 * Math.pow(t, 2) +
    1999.25 * Math.pow(t, 3) -
    51.38 * Math.pow(t, 4) -
    249.67 * Math.pow(t, 5) -
    39.05 * Math.pow(t, 6) +
    7.12 * Math.pow(t, 7) +
    27.87 * Math.pow(t, 8) +
    5.79 * Math.pow(t, 9) +
    2.45 * Math.pow(t, 10);

  const ob = obliq / 3600.0;

  const x = DISTANCE_TO_SUN * Math.cos(ecLon * DEG2RAD);
  const y = DISTANCE_TO_SUN * Math.cos(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);
  const z = DISTANCE_TO_SUN * Math.sin(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);

  return [x, y, z];
};
