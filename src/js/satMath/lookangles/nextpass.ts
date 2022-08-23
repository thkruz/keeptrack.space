import { MINUTES_PER_DAY, TAU } from '@app/js/lib/constants';
import { SatObject, SensorObject, sccPassTimes } from '../../api/keepTrackTypes';

import { calcSatrec } from '@app/js/satSet/catalogSupport/calcSatrec';
import { dateFormat } from '../../lib/external/dateFormat.js';
import { keepTrackApi } from '../../api/keepTrackApi';
import { satellite } from '../satMath';
import { verifySensors } from '../calc/verifySensors';

export const nextpass = (sat: SatObject, sensors?: SensorObject[], searchLength?: number, interval?: number) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  sensors = verifySensors(sensors, sensorManager);
  // Loop through sensors looking for in view times
  const inViewTime = [];
  // If length and interval not set try to use defaults
  searchLength ??= satellite.lookanglesLength;
  interval ??= satellite.lookanglesInterval;

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  const satrec = calcSatrec(sat);
  for (const sensor of sensors) {
    for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
      // 5second Looks
      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManager.getOffsetTimeObj(offset, simulationTime);
      const aer = satellite.getRae(now, satrec, sensor);

      const isInFOV = satellite.checkIsInView(sensor, aer);
      if (isInFOV) {
        inViewTime.push(now);
        break;
      }
    }
  }
  // If there are in view times find the earlierst and return it formatted
  if (inViewTime.length > 0) {
    inViewTime.sort((a, b) => a.getTime() - b.getTime());
    return dateFormat(inViewTime[0], 'isoDateTime', true);
  } else {
    return 'No Passes in ' + searchLength + ' Days';
  }
};
export const nextpassList = (satArray: SatObject[], interval?: number, days = 7): sccPassTimes[] => {
  let nextPassArray = [];
  settingsManager.nextNPassesCount ??= 1;
  for (let s = 0; s < satArray.length; s++) {
    let time = nextNpasses(satArray[s], null, days, interval || satellite.lookanglesInterval, settingsManager.nextNPassesCount); // Only do 1 day looks
    for (let i = 0; i < time.length; i++) {
      nextPassArray.push({
        sccNum: satArray[s].sccNum,
        time: time[i],
      });
    }
  }
  return nextPassArray;
};
export const nextNpasses = (sat: SatObject, sensors: SensorObject[], searchLength: number, interval: number, numPasses: number) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  sensors = verifySensors(sensors, sensorManager);
  // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  // If length and interval not set try to use defaults
  searchLength = searchLength || satellite.lookanglesLength;
  interval = interval || satellite.lookanglesInterval;
  numPasses = numPasses || 1;

  let passTimesArray = [];
  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  let satrec = calcSatrec(sat);
  const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    // Only pass a maximum of N passes
    if (passTimesArray.length >= numPasses) {
      return passTimesArray;
    }

    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    let aer = satellite.getRae(now, satrec, sensor);

    let isInFOV = satellite.checkIsInView(sensor, aer);
    if (isInFOV) {
      passTimesArray.push(now);
      // Jump 3/4th to the next orbit
      i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
    }
  }
  return passTimesArray;
};
