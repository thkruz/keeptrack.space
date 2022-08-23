import { RAD2DEG } from '@app/js/lib/constants';
import { Transforms } from 'ootk';
import { keepTrackApi } from '../../api/keepTrackApi';
import { calculateTimeVariables } from '../calc/calculateTimeVariables';

export const eci2ll = (x: number, y: number, z: number): { lat: number; lon: number; alt: number } => {
  const { timeManager } = keepTrackApi.programs;

  const now = timeManager.simulationTimeObj;
  const { gmst } = calculateTimeVariables(now);
  var latLon = Transforms.eci2lla({ x: x, y: y, z: z }, gmst);
  latLon.lat = latLon.lat * RAD2DEG;
  latLon.lon = latLon.lon * RAD2DEG;

  // Normalize
  latLon.lon = latLon.lon > 180 ? latLon.lon - 360 : latLon.lon;
  latLon.lon = latLon.lon < -180 ? latLon.lon + 360 : latLon.lon;
  return latLon;
};
