/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * sensorManager.ts is the primary interface between the user interface and the
 * ground based sensors.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { spaceObjType2Str } from '@app/js/lib/spaceObjType2Str';
import $ from 'jquery';
import { keepTrackApi } from '../../api/keepTrackApi';
import { SensorManager, SensorObject } from '../../api/keepTrackTypes';
import { sensorList } from './sensorList';

// Add new callbacks to the list of callbacks in keepTrackApi
keepTrackApi.callbacks.setSensor = [];
keepTrackApi.methods.setSensor = (sensor: SensorObject, id: number) => {
  keepTrackApi.callbacks.setSensor.forEach((cb: any) => cb.cb(sensor, id));
};

keepTrackApi.callbacks.resetSensor = [];
keepTrackApi.methods.resetSensor = () => {
  keepTrackApi.callbacks.resetSensor.forEach((cb: any) => cb.cb());
};

const emptySensor: SensorObject = {
  observerGd: {
    lat: null,
    lon: 0,
    alt: 0,
  },
  alt: null,
  country: '',
  lat: null,
  lon: null,
  name: '',
  obsmaxaz: 0,
  obsmaxel: 0,
  obsmaxrange: 0,
  obsminaz: 0,
  obsminel: 0,
  obsminrange: 0,
  shortName: '',
  staticNum: 0,
  sun: '',
  volume: false,
  zoom: 'geo',
};

// NOTE: This doesn't account for sensorManager.selectedSensor
export const checkSensorSelected = () => sensorManager.currentSensor[0].lat != null;

export const setCurrentSensor = (sensor: SensorObject[] | null): void => {
  // TODO: This function is totally redundant to setSensor. There should be
  // ONE selectedSensor/currentSensor and it should be an array of selected sensors.
  if (sensor === null) {
    sensorManager.currentSensor[0] = emptySensor;
  } else if (sensor[0] != null) {
    sensorManager.currentSensor = sensor;
  } else if (sensor != null) {
    throw new Error('SensorManager.setCurrentSensor: sensor is not an array');
  }
};

export const sensorListLength = () => Object.values(sensorList).reduce((acc) => acc++, 0);

