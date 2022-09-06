/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satSet.ts is the primary interface between sat-cruncher and the main application.
 * It manages all interaction with the satellite catalogue.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
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

import { isThisJest, keepTrackApi } from '@app/js/api/keepTrackApi';
import { DEG2RAD, MILLISECONDS_PER_DAY, MINUTES_PER_DAY, RAD2DEG, RADIUS_OF_EARTH, RADIUS_OF_SUN } from '@app/js/lib/constants';
import numeric from 'numeric';
import { EciVec3 } from 'ootk';
import { InView, Lla, Rae, SatObject, SensorObject, SunStatus } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { ColorInformation } from '../colorManager/colorSchemeManager';
import { getEl, stringPad } from '../lib/helpers';
import { jday } from '../timeManager/transforms';
import { onCruncherReady, satCruncherOnMessage } from './catalogSupport/cruncherInteractions';
import {
  getIdFromEci,
  getIdFromIntlDes,
  getIdFromObjNum,
  getIdFromStarName,
  getSat,
  getSatExtraOnly,
  getSatFromObjNum,
  getSatInSun,
  getSatInView,
  getSatPosOnly,
  getSatVel,
  getScreenCoords,
  getSensorFromSensorName,
} from './catalogSupport/getters';
import { exportTle2Csv, exportTle2Txt } from './exportTle';
import { search } from './search';
// TODO: FUTURE FEATURE
// import { radarDataManager } from '@app/js/satSet/radarDataManager.js';

// ******************** Initialization ********************

