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

import { keepTrackApi } from '@app/js/api/externalApi';
import { SensorObject } from '@app/js/api/keepTrack';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { sensorList } from '@app/js/plugins/sensor/sensorList';
import { setColorScheme } from '@app/js/satSet/satSet';
import $ from 'jquery';

// Add new callbacks to the list of callbacks in keepTrackApi
keepTrackApi.callbacks.setSensor = [];
keepTrackApi.methods.setSensor = (sensor, id) => {
  keepTrackApi.callbacks.setSensor.forEach((cb) => cb.cb(sensor, id));
};

keepTrackApi.callbacks.resetSensor = [];
keepTrackApi.methods.resetSensor = () => {
  keepTrackApi.callbacks.resetSensor.forEach((cb) => cb.cb());
};

export const checkSensorSelected = () => {
  if (sensorManager.currentSensor.lat != null) {
    return true;
  } else {
    return false;
  }
};
export const setCurrentSensor = (sensor: SensorObject | null) => {
  // If the sensor is null, reset the current sensor
  if (sensor == null) {
    sensor = {
      observerGd: {
        lat: null,
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
      zoom: '',
    };
  }

  sensorManager.currentSensor = sensor;
};
export const sensorListLength = () => {
  var sensorListCount = 0;
  for (var sensor in sensorList) {
    if (Object.prototype.hasOwnProperty.call(sensorList, sensor)) {
      sensorListCount++;
    }
  }
  return sensorListCount;
};
export const setSensor = (selectedSensor: SensorObject | string, staticNum: number) => {
  try {
    localStorage.setItem('currentSensor', JSON.stringify([selectedSensor, staticNum]));
  } catch {
    console.warn('Sensor Manager: Unable to set current sensor - localStorage issue!');
  }

  // Run any callbacks
  const { satSet, satellite } = keepTrackApi.programs;
  keepTrackApi.methods.setSensor(selectedSensor, staticNum);

  if (selectedSensor == null && staticNum == null) {
    sensorManager.sensorTitle = '';
    $('#sensor-selected').text(sensorManager.sensorTitle);
    return;
  }
  if (selectedSensor === 'SSN') {
    var allSSNSensors = [];
    for (const sensor in sensorList) {
      if (sensorList[sensor].country === 'United States' || sensorList[sensor].country === 'United Kingdom' || sensorList[sensor].country === 'Norway') {
        allSSNSensors.push(sensorList[sensor]);
      }
    }
    satSet.satCruncher.postMessage({
      setlatlong: true,
      sensor: allSSNSensors,
      multiSensor: true,
    });
    satellite.setobs(allSSNSensors);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    sensorManager.sensorTitle = 'All Space Surveillance Network Sensors';
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
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
      setlatlong: true,
      sensor: multiSensor,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.COD);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    sensorManager.sensorTitle = 'Cape Cod Multi Fence Radar';
  } else if (selectedSensor === 'NATO-MW') {
    var natoMWSensors = [];
    natoMWSensors.push(sensorManager.sensorList.BLE);
    natoMWSensors.push(sensorManager.sensorList.CAV);
    natoMWSensors.push(sensorManager.sensorList.CDN);
    natoMWSensors.push(sensorManager.sensorList.COD);
    natoMWSensors.push(sensorManager.sensorList.CLR);
    natoMWSensors.push(sensorManager.sensorList.FYL);
    natoMWSensors.push(sensorManager.sensorList.THL);
    satSet.satCruncher.postMessage({
      setlatlong: true,
      sensor: natoMWSensors,
      multiSensor: true,
    });
    satellite.setobs(natoMWSensors);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
    sensorManager.sensorTitle = 'All North American Aerospace Defense Command Sensors';
  } else if (selectedSensor === 'RUS-ALL') {
    var rusSensors = [];
    rusSensors.push(sensorManager.sensorList.ARM);
    rusSensors.push(sensorManager.sensorList.BAL);
    rusSensors.push(sensorManager.sensorList.GAN);
    rusSensors.push(sensorManager.sensorList.LEK);
    rusSensors.push(sensorManager.sensorList.MIS);
    rusSensors.push(sensorManager.sensorList.OLE);
    rusSensors.push(sensorManager.sensorList.PEC);
    rusSensors.push(sensorManager.sensorList.PIO);
    satSet.satCruncher.postMessage({
      setlatlong: true,
      sensor: rusSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.ARM);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
    sensorManager.sensorTitle = 'All Russian Sensors';
  } else if (selectedSensor === 'LEO-LABS') {
    var leolabsSensors = [];
    leolabsSensors.push(sensorManager.sensorList.MSR);
    leolabsSensors.push(sensorManager.sensorList.PFISR);
    leolabsSensors.push(sensorManager.sensorList.KSR);
    satSet.satCruncher.postMessage({
      setlatlong: true,
      sensor: leolabsSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.MSR);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
    sensorManager.sensorTitle = 'All LEO Labs Sensors';
  } else if (selectedSensor === 'MD-ALL') {
    var mdSensors = [];
    mdSensors.push(sensorManager.sensorList.COD);
    mdSensors.push(sensorManager.sensorList.BLE);
    mdSensors.push(sensorManager.sensorList.CLR);
    mdSensors.push(sensorManager.sensorList.FYL);
    mdSensors.push(sensorManager.sensorList.THL);
    mdSensors.push(sensorManager.sensorList.HAR);
    mdSensors.push(sensorManager.sensorList.QTR);
    mdSensors.push(sensorManager.sensorList.KUR);
    mdSensors.push(sensorManager.sensorList.SHA);
    mdSensors.push(sensorManager.sensorList.KCS);
    mdSensors.push(sensorManager.sensorList.SBX);
    satSet.satCruncher.postMessage({
      setlatlong: true,
      sensor: mdSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.MSR);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
    sensorManager.sensorTitle = 'All Missile Defense Agency Sensors';
  } else {
    for (const sensor in sensorList) {
      // console.log(sensorList[sensor] == selectedSensor);
      if (sensorList[sensor] == selectedSensor || (sensorList[sensor].staticNum === staticNum && typeof staticNum != 'undefined')) {
        sensorManager.selectedSensor = sensorList[sensor];
        // Do For All Sensors
        sensorManager.whichRadar = sensorManager.selectedSensor.shortName;
        satSet.satCruncher.postMessage({
          setlatlong: true,
          sensor: sensorManager.selectedSensor,
        });
        satellite.setobs(sensorManager.selectedSensor);

        $('#sensor-info-title').html("<a class='iframe' href='" + sensorManager.selectedSensor.url + "'>" + sensorManager.selectedSensor.name + '</a>');
        try {
          $('a.iframe').colorbox({
            iframe: true,
            width: '80%',
            height: '80%',
            fastIframe: false,
            closeButton: false,
          });
        } catch (error) {
          console.warn(error);
        }
        $('#sensor-type').html(sensorManager.selectedSensor.type);
        $('#sensor-country').html(sensorManager.selectedSensor.country);
        objectManager.setSelectedSat(-1);
        if (typeof settingsManager.currentColorScheme === 'undefined') throw new Error('settingsManager.currentColorScheme is undefined');
        setColorScheme(settingsManager.currentColorScheme, true);
        // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
        sensorManager.sensorTitle = sensorManager.selectedSensor.name;
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
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), sensor.obsminaz, sensor.obsminaz + 120, sensor.obsminel, sensor.obsmaxrange], 'c');
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), sensor.obsminaz + 120, sensor.obsmaxaz, sensor.obsminel, sensor.obsmaxrange], 'c');
      break;
    case 'FYL':
      // TODO: Find actual face directions
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), 0, 120, sensor.obsminel, sensor.obsmaxrange], 'c');
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), 120, 240, sensor.obsminel, sensor.obsmaxrange], 'c');
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), 240, 0, sensor.obsminel, sensor.obsmaxrange], 'c');
      break;
    case 'CDN':
      // NOTE: This will be a bit more complicated later
      keepTrackApi.programs.lineManager.create('scan2', [keepTrackApi.programs.satSet.getSensorFromSensorName(sensor.name), sensor.obsminaz, sensor.obsmaxaz, sensor.obsminel, sensor.obsmaxrange], 'c');
      break;
    default:
      console.debug('Sensor not found');
      break;
  }
};

