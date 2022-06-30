import { SensorManager, SensorObject } from '../../api/keepTrackTypes';

export const verifySensors = (sensors: SensorObject[], sensorManager: SensorManager): SensorObject[] => {
  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensors == 'undefined' || sensors == null) {
    if (typeof sensorManager.currentSensor == 'undefined') {
      throw new Error('getTEARR requires a sensor or for a sensor to be currently selected.');
    } else {
      sensors = sensorManager.currentSensor;
    }
  }
  // If sensor's observerGd is not set try to set it using it parameters
  if (typeof sensors[0].observerGd == 'undefined') {
    try {
      sensors[0].observerGd = {
        alt: sensors[0].alt,
        lat: sensors[0].lat,
        lon: sensors[0].lon,
      };
    } catch (e) {
      throw new Error('observerGd is not set and could not be guessed.');
    }
  }
  return sensors;
};
