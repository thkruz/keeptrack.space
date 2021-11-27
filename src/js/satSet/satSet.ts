import { keepTrackApi } from '@app/js/api/externalApi';
import { DEG2RAD, MILLISECONDS_PER_DAY, MINUTES_PER_DAY, RAD2DEG, RADIUS_OF_EARTH, RADIUS_OF_SUN } from '@app/js/lib/constants.js';
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { SatCruncherMessage } from '@app/types/types';
import { mat4 } from 'gl-matrix';
import $ from 'jquery';
import { InView, Lla, Rae, SatObject } from '../api/keepTrack';
import { numeric } from '../lib/external/numeric';
import { stringPad } from '../lib/helpers';
import { jday } from '../timeManager/transforms';
import { CatalogManager } from './catalogManager';
import { exportTle2Csv, exportTle2Txt } from './exportTle';
import { searchCountryRegex, searchNameRegex, searchYear, searchYearOrLess } from './search';

/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satSet.ts is the primary interface between sat-cruncher and the main application.
 * It manages all interaction with the satellite catalogue.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
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

// import { radarDataManager } from '@app/js/satSet/radarDataManager.js';

// ******************** Initialization ********************

export const init = async (satCruncherOveride?: any): Promise<void> => {
  try {
    const { uiManager } = keepTrackApi.programs;
    let satCruncher: Worker;

    uiManager.loadStr('elsets');
    // See if we are running jest right now for testing
    if (typeof process !== 'undefined') {
      if (satCruncherOveride) {
        satCruncher = satCruncherOveride;
        satSet.satCruncher = satCruncher;
      } else {
        try {
          const url = 'http://localhost:8080/js/positionCruncher.js';
          satCruncher = new Worker(url);
          satSet.satCruncher = satCruncher;
        } catch (error) {
          satSet.satCruncher = {} as any;
          console.debug(error);
        }
      }
    } else {
      if (typeof Worker === 'undefined') {
        console.debug('Your browser does not support web workers.');
        return;
      }
      /* istanbul ignore next */
      try {
        satCruncher = new Worker(settingsManager.installDirectory + 'js/positionCruncher.js');
        satSet.satCruncher = satCruncher;
      } catch (error) {
        // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
        if (window.location.href.indexOf('file://') === 0) {
          $('#loader-text').text('Critical Error: You need to allow access to files from your computer! Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other copies of chrome are running when you start it.');
        } else {
          console.debug(error);
        }
      }
    }

    satSet.satCruncher.onmessage = satCruncherOnMessage;
    satSet.gotExtraData = false;
    // satSet.radarDataManager = radarDataManager;
  } catch (error) {
    console.debug(error);
  }
};

export const satCruncherOnMessage = (m: SatCruncherMessage) => {
  const { mainCamera, sensorManager, objectManager, uiManager, timeManager } = keepTrackApi.programs;
  if (m.data?.typ === 'timeSync') {
    const timeDif = timeManager.calculateSimulationTime().getTime() - m.data.time;
    if (timeDif > 100 || timeDif < -100) {
      console.table([
        { time: new Date(m.data.time).toISOString(), unix: m.data.time, staticOffset: m.data.staticOffset, dynamicOffsetEpoch: m.data.dynamicOffsetEpoch, rate: m.data.propRate },
        { time: timeManager.calculateSimulationTime().toISOString(), unix: timeManager.calculateSimulationTime().getTime(), staticOffset: timeManager.propOffset, dynamicOffsetEpoch: timeManager.dynamicOffsetEpoch, rate: timeManager.propRate },
        { unix: timeDif },
      ]);
    }
    return;
  }

  // store extra data that comes from crunching
  // Only do this once
  if (!satSet.gotExtraData && m.data?.extraData) {
    cruncherExtraData(m);
    return;
  }

  if (m.data?.extraUpdate) {
    cruncherExtraUpdate(m);
    return;
  }

  cruncherDotsManagerInteraction(m);

  // Run any callbacks for a normal position cruncher message
  keepTrackApi.methods.onCruncherMessage();

  // Don't force color recalc if default colors and no sensor for inview color
  if ((objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) || settingsManager.isForceColorScheme) {
    // Don't change colors while dragging
    if (!mainCamera.isDragging) {
      setTimeout(() => {
        satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
      }, 0);
    }
  }

  // Only do this once after satSet.satData is ready
  if (!settingsManager.cruncherReady && typeof satSet.satData !== 'undefined') {
    satSet.onCruncherReady();
    if (!settingsManager.disableUI) {
      uiManager.reloadLastSensor();
    }

    parseGetVariables();

    // Load ALl The Images Now
    setTimeout(function () {
      $('img').each(function () {
        $(this).attr('src', $(this).attr('delayedsrc'));
      });
    }, 0);

    // Run any functions registered with the API
    keepTrackApi.methods.onCruncherReady();

    settingsManager.cruncherReady = true;
  }
};
/* istanbul ignore next */
export const initGsData = (): void => {
  const { uiManager } = keepTrackApi.programs;
  $.getScript('satData/gs.json', function (resp: string) {
    uiManager.loadStr('satIntel');
    $('#loading-screen').fadeIn(1000, function loadGsInfo() {
      satSet.gsInfo = JSON.parse(resp);
      for (let gsI = 0; gsI < satSet.gsInfo.length; gsI++) {
        const gsSatType = satSet.gsInfo[gsI];
        let satSetFirstI = 0;
        let satSetI = 0;
        for (let gsI2 = 0; gsI2 < gsSatType[1].length; gsI2++) {
          const gsSat = gsSatType[1][gsI2];
          satSetFirstI = Math.max(satSetFirstI - 200, 0);
          if (typeof satSet.cosparIndex[`${gsSat.cospar}`] !== 'undefined') {
            satSetI = satSet.cosparIndex[`${gsSat.cospar}`];
            if (typeof gsSat.name != 'undefined') {
              if (
                typeof satSet.satData[satSetI].ON == 'undefined' ||
                satSet.satData[satSetI].ON == 'TBA' ||
                satSet.satData[satSetI].ON == 'Unknown' ||
                satSet.satData[satSetI].ON.slice(0, 7) == 'PAYLOAD' ||
                satSet.satData[satSetI].ON.slice(0, 6) == 'OBJECT'
              ) {
                satSet.satData[satSetI].ON = gsSat.name;
              }
            }
            if (typeof gsSat.lv != 'undefined') {
              if (typeof satSet.satData[satSetI].LV == 'undefined' || satSet.satData[satSetI].LV == 'U') {
                satSet.satData[satSetI].LV = gsSat.lv;
              }
            }
            if (typeof gsSat.ls != 'undefined') {
              if (typeof satSet.satData[satSetI].LS == 'undefined' || satSet.satData[satSetI].LS == 'U') {
                satSet.satData[satSetI].LS = gsSat.ls;
              }
            }
            if (typeof gsSatType[0].gsurl != 'undefined') satSet.satData[satSetI].URL = gsSatType[0].gsurl;
            if (typeof gsSatType[0].sdpow != 'undefined') satSet.satData[satSetI].Pw = gsSatType[0].sdpow;
            if (typeof gsSatType[0].sdtyp != 'undefined') satSet.satData[satSetI].P = gsSatType[0].sdtyp;
            if (typeof gsSatType[0].sdcon != 'undefined') satSet.satData[satSetI].Con = gsSatType[0].sdcon;
            if (typeof gsSatType[0].sdmas != 'undefined') satSet.satData[satSetI].DM = gsSatType[0].sdmas;
            if (typeof gsSatType[0].sdope != 'undefined') satSet.satData[satSetI].U = gsSatType[0].sdope;
            if (typeof gsSatType[0].sdlif != 'undefined') satSet.satData[satSetI].Li = gsSatType[0].sdlif;
          }
        }
      }
      uiManager.hideLoadingScreen();
    });
  });
};