for (var i = 0; i < Object.keys(sensorList).length; i++) {
  sensorList[Object.keys(sensorList)[i]].staticNum = i;
  if (sensorList[Object.keys(sensorList)[i]].obsmaxrange < 8000) {
    sensorList[Object.keys(sensorList)[i]].zoom = 'leo';
  } else {
    sensorList[Object.keys(sensorList)[i]].zoom = 'geo';
  }
}

export const sensorManager = {
  sensorList: sensorList,
  setSensor: setSensor,
  checkSensorSelected: checkSensorSelected,
  sensorListLength: sensorListLength,
  drawFov: drawFov,
  sensorTitle: '',
  setCurrentSensor: setCurrentSensor,
  curSensorPositon: [0, 0, 0],
  whichRadar: '',
  selectedSensor: null,
  sensorListUS: [sensorList.COD, sensorList.BLE, sensorList.CAV, sensorList.CLR, sensorList.EGL, sensorList.FYL, sensorList.THL, sensorList.MIL, sensorList.ALT, sensorList.ASC, sensorList.CDN],
  currentSensor: {
    observerGd: {
      lat: null,
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
    zoom: '',
  },
  defaultSensor: {
    observerGd: {
      lat: null,
      lon: 0,
      alt: 0,
    },
  },
};
