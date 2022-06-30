import { keepTrackApi } from '../../api/keepTrackApi';
import { SatObject } from '../../api/keepTrackTypes';
import { getLlaTimeView } from './getLlaTimeView';

export const map = (sat: SatObject, i: number, pointPerOrbit?: number): { time: string; lat: number; lon: number; inView: boolean } => {
  const { timeManager } = keepTrackApi.programs;
  pointPerOrbit ??= 256; // TODO: This should be mandatory but tests need updated

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let offset = ((i * sat.period) / pointPerOrbit) * 60 * 1000; // Offset in seconds (msec * 1000)
  const now = timeManager.getOffsetTimeObj(offset, simulationTime);

  return getLlaTimeView(now, sat);
};