export const setSensor = (selectedSensor: SensorObject | string, staticNum: number) => { // NOSONAR
  try {
    localStorage.setItem('currentSensor', JSON.stringify([selectedSensor, staticNum]));
  } catch {
    console.warn('Sensor Manager: Unable to set current sensor - localStorage issue!');
  }

  // Run any callbacks
  const { satSet, satellite, objectManager } = keepTrackApi.programs;
  keepTrackApi.methods.setSensor(selectedSensor, staticNum);

  if (selectedSensor == null && staticNum == null) {
    sensorManager.sensorTitle = '';
    $('#sensor-selected').text(sensorManager.sensorTitle);
    return;
  }
  if (selectedSensor === 'SSN') {
    sensorManager.sensorTitle = 'All Space Surveillance Network Sensors';
    const filteredSensors = Object.values(sensorList).filter((sensor) => sensor.country === 'United States' || sensor.country === 'United Kingdom' || sensor.country === 'Norway');
    sendSensorToOtherPrograms(filteredSensors);
  } else if (selectedSensor === 'CapeCodMulti') {
    let multiSensor = [];
    multiSensor.push({
      lat: 41.754785,
      lon: -70.539151,
      alt: 0.060966,
      obsminaz: 347,
      obsmaxaz: 227,
      obsminel: 6,
      obsmaxel: 85,
      obsminrange: 150,
      obsmaxrange: 725,
      volume: false,
    });
    multiSensor.push({
      lat: 41.754785,
      lon: -70.539151,
      alt: 0.060966,
      obsminaz: 347,
      obsmaxaz: 227,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 700,
      obsmaxrange: 2450,
      volume: false,
    });
    multiSensor.push({
      lat: 41.754785,
      lon: -70.539151,
      alt: 0.060966,
      obsminaz: 347,
      obsmaxaz: 227,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 2200,
      obsmaxrange: 5556,
      volume: false,
    });
    satSet.satCruncher.postMessage({
      typ: 'sensor',
      setlatlong: true,
      sensor: multiSensor,
      multiSensor: true,
    });
    satellite.setobs([sensorManager.sensorList.COD]);
    objectManager.setSelectedSat(-1);
    satSet.setColorScheme(settingsManager.currentColorScheme, true);
    sensorManager.sensorTitle = 'Cape Cod Multi Fence Radar';
  } else if (selectedSensor === 'NATO-MW') {
    sensorManager.sensorTitle = 'All North American Aerospace Defense Command Sensors';
    const filteredSensors = Object.values(sensorList).filter(
      (sensor) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        sensor == sensorManager.sensorList.BLE ||
        sensor == sensorManager.sensorList.CAV ||
        sensor == sensorManager.sensorList.CDN ||
        sensor == sensorManager.sensorList.COD ||
        sensor == sensorManager.sensorList.CLR ||
        sensor == sensorManager.sensorList.FYL ||
        sensor == sensorManager.sensorList.THL
    );
    sendSensorToOtherPrograms(filteredSensors);
  } else if (selectedSensor === 'RUS-ALL') {
    sensorManager.sensorTitle = 'All Russian Sensors';
    const filteredSensors = Object.values(sensorList).filter(
      (sensor) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        sensor == sensorManager.sensorList.ARM ||
        sensor == sensorManager.sensorList.BAL ||
        sensor == sensorManager.sensorList.GAN ||
        sensor == sensorManager.sensorList.LEK ||
        sensor == sensorManager.sensorList.MIS ||
        sensor == sensorManager.sensorList.OLE ||
        sensor == sensorManager.sensorList.PEC ||
        sensor == sensorManager.sensorList.PIO
    );
    sendSensorToOtherPrograms(filteredSensors);
  } else if (selectedSensor === 'LEO-LABS') {
    sensorManager.sensorTitle = 'All LEO Labs Sensors';
    const filteredSensors = Object.values(sensorList).filter(
      (sensor) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        sensor == sensorManager.sensorList.MSR || sensor == sensorManager.sensorList.PFISR || sensor == sensorManager.sensorList.KSR
    );
    sendSensorToOtherPrograms(filteredSensors);
  } else if (selectedSensor === 'MD-ALL') {
    sensorManager.sensorTitle = 'All Missile Defense Agency Sensors';
    const filteredSensors = Object.values(sensorList).filter(
      (sensor) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        sensor == sensorManager.sensorList.COD ||
        sensor == sensorManager.sensorList.BLE ||
        sensor == sensorManager.sensorList.CLR ||
        sensor == sensorManager.sensorList.FYL ||
        sensor == sensorManager.sensorList.THL ||
        sensor == sensorManager.sensorList.HAR ||
        sensor == sensorManager.sensorList.QTR ||
        sensor == sensorManager.sensorList.KUR ||
        sensor == sensorManager.sensorList.SHA ||
        sensor == sensorManager.sensorList.KCS ||
        sensor == sensorManager.sensorList.SBX
    );
    sendSensorToOtherPrograms(filteredSensors);
  } else {
    for (const sensor in sensorList) {
      if (sensorList[sensor] == selectedSensor || (sensorList[sensor].staticNum === staticNum && typeof staticNum != 'undefined')) {
        // TODO: selectedSensor is redundant and should be merged with currentSensor (this will make bugs if you don't remove
        // references to selectedSensor)
        sensorManager.selectedSensor = sensorList[sensor];

        $('#sensor-info-title').html("<a class='iframe' href='" + sensorManager.selectedSensor.url + "'>" + sensorManager.selectedSensor.name + '</a>');
        new Promise(() => {
          $('a.iframe').colorbox({
            iframe: true,
            width: '80%',
            height: '80%',
            fastIframe: false,
            closeButton: false,
          });
        }).catch((err) => console.warn(err));

        $('#sensor-type').html(spaceObjType2Str(sensorManager.selectedSensor.type));
        $('#sensor-country').html(sensorManager.selectedSensor.country);
        sensorManager.sensorTitle = sensorManager.selectedSensor.name;

        // Send single sensor as an array to other programs
        sendSensorToOtherPrograms([sensorList[sensor]]);
      }
    }
  }
  $('#sensor-selected').text(sensorManager.sensorTitle);
};
export const drawFov = (sensor: SensorObject) => {
  switch (sensor.shortName) {
    case 'COD':
    case 'BLE':
    case 'CLR':
    case 'THL':
      keepTrackApi.programs.lineManager.create(
        'scan2',
        [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), sensor.obsminaz, sensor.obsminaz + 120, sensor.obsminel, sensor.obsmaxrange],
        'c'
      );
      keepTrackApi.programs.lineManager.create(
        'scan2',
        [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), sensor.obsminaz + 120, sensor.obsmaxaz, sensor.obsminel, sensor.obsmaxrange],
        'c'
      );
      break;
    case 'FYL':
      // TODO: Find actual face directions
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), 0, 120, sensor.obsminel, sensor.obsmaxrange], 'c');
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), 120, 240, sensor.obsminel, sensor.obsmaxrange], 'c');
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), 240, 0, sensor.obsminel, sensor.obsmaxrange], 'c');
      break;
    case 'CDN':
      // NOTE: This will be a bit more complicated later
      keepTrackApi.programs.lineManager.create(
        'scan2',
        [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), sensor.obsminaz, sensor.obsmaxaz, sensor.obsminel, sensor.obsmaxrange],
        'c'
      );
      break;
    default:
      console.debug('Sensor not found');
      break;
  }
};

