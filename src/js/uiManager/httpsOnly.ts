import $ from 'jquery';
import { SensorObject } from '../api/keepTrack';
import { keepTrackApi } from '../api/keepTrackApi';

export const useCurrentGeolocationAsSensor = () => {
  const { objectManager, sensorManager, timeManager, satellite, satSet, mainCamera } = keepTrackApi.programs;

  if (location.protocol === 'https:' && !settingsManager.geolocationUsed && settingsManager.isMobileModeEnabled) {
    navigator.geolocation.getCurrentPosition(function (position) {
      settingsManager.geolocation.lat = position.coords.latitude;
      settingsManager.geolocation.lon = position.coords.longitude;
      settingsManager.geolocation.alt = 0;
      settingsManager.geolocation.minaz = 0;
      settingsManager.geolocation.maxaz = 360;
      settingsManager.geolocation.minel = 30;
      settingsManager.geolocation.maxel = 90;
      settingsManager.geolocation.minrange = 0;
      settingsManager.geolocation.maxrange = 100000;
      sensorManager.whichRadar = 'CUSTOM';

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

      var lon = settingsManager.geolocation.lon;
      var lat = settingsManager.geolocation.lat;
      var alt = settingsManager.geolocation.alt;
      var minaz = settingsManager.geolocation.minaz;
      var maxaz = settingsManager.geolocation.maxaz;
      var minel = settingsManager.geolocation.minel;
      var maxel = settingsManager.geolocation.maxel;
      var minrange = settingsManager.geolocation.minrange;
      var maxrange = settingsManager.geolocation.maxrange;

      satSet.satCruncher.postMessage({
        // Send satSet.satCruncher File information on this radar
        setlatlong: true,
        sensor: {
          lat: lat,
          lon: lon,
          alt: alt,
          obsminaz: minaz,
          obsmaxaz: maxaz,
          obsminel: minel,
          obsmaxel: maxel,
          obsminrange: minrange,
          obsmaxrange: maxrange,
        },
      });

      satellite.setobs(<SensorObject[]>[
        {
          lat: lat,
          lon: lon,
          alt: alt,
          obsminaz: minaz,
          obsmaxaz: maxaz,
          obsminel: minel,
          obsmaxel: maxel,
          obsminrange: minrange,
          obsmaxrange: maxrange,
        },
      ]);

      objectManager.setSelectedSat(-1);
      lat = lat * 1;
      lon = lon * 1;
      if (maxrange > 6000) {
        mainCamera.changeZoom('geo');
      } else {
        mainCamera.changeZoom('leo');
      }
      mainCamera.camSnap(mainCamera.latToPitch(lat), mainCamera.longToYaw(lon, timeManager.selectedDate));
    });
  }
};