// prettier-ignore
export const init = async (satCruncherOveride?: any): Promise<number> => { // NOSONAR
  try {
    const { uiManager } = keepTrackApi.programs;
    let satCruncher: Worker;

    uiManager.loadStr('elsets');
    // See if we are running jest right now for testing
    if (isThisJest()) {
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
        getEl('loader-text').innerText = (
          'Your browser does not support web workers.'
        );
        return 1;
      }
      /* istanbul ignore next */
      try {
        satCruncher = new Worker(settingsManager.installDirectory + 'js/positionCruncher.js');
        satSet.satCruncher = satCruncher;
      } catch (error) {
        // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
        if (window.location.href.indexOf('file://') === 0) {
          getEl('loader-text').innerText = (
            'Critical Error: You need to allow access to files from your computer! ' + 
            'Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other copies of chrome are running when you start it.'
          );
          return 1;
        } else {
          getEl('loader-text').innerText = (
            error
          );
          return 1;
        }
      }
    }

    satSet.satCruncher.onmessage = satCruncherOnMessage;
    satSet.gotExtraData = false;
    // TODO: FUTURE FEATURE
    // satSet.radarDataManager = radarDataManager;
    return 0;
  } catch (error) {
    getEl('loader-text').innerText = (
      error
    );
    return 1;
  }
};
export const insertNewAnalystSatellite = (TLE1: string, TLE2: string, id: number, sccNum?: string): any => {
  const { satellite, timeManager, orbitManager, uiManager } = keepTrackApi.programs;
  if (TLE1.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${TLE1}`);
  if (TLE2.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${TLE2}`);
  if (satellite.altitudeCheck(TLE1, TLE2, timeManager.simulationTimeObj) > 1) {
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
    sat.type = SpaceObjectType.PAYLOAD; // Default to Satellite
    sat.sccNum = sccNum || stringPad.pad0(TLE1.substr(2, 5).trim(), 5);
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
export const setHover = (i: number): void => {
  const { objectManager, colorSchemeManager } = keepTrackApi.programs;
  const { gl } = keepTrackApi.programs.drawManager;
  objectManager.setHoveringSat(i);
  if (i === objectManager.lasthoveringSat) return;
  if (i !== -1 && satSet.satData[i].type === SpaceObjectType.STAR) return;

  gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManager.colorBuffer);
  // If Old Select Sat Picked Color it Correct Color
  if (objectManager.lasthoveringSat !== -1 && objectManager.lasthoveringSat !== objectManager.selectedSat) {
    const newColor = colorSchemeManager.currentColorScheme(satSet.getSat(objectManager.lasthoveringSat)).color;
    colorSchemeManager.colorData[objectManager.lasthoveringSat * 4] = newColor[0]; // R
    colorSchemeManager.colorData[objectManager.lasthoveringSat * 4 + 1] = newColor[1]; // G
    colorSchemeManager.colorData[objectManager.lasthoveringSat * 4 + 2] = newColor[2]; // B
    colorSchemeManager.colorData[objectManager.lasthoveringSat * 4 + 3] = newColor[3]; // A

    gl.bufferSubData(gl.ARRAY_BUFFER, objectManager.lasthoveringSat * 4 * 4, new Float32Array(newColor));
  }
  // If New Hover Sat Picked Color it
  if (objectManager.hoveringSat !== -1 && objectManager.hoveringSat !== objectManager.selectedSat) {
    gl.bufferSubData(gl.ARRAY_BUFFER, objectManager.hoveringSat * 4 * 4, new Float32Array(settingsManager.hoverColor));
  }
  objectManager.setLasthoveringSat(objectManager.hoveringSat);
};
export const selectSat = (i: number): void => {
  if (settingsManager.isDisableSelectSat) return;
  const { sensorManager, objectManager, uiManager, colorSchemeManager } = keepTrackApi.programs;
  const { gl } = keepTrackApi.programs.drawManager;
  if (i === objectManager.lastSelectedSat()) return;
  if (!colorSchemeManager.colorBufferOneTime) {
    // TODO: Fix this
    // Race condition where the color buffer isn't setup yet and we are getting
    // ready to buffersubdata. There needs to be an await adjusted on main.ts
    // more than likely to ensure satSet and colorSchemeManager are setup first.
    console.debug('Color Buffer Not Initialized');
    return;
  }

  const sat = satSet.getSat(i);
  if (sat !== null && sat.static && typeof sat.staticNum !== 'undefined') {
    if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.sensor();
  } else {
    if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.satelliteSelected();
  }

  satSet.satCruncher.postMessage({
    typ: 'satelliteSelected',
    satelliteSelected: [i],
  });
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManager.colorBuffer);
  // If Old Select Sat Picked Color it Correct Color
  if (objectManager.lastSelectedSat() !== -1) {
    const newColor = colorSchemeManager.currentColorScheme(satSet.getSat(objectManager.lastSelectedSat())).color;
    colorSchemeManager.colorData[objectManager.lastSelectedSat() * 4] = newColor[0]; // R
    colorSchemeManager.colorData[objectManager.lastSelectedSat() * 4 + 1] = newColor[1]; // G
    colorSchemeManager.colorData[objectManager.lastSelectedSat() * 4 + 2] = newColor[2]; // B
    colorSchemeManager.colorData[objectManager.lastSelectedSat() * 4 + 3] = newColor[3]; // A
    gl.bufferSubData(gl.ARRAY_BUFFER, objectManager.lastSelectedSat() * 4 * 4, new Float32Array(newColor));
  }
  // If New Select Sat Picked Color it
  if (i !== -1) {
    gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(settingsManager.selectedColor));
  }

  objectManager.setSelectedSat(i);

  if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null) {
    getEl('menu-lookangles').classList.remove('bmenu-item-disabled');
  }
  getEl('menu-lookanglesmultisite').classList.remove('bmenu-item-disabled');
  getEl('menu-satview').classList.remove('bmenu-item-disabled');
  getEl('menu-map').classList.remove('bmenu-item-disabled');
  getEl('menu-editSat').classList.remove('bmenu-item-disabled');
  getEl('menu-sat-fov').classList.remove('bmenu-item-disabled');
  getEl('menu-newLaunch').classList.remove('bmenu-item-disabled');
  getEl('menu-breakup').classList.remove('bmenu-item-disabled');
  getEl('menu-plot-analysis').classList.remove('bmenu-item-disabled');
  getEl('menu-plot-analysis2').classList.remove('bmenu-item-disabled');
  if (objectManager.secondarySat !== -1) {
    getEl('menu-plot-analysis3').classList.remove('bmenu-item-disabled');
  }
};
export const convertIdArrayToSatnumArray = (satIdArray: number[]) => satIdArray.map((id) => (satSet.getSat(id)?.sccNum || -1).toString()).filter((satnum) => satnum !== '-1');
export const convertSatnumArrayToIdArray = (satnumArray: number[]) => satnumArray.map((satnum) => satSet.getIdFromObjNum(satnum, false) || null).filter((id) => id !== null);
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
export const setColorScheme = async (scheme: (sat: SatObject) => ColorInformation, isForceRecolor?: boolean) => {
  const { dotsManager, colorSchemeManager } = keepTrackApi.programs;
  try {
    settingsManager.setCurrentColorScheme(scheme); // Deprecated
    colorSchemeManager.currentColorScheme = scheme;
    colorSchemeManager.calculateColorBuffers(isForceRecolor);
    dotsManager.colorBuffer = colorSchemeManager.colorBuffer;
    dotsManager.pickingBuffer = colorSchemeManager.pickableBuffer;
  } catch (error) {
    // If we can't load the color scheme, just use the default
    console.debug(error);
    settingsManager.setCurrentColorScheme(colorSchemeManager.default);
    colorSchemeManager.currentColorScheme = colorSchemeManager.default;
    colorSchemeManager.calculateColorBuffers(isForceRecolor);
  }
};
export const setSat = (i: number, sat: SatObject): void => {
  if (!satSet.satData) return; // Cant set a satellite without a catalog
  satSet.satData[i] = sat;
  satSet.satData[i].velocity ??= { total: 0, x: 0, y: 0, z: 0 }; // Set the velocity to 0 if it doesn't exist
};
export const mergeSat = (sat: SatObject): void => {
  if (!satSet.satData) return null;
  const satId = sat?.sccNum || -1;
  if (satId === -1) return;
  const i = satSet.getIdFromObjNum(parseInt(satId));
  satSet.satData[i] = { ...satSet.satData[i], ...sat };
};
export const replaceSatSet = (newSatSet: any) => {
  satSet = newSatSet;
};

