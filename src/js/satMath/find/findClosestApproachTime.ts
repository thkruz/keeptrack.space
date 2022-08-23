import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { Sgp4 } from 'ootk';
import { getEci } from '../calc/getEci';
import { sat2ric } from '../transforms';

export const findClosestApproachTime = (
  sat1: SatObject,
  sat2: SatObject,
  propLength?: number
): {
  offset: number;
  dist: number;
  ric: { position: [number, number, number]; velocity: [number, number, number] };
} => {
  let offset = 0;
  propLength ??= 1440 * 60; // 1 Day
  let minDist = 1000000;
  let result = {
    offset: null,
    dist: null,
    ric: null,
  };

  sat1.satrec = Sgp4.createSatrec(sat1.TLE1, sat1.TLE2); // perform and store sat init calcs
  sat2.satrec = Sgp4.createSatrec(sat2.TLE1, sat2.TLE2); // perform and store sat init calcs

  for (let t = 0; t < propLength; t++) {
    offset = t * 1000; // Offset in seconds (msec * 1000)

    sat1 = <SatObject>{ ...sat1, ...getEci(sat1, new Date(Date.now() + offset)) };
    sat2 = <SatObject>{ ...sat2, ...getEci(sat2, new Date(Date.now() + offset)) };
    const pv = sat2ric(sat1, sat2);
    const dist = Math.sqrt(pv.position[0] ** 2 + pv.position[1] ** 2 + pv.position[2] ** 2);
    if (dist < minDist && !(pv.position[0] === 0 && pv.position[1] === 0 && pv.position[2] === 0)) {
      minDist = dist;
      result = {
        offset,
        dist: dist,
        ric: pv,
      };
    }
  }

  // Go to closest approach time
  keepTrackApi.programs.timeManager.changeStaticOffset(result.offset);
  keepTrackApi.programs.satSet.setColorScheme(settingsManager.currentColorScheme, true);

  return result;
};
