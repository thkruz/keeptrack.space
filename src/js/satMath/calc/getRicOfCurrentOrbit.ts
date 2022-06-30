import { keepTrackApi } from '../../api/keepTrackApi';
import { SatObject } from '../../api/keepTrackTypes';
import { sat2ric } from '../transforms/sat2ric';
import { getEci } from './getEci';

export const getRicOfCurrentOrbit = (sat: SatObject, sat2: SatObject, points: number, orbits?: number): { x: number; y: number; z: number }[] => {
  const { timeManager } = keepTrackApi.programs;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  orbits ??= 1;
  let ricPoints = [];
  for (let i = 0; i < points; i++) {
    let offset = ((i * sat.period * orbits) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    sat = { ...sat, ...(<SatObject>getEci(sat, now)) };
    sat2 = { ...sat2, ...(<SatObject>getEci(sat2, now)) };
    ricPoints.push(sat2ric(sat, sat2).position);
  }
  return ricPoints;
};
