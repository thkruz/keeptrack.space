import { keepTrackContainer } from '@app/js/container';
import { lookanglesRow, SatObject, SensorManager, SensorObject, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { clickAndDragWidth } from '@app/js/lib/click-and-drag';
import { getEl } from '@app/js/lib/get-el';
import { showLoading } from '@app/js/lib/showLoading';
import { slideInRight, slideOutLeft } from '@app/js/lib/slide';

import { adviceManagerInstance } from '@app/js/singletons/adviceManager';
import { SatMath } from '@app/js/static/sat-math';

import { DEG2RAD, MINUTES_PER_DAY, TAU } from '@app/js/lib/constants';
import { getUnique } from '@app/js/lib/get-unique';
import { saveCsv } from '@app/js/lib/saveVariable';
import { TimeManager } from '@app/js/singletons/time-manager';
import { CatalogExporter } from '@app/js/static/catalog-exporter';
import { CatalogSearch } from '@app/js/static/catalog-search';
import { EciVec3, Kilometers, Radians, SatelliteRecord } from 'ootk';
import { AnalysisBottomIcon } from './components/AnalysisBottomIcon';
import { AnalysisSideMenu } from './components/AnalysisSideMenu';
import { helpBodyTextAnalysis, helpTitleTextAnalysis } from './help';

/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * analysis.ts is a plugin for viewing trend data on TLEs and calculating best
 * pass times.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

let isAnalysisMenuOpen = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'analysis',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'analysis',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'analysis',
    cb: (iconName: string): void => {
      if (iconName === 'menu-analysis') {
        const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

        if (isAnalysisMenuOpen) {
          isAnalysisMenuOpen = false;
          getEl('menu-analysis').classList.remove('bmenu-item-selected');
          uiManagerInstance.hideSideMenus();
          return;
        } else {
          uiManagerInstance.hideSideMenus();
          isAnalysisMenuOpen = true;
          if (keepTrackApi.getCatalogManager().selectedSat != -1) {
            const sat: SatObject = keepTrackApi.getCatalogManager().getSat(keepTrackApi.getCatalogManager().selectedSat);
            const analSatDom = <HTMLInputElement>getEl('anal-sat');
            if (analSatDom) analSatDom.value = sat.sccNum;
          }

          // TODO: Fix analysis trends
          // if (sensorManager.checkSensorSelected()) {
          //   getEl('anal-type').innerHTML = `${OrbitOptionGroup}${RaeOptionGroup}`;
          // } else {
          //   getEl('anal-type').innerHTML = `${OrbitOptionGroup}`;
          // }

          // Reinitialize the Material CSS Code
          const elems = document.querySelectorAll('select');
          (<any>window.M).FormSelect.init(elems);

          slideInRight(getEl('analysis-menu'), 1000);
          getEl('menu-analysis').classList.add('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'analysis',
    cb: (sat: any): void => {
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      if (uiManagerInstance.isAnalysisMenuOpen) {
        (<HTMLInputElement>getEl('anal-sat')).value = sat.sccNum;
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'analysis',
    cb: (): void => {
      slideOutLeft(getEl('analysis-menu'), 1000);
      getEl('menu-analysis').classList.remove('bmenu-item-selected');
      isAnalysisMenuOpen = false;
    },
  });

  keepTrackApi.register({
    method: 'onHelpMenuClick',
    cbName: 'analysis',
    cb: onHelpMenuClick,
  });
};

export const onHelpMenuClick = (): boolean => {
  if (isAnalysisMenuOpen) {
    adviceManagerInstance.showAdvice(helpTitleTextAnalysis, helpBodyTextAnalysis);
    return true;
  }
  return false;
};

export const uiManagerInit = () => {
  getEl('left-menus').insertAdjacentHTML('beforeend', AnalysisSideMenu);
  getEl('bottom-icons').insertAdjacentHTML('beforeend', AnalysisBottomIcon);
};

export const uiManagerFinal = () => {
  // TODO: Fix analysis trends menu
  // getEl('analysis-form')?.addEventListener('submit', function (e: Event) {
  //   e.preventDefault();
  //   analysisFormSubmit();
  // });
  getEl('analysis-bpt')?.addEventListener('submit', function (e: Event) {
    e.preventDefault();
    analysisBptSumbit();
  });

  getEl('findCsoBtn')?.addEventListener('click', () => {
    showLoading(findCsoBtnClick);
  });

  getEl('findReentries')?.addEventListener('click', () => {
    showLoading(findRaBtnClick);
  });

  const satData = <SatObject[]>keepTrackApi.getCatalogManager().satData;
  getEl('export-catalog-csv-btn')?.addEventListener('click', () => {
    CatalogExporter.exportTle2Csv(satData);
  });

  getEl('export-catalog-txt-2a')?.addEventListener('click', () => {
    CatalogExporter.exportTle2Txt(satData);
  });

  getEl('export-catalog-txt-2b')?.addEventListener('click', () => {
    CatalogExporter.exportTle2Txt(satData, 2, false);
  });

  getEl('export-catalog-txt-3a')?.addEventListener('click', () => {
    CatalogExporter.exportTle2Txt(satData, 3);
  });

  getEl('export-catalog-txt-3b')?.addEventListener('click', () => {
    CatalogExporter.exportTle2Txt(satData, 3, false);
  });

  clickAndDragWidth(getEl('analysis-menu'));
};

export const analysisFormSubmit = () => {
  // const { sensorManager } = keepTrackApi.programs;
  // const chartType = (<HTMLInputElement>getEl('anal-type')).value;
  // const sat = (<HTMLInputElement>getEl('anal-sat')).value;
  // const sensor = sensorManager.currentSensor[0].shortName;
  // if (typeof sensor == 'undefined') {
  //   $.colorbox({
  //     html: `<html><body><div><h1>Test</h1></div></body></html>`,
  //     width: '60%',
  //     height: '60%',
  //     closeButton: false,
  //   });
  // } else {
  //   $.colorbox({
  //     html: `<html><body><div><h1>Test</h1></div></body></html>`,
  //     width: '60%',
  //     height: '60%',
  //     closeButton: false,
  //   });
  // }
};
export const findCsoBtnClick = () => {
  const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

  const searchStr = findCloseObjects();
  uiManagerInstance.doSearch(searchStr);
};

let searchStrCache_ = null;
export const findCloseObjects = () => {
  if (searchStrCache_) return searchStrCache_;
  const searchRadius = 50; // km

  let csoList = [];
  let satList = <SatObject[]>[];

  // Loop through all the satellites
  for (let i = 0; i < keepTrackApi.getCatalogManager().orbitalSats; i++) {
    // Get the satellite
    const sat = keepTrackApi.getCatalogManager().getSat(i);
    // Avoid unnecessary errors
    if (typeof sat.TLE1 == 'undefined') continue;
    // Only look at satellites in LEO
    // if (sat.apogee > 5556) continue;
    // Find where the satellite is right now
    if (typeof sat.position === 'undefined') {
      sat.position = <EciVec3>SatMath.getEci(sat, new Date()).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };
    }
    // If it fails, skip it
    if (isNaN(sat.position.x) || isNaN(sat.position.y) || isNaN(sat.position.z)) continue;
    if (sat.position && typeof sat.position !== 'boolean' && sat.position.x === 0 && sat.position.y === 0 && sat.position.z === 0) continue;
    // Add the satellite to the list
    satList.push(sat);
  }

  // Remove duplicates
  satList = getUnique(satList);

  // Sort satList by position.x property
  satList.sort((a, b) => a.position.x - b.position.x);

  // Loop through all the satellites with valid positions
  let i = 0;
  const satListLen = satList.length;
  for (i = 0; i < satListLen; i++) {
    const sat1 = satList[i];
    const pos1 = sat1.position;

    // Calculate the area around the satellite
    const posXmin = pos1.x - searchRadius;
    const posXmax = pos1.x + searchRadius;
    const posYmin = pos1.y - searchRadius;
    const posYmax = pos1.y + searchRadius;
    const posZmin = pos1.z - searchRadius;
    const posZmax = pos1.z + searchRadius;

    // Loop through the list again
    let j = 0;
    for (j = Math.max(0, i - 200); j < satListLen; j++) {
      const sat2 = satList[j]; // Get the second satellite
      if (sat1 == sat2) continue; // Skip the same satellite
      const pos2 = sat2.position; // Get the second satellite's position

      // Satellites are in order of x position so once we exceed the maxX, we can stop
      if (pos2.x > posXmax) break;
      // Check to see if the second satellite is in the search area
      if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
        // Add the second satellite to the list if it is close
        csoList.push({ sat1: sat1, sat2: sat2 });
      }
    }
  }

  let csoListUnique = getUnique(csoList);

  const csoStrArr = []; // Clear CSO List

  // Loop through the possible CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Calculate the first CSO's position 30 minutes later
    let sat = csoListUnique[i].sat1;
    let eci = SatMath.getEci(sat, new Date(Date.now() + 1000 * 60 * 30));
    if (eci.position && typeof eci.position !== 'boolean' && eci.position.x === 0 && eci.position.y === 0 && eci.position.z === 0) continue;
    csoListUnique[i].sat1.position = eci.position;

    // Calculate the second CSO's position 30 minutes later
    sat = csoListUnique[i].sat2;
    eci = SatMath.getEci(sat, new Date(Date.now() + 1000 * 60 * 30));
    if (eci.position && typeof eci.position !== 'boolean' && eci.position.x === 0 && eci.position.y === 0 && eci.position.z === 0) continue;
    sat.position = eci.position;
    csoListUnique[i].sat2.position = eci.position;
  }

  // Loop through the CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Check the first CSO
    let sat1 = csoListUnique[i].sat1;
    let pos1 = sat1.position;
    if (typeof pos1 == 'undefined') continue;

    // Calculate the area around the CSO
    let posXmin = pos1.x - searchRadius;
    let posXmax = pos1.x + searchRadius;
    let posYmin = pos1.y - searchRadius;
    let posYmax = pos1.y + searchRadius;
    let posZmin = pos1.z - searchRadius;
    let posZmax = pos1.z + searchRadius;

    // Get the second CSO object
    let sat2 = csoListUnique[i].sat2;
    let pos2 = sat2.position;
    if (typeof pos2 == 'undefined') continue;

    // If it is still in the search area, add it to the list
    if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
      csoStrArr.push(sat1.sccNum);
      csoStrArr.push(sat2.sccNum);
    }
  }

  // Generate the search string
  const csoListUniqueArr = Array.from(new Set(csoStrArr));
  let searchStr = '';
  for (let i = 0; i < csoListUniqueArr.length; i++) {
    if (i == csoListUniqueArr.length - 1) {
      searchStr += csoListUniqueArr[i];
    } else {
      searchStr += csoListUniqueArr[i] + ',';
    }
  }

  // Dont need to do this math more than once
  searchStrCache_ = searchStr;
  return searchStr; // csoListUnique;
};

