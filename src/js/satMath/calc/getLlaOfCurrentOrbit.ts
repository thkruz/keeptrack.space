import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { EciVec3 } from 'ootk';
import { eci2lla } from '../transforms';
import { calculateTimeVariables } from './calculateTimeVariables';
import { getEci } from './getEci';

export const getLlaOfCurrentOrbit = (sat: SatObject, points: number): { lat: number; lon: number; alt: number; time: number }[] => {
  const { timeManager } = keepTrackApi.programs;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let llaPoints = [];
  for (let i = 0; i < points; i++) {
    let offset = ((i * sat.period) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    const { gmst } = calculateTimeVariables(now);
    const eci = <EciVec3>getEci(sat, now).position;
    if (!eci) {
      console.debug('No ECI position for', sat.sccNum, 'at', now);
      continue;
    }
    const lla = eci2lla(eci, gmst);
    const llat = { ...lla, ...{ time: now.getTime() } };
    llaPoints.push(llat);
  }
  return llaPoints;
};