// prettier-ignore
export const addSatExtraFunctions = (i: number) => { // NOSONAR
  const { sensorManager, satellite, timeManager, objectManager } = keepTrackApi.programs;
  if (typeof satSet.satData[i].isInSun == 'undefined') {
    satSet.satData[i].isInSun = (): SunStatus => {
      // TODO: Implement enums for the return values
      if (typeof satSet.satData[i].position == 'undefined') return SunStatus.UNKNOWN;

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
      const semiDiamEarth =
        Math.asin(
          RADIUS_OF_EARTH / Math.sqrt(Math.pow(-satSet.satData[i].position.x, 2) + Math.pow(-satSet.satData[i].position.y, 2) + Math.pow(-satSet.satData[i].position.z, 2))
        ) * RAD2DEG;

      // Position needs to be relative to satellite NOT ECI
      // var distSatSunX = Math.pow(-satSet.satData[i].position.x + sunECI.x, 2);
      // var distSatSunY = Math.pow(-satSet.satData[i].position.y + sunECI.y, 2);
      // var distSatSunZ = Math.pow(-satSet.satData[i].position.z + sunECI.z, 2);
      // var distSatSun = Math.sqrt(distSatSunX + distSatSunY + distSatSunZ);
      // var semiDiamSun = Math.asin(RADIUS_OF_SUN/distSatSun) * RAD2DEG;
      const semiDiamSun =
        Math.asin(
          RADIUS_OF_SUN /
            Math.sqrt(
              Math.pow(-satSet.satData[i].position.x + sunECI.x, 2) + Math.pow(-satSet.satData[i].position.y + sunECI.y, 2) + Math.pow(-satSet.satData[i].position.z + sunECI.z, 2)
            )
        ) * RAD2DEG;

      // Angle between earth and sun
      const theta =
        Math.acos(
          <number>(
            numeric.dot(
              [-satSet.satData[i].position.x, -satSet.satData[i].position.y, -satSet.satData[i].position.z],
              [-satSet.satData[i].position.x + sunECI.x, -satSet.satData[i].position.y + sunECI.y, -satSet.satData[i].position.z + sunECI.z]
            )
          ) /
            (Math.sqrt(Math.pow(-satSet.satData[i].position.x, 2) + Math.pow(-satSet.satData[i].position.y, 2) + Math.pow(-satSet.satData[i].position.z, 2)) *
              Math.sqrt(
                Math.pow(-satSet.satData[i].position.x + sunECI.x, 2) +
                  Math.pow(-satSet.satData[i].position.y + sunECI.y, 2) +
                  Math.pow(-satSet.satData[i].position.z + sunECI.z, 2)
              ))
        ) * RAD2DEG;
      
      if (semiDiamEarth > semiDiamSun && theta < semiDiamEarth - semiDiamSun) {        
        return SunStatus.UMBRAL;
      }

      if ((semiDiamSun > semiDiamEarth) || 
          (theta < semiDiamSun - semiDiamEarth) || 
          (Math.abs(semiDiamEarth - semiDiamSun) < theta && theta < semiDiamEarth + semiDiamSun)) {
        return SunStatus.PENUMBRAL;
      }

      return SunStatus.SUN;
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
      if (satSet.satData[i].type === SpaceObjectType.STAR) return false;
      // Sensors don't have TLEs
      if ([SpaceObjectType.PHASED_ARRAY_RADAR, SpaceObjectType.MECHANICAL, SpaceObjectType.OPTICAL].includes(satSet.satData[i].type)) return false;

      if (satSet.satData[i].missile) {
        return satellite.eci2ll(satSet.satData[i].position.x, satSet.satData[i].position.y, satSet.satData[i].position.z).alt;
      } else {
        return satellite.altitudeCheck(satSet.satData[i].TLE1, satSet.satData[i].TLE2, timeManager.simulationTimeObj);
      }
    };
  }
  if (objectManager.isSensorManagerLoaded && typeof satSet.satData[i].getTEARR == 'undefined') {
    satSet.satData[i].getTEARR = (
      propTime?: Date,
      sensors?: SensorObject[]
    ): {
      lat: number;
      lon: number;
      alt: number;
      rng?: number;
      az?: number;
      el?: number;
      inView: boolean;
    } => {
      const currentTEARR: Lla & Rae & InView & {name: string} = {
        lat: 0,
        lon: 0,
        alt: 0,
        rng: 0,
        az: 0,
        el: 0,
        inView: false,
        name: ''
      }; // Most current TEARR data that is set in satellite object and returned.

      if (typeof sensors === 'undefined' || sensors[0] === null) {
        sensors = sensorManager.currentSensor;
      }
      // If sensor's observerGd is not set try to set it using it parameters
      if (typeof sensors[0].observerGd == 'undefined') {
        try {
          sensors[0].observerGd = {
            alt: sensors[0].alt,
            lat: sensors[0].lat * DEG2RAD,
            lon: sensors[0].lon * DEG2RAD,
          };
        } catch (e) {
          throw new Error('observerGd is not set and could not be guessed.');
        }
        // If it didn't work, try again
        if (typeof sensors[0].observerGd.lon == 'undefined') {
          try {
            sensors[0].observerGd = {
              alt: sensors[0].alt,
              lat: sensors[0].lat * DEG2RAD,
              lon: sensors[0].lon * DEG2RAD,
            };
          } catch (e) {
            throw new Error('observerGd is not set and could not be guessed.');
          }
        }
      } else {
        // Convert observer grid to radians
        sensors[0].observerGd = {
          alt: sensors[0].alt,
          lat: sensors[0].lat * DEG2RAD,
          lon: sensors[0].lon * DEG2RAD,
        };
      }

      // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
      const sensor = sensors[0];

      let now: {
        getUTCFullYear: () => any;
        getUTCMonth: () => number;
        getUTCDate: () => any;
        getUTCHours: () => any;
        getUTCMinutes: () => any;
        getUTCSeconds: () => any;
        getUTCMilliseconds: () => number;
      };
      if (typeof propTime != 'undefined' && propTime !== null) {
        now = propTime;
      } else {
        now = timeManager.simulationTimeObj;
      }
      let j = jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
      const gmst = satellite.gstime(j);

      if (satSet.satData[i].missile) {
        // ECI to ECF
        const positionEcf = satellite.eciToEcf(satSet.satData[i].position, gmst);
        // ECF to RAE
        const rae = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
        const inview = satellite.checkIsInView(sensor, {
          az: rae.az * RAD2DEG,
          el: rae.el * RAD2DEG,
          rng: rae.rng,
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
      const positionEci = <EciVec3>satellite.sgp4(satrec, m).position;
      if (!positionEci) {
        console.error('No ECI position for', satrec.satnum, 'at', now);
        currentTEARR.alt = 0;
        currentTEARR.lon = 0;
        currentTEARR.lat = 0;
        currentTEARR.az = 0;
        currentTEARR.el = 0;
        currentTEARR.rng = 0;
      }

      try {
        const gpos = satellite.eciToGeodetic(positionEci, gmst);
        currentTEARR.alt = gpos.alt;
        currentTEARR.lon = gpos.lon;
        currentTEARR.lat = gpos.lat;
        const positionEcf = satellite.eciToEcf(positionEci, gmst);
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

      currentTEARR.inView = satellite.checkIsInView(sensor, {
        az: currentTEARR.az,
        el: currentTEARR.el,
        rng: currentTEARR.rng,
      });

      currentTEARR.name = satSet.satData[i].name;

      satellite.setTEARR(currentTEARR);
      return currentTEARR;
    };
  }
  if (typeof satSet.satData[i].getDirection == 'undefined') {
    satSet.satData[i].getDirection = () => {
      const nowLat = satSet.satData[i].getTEARR().lat * RAD2DEG;
      const futureTime = timeManager.getOffsetTimeObj(5000, timeManager.simulationTimeObj);
      const futLat = satSet.satData[i].getTEARR(futureTime).lat * RAD2DEG;

      // TODO: Remove getTEARR References
      // let nowLat = satellite.eci2ll(satSet.satData[i].position.x,satSet.satData[i].position.y,satSet.satData[i].position.z).lat;
      // let futureTime = timeManager.getOffsetTimeObj(5000, timeManager.simulationTimeObj);
      // let futureEci = satellite.getEci(satSet.satData[i], futureTime);
      // let futLat = satellite.eci2ll(futureEci.x,futureEci.y,futureEci.z).lat;
      if (nowLat < futLat) return 'N';
      if (nowLat > futLat) return 'S';
      if (nowLat === futLat) {
        // TODO: decide what to do with this
        // futureTime = timeManager.getOffsetTimeObj(20000, timeManager.simulationTimeObj);
        // futureTEARR = satSet.satData[i].getTEARR(futureTime);
        if (nowLat < futLat) return 'N';
        if (nowLat > futLat) return 'S';
      }
      console.warn('Sat Direction Calculation Error - By Pole?');
      return 'Error';
    };
  }
};

export type CatalogManager = typeof satSet;
export let satSet = {
  convertIdArrayToSatnumArray,
  convertSatnumArrayToIdArray,
  cosparIndex: null,
  exportTle2Csv,
  exportTle2Txt,
  getIdFromEci,
  getIdFromIntlDes,
  getIdFromObjNum,
  getSensorFromSensorName,
  getIdFromStarName,
  getSat,
  getSatExtraOnly,
  getSatFromObjNum,
  getSatInSun,
  getSatInView,
  getSatPosOnly,
  getSatVel,
  getScreenCoords,
  gotExtraData: false,
  gsInfo: null,
  init,
  insertNewAnalystSatellite,
  mergeSat,
  missileSats: null,
  numSats: null,
  onCruncherReady,
  orbitalSats: null,
  queryStr: null,
  resetSatInSun,
  resetSatInView,
  satCruncher: null,
  satData: null,
  satExtraData: null,
  satSensorMarkerArray: null,
  sccIndex: null,
  selectSat,
  setColorScheme: <any>setColorScheme,
  setHover,
  setSat,
  sunECI: null,
  search,
};
