import $ from 'jquery';
import { DEG2RAD } from '@app/js/lib/constants.js';
import { db } from '@app/js/settingsManager/settingsManager.ts';
import { timeManager } from '@app/js/timeManager/timeManager.ts';

var satellite, sensorManager, satSet, satCruncher;
let radarDataManager = {};

radarDataManager.radarData = [];
radarDataManager.drawT1 = 0;

radarDataManager.init = async (sensorManagerRef, satSetRef, satCruncherRef, satelliteRef) => {
  if (!settingsManager.isEnableRadarData) return;
  sensorManager = sensorManagerRef;
  satSet = satSetRef;
  satCruncher = satCruncherRef;
  satellite = satelliteRef;
  $.getScript(`${settingsManager.installDirectory}radarData/radarData.txt`, function (resp) {
    settingsManager.loadStr('radarData');
    $('#loading-screen').fadeIn(1000, function () {
      radarDataManager.setup(resp);
      $('#loading-screen').fadeOut('slow');
      setTimeout(function () {
        settingsManager.loadStr('math');
      }, 800);
    });
  });
};

/* istanbul ignore next */
radarDataManager.changeTimeToFirstDataTime = () => {
  if (!settingsManager.isEnableRadarData) return;
  timeManager.propOffset = new Date(radarDataManager.radarData[0].t) - Date.now();
  $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
  satCruncher.postMessage({
    typ: 'offset',
    dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
  });
};

/* istanbul ignore next */
radarDataManager.findFirstDataTime = () => {
  if (!settingsManager.isEnableRadarData) return;
  let now = timeManager.propTime() * 1;
  for (let i = 0; i < radarDataManager.radarData.length; i++) {
    if (radarDataManager.radarData[i].t > now - 3000) {
      radarDataManager.drawT1 = i;
      return;
    }
  }
};

/* istanbul ignore next */
radarDataManager.setup = (resp) => {
  if (!settingsManager.isEnableRadarData) return;
  db.log('radarDataManager.init');
  radarDataManager.radarData = JSON.parse(resp);

  let j, gmst, nowDate, radarDataECF, radarDataECI;
  for (let i = 0; i < radarDataManager.radarData.length; i++) {
    nowDate = new Date(radarDataManager.radarData[i].t);

    j = timeManager.jday(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
      nowDate.getUTCDate(),
      nowDate.getUTCHours(),
      nowDate.getUTCMinutes(),
      nowDate.getUTCSeconds()
    );
    j += nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond

    gmst = satellite.gstime(j);

    // Update Radar Marker Position
    radarDataECF = satellite.lookAnglesToEcf(
      radarDataManager.radarData[i].a,
      radarDataManager.radarData[i].e,
      radarDataManager.radarData[i].r,
      sensorManager.sensorList.COD.lat * DEG2RAD,
      sensorManager.sensorList.COD.lon * DEG2RAD,
      sensorManager.sensorList.COD.alt
    );
    radarDataECI = satellite.ecfToEci(radarDataECF, gmst);
    radarDataManager.radarData[i].x = radarDataECI.x;
    radarDataManager.radarData[i].y = radarDataECI.y;
    radarDataManager.radarData[i].z = radarDataECI.z;
  }

  satSet.updateRadarData();
  radarDataManager.changeTimeToFirstDataTime();
  settingsManager.radarDataReady = true;
};

/* istanbul ignore next */
radarDataManager.createFakeData = () => {
  let fakeData = [];
  let now = Date.now();
  // Generates 1 Hour of 10x ~56ms data
  let k = 0;
  for (var i = 0; i < 60 * 60 * 1000; i += 1000) {
    for (let j = 0; j < 20; j++) {
      // Most in surveillance
      let az = -18 + Math.random() * 240;
      let el = 2 + Math.random() * 2;
      if (k < 2) el = 2 + Math.random() * 83;
      k++;
      if (k == 10) k = 0;
      fakeData.push({
        t: now - 1000 * 60 * 60 * 24 * 3 + i,
        dataType: 1,
        m: `${Math.round(Math.random() * 100000)}`,
        ti: `${Math.round(Math.random() * 100000)}`,
        oi: `${Math.round(Math.random() * 100000)}`,
        si: `${Math.round(Math.random() * 45000 - 30000)}`,
        mc: `${Math.round(Math.random() * 5 - 3)}`,
        mo: `${Math.round(Math.random() * 20)}`,
        r: 150 + Math.random() * 5556,
        a: az,
        e: el,
        ae: Math.random() * 3,
        ee: Math.random() * 3,
        rc: (Math.random() * 40) / 10,
      });
    }
  }
  return fakeData;
};

export { radarDataManager };
