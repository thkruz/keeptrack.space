import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SensorObject } from '@app/js/api/keepTrackTypes';
import { getEl } from '@app/js/lib/helpers';

export const getsensorinfo = () => {
  const { currentSensor }: { currentSensor: SensorObject[] } = keepTrackApi.programs.sensorManager;

  const firstSensor = currentSensor[0];
  getEl('sensor-latitude').innerHTML = firstSensor.lat.toString();
  getEl('sensor-longitude').innerHTML = firstSensor.lon.toString();
  getEl('sensor-minazimuth').innerHTML = firstSensor.obsminaz.toString();
  getEl('sensor-maxazimuth').innerHTML = firstSensor.obsmaxaz.toString();
  getEl('sensor-minelevation').innerHTML = firstSensor.obsminel.toString();
  getEl('sensor-maxelevation').innerHTML = firstSensor.obsmaxel.toString();
  getEl('sensor-minrange').innerHTML = firstSensor.obsminrange.toString();
  getEl('sensor-maxrange').innerHTML = firstSensor.obsmaxrange.toString();
};
