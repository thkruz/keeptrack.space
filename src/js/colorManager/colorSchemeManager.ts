/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
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

import { getEl } from '@app/js/lib/helpers';
import { keepTrackApi } from '../api/keepTrackApi';
import { Colors, SatObject } from '../api/keepTrackTypes';
import { CatalogManager } from '../satSet/satSet';
import { ageOfElsetRules } from './ruleSets/ageOfElset';
import { apogeeRules } from './ruleSets/apogee';
import { countriesRules } from './ruleSets/countries';
import { defaultRules } from './ruleSets/default';
import { geoRules } from './ruleSets/geo';
import { groupRules } from './ruleSets/group';
import { groupCountriesRules } from './ruleSets/group-countries';
import { leoRules } from './ruleSets/leo';
import { lostobjectsRules } from './ruleSets/lostobjects';
import { onlyFovRules } from './ruleSets/onlyFov';
import { rcsRules } from './ruleSets/rcs';
import { smallsatsRules } from './ruleSets/smallsat';
import { sunlightRules } from './ruleSets/sunlight';
import { velocityRules } from './ruleSets/velocity';

export interface ObjectTypeFlags {
  payload: boolean;
  radarData: boolean;
  rocketBody: boolean;
  debris: boolean;
  facility: boolean;
  sensor: boolean;
  missile: boolean;
  missileInview: boolean;
  pink: boolean;
  inFOV: boolean;
  inViewAlt: boolean;
  starLow: boolean;
  starMed: boolean;
  starHi: boolean;
  satLEO: boolean;
  satGEO: boolean;
  satLow: boolean;
  satMed: boolean;
  satHi: boolean;
  satSmall: boolean;
  rcsSmall: boolean;
  rcsMed: boolean;
  rcsLarge: boolean;
  rcsUnknown: boolean;
  velocitySlow: boolean;
  velocityMed: boolean;
  velocityFast: boolean;
  ageNew: boolean;
  ageMed: boolean;
  ageOld: boolean;
  ageLost: boolean;
  countryUS: boolean;
  countryPRC: boolean;
  countryCIS: boolean;
  countryOther: boolean;
}

export interface ColorSchemeManager {
  colorBufferOneTime: boolean;
  pickableBufferOneTime: boolean;
  colorData: Float32Array;
  pickableData: Float32Array;
  pickableBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  init: () => void;
  colorTheme: Colors;
  resetObjectTypeFlags: () => void;
  reloadColors: () => void;
  currentColorScheme: ColorRuleSet;
  lastColorScheme: ColorRuleSet;
  iSensor: number;
  lastCalculation: number;
  lastDotColored: number;
  default: ColorRuleSet;
  onlyFOV: ColorRuleSet;
  sunlight: ColorRuleSet;
  apogee: ColorRuleSet;
  smallsats: ColorRuleSet;
  rcs: ColorRuleSet;
  countries: ColorRuleSet;
  ageOfElset: ColorRuleSet;
  lostobjects: ColorRuleSet;
  leo: ColorRuleSet;
  geo: ColorRuleSet;
  velocity: ColorRuleSet;
  group: ColorRuleSet;
  groupCountries: ColorRuleSet;
  calculateColorBuffers: (isForceRecolor?: boolean) => Promise<void>;
  objectTypeFlags: ObjectTypeFlags;
  satSet: CatalogManager;
}

export interface ColorScheme {
  colorBuffer: WebGLBuffer;
  colorData: any;
  colorRuleSet: any;
  colors: any;
  gl: WebGL2RenderingContext;
  hoverSat: any;
  iSensor: number;
  isSunlightColorScheme: boolean;
  isVelocityColorScheme: boolean;
  lastCalculation: number;
  now: number;
  pickableBuffer: WebGLBuffer;
  pickableBufferOneTime: any;
  pickableData: any;
  satData: any;
  satInSun: any;
  satInView: any;
  satSet: any;
  satVel: any;
  selectSat: any;
  tempNumOfSats: number;
  colorBufferOneTime: boolean;
  colorBuf: any;
  pickableBuf: any;
  calculateColorBuffers: (force: boolean) => void;
}