export const findRaBtnClick = () => {
  const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

  const searchStr = CatalogSearch.findReentry(<SatObject[]>keepTrackApi.getCatalogManager().satData).join(',');
  uiManagerInstance.doSearch(searchStr);
};
export const analysisBptSumbit = () => {
  const sats = (<HTMLInputElement>getEl('analysis-bpt-sats')).value;
  const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

  if (!sensorManagerInstance.isSensorSelected()) {
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    uiManagerInstance.toast(`You must select a sensor first!`, 'critical');
  } else {
    findBestPasses(sats, sensorManagerInstance.currentSensors[0]);
  }
};

export const findBestPass = (sat: SatObject, sensors: SensorObject[]): lookanglesRow[] => {
  const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
  const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

  // Check if there is a sensor
  if (sensors.length <= 0 || !sensors[0] || typeof sensors[0].obsminaz == 'undefined') {
    uiManagerInstance.toast(`Sensor's format incorrect. Did you select a sensor first?`, 'critical');
    return [];
  }
  sensors[0].observerGd = {
    // Array to calculate look angles in propagate()
    lat: <Radians>(sensors[0].lat * DEG2RAD),
    lon: <Radians>(sensors[0].lon * DEG2RAD),
    alt: sensors[0].alt,
  };

  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  let offset = 0;

  var satrec = keepTrackApi.getCatalogManager().calcSatrec(sat);
  var lookanglesTable = []; // Iniially no rows to the table

  let looksInterval = 5;
  let looksLength = 7;

  // Setup flags for passes
  let score = 0;
  let sAz = <string | null>null;
  let sEl = <string | null>null;
  let srng = <string | null>null;
  let sTime = <Date | null>null;
  let passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng (start at max rng)
  let passMaxEl = 0;
  let start3 = false;
  let stop3 = false;

  let orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  const _propagateBestPass = (now: Date, satrecIn: SatelliteRecord): lookanglesRow => {
    let aer = SatMath.getRae(now, satrecIn, sensor);
    let isInFOV = SatMath.checkIsInView(sensor, aer);

    if (isInFOV) {
      // Previous Pass to Calculate first line of coverage
      const now1 = timeManagerInstance.getOffsetTimeObj(offset - looksInterval * 1000);
      let aer1 = SatMath.getRae(now1, satrecIn, sensor);

      let isInFOV1 = SatMath.checkIsInView(sensor, aer1);
      if (!isInFOV1) {
        // if it starts around 3
        if (aer.el <= 3.5) {
          start3 = true;
        }

        // First Line of Coverage
        sTime = now;
        sAz = aer.az.toFixed(0);
        sEl = aer.el.toFixed(1);
        srng = aer.rng.toFixed(0);
      } else {
        // Next Pass to Calculate Last line of coverage
        let _now1 = timeManagerInstance.getOffsetTimeObj(offset + looksInterval * 1000);
        aer1 = SatMath.getRae(_now1, satrecIn, sensor);

        isInFOV1 = SatMath.checkIsInView(sensor, aer1);
        if (!isInFOV1) {
          // if it stops around 3
          stop3 = aer.el <= 3.5;

          // Skip pass if satellite is in track right now
          if (sTime == null) {
            return {
              sortTime: null,
              scc: null,
              score: null,
              startDate: null,
              startTime: null,
              startAz: null,
              startEl: null,
              startrng: null,
              stopDate: null,
              stopTime: null,
              stopAz: null,
              stopEl: null,
              stoprng: null,
              tic: null,
              minrng: null,
              passMaxEl: null,
            };
          }

          score = Math.min((((now.getTime() - sTime.getTime()) / 1000 / 60) * 10) / 8, 10); // 8 minute pass is max score
          let elScore = Math.min((passMaxEl / 50) * 10, 10); // 50 el or above is max score

          // elScore -= Math.max((passMaxEl - 50) / 5, 0); // subtract points for being over 50 el
          elScore *= start3 && stop3 ? 2 : 1; // Double points for start and stop at 3
          score += elScore;
          score += Math.min((10 * 750) / passMinrng, 10); // 750 or less is max score

          // score -= Math.max((750 - passMinrng) / 10, 0); // subtract points for being closer than 750
          let tic = 0;
          tic = (now.getTime() - sTime.getTime()) / 1000 || 0;

          // Last Line of Coverage
          return {
            sortTime: sTime.getTime(),
            scc: satrecIn.satnum,
            score: score,
            startDate: sTime,
            startTime: sTime,
            startAz: sAz,
            startEl: sEl,
            startrng: srng,
            stopDate: now,
            stopTime: now,
            stopAz: aer.az.toFixed(0),
            stopEl: aer.el.toFixed(1),
            stoprng: aer.rng.toFixed(0),
            tic: tic,
            minrng: passMinrng.toFixed(0),
            passMaxEl: passMaxEl.toFixed(1),
          };
        }
      }
      // Do this for any pass in coverage
      if (passMaxEl < aer.el) passMaxEl = aer.el;
      if (passMinrng > aer.rng) passMinrng = aer.rng;
    }
    return {
      sortTime: null,
      scc: null,
      score: null,
      startDate: null,
      startTime: null,
      startAz: null,
      startEl: null,
      startrng: null,
      stopDate: null,
      stopTime: null,
      stopAz: null,
      stopEl: null,
      stoprng: null,
      tic: null,
      minrng: null,
      passMaxEl: null,
    };
  };

  for (let i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
    // lookanglesInterval in seconds
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManagerInstance.getOffsetTimeObj(offset);
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      const _lookanglesRow = _propagateBestPass(now, satrec);
      // If data came back...
      if (_lookanglesRow.score !== null) {
        lookanglesTable.push(_lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1

        // Reset flags for next pass
        score = 0;
        sAz = null;
        sEl = null;
        srng = null;
        sTime = null;
        passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng
        passMaxEl = 0;
        start3 = false;
        stop3 = false;
        // Jump 3/4th to the next orbit
        i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }
  }

  return lookanglesTable;
};

export const findBestPasses = (sats: string, sensor: SensorObject) => {
  sats = sats.replace(/ /gu, ',');
  const satArray = sats.split(',');
  let tableSatTimes = [];
  for (let i = 0; i < satArray.length; i++) {
    try {
      const satId = satArray[i];
      if (typeof satId == 'undefined' || satId == null || satId === '' || satId === ' ') continue;
      const sat = keepTrackApi.getCatalogManager().getSatFromObjNum(parseInt(satId));
      const satPasses = findBestPass(sat, [sensor]);
      for (let s = 0; s < satPasses.length; s++) {
        tableSatTimes.push(satPasses[s]);
        // }
      }
    } catch (e) {
      console.debug(e);
    }
  }
  tableSatTimes.sort((a, b) => b.sortTime - a.sortTime);
  tableSatTimes.reverse();
  tableSatTimes.forEach((v) => {
    delete v.sortTime;
  });

  for (let i = 0; i < tableSatTimes.length; i++) {
    tableSatTimes[i].startDate = tableSatTimes[i].startDate.toISOString().split('T')[0];
    tableSatTimes[i].startTime = tableSatTimes[i].startTime.toISOString().split('T')[1].split('.')[0];
    tableSatTimes[i].stopDate = tableSatTimes[i].stopDate.toISOString().split('T')[0];
    tableSatTimes[i].stopTime = tableSatTimes[i].stopTime.toISOString().split('T')[1].split('.')[0];
  }

  saveCsv(tableSatTimes, 'bestSatTimes');
};
