import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { Sgp4 } from 'ootk';
import { SatRec } from 'satellite.js';

/**
 * Returns the satellite record from cache or calculates it.
 * @sideeffects
 * @param {SatObject} sat The satellite object
 * @returns {SatRec} The satellite record containing description of the orbit
 */
export const calcSatrec = (sat: SatObject): SatRec => {
  // If cached satrec exists, return it
  if (sat.satrec) {
    return sat.satrec;
  }

  // Perform and store sat init calcs
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2);

  // Cache the satrec for later use.
  const { satSet } = keepTrackApi.programs;
  if (satSet.satData[sat.id]) {
    satSet.satData[sat.id].satrec = satrec;
  } else {
    console.debug('calcSatrec: satId not found in satData');
  }

  return satrec;
};
