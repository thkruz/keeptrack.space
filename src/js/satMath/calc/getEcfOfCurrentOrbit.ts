import { TAU } from '@app/js/lib/constants';
import { EciVec3 } from 'ootk';
import { keepTrackApi } from '../../api/keepTrackApi';
import { SatObject } from '../../api/keepTrackTypes';
import { satellite } from '../satMath';
import { getEci } from './getEci';

export const getEcfOfCurrentOrbit = (sat: SatObject, points: number): { x: number; y: number; z: number }[] => {
  const { timeManager } = keepTrackApi.programs;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let ecfPoints = [];
  for (let i = 0; i < points; i++) {
    let offset = ((i * sat.period) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    const eciPos = <EciVec3>getEci(sat, now).position;
    if (!eciPos) {
      console.debug('No ECI position for', sat.sccNum, 'at', now);
      continue;
    }
    ecfPoints.push(satellite.ecfToEci(eciPos, (-i * (sat.period / points) * TAU) / sat.period));
  }
  return ecfPoints;
};
