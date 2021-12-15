import $ from 'jquery';
import { keepTrackApi } from '../api/keepTrackApi';
import { SensorObject } from '../api/keepTrackTypes';

export type GeolocationPosition = {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
};

export interface SensorGeolocation {
  lat: number;
  lon: number;
  alt: number;
  minaz: number;
  maxaz: number;
  minel: number;
  maxel: number;
  minrange: number;
  maxrange: number;
}

export const updateSettingsManager = (position: GeolocationPosition): SensorGeolocation => {
  settingsManager.geolocation.lat = position.coords.latitude;
  settingsManager.geolocation.lon = position.coords.longitude;
  settingsManager.geolocation.alt = 0;
  settingsManager.geolocation.minaz = 0;
  settingsManager.geolocation.maxaz = 360;
  settingsManager.geolocation.minel = 30;
  settingsManager.geolocation.maxel = 90;
  settingsManager.geolocation.minrange = 0;
  settingsManager.geolocation.maxrange = 100000;
  return settingsManager.geolocation;
};

export const updateUi = (): void => {
  if (!settingsManager.geolocation) throw new Error('geolocation is not defined');
  if (typeof settingsManager.geolocation.lat !== 'number') throw new Error('geolocation.lat is not valid');
  if (typeof settingsManager.geolocation.lon !== 'number') throw new Error('geolocation.lon is not valid');
  if (typeof settingsManager.geolocation.alt !== 'number') throw new Error('geolocation.alt is not valid');

  $('#cs-lat').val(settingsManager.geolocation.lat).trigger('change');
  $('#cs-lon').val(settingsManager.geolocation.lon).trigger('change');
  $('#cs-hei').val(settingsManager.geolocation.alt).trigger('change');

  $('#cs-telescope').attr('checked', 'checked');
  $('#cs-minaz').attr('disabled', true.toString());
  $('#cs-maxaz').attr('disabled', true.toString());
  $('#cs-minel').attr('disabled', true.toString());
  $('#cs-maxel').attr('disabled', true.toString());
  $('#cs-minrange').attr('disabled', true.toString());
  $('#cs-maxrange').attr('disabled', true.toString());
  $('#cs-minaz-div').hide();
  $('#cs-maxaz-div').hide();
  $('#cs-minel-div').hide();
  $('#cs-maxel-div').hide();
  $('#cs-minrange-div').hide();
  $('#cs-maxrange-div').hide();
  $('#cs-minaz').val(0);
  $('#cs-maxaz').val(360);
  $('#cs-minel').val(10);
  $('#cs-maxel').val(90);
  $('#cs-minrange').val(100);
  $('#cs-maxrange').val(50000);

  $('#sensor-type').html('Telescope');
  $('#sensor-info-title').html('Custom Sensor');
  $('#sensor-country').html('Custom Sensor');
};

export const updateSensorPosition = (position: GeolocationPosition): void => {
  const { objectManager, sensorManager, timeManager, satellite, satSet, mainCamera } = keepTrackApi.programs;
  const { lon, lat, alt, minaz, maxaz, minel, maxel, minrange, maxrange } = updateSettingsManager(position);

  sensorManager.whichRadar = 'CUSTOM';
  updateUi();

  const sensorInfo = {
    lat,
    lon,
    alt,
    obsminaz: minaz,
    obsmaxaz: maxaz,
    obsminel: minel,
    obsmaxel: maxel,
    obsminrange: minrange,
    obsmaxrange: maxrange,
  };

  satSet.satCruncher.postMessage({
    setlatlong: true,
    sensor: sensorInfo,
  });

  satellite.setobs(<SensorObject[]>[sensorInfo]);

  objectManager.setSelectedSat(-1);
  maxrange > 6000 ? mainCamera.changeZoom('geo') : mainCamera.changeZoom('leo');
  mainCamera.camSnap(mainCamera.latToPitch(lat), mainCamera.longToYaw(lon, timeManager.selectedDate));
};

export const useCurrentGeolocationAsSensor = () => {
  if (location.protocol === 'https:' && !settingsManager.geolocationUsed && settingsManager.isMobileModeEnabled) {
    navigator.geolocation.getCurrentPosition(updateSensorPosition);
  }
};