export enum Pickable {
  Yes = 1,
  No = 0,
}

export type ColorInformation = {
  color: [number, number, number, number];
  marker?: boolean;
  pickable: Pickable;
};

export interface ColorRuleParams {
  satInView?: Int8Array;
  satInSun?: Int8Array;
}

export type ColorRuleSet = (sat: SatObject, params?: any) => ColorInformation;

const DOTS_PER_CALC = 450;

export const colorSchemeManager: ColorSchemeManager = {
  objectTypeFlags: {
    payload: true,
    radarData: true,
    rocketBody: true,
    debris: true,
    facility: true,
    sensor: true,
    missile: true,
    missileInview: true,
    pink: true,
    inFOV: true,
    inViewAlt: true,
    starLow: true,
    starMed: true,
    starHi: true,
    satLEO: true,
    satGEO: true,
    satLow: true,
    satMed: true,
    satHi: true,
    satSmall: true,
    rcsSmall: true,
    rcsMed: true,
    rcsLarge: true,
    rcsUnknown: true,
    velocitySlow: true,
    velocityMed: true,
    velocityFast: true,
    ageNew: true,
    ageMed: true,
    ageOld: true,
    ageLost: true,
    countryUS: true,
    countryPRC: true,
    countryCIS: true,
    countryOther: true,
  },
  init: () => {
    const { satSet } = keepTrackApi.programs;
    const { gl } = keepTrackApi.programs.drawManager;

    colorSchemeManager.colorTheme = settingsManager.colors;
    colorSchemeManager.resetObjectTypeFlags();
    colorSchemeManager.satSet = satSet;

    // Create the color buffers as soon as the position cruncher is ready
    keepTrackApi.register({
      method: 'onCruncherReady',
      cbName: 'colorSchemeManager',
      cb: (): void => {
        // Generate some public buffers
        colorSchemeManager.colorBuffer = gl.createBuffer();
        colorSchemeManager.pickableBuffer = gl.createBuffer();
        colorSchemeManager.colorData = new Float32Array(satSet.numSats * 4);
        colorSchemeManager.pickableData = new Float32Array(satSet.numSats);
      },
    });
    colorSchemeManager.default = defaultRules;
    colorSchemeManager.onlyFOV = onlyFovRules;
    colorSchemeManager.sunlight = sunlightRules;
    colorSchemeManager.apogee = apogeeRules;
    colorSchemeManager.smallsats = smallsatsRules;
    colorSchemeManager.rcs = rcsRules;
    colorSchemeManager.countries = countriesRules;
    colorSchemeManager.groupCountries = groupCountriesRules;
    colorSchemeManager.ageOfElset = ageOfElsetRules;
    colorSchemeManager.lostobjects = lostobjectsRules;
    colorSchemeManager.leo = leoRules;
    colorSchemeManager.geo = geoRules;
    colorSchemeManager.velocity = velocityRules;
    // Used When Displaying a Group/Search of Objects
    colorSchemeManager.group = groupRules;
  },
  currentColorScheme: null,
  lastColorScheme: null,
  iSensor: 0,
  lastCalculation: 0,
  lastDotColored: 0,

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  // prettier-ignore
  calculateColorBuffers: async (isForceRecolor?: boolean): Promise<void> => { // NOSONAR
    try {
      // These two variables only need to be set once, but we want to make sure they aren't called before the satellites
      // are loaded into satSet. Don't move the buffer data creation into the constructor!
      if (!colorSchemeManager.pickableData || !colorSchemeManager.colorData) return;
      const { searchBox, orbitManager } = keepTrackApi.programs;
      const { gl } = keepTrackApi.programs.drawManager;


      // Revert colorscheme if search box is empty
      if (colorSchemeManager.currentColorScheme === colorSchemeManager.group || colorSchemeManager.currentColorScheme === colorSchemeManager.groupCountries) {
        if (searchBox.getCurrentSearch() === '' && getEl('watchlist-menu').style.transform !== 'translateX(0px)' && !orbitManager.isTimeMachineRunning) {
          if (colorSchemeManager.currentColorScheme === colorSchemeManager.groupCountries) {
            colorSchemeManager.currentColorScheme = colorSchemeManager.countries;
          } else {
            colorSchemeManager.currentColorScheme = colorSchemeManager.default;
          }
        }
      }


      if (!isForceRecolor) {
        switch (colorSchemeManager.currentColorScheme) {          
          case colorSchemeManager.apogee:
          case colorSchemeManager.smallsats:
          case colorSchemeManager.rcs:
          case colorSchemeManager.countries:
          case colorSchemeManager.ageOfElset:
          case colorSchemeManager.lostobjects:
          case colorSchemeManager.leo:
          case colorSchemeManager.geo:
          case colorSchemeManager.group:    
          case colorSchemeManager.groupCountries:        
            // These don't change over time
            return;
          case colorSchemeManager.default:
          case colorSchemeManager.onlyFOV:
          case colorSchemeManager.sunlight:
          case colorSchemeManager.velocity:
            // These change over time
            break;
          default:
            // Reset the scheme to the default
            colorSchemeManager.currentColorScheme = colorSchemeManager.default;
            break;
        }
      }

      // Figure out if we are coloring all of the dots - assume yes initially
      let firstDotToColor = 0;
      let lastDotToColor = settingsManager.dotsOnScreen;
      // If this is the same color scheme then we don't need to recolor everything
      if (!isForceRecolor && colorSchemeManager.currentColorScheme === colorSchemeManager.lastColorScheme) {
        if (colorSchemeManager.lastDotColored < settingsManager.dotsOnScreen) {
          firstDotToColor = colorSchemeManager.lastDotColored;
          lastDotToColor = firstDotToColor + ((<any>window).dotsPerColor || DOTS_PER_CALC);
          if (lastDotToColor > settingsManager.dotsOnScreen) lastDotToColor = settingsManager.dotsOnScreen;
        } else {
          lastDotToColor = (<any>window).dotsPerColor || DOTS_PER_CALC;
        }

        colorSchemeManager.lastDotColored = lastDotToColor;
      } else {
        colorSchemeManager.lastDotColored = 0;
      }
      // Note the colorscheme for next time
      colorSchemeManager.lastColorScheme = colorSchemeManager.currentColorScheme;

      // We need to know what all the satellites currently look like - ask satSet to give that information
      const { satData } = keepTrackApi.programs.satSet;      

      // We also need the velocity data if we are trying to colorizing that
      let satVel = null;
      if (colorSchemeManager.currentColorScheme === colorSchemeManager.velocity) {
        satVel = colorSchemeManager.currentColorScheme === colorSchemeManager.velocity ? colorSchemeManager.satSet.getSatVel() : null;
      }

      // Reset Which Sensor we are coloring before the loop begins
      if (firstDotToColor === 0) {
        colorSchemeManager.iSensor = 0;
      }

      // Lets loop through all the satellites and color them in one by one      
      let params = {
        year: '',
        jday: 0,
      };

      if (colorSchemeManager.currentColorScheme === colorSchemeManager.ageOfElset) {
        const {timeManager} = keepTrackApi.programs;
        let now = new Date();
        params.jday = timeManager.getDayOfYear(now);
        params.year = now.getUTCFullYear().toString().substr(2, 2);
      }

      // Velocity is a special case - we need to know the velocity of each satellite
      if (colorSchemeManager.currentColorScheme === colorSchemeManager.velocity) {
        for (let i = firstDotToColor; i < lastDotToColor; i++) {          
          let colors: ColorInformation = null;      
          satData[i].velocity.total = Math.sqrt(satVel[i * 3] * satVel[i * 3] + satVel[i * 3 + 1] * satVel[i * 3 + 1] + satVel[i * 3 + 2] * satVel[i * 3 + 2]);

          if (!settingsManager.isShowLeoSats && satData[i].apogee < 6000) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }
          if (!settingsManager.isShowHeoSats && (satData[i].eccentricity >= 0.1 || satData[i].apogee >= 6000 && satData[i].perigee < 6000)) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }
          if (!settingsManager.isShowMeoSats && satData[i].perigee <= 32000 && satData[i].perigee >= 6000) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }
          if (!settingsManager.isShowGeoSats && satData[i].perigee > 32000) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }          
          colors ??= colorSchemeManager.currentColorScheme(satData[i], params);
          
          colorSchemeManager.colorData[i * 4] = colors.color[0]; // R
          colorSchemeManager.colorData[i * 4 + 1] = colors.color[1]; // G
          colorSchemeManager.colorData[i * 4 + 2] = colors.color[2]; // B
          colorSchemeManager.colorData[i * 4 + 3] = colors.color[3]; // A
          colorSchemeManager.pickableData[i] = colors.pickable;        
        }
      } else {
        for (let i = firstDotToColor; i < lastDotToColor; i++) {             
          let colors: ColorInformation = null;   
          if (!settingsManager.isShowLeoSats && satData[i].apogee < 6000) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }
          if (!settingsManager.isShowHeoSats && (satData[i].eccentricity >= 0.1 || satData[i].apogee >= 6000 && satData[i].perigee < 6000)) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }
          if (!settingsManager.isShowMeoSats && satData[i].perigee <= 32000 && satData[i].perigee >= 6000) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }
          if (!settingsManager.isShowGeoSats && satData[i].perigee > 32000) {
            colors = {
              color: [0, 0, 0, 0],
              pickable: Pickable.No,
            }
          }          
          colors ??= colorSchemeManager.currentColorScheme(satData[i], params);

          colorSchemeManager.colorData[i * 4] = colors.color[0]; // R
          colorSchemeManager.colorData[i * 4 + 1] = colors.color[1]; // G
          colorSchemeManager.colorData[i * 4 + 2] = colors.color[2]; // B
          colorSchemeManager.colorData[i * 4 + 3] = colors.color[3]; // A
          colorSchemeManager.pickableData[i] = colors.pickable;        
        }
      }
        
      // If we don't do this then everytime the color refreshes it will undo any effect being applied outside of this loop
      const selSat = keepTrackApi.programs.objectManager.selectedSat;
      // Selected satellites are always one color so forget whatever we just did
      colorSchemeManager.colorData[selSat * 4] = settingsManager.selectedColor[0]; // R
      colorSchemeManager.colorData[selSat * 4 + 1] = settingsManager.selectedColor[1]; // G
      colorSchemeManager.colorData[selSat * 4 + 2] = settingsManager.selectedColor[2]; // B
      colorSchemeManager.colorData[selSat * 4 + 3] = settingsManager.selectedColor[3]; // A

      const hovSat = keepTrackApi.programs.objectManager.hoveringSat;
      // Hover satellites are always one color so forget whatever we just did
      // We check this last so you can hover over the selected satellite
      colorSchemeManager.colorData[hovSat * 4] = settingsManager.hoverColor[0]; // R
      colorSchemeManager.colorData[hovSat * 4 + 1] = settingsManager.hoverColor[1]; // G
      colorSchemeManager.colorData[hovSat * 4 + 2] = settingsManager.hoverColor[2]; // B
      colorSchemeManager.colorData[hovSat * 4 + 3] = settingsManager.hoverColor[3]; // A

      // Now that we have all the information, load the color buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManager.colorBuffer);
      // And update it
      if (!colorSchemeManager.colorBufferOneTime) {
        gl.bufferData(gl.ARRAY_BUFFER, colorSchemeManager.colorData, gl.DYNAMIC_DRAW);
        colorSchemeManager.colorBufferOneTime = true;
      } else {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorSchemeManager.colorData);
      }

      // Next the buffer for which objects can be picked -- different than what color they are on the pickable frame (that is in the dots class)
      gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManager.pickableBuffer);
      if (!colorSchemeManager.pickableBufferOneTime) {
        gl.bufferData(gl.ARRAY_BUFFER, colorSchemeManager.pickableData, gl.DYNAMIC_DRAW);
        colorSchemeManager.pickableBufferOneTime = true;
      } else {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorSchemeManager.pickableData);
      }
    } catch (e) {
      // Intentionally left blank
    }
  },
  resetObjectTypeFlags: () => {
    colorSchemeManager.objectTypeFlags.payload = true;
    colorSchemeManager.objectTypeFlags.radarData = true;
    colorSchemeManager.objectTypeFlags.rocketBody = true;
    colorSchemeManager.objectTypeFlags.debris = true;
    colorSchemeManager.objectTypeFlags.facility = true;
    colorSchemeManager.objectTypeFlags.sensor = true;
    colorSchemeManager.objectTypeFlags.missile = true;
    colorSchemeManager.objectTypeFlags.missileInview = true;
    colorSchemeManager.objectTypeFlags.pink = true;
    colorSchemeManager.objectTypeFlags.inFOV = true;
    colorSchemeManager.objectTypeFlags.inViewAlt = true;
    colorSchemeManager.objectTypeFlags.starLow = true;
    colorSchemeManager.objectTypeFlags.starMed = true;
    colorSchemeManager.objectTypeFlags.starHi = true;
    colorSchemeManager.objectTypeFlags.satLEO = true;
    colorSchemeManager.objectTypeFlags.satGEO = true;
    colorSchemeManager.objectTypeFlags.satLow = true;
    colorSchemeManager.objectTypeFlags.satMed = true;
    colorSchemeManager.objectTypeFlags.satHi = true;
    colorSchemeManager.objectTypeFlags.satSmall = true;
    colorSchemeManager.objectTypeFlags.rcsSmall = true;
    colorSchemeManager.objectTypeFlags.rcsMed = true;
    colorSchemeManager.objectTypeFlags.rcsLarge = true;
    colorSchemeManager.objectTypeFlags.rcsUnknown = true;
    colorSchemeManager.objectTypeFlags.velocitySlow = true;
    colorSchemeManager.objectTypeFlags.velocityMed = true;
    colorSchemeManager.objectTypeFlags.velocityFast = true;
    colorSchemeManager.objectTypeFlags.ageNew = true;
    colorSchemeManager.objectTypeFlags.ageMed = true;
    colorSchemeManager.objectTypeFlags.ageOld = true;
    colorSchemeManager.objectTypeFlags.ageLost = true;
  },
  reloadColors: () => {
    colorSchemeManager.colorTheme = settingsManager.colors;
  },
  satSet: null,
  colorTheme: null,
  default: null,
  onlyFOV: null,
  sunlight: null,
  apogee: null,
  smallsats: null,
  rcs: null,
  countries: null,
  groupCountries: null,
  ageOfElset: null,
  lostobjects: null,
  leo: null,
  geo: null,
  velocity: null,
  group: null,
  pickableBuffer: null,
  colorBuffer: null,
  colorData: null,
  pickableData: null,
  colorBufferOneTime: false,
  pickableBufferOneTime: false,
};

export const isPayloadOff = (sat: SatObject) => sat.type === 1 && colorSchemeManager.objectTypeFlags.payload === false;
export const isRocketBodyOff = (sat: SatObject) => sat.type === 2 && colorSchemeManager.objectTypeFlags.rocketBody === false;
export const isDebrisOff = (sat: SatObject) => sat.type === 3 && colorSchemeManager.objectTypeFlags.debris === false;
export const isInViewOff = (sat: SatObject) => keepTrackApi.programs.dotsManager.inViewData[sat.id] === 1 && colorSchemeManager.objectTypeFlags.inFOV === false;