export const sensorManager: SensorManager = {
  sensorList: sensorList,
  setSensor: setSensor,
  checkSensorSelected: checkSensorSelected,
  sensorListLength: sensorListLength,
  drawFov: drawFov,
  sensorTitle: '',
  setCurrentSensor: setCurrentSensor,
  curSensorPositon: [0, 0, 0],
  whichRadar: '',
  selectedSensor: <SensorObject>null,
  sensorListUS: [
    sensorList.COD,
    sensorList.BLE,
    sensorList.CAV,
    sensorList.CLR,
    sensorList.EGL,
    sensorList.FYL,
    sensorList.THL,
    sensorList.MIL,
    sensorList.ALT,
    sensorList.ASC,
    sensorList.CDN,
  ],
  currentSensor: [
    {
      observerGd: {
        lat: <number>null,
        lon: 0,
        alt: 0,
      },
      alt: 0,
      country: '',
      lat: 0,
      lon: 0,
      name: '',
      obsmaxaz: 0,
      obsmaxel: 0,
      obsmaxrange: 0,
      obsminaz: 0,
      obsminel: 0,
      obsminrange: 0,
      shortName: '',
      staticNum: 0,
      sun: '',
      volume: false,
      zoom: 'leo',
    },
  ],
  defaultSensor: <SensorObject[]>[
    {
      observerGd: {
        lat: null,
        lon: 0,
        alt: 0,
      },
    },
  ],
  currentSensorList: null,
  currentSensorMultiSensor: false,
  tempSensor: null,
  isLookanglesMenuOpen: false,
  isCustomSensorMenuOpen: false,
};

export const sendSensorToOtherPrograms = (filteredSensors: SensorObject[]) => {
  const { satSet, satellite, objectManager } = keepTrackApi.programs;
  satSet.satCruncher.postMessage({
    typ: 'sensor',
    setlatlong: true,
    sensor: filteredSensors,
    multiSensor: filteredSensors.length > 1,
  });
  setCurrentSensor(filteredSensors);
  satellite.setobs(filteredSensors);
  objectManager.setSelectedSat(-1);

  if (typeof settingsManager.currentColorScheme === 'undefined') throw new Error('settingsManager.currentColorScheme is undefined');
  satSet.setColorScheme(settingsManager.currentColorScheme, true);
};
