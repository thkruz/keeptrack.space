/* */
/*! /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
http://keeptrack.space

All code is Copyright © 2016-2020 by Theodore Kruczek. All rights reserved.
No part of this web site may be reproduced, published, distributed, displayed,
performed, copied or stored for public or private use, without written
permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

import { satCruncher, setColorScheme } from '@app/js/satSet/satSet.js';
import $ from 'jquery';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { sensorList } from '@app/js/sensorManager/sensorList.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.js';
import { timeManager } from '@app/js/timeManager/timeManager.js';

var sensorManager = {};
sensorManager.tempSensor = {};
sensorManager.checkSensorSelected = () => {
  if (sensorManager.currentSensor.lat != null) {
    return true;
  } else {
    return false;
  }
};

sensorManager.defaultSensor = {};
sensorManager.currentSensor = {};
sensorManager.defaultSensor.observerGd = {
  lat: null,
  longitude: 0,
  latitude: 0,
  height: 0,
};
sensorManager.currentSensor = sensorManager.defaultSensor;
sensorManager.setCurrentSensor = (sensor) => {
  sensorManager.currentSensor = sensor;
};

sensorManager.sensorListLength = function () {
  var sensorListCount = 0;
  for (var sensor in sensorList) {
    if (Object.prototype.hasOwnProperty.call(sensorList, sensor)) {
      sensorListCount++;
    }
  }
  return sensorListCount;
};
sensorManager.curSensorPositon = [0, 0, 0];
sensorManager.selectedSensor = {};
sensorManager.whichRadar = '';
sensorManager.setSensor = function (selectedSensor, staticNum) {
  try {
    localStorage.setItem('currentSensor', JSON.stringify([selectedSensor, staticNum]));
  } catch (e) {
    console.log(`Couldn't clear the current sensor info!`);
  }
  if (selectedSensor == null && staticNum == null) {
    return;
  }
  var sensor;
  if (selectedSensor === 'SSN') {
    var allSSNSensors = [];
    for (sensor in sensorList) {
      if (sensorList[sensor].country === 'United States' || sensorList[sensor].country === 'United Kingdom' || sensorList[sensor].country === 'Norway') {
        allSSNSensors.push(sensorList[sensor]);
      }
    }
    satCruncher.postMessage({
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      setlatlong: true,
      sensor: allSSNSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.COD);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
  } else if (selectedSensor === 'CapeCodMulti') {
    let multiSensor = [];
    multiSensor.push({
      lat: 41.754785,
      long: -70.539151,
      obshei: 0.060966,
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
      long: -70.539151,
      obshei: 0.060966,
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
      long: -70.539151,
      obshei: 0.060966,
      obsminaz: 347,
      obsmaxaz: 227,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 2200,
      obsmaxrange: 5556,
      volume: false,
    });
    satCruncher.postMessage({
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      setlatlong: true,
      sensor: multiSensor,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.COD);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
  } else if (selectedSensor === 'NATO-MW') {
    var natoMWSensors = [];
    natoMWSensors.push(sensorManager.sensorList.BLE);
    natoMWSensors.push(sensorManager.sensorList.CAV);
    natoMWSensors.push(sensorManager.sensorList.COD);
    natoMWSensors.push(sensorManager.sensorList.CLR);
    natoMWSensors.push(sensorManager.sensorList.FYL);
    natoMWSensors.push(sensorManager.sensorList.THL);
    satCruncher.postMessage({
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      setlatlong: true,
      sensor: natoMWSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.COD);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
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
    satCruncher.postMessage({
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      setlatlong: true,
      sensor: rusSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.ARM);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
  } else if (selectedSensor === 'LEO-LABS') {
    var leolabsSensors = [];
    leolabsSensors.push(sensorManager.sensorList.MSR);
    leolabsSensors.push(sensorManager.sensorList.PFISR);
    leolabsSensors.push(sensorManager.sensorList.KSR);
    satCruncher.postMessage({
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      setlatlong: true,
      sensor: leolabsSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.MSR);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
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
    satCruncher.postMessage({
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      setlatlong: true,
      sensor: mdSensors,
      multiSensor: true,
    });
    satellite.setobs(sensorManager.sensorList.MSR);
    objectManager.setSelectedSat(-1);
    setColorScheme(settingsManager.currentColorScheme, true);
    // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
  } else {
    for (sensor in sensorList) {
      // console.log(sensorList[sensor] == selectedSensor);
      if (sensorList[sensor] == selectedSensor || (sensorList[sensor].staticNum === staticNum && typeof staticNum != 'undefined')) {
        sensorManager.selectedSensor = sensorList[sensor];
        // Do For All Sensors
        sensorManager.whichRadar = sensorManager.selectedSensor.shortName;
        satCruncher.postMessage({
          typ: 'offset',
          dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
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
        setColorScheme(settingsManager.currentColorScheme, true);
        // setTimeout(setColorScheme, 1500, settingsManager.currentColorScheme, true);
      }
    }
  }
};
sensorManager.sensorListUS = [sensorList.COD, sensorList.BLE, sensorList.CAV, sensorList.CLR, sensorList.EGL, sensorList.FYL, sensorList.THL, sensorList.MIL, sensorList.ALT, sensorList.ASC, sensorList.CDN];

for (var i = 0; i < Object.keys(sensorList).length; i++) {
  sensorList[Object.keys(sensorList)[i]].staticNum = i;
  if (sensorList[Object.keys(sensorList)[i]].obsmaxrange < 8000) {
    sensorList[Object.keys(sensorList)[i]].zoom = 'leo';
  } else {
    sensorList[Object.keys(sensorList)[i]].zoom = 'geo';
  }
}

sensorManager.sensorList = sensorList;
export { sensorManager };
