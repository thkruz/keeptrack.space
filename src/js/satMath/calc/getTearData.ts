import { SatRec } from 'satellite.js';
import { SensorObject, TearrData } from '../../api/keepTrackTypes';
import { dateFormat } from '../../lib/external/dateFormat.js';
import { checkIsInView } from '../lookangles/checkIsInView';
import { getRae } from './getRae';

export const getTearData = (now: Date, satrec: SatRec, sensors: SensorObject[], isRiseSetLookangles: boolean): TearrData => {
  // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  let aer = getRae(now, satrec, sensor);
  const isInFOV = checkIsInView(sensor, aer);

  if (isInFOV) {
    if (isRiseSetLookangles) {
      // Previous Pass to Calculate first line of coverage
      const now1 = new Date();
      now1.setTime(Number(now) - 1000);
      let aer1 = getRae(now1, satrec, sensor);
      let isInFOV1 = checkIsInView(sensor, aer1);

      // Is in FOV and Wasn't Last Time so First Line of Coverage
      if (!isInFOV1) {
        return {
          time: dateFormat(now, 'isoDateTime', true),
          rng: aer.rng,
          az: aer.az,
          el: aer.el,
          name: sensor.shortName,
        };
      } else {
        // Next Pass to Calculate Last line of coverage
        now1.setTime(Number(now) + 1000);
        aer1 = getRae(now1, satrec, sensor);
        isInFOV1 = checkIsInView(sensor, aer1);

        // Is in FOV and Wont Be Next Time so Last Line of Coverage
        if (!isInFOV1) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            name: sensor.shortName,
          };
        }
      }
      return {
        time: '',
        rng: -1,
        az: -1,
        el: -1,
        name: sensor.shortName,
      };
    }
    return {
      time: dateFormat(now, 'isoDateTime', true),
      rng: aer.rng,
      az: aer.az,
      el: aer.el,
      name: sensor.shortName,
    };
  }
  return {
    time: '',
    rng: -1,
    az: -1,
    el: -1,
    name: sensor.shortName,
  };
};
