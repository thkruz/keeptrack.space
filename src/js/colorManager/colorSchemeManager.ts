// Copyright (C) 2016-2022 Theodore Kruczek
// Copyright (C) 2020 Heather Kruczek
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

import { keepTrackApi } from '../api/keepTrackApi';
import { CatalogManager, Colors, SatObject } from '../api/keepTrackTypes';
import { ageOfElsetRules } from './ruleSets/ageOfElset';
import { apogeeRules } from './ruleSets/apogee';
import { countriesRules } from './ruleSets/countries';
import { defaultRules } from './ruleSets/default';
import { geoRules } from './ruleSets/geo';
import { groupRules } from './ruleSets/group';
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
  iSensor: number;
  lastCalculation: number;
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

export type ColorRuleSet = (sat: SatObject) => ColorInformation;

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
    colorSchemeManager.ageOfElset = ageOfElsetRules;
    colorSchemeManager.lostobjects = lostobjectsRules;
    colorSchemeManager.leo = leoRules;
    colorSchemeManager.geo = geoRules;
    colorSchemeManager.velocity = velocityRules;
    // Used When Displaying a Group/Search of Objects
    colorSchemeManager.group = groupRules;
  },
  currentColorScheme: null,
  iSensor: 0,
  lastCalculation: 0,

  // This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
  calculateColorBuffers: async (isForceRecolor?: boolean): Promise<void> => { // NOSONAR
    try {
      // These two variables only need to be set once, but we want to make sure they aren't called before the satellites
      // are loaded into satSet. Don't move the buffer data creation into the constructor!
      if (!colorSchemeManager.pickableData || !colorSchemeManager.colorData) return;
      const { gl } = keepTrackApi.programs.drawManager;

      // Determine what time it is so we know if its time to recolor everything
      const now = Date.now();

      // Unless we are forcing a recolor
      // If there hasn't been enough time between the last recoloring skip it (performance boost)
      // Unless its the first draw - otherwise we will never color in anything
      if (!isForceRecolor && now - colorSchemeManager.lastCalculation < settingsManager.reColorMinimumTime && colorSchemeManager.lastCalculation !== 0) return;

      // Record this as the last time we calculated this.colors
      colorSchemeManager.lastCalculation = now;

      // We need to know what all the satellites currently look like - ask satSet to give that information
      const { satData } = keepTrackApi.programs.satSet;

      const satInView = colorSchemeManager.satSet.getSatInView();

      // We also need the velocity data if we are trying to colorizing that
      const satVel = colorSchemeManager.currentColorScheme === colorSchemeManager.velocity ? colorSchemeManager.satSet.getSatVel() : null;
      // If we want to color things based on sunlight we need to get that info from satSet
      const satInSun = colorSchemeManager.satSet.getSatInSun();

      // Reset Which Sensor we are coloring before the loop begins
      colorSchemeManager.iSensor = 0;

      // Lets loop through all the satellites and color them in one by one
      let colors: ColorInformation = null;
      for (let i = 0; i < settingsManager.dotsOnScreen; i++) {
        // In View data is stored in a separate array
        if (satInView) {
          satData[i].inView = satInView[i];
        }

        // Sun values are stored separately from the rest of satSet so it needs to be combined
        if (satInSun) {
          satData[i].inSun = satInSun[i];
        }

        // Velocity is stored separate from satellite details - so add in the velocity
        if (satVel) {
          satData[i].velocity.total = Math.sqrt(satVel[i * 3] * satVel[i * 3] + satVel[i * 3 + 1] * satVel[i * 3 + 1] + satVel[i * 3 + 2] * satVel[i * 3 + 2]);
        }

        // Run the colorRuleSet function we used to create this schematic
        colors = colorSchemeManager.currentColorScheme(satData[i]);

        // Don't let one bad color break the buffer
        // if (typeof this.colors == 'undefined') continue;

        // We got a Vec4 back, but we need to flatten it
        colorSchemeManager.colorData[i * 4] = colors.color[0]; // R
        colorSchemeManager.colorData[i * 4 + 1] = colors.color[1]; // G
        colorSchemeManager.colorData[i * 4 + 2] = colors.color[2]; // B
        colorSchemeManager.colorData[i * 4 + 3] = colors.color[3]; // A
        colorSchemeManager.pickableData[i] = colors.pickable ? Pickable.Yes : Pickable.No;

        // If we don't do this then everytime the color refreshes it will undo any effect being applied outside of this loop
        if (i == keepTrackApi.programs.objectManager.selectedSat) {
          // Selected satellites are always one color so forget whatever we just did
          colorSchemeManager.colorData[i * 4] = settingsManager.selectedColor[0]; // R
          colorSchemeManager.colorData[i * 4 + 1] = settingsManager.selectedColor[1]; // G
          colorSchemeManager.colorData[i * 4 + 2] = settingsManager.selectedColor[2]; // B
          colorSchemeManager.colorData[i * 4 + 3] = settingsManager.selectedColor[3]; // A
        }

        if (i == keepTrackApi.programs.objectManager.hoveringSat) {
          // Hover satellites are always one color so forget whatever we just did
          // We check this last so you can hover over the selected satellite
          colorSchemeManager.colorData[i * 4] = settingsManager.hoverColor[0]; // R
          colorSchemeManager.colorData[i * 4 + 1] = settingsManager.hoverColor[1]; // G
          colorSchemeManager.colorData[i * 4 + 2] = settingsManager.hoverColor[2]; // B
          colorSchemeManager.colorData[i * 4 + 3] = settingsManager.hoverColor[3]; // A
        }
      }

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
export const isInViewOff = (sat: SatObject) => sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === false;
