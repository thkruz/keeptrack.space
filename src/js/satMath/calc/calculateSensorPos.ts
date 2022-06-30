import { DEG2RAD, PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/js/lib/constants';
import { keepTrackApi } from '../../api/keepTrackApi';
import { SensorObject } from '../../api/keepTrackTypes';
import { calculateTimeVariables } from './calculateTimeVariables';
import { verifySensors } from './verifySensors';

export const calculateSensorPos = (sensors?: SensorObject[]): { x: number; y: number; z: number; lat: number; lon: number; gmst: number } => {
  const { timeManager, sensorManager } = keepTrackApi.programs;
  sensors = verifySensors(sensors, sensorManager);
  const sensor = sensors[0];

  const now = timeManager.simulationTimeObj;
  const { gmst } = calculateTimeVariables(now);

  const cosLat = Math.cos(sensor.lat * DEG2RAD);
  const sinLat = Math.sin(sensor.lat * DEG2RAD);
  const cosLon = Math.cos(sensor.lon * DEG2RAD + gmst);
  const sinLon = Math.sin(sensor.lon * DEG2RAD + gmst);

  return {
    x: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon,
    y: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon,
    z: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat,
    gmst: gmst,
    lat: sensor.lat,
    lon: sensor.lon,
  };
};