// ******************** Simple Functions ********************

export const parseGetVariables = (): void => {
  // do querystring stuff
  const params = satSet.queryStr.split('&');

  // Do Searches First
  getVariableSearch(params);

  // Then Do Other Stuff
  getVariableActions(params);
};
export const insertNewAnalystSatellite = (TLE1: string, TLE2: string, id: number, SCC_NUM?: string): any => {
  const { satellite, timeManager, orbitManager, uiManager } = keepTrackApi.programs;
  if (satellite.altitudeCheck(TLE1, TLE2, timeManager.calculateSimulationTime()) > 1) {
    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: id,
      active: true,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    orbitManager.updateOrbitBuffer(id, true, TLE1, TLE2);
    const sat = satSet.getSat(id);
    sat.active = true;
    sat.OT = 1; // Default to Satellite
    sat.SCC_NUM = SCC_NUM || stringPad.pad0(TLE1.substr(2, 5).trim(), 5);
    return sat;
  } else {
    console.debug(TLE1);
    console.debug(TLE2);
    uiManager.toast(`New Analyst Satellite is Invalid!`, 'critical');
    return false;
  }
};
/*
// export const updateRadarData = () => {
//   for (let i = 0; i < radarDataManager.radarData.length; i++) {
//     try {
//       satSet.satData[radarDataManager.satDataStartIndex + i].isRadarData = true;
//       satSet.satData[radarDataManager.satDataStartIndex + i].mId = parseInt(radarDataManager.radarData[i].m);
//       satSet.satData[radarDataManager.satDataStartIndex + i].t = radarDataManager.radarData[i].t;
//       satSet.satData[radarDataManager.satDataStartIndex + i].rcs = parseInt(radarDataManager.radarData[i].rc);
//       satSet.satData[radarDataManager.satDataStartIndex + i].trackId = parseInt(radarDataManager.radarData[i].ti);
//       satSet.satData[radarDataManager.satDataStartIndex + i].objectId = parseInt(radarDataManager.radarData[i].oi);
//       satSet.satData[radarDataManager.satDataStartIndex + i].satId = parseInt(radarDataManager.radarData[i].si);
//       satSet.satData[radarDataManager.satDataStartIndex + i].missileComplex = parseInt(radarDataManager.radarData[i].mc);
//       satSet.satData[radarDataManager.satDataStartIndex + i].missileObject = parseInt(radarDataManager.radarData[i].mo);
//       satSet.satData[radarDataManager.satDataStartIndex + i].azError = radarDataManager.radarData[i].ae;
//       satSet.satData[radarDataManager.satDataStartIndex + i].elError = radarDataManager.radarData[i].ee;
//       satSet.satData[radarDataManager.satDataStartIndex + i].dataType = radarDataManager.radarData[i].dataType;
//     } catch (e) {
//       // console.log(radarDataManager.radarData[i]);
//     }
//   }
//   satSet.setColorScheme(settingsManager.currentColorScheme, true);
// };
*/
export const getSat = (i: number): SatObject => {
  if (!satSet.satData) return null;
  if (!satSet.satData[i]) return null;
  const { dotsManager } = keepTrackApi.programs;

  if (satSet.gotExtraData) {
    satSet.satData[i].inViewChange = false;
    if (typeof dotsManager.inViewData != 'undefined' && typeof dotsManager.inViewData[i] != 'undefined') {
      if (satSet.satData[i].inView !== dotsManager.inViewData[i]) satSet.satData[i].inViewChange = true;
      satSet.satData[i].inView = dotsManager.inViewData[i];
    } else {
      satSet.satData[i].inView = false;
      satSet.satData[i].inViewChange = false;
    }

    if (typeof dotsManager.inSunData != 'undefined' && typeof dotsManager.inSunData[i] != 'undefined') {
      if (satSet.satData[i].inSun !== dotsManager.inSunData[i]) satSet.satData[i].inSunChange = true;
      satSet.satData[i].inSun = dotsManager.inSunData[i];
    }

    // if (satSet.satData[i].velocity == 0) debugger;

    satSet.satData[i].velocity = typeof satSet.satData[i].velocity == 'undefined' ? {} : satSet.satData[i].velocity;
    satSet.satData[i].velocity.total = Math.sqrt(
      dotsManager.velocityData[i * 3] * dotsManager.velocityData[i * 3] + dotsManager.velocityData[i * 3 + 1] * dotsManager.velocityData[i * 3 + 1] + dotsManager.velocityData[i * 3 + 2] * dotsManager.velocityData[i * 3 + 2]
    );
    satSet.satData[i].velocity.x = dotsManager.velocityData[i * 3];
    satSet.satData[i].velocity.y = dotsManager.velocityData[i * 3 + 1];
    satSet.satData[i].velocity.z = dotsManager.velocityData[i * 3 + 2];
    satSet.satData[i].position = {
      x: dotsManager.positionData[i * 3],
      y: dotsManager.positionData[i * 3 + 1],
      z: dotsManager.positionData[i * 3 + 2],
    };
  }

  if (satSet.satData[i].type == 'Star') return satSet.satData[i];

  // Add Functions One Time
  addSatExtraFunctions(i);

  return satSet.satData[i];
};
export const setHover = (i: number): void => {
  const { objectManager } = keepTrackApi.programs;
  const { gl } = keepTrackApi.programs.drawManager;
  objectManager.setHoveringSat(i);
  if (i === objectManager.lasthoveringSat) return;
  if (i !== -1 && satSet.satData[i].type == 'Star') return;

  settingsManager.currentColorScheme.hoverSat = objectManager.hoveringSat;

  gl.bindBuffer(gl.ARRAY_BUFFER, settingsManager.currentColorScheme.colorBuffer);
  // If Old Select Sat Picked Color it Correct Color
  if (objectManager.lasthoveringSat !== -1 && objectManager.lasthoveringSat !== objectManager.selectedSat) {
    gl.bufferSubData(gl.ARRAY_BUFFER, objectManager.lasthoveringSat * 4 * 4, new Float32Array(settingsManager.currentColorScheme.colorRuleSet(satSet.getSat(objectManager.lasthoveringSat)).color));
  }
  // If New Select Sat Picked Color it
  if (objectManager.hoveringSat !== -1 && objectManager.hoveringSat !== objectManager.selectedSat) {
    gl.bufferSubData(gl.ARRAY_BUFFER, objectManager.hoveringSat * 4 * 4, new Float32Array(settingsManager.hoverColor));
  }
  objectManager.setLasthoveringSat(objectManager.hoveringSat);

  // satSet.setColorScheme(settingsManager.currentColorScheme, true);
};
export const selectSat = (i: number): void => {
  const { sensorManager, objectManager, uiManager } = keepTrackApi.programs;
  const { gl } = keepTrackApi.programs.drawManager;
  if (i === objectManager.lastSelectedSat()) return;

  const sat = satSet.getSat(i);
  if (sat !== null && sat.static && typeof sat.staticNum !== 'undefined') {
    if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.sensor();
  } else {
    if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.satelliteSelected();
  }

  satSet.satCruncher.postMessage({
    satelliteSelected: [i],
  });
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);

  settingsManager.currentColorScheme.selectSat = objectManager.selectedSat;
  gl.bindBuffer(gl.ARRAY_BUFFER, settingsManager.currentColorScheme.colorBuffer);
  // If Old Select Sat Picked Color it Correct Color
  if (objectManager.lastSelectedSat() !== -1) {
    gl.bufferSubData(gl.ARRAY_BUFFER, objectManager.lastSelectedSat() * 4 * 4, new Float32Array(settingsManager.currentColorScheme.colorRuleSet(satSet.getSat(objectManager.lastSelectedSat())).color));
  }
  // If New Select Sat Picked Color it
  if (i !== -1) {
    gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(settingsManager.selectedColor));
  }

  objectManager.setSelectedSat(i);

  // satSet.setColorScheme(settingsManager.currentColorScheme, true);

  if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
    $('#menu-lookangles').removeClass('bmenu-item-disabled');
  }
  $('#menu-lookanglesmultisite').removeClass('bmenu-item-disabled');
  $('#menu-satview').removeClass('bmenu-item-disabled');
  $('#menu-map').removeClass('bmenu-item-disabled');
  $('#menu-editSat').removeClass('bmenu-item-disabled');
  $('#menu-sat-fov').removeClass('bmenu-item-disabled');
  $('#menu-newLaunch').removeClass('bmenu-item-disabled');
  $('#menu-breakup').removeClass('bmenu-item-disabled');
};
export const getSatInViewOnly = (i: number): void => {
  const { dotsManager } = keepTrackApi.programs;
  if (!satSet.satData) return null;
  if (!satSet.satData[i]) return null;

  satSet.satData[i].inView = dotsManager.inViewData[i];
  return satSet.satData[i];
};
export const getSatPosOnly = (i: number): SatObject => {
  const { dotsManager } = keepTrackApi.programs;
  if (!satSet.satData) return null;
  if (!satSet.satData[i]) return null;

  if (satSet.gotExtraData) {
    satSet.satData[i].position = {
      x: dotsManager.positionData[i * 3],
      y: dotsManager.positionData[i * 3 + 1],
      z: dotsManager.positionData[i * 3 + 2],
    };
  }

  const sat = satSet.satData[i];
  return sat;
};
export const getIdFromEci = (eci: { x: number; y: number; z: number }): number => {
  const { dotsManager } = keepTrackApi.programs;
  let x: number, y: number, z: number;
  for (let id = 0; id < satSet.orbitalSats; id++) {
    x = dotsManager.positionData[id * 3];
    if (x > eci.x - 100 && x < eci.x + 100) {
      y = dotsManager.positionData[id * 3 + 1];
      if (y > eci.y - 100 && y < eci.y + 100) {
        console.log(`y: ${id}`);
        z = dotsManager.positionData[id * 3 + 2];
        if (z > eci.z - 100 && z < eci.z + 100) {
          return id;
        }
      }
    }
  }
  return -1;
};
export const getSatInView = () => {
  const { dotsManager } = keepTrackApi.programs;
  if (typeof dotsManager.inViewData == 'undefined') return false;
  return dotsManager.inViewData;
};
export const getSatInSun = () => {
  const { dotsManager } = keepTrackApi.programs;
  if (typeof dotsManager.inSunData == 'undefined') return false;
  return dotsManager.inSunData;
};
export const getSatVel = () => {
  const { dotsManager } = keepTrackApi.programs;
  if (typeof dotsManager.velocityData == 'undefined') return false;
  return dotsManager.velocityData;
};
export const resetSatInView = () => {
  const { dotsManager } = keepTrackApi.programs;
  dotsManager.inViewData = new Int8Array(dotsManager.inViewData.length);
  dotsManager.inViewData.fill(0);
};
export const resetSatInSun = () => {
  const { dotsManager } = keepTrackApi.programs;
  dotsManager.inSunData = new Int8Array(dotsManager.inSunData.length);
  dotsManager.inSunData.fill(0);
};
// eslint-disable-next-line no-unused-vars
export const setColorScheme = async (scheme: { calculateColorBuffers: (arg0: any) => any; colorBuf: any; pickableBuf: any }, isForceRecolor?: boolean) => {
  const { dotsManager } = keepTrackApi.programs;
  try {
    settingsManager.setCurrentColorScheme(scheme);
    await scheme.calculateColorBuffers(isForceRecolor);
    dotsManager.colorBuffer = scheme.colorBuf;
    dotsManager.pickingBuffer = scheme.pickableBuf;
  } catch (error) {
    // If we can't load the color scheme, just use the default
    console.debug(error);
    settingsManager.setCurrentColorScheme(keepTrackApi.programs.ColorScheme.default);
    scheme = keepTrackApi.programs.ColorScheme.default;
    await scheme.calculateColorBuffers(isForceRecolor);
    dotsManager.colorBuffer = scheme.colorBuf;
    dotsManager.pickingBuffer = scheme.pickableBuf;
  }
};

