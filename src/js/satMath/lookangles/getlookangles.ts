import { MINUTES_PER_DAY, TAU } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/helpers';
import { Sgp4 } from 'ootk';
import { SatRec } from 'satellite.js';
import { keepTrackApi } from '../../api/keepTrackApi';
import { SatObject, SensorObject, TearrData } from '../../api/keepTrackTypes';
import { dateFormat } from '../../lib/external/dateFormat.js';
import { getTearData } from '../calc/getTearData';
import { satellite } from '../satMath';

export const getlookangles = (sat: SatObject): TearrData[] => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  // Error Checking
  if (!sensorManager.checkSensorSelected()) {
    console.debug('satellite.getlookangles requires a sensor to be set!');
    return [];
  }

  let sensor = sensorManager.currentSensor;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;

  let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

  // const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
  // Use custom interval unless doing rise/set lookangles - then use 1 second
  let lookanglesInterval = satellite.isRiseSetLookangles ? 1 : satellite.lookanglesInterval;

  let looksArray = [];
  for (let i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += lookanglesInterval) {
    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    let looksPass = getTearData(now, satrec, sensor, satellite.isRiseSetLookangles);
    if (looksPass.time !== '') {
      looksArray.push(looksPass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
    }
    if (looksArray.length >= 1500) {
      // Maximum of 1500 lines in the look angles table
      break; // No more updates to the table (Prevent GEO object slowdown)
    }
  }

  looksArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  satellite.lastlooksArray = looksArray;

  // Populate the Side Menu
  (() => {
    let tbl = <HTMLTableElement>getEl('looks'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data
    let tr = tbl.insertRow();
    let tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    tdT.setAttribute('style', 'text-decoration: underline');
    let tdE = tr.insertCell();
    tdE.appendChild(document.createTextNode('El'));
    tdE.setAttribute('style', 'text-decoration: underline');
    let tdA = tr.insertCell();
    tdA.appendChild(document.createTextNode('Az'));
    tdA.setAttribute('style', 'text-decoration: underline');
    let tdR = tr.insertCell();
    tdR.appendChild(document.createTextNode('Rng'));
    tdR.setAttribute('style', 'text-decoration: underline');

    for (let i = 0; i < looksArray.length; i++) {
      if (tbl.rows.length > 0) {
        tr = tbl.insertRow();
        tdT = tr.insertCell();
        tdT.appendChild(document.createTextNode(dateFormat(looksArray[i].time, 'isoDateTime', false)));
        tdE = tr.insertCell();
        tdE.appendChild(document.createTextNode(looksArray[i].el.toFixed(1)));
        tdA = tr.insertCell();
        tdA.appendChild(document.createTextNode(looksArray[i].az.toFixed(0)));
        tdR = tr.insertCell();
        tdR.appendChild(document.createTextNode(looksArray[i].rng.toFixed(0)));
      }
    }
  })();

  return looksArray;
};
const propagateMultiSite = (now: Date, satrec: SatRec, sensor: SensorObject): TearrData => {
  // Setup Realtime and Offset Time
  const aer = satellite.getRae(now, satrec, sensor);

  if (satellite.checkIsInView(sensor, aer)) {
    return {
      time: now.toISOString(),
      el: aer.el,
      az: aer.az,
      rng: aer.rng,
      name: sensor.shortName,
    };
  } else {
    return {
      time: '',
      el: 0,
      az: 0,
      rng: 0,
      name: '',
    };
  }
};

export const getlookanglesMultiSite = (sat: SatObject) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  const isResetToDefault = !sensorManager.checkSensorSelected();

  // Save Current Sensor
  sensorManager.tempSensor = sensorManager.currentSensor;

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;

  // Get Satellite Info
  let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  const multiSiteArray = <TearrData[]>[];
  for (const sensor in sensorManager.sensorList) {
    satellite.setobs([sensorManager.sensorList[sensor]]);
    for (let i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
      // 5second Looks
      offset = i * 1000; // Offset in seconds (msec * 1000)
      let now = timeManager.getOffsetTimeObj(offset, simulationTime);
      let multiSitePass = propagateMultiSite(now, satrec, sensorManager.sensorList[sensor]);
      if (multiSitePass.time !== '') {
        multiSiteArray.push(multiSitePass); // Update the table with looks for this 5 second chunk and then increase table counter by 1

        // Jump 3/4th to the next orbit
        i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }
  }

  multiSiteArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  satellite.lastMultiSiteArray = multiSiteArray;

  // Populate the Side Menu
  populateMultiSiteTable(multiSiteArray, sat);

  isResetToDefault ? sensorManager.setCurrentSensor(sensorManager.defaultSensor) : sensorManager.setCurrentSensor(sensorManager.tempSensor);
};

export const populateMultiSiteTable = (multiSiteArray: TearrData[], sat: SatObject) => {
  const { sensorManager } = keepTrackApi.programs;

  const tbl = <HTMLTableElement>getEl('looksmultisite'); // Identify the table to update
  tbl.innerHTML = ''; // Clear the table from old object data
  let tr = tbl.insertRow();
  let tdT = tr.insertCell();
  tdT.appendChild(document.createTextNode('Time'));
  tdT.setAttribute('style', 'text-decoration: underline');
  let tdR = tr.insertCell();
  tdR.appendChild(document.createTextNode('Rng'));
  tdR.setAttribute('style', 'text-decoration: underline');
  let tdA = tr.insertCell();
  tdA.appendChild(document.createTextNode('Az'));
  tdA.setAttribute('style', 'text-decoration: underline');
  let tdE = tr.insertCell();
  tdE.appendChild(document.createTextNode('El'));
  tdE.setAttribute('style', 'text-decoration: underline');
  let tdS = tr.insertCell();
  tdS.appendChild(document.createTextNode('Sensor'));
  tdS.setAttribute('style', 'text-decoration: underline');

  for (let i = 0; i < multiSiteArray.length; i++) {
    if (sensorManager.sensorListUS.includes(sensorManager.sensorList[multiSiteArray[i].name])) {
      tr = tbl.insertRow();
      tr.setAttribute('style', 'cursor: pointer');
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(multiSiteArray[i].time, 'isoDateTime', true)));
      tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(multiSiteArray[i].el.toFixed(1)));
      tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(multiSiteArray[i].az.toFixed(0)));
      tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(multiSiteArray[i].rng.toFixed(0)));
      tdS = tr.insertCell();
      tdS.appendChild(document.createTextNode(multiSiteArray[i].name));
      // TODO: Future feature
      tr.addEventListener('click', () => {
        const { timeManager, satSet } = keepTrackApi.programs;
        timeManager.changeStaticOffset(new Date(multiSiteArray[i].time).getTime() - new Date().getTime());
        sensorManager.setSensor(sensorManager.sensorList[multiSiteArray[i].name]);
        // TODO: This is an ugly workaround
        setTimeout(() => {
          satSet.selectSat(sat.id);
        }, 500);
      });
    }
  }
};
