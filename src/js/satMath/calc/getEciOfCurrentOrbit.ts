import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { getEci } from './getEci';

export const getEciOfCurrentOrbit = (sat: SatObject, points: number): { x: number; y: number; z: number }[] => {
  const { timeManager } = keepTrackApi.programs;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let eciPoints = [];
  for (let i = 0; i < points; i++) {
    let offset = ((i * sat.period) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    eciPoints.push(getEci(sat, now).position);
  }
  return eciPoints;
};