// ******************** PURE ********************
export const getSatExtraOnly = (i: number): SatObject => {
  if (!satSet.satData) return null;
  if (!satSet.satData[i]) return null;
  return satSet.satData[i];
};
export const getSatFromObjNum = (objNum: number): SatObject => {
  const satIndex = satSet.getIdFromObjNum(objNum);
  return satSet.getSat(satIndex);
};
export const getIdFromObjNum = (objNum: number): number => {
  if (typeof satSet.sccIndex?.[`${objNum}`] !== 'undefined') {
    return satSet.sccIndex[`${objNum}`];
  } else {
    for (let i = 0; i < satSet.satData.length; i++) {
      if (parseInt(satSet.satData[i].SCC_NUM) == objNum) return i;
    }
    return null;
  }
};
export const setSat = (i: number, sat: SatObject) => {
  if (!satSet.satData) return null;
  satSet.satData[i] = sat;
  satSet.satData[i].velocity = satSet.satData[i].velocity == 0 ? {} : satSet.satData[i].velocity;
};
export const mergeSat = (sat: {
  SCC?: any;
  SCC_NUM?: number;
  OT?: number;
  ON?: string;
  C?: string;
  LV?: string;
  LS?: string;
  R?: number;
  URL?: string;
  NOTES?: string;
  TTP?: string;
  FMISSED?: string;
  ORPO?: string;
  constellation?: string;
  associates?: string;
  maneuver?: string;
}) => {
  if (!satSet.satData) return null;
  const satId = sat.SCC || sat.SCC_NUM || -1;
  if (satId === -1) return;
  const i = satSet.getIdFromObjNum(satId);
  satSet.satData[i].ON = sat.ON;
  satSet.satData[i].OT = sat.OT;
  satSet.satData[i].C = sat.C;
  satSet.satData[i].LV = sat.LV;
  satSet.satData[i].LS = sat.LS;
  satSet.satData[i].R = sat.R;
  satSet.satData[i].URL = sat.URL;
  satSet.satData[i].NOTES = sat.NOTES;
  satSet.satData[i].TTP = sat.TTP;
  satSet.satData[i].FMISSED = sat.FMISSED;
  satSet.satData[i].ORPO = sat.ORPO;
  satSet.satData[i].constellation = sat.constellation;
  satSet.satData[i].associates = sat.associates;
  satSet.satData[i].maneuver = sat.maneuver;
};
export const vmagUpdate = (vmagObject: { satid: string | number; vmag: any }) => {
  if (!satSet.satData) return null;
  try {
    satSet.satData[vmagObject.satid].vmag = vmagObject.vmag;
  } catch (e) {
    // console.warn('Old Satellite in vmagManager: ' + vmagObject.satid);
  }
};
export const onCruncherReady = () => {
  try {
    satSet.queryStr = window.location.search.substring(1);
  } catch {
    satSet.queryStr = '';
  }
  // Anything else?
};
export const convertIdArrayToSatnumArray = (satIdArray: number[]) => {
  const satnumArray = [];
  for (let i = 0; i < satIdArray.length; i++) {
    satnumArray.push(parseInt(satSet.getSat(satIdArray[i]).SCC_NUM));
  }
  return satnumArray;
};
export const convertSatnumArrayToIdArray = (satnumArray: number[]) => {
  const satIdArray = [];
  for (let i = 0; i < satnumArray.length; i++) {
    try {
      satIdArray.push(satSet.getSatFromObjNum(satnumArray[i]).id);
    } catch (e) {
      // console.log(`Missing Sat: ${satnumArray[i]}`);
    }
  }
  return satIdArray;
};
export const getIdFromIntlDes = (intlDes: string) => {
  if (typeof satSet.cosparIndex[`${intlDes}`] !== 'undefined') {
    return satSet.cosparIndex[`${intlDes}`];
  } else {
    return null;
  }
};
export const getIdFromStarName = (starName: string) => {
  for (let i = 0; i < satSet.satData.length; i++) {
    if (satSet.satData[i].type === 'Star') {
      if (satSet.satData[i].name === starName) {
        return i;
      }
    }
  }
  return null;
};
export const getSensorFromSensorName = (sensorName: string): number => {
  for (let i = 0; i < satSet.satData.length; i++) {
    if (satSet.satData[i].static === true && satSet.satData[i].missile !== true && satSet.satData[i].type !== 'Star') {
      if (satSet.satData[i].name === sensorName) {
        return i;
      }
    }
  }
  return -1;
};
export const getScreenCoords = (i: number, pMatrix: mat4, camMatrix: mat4, pos: { x: number; y: number; z: number }) => {
  const satScreenPositionArray = { x: null, y: null, z: null, error: false };
  try {
    if (!pos) pos = satSet.getSatPosOnly(i).position;
    const posVec4 = glm.vec4.fromValues(pos.x, pos.y, pos.z, 1);

    glm.vec4.transformMat4(posVec4, posVec4, camMatrix);
    glm.vec4.transformMat4(posVec4, posVec4, pMatrix);

    satScreenPositionArray.x = posVec4[0] / posVec4[3];
    satScreenPositionArray.y = posVec4[1] / posVec4[3];
    satScreenPositionArray.z = posVec4[2] / posVec4[3];

    satScreenPositionArray.x = (satScreenPositionArray.x + 1) * 0.5 * window.innerWidth;
    satScreenPositionArray.y = (-satScreenPositionArray.y + 1) * 0.5 * window.innerHeight;

    if (satScreenPositionArray.x >= 0 && satScreenPositionArray.y >= 0 && satScreenPositionArray.z >= 0 && satScreenPositionArray.z <= 1) {
      // Passed Test
    } else {
      satScreenPositionArray.error = true;
    }
  } catch {
    satScreenPositionArray.error = true;
  }
  return satScreenPositionArray;
};

