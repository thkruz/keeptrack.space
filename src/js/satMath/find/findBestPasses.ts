import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SensorObject } from '@app/js/api/keepTrackTypes';
import { saveCsv } from '@app/js/lib/helpers';
import { findBestPass } from './findBestPass';

export const findBestPasses = (sats: string, sensor: SensorObject) => {
  const { satSet } = keepTrackApi.programs;

  sats = sats.replace(/ /gu, ',');
  const satArray = sats.split(',');
  let tableSatTimes = [];
  for (let i = 0; i < satArray.length; i++) {
    try {
      const satId = satArray[i];
      if (typeof satId == 'undefined' || satId == null || satId === '' || satId === ' ') continue;
      const sat = satSet.getSatFromObjNum(parseInt(satId));
      const satPasses = findBestPass(sat, [sensor]);
      for (let s = 0; s < satPasses.length; s++) {
        tableSatTimes.push(satPasses[s]);
        // }
      }
    } catch (e) {
      console.debug(e);
    }
  }
  tableSatTimes.sort((a, b) => b.sortTime - a.sortTime);
  tableSatTimes.reverse();
  tableSatTimes.forEach((v) => {
    delete v.sortTime;
  });

  for (let i = 0; i < tableSatTimes.length; i++) {
    tableSatTimes[i].startDate = tableSatTimes[i].startDate.toISOString().split('T')[0];
    tableSatTimes[i].startTime = tableSatTimes[i].startTime.toISOString().split('T')[1].split('.')[0];
    tableSatTimes[i].stopDate = tableSatTimes[i].stopDate.toISOString().split('T')[0];
    tableSatTimes[i].stopTime = tableSatTimes[i].stopTime.toISOString().split('T')[1].split('.')[0];
  }

  saveCsv(tableSatTimes, 'bestSatTimes');
};