export const replaceSatSet = (newSatSet: any) => {
  satSet = newSatSet;
};
export const getVariableSearch = (params: string[]) => {
  const { uiManager, searchBox } = keepTrackApi.programs;
  for (let i = 0; i < params.length; i++) {
    const key = params[i].split('=')[0];
    const val = params[i].split('=')[1];
    if (key == 'search') {
      if (!settingsManager.disableUI) {
        uiManager.doSearch(val);
        if (settingsManager.lastSearchResults.length == 0) {
          uiManager.toast(`Search for "${val}" found nothing!`, 'caution', true);
          searchBox.hideResults();
        }
      }
    }
  }
};

export const getVariableActions = (params: string[]) => {
  const { timeManager, objectManager, uiManager } = keepTrackApi.programs;
  for (let i = 0; i < params.length; i++) {
    const key = params[i].split('=')[0];
    let val = params[i].split('=')[1];
    let urlSatId: number;
    switch (key) {
      case 'intldes':
        urlSatId = satSet.getIdFromIntlDes(val.toUpperCase());
        if (urlSatId !== null) {
          objectManager.setSelectedSat(urlSatId);
        } else {
          uiManager.toast(`International Designator "${val.toUpperCase()}" was not found!`, 'caution', true);
        }
        break;
      case 'sat':
        urlSatId = satSet.getIdFromObjNum(parseInt(val));
        if (urlSatId !== null) {
          objectManager.setSelectedSat(urlSatId);
        } else {
          uiManager.toast(`Satellite "${val.toUpperCase()}" was not found!`, 'caution', true);
        }
        break;
      case 'misl':
        var subVal = val.split(',');
        $('#ms-type').val(subVal[0].toString());
        $('#ms-attacker').val(subVal[1].toString());
        // $('#ms-lat-lau').val() * 1;
        // ('#ms-lon-lau').val() * 1;
        $('#ms-target').val(subVal[2].toString());
        // $('#ms-lat').val() * 1;
        // $('#ms-lon').val() * 1;
        $('#missile').trigger('submit');
        break;
      case 'date':
        if (isNaN(parseInt(val))) {
          uiManager.toast(`Date value of "${val}" is not a proper unix timestamp!`, 'caution', true);
          break;
        }
        timeManager.changeStaticOffset(Number(val) - Date.now());
        $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.dynamicOffsetEpoch + timeManager.propOffset));
        break;
      case 'rate':
        var rate = parseFloat(val);
        if (isNaN(rate)) {
          uiManager.toast(`Propagation rate of "${rate}" is not a valid float!`, 'caution', true);
          break;
        }
        rate = Math.min(rate, 1000);
        // could run time backwards, but let's not!
        rate = Math.max(rate, 0.0);
        timeManager.changePropRate(Number(rate));
        break;
    }
  }
};
export const addSatExtraFunctions = (i: number) => {
  const { sensorManager, satellite, timeManager, objectManager } = keepTrackApi.programs;
  if (typeof satSet.satData[i].isInSun == 'undefined') {
    satSet.satData[i].isInSun = () => {
      //
      if (typeof satSet.satData[i].position == 'undefined') return -1;

      // Distances all in km
      // satSet.sunECI is updated by drawManager every draw frame
      const sunECI = satSet.sunECI;

      // NOTE: Code is mashed to save memory when used on the whole catalog
      // Position needs to be relative to satellite NOT ECI
      // var distSatEarthX = Math.pow(-satSet.satData[i].position.x, 2);
      // var distSatEarthY = Math.pow(-satSet.satData[i].position.y, 2);
      // var distSatEarthZ = Math.pow(-satSet.satData[i].position.z, 2);
      // var distSatEarth = Math.sqrt(distSatEarthX + distSatEarthY + distSatEarthZ);
      // var semiDiamEarth = Math.asin(RADIUS_OF_EARTH/distSatEarth) * RAD2DEG;
      const semiDiamEarth = Math.asin(RADIUS_OF_EARTH / Math.sqrt(Math.pow(-satSet.satData[i].position.x, 2) + Math.pow(-satSet.satData[i].position.y, 2) + Math.pow(-satSet.satData[i].position.z, 2))) * RAD2DEG;

      // Position needs to be relative to satellite NOT ECI
      // var distSatSunX = Math.pow(-satSet.satData[i].position.x + sunECI.x, 2);
      // var distSatSunY = Math.pow(-satSet.satData[i].position.y + sunECI.y, 2);
      // var distSatSunZ = Math.pow(-satSet.satData[i].position.z + sunECI.z, 2);
      // var distSatSun = Math.sqrt(distSatSunX + distSatSunY + distSatSunZ);
      // var semiDiamSun = Math.asin(RADIUS_OF_SUN/distSatSun) * RAD2DEG;
      const semiDiamSun = Math.asin(RADIUS_OF_SUN / Math.sqrt(Math.pow(-satSet.satData[i].position.x + sunECI.x, 2) + Math.pow(-satSet.satData[i].position.y + sunECI.y, 2) + Math.pow(-satSet.satData[i].position.z + sunECI.z, 2))) * RAD2DEG;

      // Angle between earth and sun
      const theta =
        Math.acos(
          <number>(
            numeric.dot([-satSet.satData[i].position.x, -satSet.satData[i].position.y, -satSet.satData[i].position.z], [-satSet.satData[i].position.x + sunECI.x, -satSet.satData[i].position.y + sunECI.y, -satSet.satData[i].position.z + sunECI.z])
          ) /
            (Math.sqrt(Math.pow(-satSet.satData[i].position.x, 2) + Math.pow(-satSet.satData[i].position.y, 2) + Math.pow(-satSet.satData[i].position.z, 2)) *
              Math.sqrt(Math.pow(-satSet.satData[i].position.x + sunECI.x, 2) + Math.pow(-satSet.satData[i].position.y + sunECI.y, 2) + Math.pow(-satSet.satData[i].position.z + sunECI.z, 2)))
        ) * RAD2DEG;

      // var isSun = false;
      // var isUmbral = false;
      if (semiDiamEarth > semiDiamSun && theta < semiDiamEarth - semiDiamSun) {
        // isUmbral = true;
        return 0;
      }

      // var isPenumbral = false;
      if (Math.abs(semiDiamEarth - semiDiamSun) < theta && theta < semiDiamEarth + semiDiamSun) {
        // isPenumbral = true;
        return 1;
      }

      if (semiDiamSun > semiDiamEarth) {
        // isPenumbral = true;
        return 1;
      }

      if (theta < semiDiamSun - semiDiamEarth) {
        // isPenumbral = true;
        return 1;
      }

      // if (!isUmbral && !isPenumbral) isSun = true;
      return 2;
    };
  }
  if (typeof satSet.satData[i].setRAE == 'undefined') {
    satSet.satData[i].setRAE = (rae: any) => {
      satSet.satData[i].rae = rae;
    };
  }
  if (typeof satSet.satData[i].getAltitude == 'undefined') {
    satSet.satData[i].getAltitude = () => {
      // Stars don't have an altitude
      if (satSet.satData[i].type == 'Star') return;

      if (satSet.satData[i].missile) {
        return satellite.eci2ll(satSet.satData[i].position.x, satSet.satData[i].position.y, satSet.satData[i].position.z).alt;
      } else {
        return satellite.altitudeCheck(satSet.satData[i].TLE1, satSet.satData[i].TLE2, timeManager.calculateSimulationTime());
      }
    };
  }
  if (objectManager.isSensorManagerLoaded && typeof satSet.satData[i].getTEARR == 'undefined') {
    satSet.satData[i].getTEARR = (propTime: any, sensor: { observerGd?: any; alt?: any; lat?: any; lon?: any }) => {
      const currentTEARR: Lla & Rae & InView = {
        lat: 0,
        lon: 0,
        alt: 0,
        rng: 0,
        az: 0,
        el: 0,
        inView: false,
      }; // Most current TEARR data that is set in satellite object and returned.

      if (typeof sensor == 'undefined') {
        sensor = sensorManager.currentSensor;
      }
      // If sensor's observerGd is not set try to set it using it parameters
      if (typeof sensor.observerGd == 'undefined') {
        try {
          sensor.observerGd = {
            alt: sensor.alt,
            lat: sensor.lat * DEG2RAD,
            lon: sensor.lon * DEG2RAD,
          };
        } catch (e) {
          throw 'observerGd is not set and could not be guessed.';
        }
        // If it didn't work, try again
        if (typeof sensor.observerGd.lon == 'undefined') {
          try {
            sensor.observerGd = {
              alt: sensor.alt,
              lat: sensor.lat * DEG2RAD,
              lon: sensor.lon * DEG2RAD,
            };
          } catch (e) {
            throw 'observerGd is not set and could not be guessed.';
          }
        }
      } else {
        // Convert observer grid to radians
        sensor.observerGd = {
          alt: sensor.alt,
          lat: sensor.lat * DEG2RAD,
          lon: sensor.lon * DEG2RAD,
        };
      }

      let now: { getUTCFullYear: () => any; getUTCMonth: () => number; getUTCDate: () => any; getUTCHours: () => any; getUTCMinutes: () => any; getUTCSeconds: () => any; getUTCMilliseconds: () => number };
      if (typeof propTime != 'undefined' && propTime !== null) {
        now = propTime;
      } else {
        now = timeManager.calculateSimulationTime();
      }
      let j = jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
      const gmst = satellite.gstime(j);

      if (satSet.satData[i].missile) {
        // ECI to ECF
        const positionEcf = satellite.eciToEcf(satSet.satData[i].position, gmst);
        // ECF to RAE
        const Rae = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
        const inview = satellite.checkIsInFOV(sensor, {
          az: Rae.az * RAD2DEG,
          el: Rae.el * RAD2DEG,
          rng: Rae.rng,
        });
        const lla = satellite.eciToGeodetic(satSet.satData[i].position, gmst);
        return {
          lat: lla.lat,
          lon: lla.lon,
          alt: lla.alt,
          inView: inview,
        };
      }

      // Set default timing settings. These will be changed to find look angles at different times in future.
      const satrec = satellite.twoline2satrec(satSet.satData[i].TLE1, satSet.satData[i].TLE2); // perform and store sat init calcs

      const m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
      const positionEci = satellite.sgp4(satrec, m);

      try {
        const gpos = satellite.eciToGeodetic(positionEci.position, gmst);
        currentTEARR.alt = gpos.alt;
        currentTEARR.lon = gpos.lon;
        currentTEARR.lat = gpos.lat;
        const positionEcf = satellite.eciToEcf(positionEci.position, gmst);
        const lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
        currentTEARR.az = lookAngles.az * RAD2DEG;
        currentTEARR.el = lookAngles.el * RAD2DEG;
        currentTEARR.rng = lookAngles.rng;
      } catch (e) {
        currentTEARR.alt = 0;
        currentTEARR.lon = 0;
        currentTEARR.lat = 0;
        currentTEARR.az = 0;
        currentTEARR.el = 0;
        currentTEARR.rng = 0;
      }

      currentTEARR.inView = satellite.checkIsInFOV(sensor, {
        az: currentTEARR.az,
        el: currentTEARR.el,
        rng: currentTEARR.rng,
      });

      satellite.setTEARR(currentTEARR);
      return currentTEARR;
    };
  }
  if (typeof satSet.satData[i].getDirection == 'undefined') {
    satSet.satData[i].getDirection = () => {
      const nowLat = satSet.satData[i].getTEARR().lat * RAD2DEG;
      let futureTime = timeManager.getOffsetTimeObj(5000, timeManager.calculateSimulationTime());
      const futLat = satSet.satData[i].getTEARR(futureTime).lat * RAD2DEG;

      // TODO: Remove getTEARR References
      // let nowLat = satellite.eci2ll(satSet.satData[i].position.x,satSet.satData[i].position.y,satSet.satData[i].position.z).lat;
      // let futureTime = timeManager.getOffsetTimeObj(5000, timeManager.calculateSimulationTime());
      // let futureEci = satellite.getEci(satSet.satData[i], futureTime);
      // let futLat = satellite.eci2ll(futureEci.x,futureEci.y,futureEci.z).lat;
      if (nowLat < futLat) return 'N';
      if (nowLat > futLat) return 'S';
      if (nowLat === futLat) {
        futureTime = timeManager.getOffsetTimeObj(20000, timeManager.calculateSimulationTime());
        // futureTEARR = satSet.satData[i].getTEARR(futureTime);
        if (nowLat < futLat) return 'N';
        if (nowLat > futLat) return 'S';
      }
      console.warn('Sat Direction Calculation Error - By Pole?');
      return 'Error';
    };
  }
};
export const cruncherExtraData = (m: SatCruncherMessage) => {
  if (!m.data?.extraData) throw new Error('extraData required!');
  const satExtraData = JSON.parse(m.data.extraData);

  for (let satCrunchIndex = 0; satCrunchIndex < satSet.numSats; satCrunchIndex++) {
    if (typeof satSet.satData === 'undefined') throw new Error('No sat data');
    if (typeof satExtraData === 'undefined') throw new Error('No extra data');
    if (satExtraData[satCrunchIndex] === 'undefined') throw new Error('No extra data for sat ' + satCrunchIndex);
    if (satSet.satData[satCrunchIndex] === 'undefined') throw new Error('No data for sat ' + satCrunchIndex);

    try {
      satSet.satData[satCrunchIndex].inclination = satExtraData[satCrunchIndex].inclination;
      satSet.satData[satCrunchIndex].eccentricity = satExtraData[satCrunchIndex].eccentricity;
      satSet.satData[satCrunchIndex].raan = satExtraData[satCrunchIndex].raan;
      satSet.satData[satCrunchIndex].argPe = satExtraData[satCrunchIndex].argPe;
      satSet.satData[satCrunchIndex].meanMotion = satExtraData[satCrunchIndex].meanMotion;

      satSet.satData[satCrunchIndex].semiMajorAxis = satExtraData[satCrunchIndex].semiMajorAxis;
      satSet.satData[satCrunchIndex].semiMinorAxis = satExtraData[satCrunchIndex].semiMinorAxis;
      satSet.satData[satCrunchIndex].apogee = satExtraData[satCrunchIndex].apogee;
      satSet.satData[satCrunchIndex].perigee = satExtraData[satCrunchIndex].perigee;
      satSet.satData[satCrunchIndex].period = satExtraData[satCrunchIndex].period;
      satSet.satData[satCrunchIndex].velocity = {};
    } catch (error) {
      console.debug(satCrunchIndex);
    }
  }

  satSet.gotExtraData = true;
};
export const cruncherExtraUpdate = (m: SatCruncherMessage) => {
  if (!m.data?.extraUpdate) throw new Error('extraUpdate required!');
  const satExtraData = JSON.parse(m.data.extraData);
  const satCrunchIndex = m.data.satId;

  satSet.satData[satCrunchIndex].inclination = satExtraData[0].inclination;
  satSet.satData[satCrunchIndex].eccentricity = satExtraData[0].eccentricity;
  satSet.satData[satCrunchIndex].raan = satExtraData[0].raan;
  satSet.satData[satCrunchIndex].argPe = satExtraData[0].argPe;
  satSet.satData[satCrunchIndex].meanMotion = satExtraData[0].meanMotion;

  satSet.satData[satCrunchIndex].semiMajorAxis = satExtraData[0].semiMajorAxis;
  satSet.satData[satCrunchIndex].semiMinorAxis = satExtraData[0].semiMinorAxis;
  satSet.satData[satCrunchIndex].apogee = satExtraData[0].apogee;
  satSet.satData[satCrunchIndex].perigee = satExtraData[0].perigee;
  satSet.satData[satCrunchIndex].period = satExtraData[0].period;
  satSet.satData[satCrunchIndex].TLE1 = satExtraData[0].TLE1;
  satSet.satData[satCrunchIndex].TLE2 = satExtraData[0].TLE2;
};
export const cruncherDotsManagerInteraction = (m: SatCruncherMessage) => {
  const { dotsManager } = keepTrackApi.programs;
  if (typeof dotsManager.positionData == 'undefined') {
    dotsManager.positionData = new Float32Array(m.data.satPos);
  } else {
    dotsManager.positionData.set(m.data.satPos, 0);
  }

  if (typeof dotsManager.velocityData == 'undefined') {
    dotsManager.velocityData = new Float32Array(m.data.satVel);
  } else {
    dotsManager.velocityData.set(m.data.satVel, 0);
  }

  if (typeof m.data?.satInView != 'undefined' && m.data?.satInView.length > 0) {
    if (typeof dotsManager.inViewData == 'undefined' || dotsManager.inViewData.length !== m.data.satInView.length) {
      dotsManager.inViewData = new Int8Array(m.data.satInView);
    } else {
      dotsManager.inViewData.set(m.data.satInView, 0);
    }
  }

  if (typeof m.data?.satInSun != 'undefined' && m.data?.satInSun.length > 0) {
    if (typeof dotsManager.inSunData == 'undefined' || dotsManager.inSunData.length !== m.data.satInSun.length) {
      dotsManager.inSunData = new Int8Array(m.data.satInSun);
    } else {
      dotsManager.inSunData.set(m.data.satInSun, 0);
    }
  }

  if (typeof m.data?.sensorMarkerArray != 'undefined' && m.data?.sensorMarkerArray?.length !== 0) {
    satSet.satSensorMarkerArray = m.data.sensorMarkerArray;
  }

  const highestMarkerNumber = satSet.satSensorMarkerArray?.[satSet.satSensorMarkerArray?.length - 1] || 0;
  settingsManager.dotsOnScreen = Math.max(satSet.numSats - settingsManager.maxFieldOfViewMarkers, highestMarkerNumber);
};

export let satSet: CatalogManager = {
  convertIdArrayToSatnumArray: convertIdArrayToSatnumArray,
  convertSatnumArrayToIdArray: convertSatnumArrayToIdArray,
  cosparIndex: null,
  exportTle2Csv: exportTle2Csv,
  exportTle2Txt: exportTle2Txt,
  getIdFromEci: getIdFromEci,
  getIdFromIntlDes: getIdFromIntlDes,
  getIdFromObjNum: getIdFromObjNum,
  getSensorFromSensorName: getSensorFromSensorName,
  getIdFromStarName: getIdFromStarName,
  getSat: getSat,
  getSatExtraOnly: getSatExtraOnly,
  getSatFromObjNum: getSatFromObjNum,
  getSatInSun: getSatInSun,
  getSatInView: getSatInView,
  getSatInViewOnly: getSatInViewOnly,
  getSatPosOnly: getSatPosOnly,
  getSatVel: getSatVel,
  getScreenCoords: getScreenCoords,
  gotExtraData: false,
  gsInfo: null,
  init: init,
  initGsData: initGsData,
  insertNewAnalystSatellite: insertNewAnalystSatellite,
  mergeSat: mergeSat,
  missileSats: null,
  numSats: null,
  onCruncherReady: onCruncherReady,
  orbitalSats: null,
  queryStr: null,
  resetSatInSun: resetSatInSun,
  resetSatInView: resetSatInView,
  satCruncher: null,
  satData: null,
  satExtraData: null,
  satSensorMarkerArray: null,
  sccIndex: null,
  searchCountryRegex: searchCountryRegex,
  searchNameRegex: searchNameRegex,
  searchYear: searchYear,
  searchYearOrLess: searchYearOrLess,
  selectSat: selectSat,
  setColorScheme: setColorScheme,
  setHover: setHover,
  setSat: setSat,
  sunECI: null,
  vmagUpdate: vmagUpdate,
};
