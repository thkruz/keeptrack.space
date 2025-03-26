/* eslint-disable complexity */
/* eslint-disable newline-before-return */
/* eslint-disable max-lines */
/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2016-2025 Theodore Kruczek
 * @Copyright (C) 2020-2025 Heather Kruczek
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

import { ColorRuleSet, KeepTrackApiEvents } from '@app/interfaces';
import { ColorInformation, Pickable, rgbaArray } from '../interfaces';
import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { errorManagerInstance } from './errorManager';

import { waitForCruncher } from '@app/lib/waitForCruncher';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { BaseObject, DetailedSatellite, SpaceObjectType } from 'ootk';
import { LegendManager } from '../static/legend-manager';
import { TimeMachine } from './../plugins/time-machine/time-machine';
import { CelestrakColorScheme } from './color-schemes/celestrak-color-scheme';
import { ColorScheme, ColorSchemeColorMap } from './color-schemes/color-scheme';
import { ConfidenceColorScheme } from './color-schemes/confidence-color-scheme';
import { CountryColorScheme } from './color-schemes/country-color-scheme';
import { DefaultColorScheme, DefaultColorSchemeColorMap } from './color-schemes/default-color-scheme';
import { DensityColorScheme } from './color-schemes/density-color-scheme';
import { GpAgeColorScheme } from './color-schemes/gp-age-color-scheme';
import { MissionColorScheme } from './color-schemes/mission-color-scheme';
import { RcsColorScheme } from './color-schemes/rcs-color-scheme';
import { SmallSatColorScheme } from './color-schemes/smallsat-color-scheme';
import { SourceColorScheme } from './color-schemes/source-color-scheme';
import { StarlinkColorScheme } from './color-schemes/starlink-color-scheme';
import { SunlightColorScheme } from './color-schemes/sunlight-color-scheme';
import { VelocityColorScheme } from './color-schemes/velocity-color-scheme';
import { PersistenceManager, StorageKey } from './persistence-manager';

export class ColorSchemeManager {
  // This is where you confiure addon color schemes
  static readonly addonColorSchemes = [
    DefaultColorScheme,
    CelestrakColorScheme,
    CountryColorScheme,
    RcsColorScheme,
    MissionColorScheme,
    ConfidenceColorScheme,
    DensityColorScheme,
    SunlightColorScheme,
    GpAgeColorScheme,
    SourceColorScheme,
    VelocityColorScheme,
    StarlinkColorScheme,
    SmallSatColorScheme,
  ];
  readonly colorSchemeInstances = {
    DefaultColorScheme: new DefaultColorScheme(),
    CelestrakColorScheme: new CelestrakColorScheme(),
    CountryColorScheme: new CountryColorScheme(),
    RcsColorScheme: new RcsColorScheme(),
    MissionColorScheme: new MissionColorScheme(),
    ConfidenceColorScheme: new ConfidenceColorScheme(),
    DensityColorScheme: new DensityColorScheme(),
    SunlightColorScheme: new SunlightColorScheme(),
    GpAgeColorScheme: new GpAgeColorScheme(),
    SourceColorScheme: new SourceColorScheme(),
    VelocityColorScheme: new VelocityColorScheme(),
    StarlinkColorScheme: new StarlinkColorScheme(),
    SmallSatColorScheme: new SmallSatColorScheme(),
  };
  private readonly DOTS_PER_CALC = 350;
  private gl_: WebGL2RenderingContext;
  currentColorScheme: ColorScheme = this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? this.colorSchemeInstances.DefaultColorScheme;
  lastColorScheme: ColorScheme = this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? this.colorSchemeInstances.DefaultColorScheme;
  isUseGroupColorScheme = false;
  colorBuffer: WebGLBuffer | null = null;
  colorBufferOneTime = false;
  // Colors are all 0-255
  colorData = new Float32Array(0);
  colorTheme: ColorSchemeColorMap & DefaultColorSchemeColorMap;
  /**
   * This is the update function that will be used color the dots
   * it should be set to either the colorscheme class's update function or the group update function
   */
  currentColorSchemeUpdate: ColorRuleSet;
  iSensor = 0;
  isReady = false;
  lastDotColored = 0;
  objectTypeFlags = {
    starLow: true,
    starMed: true,
    starHi: true,
    inViewAlt: true,
    sensor: true,
    inFOV: true,
  };
  pickableBuffer: WebGLBuffer | null = null;
  pickableBufferOneTime = false;
  pickableData = new Int8Array(0);

  calcColorBufsNextCruncher(): void {
    waitForCruncher({
      cruncher: keepTrackApi.getCatalogManager().satCruncher,
      cb: () => {
        keepTrackApi.getColorSchemeManager().calculateColorBuffers();
      },
      validationFunc: (m: PositionCruncherOutgoingMsg) => (!!((m.satInView?.length && m.satInView?.length > 0))),
      isSkipFirst: true,
      isRunCbOnFailure: true,
      maxRetries: 5,
    });
  }

  calculateColorBuffers(isForceRecolor = false): void {
    try {
      /*
       * These two variables only need to be set once, but we want to make sure they aren't called before the satellites
       * are loaded into catalogManagerInstance. Don't move the buffer data creation into the constructor!
       */
      if (!this.pickableData || !this.colorData) {
        return;
      }

      // Revert colorscheme if search box is empty
      this.preValidateColorScheme_(isForceRecolor);

      if (this.isUseGroupColorScheme) {
        // current.updateGroup -> current.update -> settings.default.updateGroupupdateGroup -> default.updateGroup
        this.currentColorSchemeUpdate = this.currentColorScheme.updateGroup ?? this.currentColorScheme.update ??
          this.colorSchemeInstances[settingsManager.defaultColorScheme].updateGroup ?? this.colorSchemeInstances.DefaultColorScheme.updateGroup;
      } else {
        // current.update -> settings.default.update -> default.update
        this.currentColorSchemeUpdate = this.currentColorScheme.update ?? this.colorSchemeInstances[settingsManager.defaultColorScheme].update ??
          this.colorSchemeInstances.DefaultColorScheme.update;
      }

      // Figure out if we are coloring all of the dots - assume yes initially
      const { firstDotToColor, lastDotToColor } = this.calcFirstAndLastDot_(isForceRecolor);


      // Reset Which Sensor we are coloring before the loop begins
      if (firstDotToColor === 0) {
        this.iSensor = 0;
      }

      // Lets loop through all the satellites and color them in one by one
      const params = this.calculateParams_();
      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      // Velocity is a special case - we need to know the velocity of each satellite
      if (this.currentColorScheme?.id === VelocityColorScheme.id) {
        // We also need the velocity data if we are trying to colorizing that
        const dotsManagerInstance = keepTrackApi.getDotsManager();
        const satVel: Float32Array | null = this.currentColorScheme?.id === VelocityColorScheme.id ? dotsManagerInstance.getSatVel() : null;

        this.calculateBufferDataVelocity_(firstDotToColor, lastDotToColor, catalogManagerInstance.objectCache, satVel as Float32Array, params);
      } else {
        this.calculateBufferDataLoop_(firstDotToColor, lastDotToColor, catalogManagerInstance.objectCache, params);
      }

      // If we don't do this then every time the color refreshes it will undo any effect being applied outside of this loop
      this.setSelectedAndHoverBuffer_();
      this.sendColorBufferToGpu();

      // Save the color scheme if needed
      if (this.currentColorScheme?.id && this.lastColorScheme?.id !== this.currentColorScheme?.id) {
        PersistenceManager.getInstance().saveItem(StorageKey.COLOR_SCHEME, this.currentColorScheme.id);
        // Note the colorscheme for next time
        this.lastColorScheme = this.currentColorScheme;
      }
    } catch (e) {
      this.currentColorScheme ??= this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? this.colorSchemeInstances.DefaultColorScheme;
      this.lastColorScheme = this.currentColorScheme;
      errorManagerInstance.debug(e);
    }
  }

  init(): void {
    const renderer = keepTrackApi.getRenderer();

    this.gl_ = renderer.gl;
    this.colorTheme = settingsManager.colors ?? <ColorSchemeColorMap & DefaultColorSchemeColorMap>{
      transparent: [0, 0, 0, 0] as rgbaArray,
      deselected: [0.0, 0.0, 0.0, 0.0] as rgbaArray,
      starLow: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      starMed: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      starHi: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      analyst: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      facility: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      missile: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      missileInview: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      gradientAmt: 0.0,
      inFOVAlt: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      inGroup: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      length: 0,
      marker: [[0.0, 0.0, 0.0, 1.0]] as rgbaArray[],
      version: '0',
      notional: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    };

    this.resetObjectTypeFlags();
    this.colorBuffer = renderer.gl.createBuffer();
    this.pickableBuffer = renderer.gl.createBuffer();

    // Create the color buffers as soon as the position cruncher is ready
    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherReady,
      cbName: 'colorSchemeManager',
      cb: (): void => {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const cachedColorScheme = PersistenceManager.getInstance().getItem(StorageKey.COLOR_SCHEME);
        let possibleColorScheme: ColorScheme | null = null;

        /*
         * We don't want to reload a cached group color scheme because we might not have a search
         * this can result in all dots turning black
         */
        if (cachedColorScheme) {
          LegendManager.change(cachedColorScheme);
          possibleColorScheme = this.colorSchemeInstances[cachedColorScheme] as ColorScheme;
        }
        this.currentColorScheme = possibleColorScheme ?? this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? this.colorSchemeInstances.DefaultColorScheme;
        this.lastColorScheme = this.currentColorScheme;

        // Generate some buffers
        this.colorData = new Float32Array(catalogManagerInstance.numObjects * 4);
        this.pickableData = new Int8Array(catalogManagerInstance.numObjects);
        this.calculateColorBuffers(true);
        this.isReady = true;

        // This helps keep the inview colors up to date
        keepTrackApi.register({
          event: KeepTrackApiEvents.staticOffsetChange,
          cbName: 'colorSchemeManager',
          cb: () => {
            setTimeout(() => {
              this.calcColorBufsNextCruncher();
            }, 1000);
          },
        });

      },
    });
  }

  isInView(obj: BaseObject) {
    return keepTrackApi.getDotsManager().inViewData?.[obj.id] === 1 && this.currentColorScheme?.objectTypeFlags.inFOV;
  }
  isInViewOff(obj: BaseObject) {
    return keepTrackApi.getDotsManager().inViewData?.[obj.id] === 1 && !this.currentColorScheme?.objectTypeFlags.inFOV;
  }
  isPayloadOff(obj: BaseObject) {
    return obj.type === SpaceObjectType.PAYLOAD && !settingsManager.isShowPayloads;
  }
  isRocketBodyOff(obj: BaseObject) {
    return obj.type === SpaceObjectType.ROCKET_BODY && !settingsManager.isShowRocketBodies;
  }
  isDebrisOff(obj: BaseObject) {
    return obj.type === SpaceObjectType.DEBRIS && !settingsManager.isShowDebris;
  }
  isJscVimpelSatOff(obj: BaseObject) {
    return obj.name?.startsWith('JSC Vimpel') && !settingsManager.isShowVimpelSats;
  }
  isNotionalSatOff(obj: BaseObject) {
    return obj.isNotional() && !settingsManager.isShowNotionalSats;
  }
  isLeoSatOff(obj: BaseObject) {
    return (obj as DetailedSatellite).apogee < 6000 && !settingsManager.isShowLeoSats;
  }
  isMeoSatOff(obj: BaseObject) {
    return (obj as DetailedSatellite).perigee <= 32000 && (obj as DetailedSatellite).perigee >= 6000 && !settingsManager.isShowMeoSats;
  }
  isGeoSatOff(obj: BaseObject) {
    return (obj as DetailedSatellite).perigee > 32000 && !settingsManager.isShowGeoSats;
  }
  isHeoSatOff(obj: BaseObject) {
    return (obj as DetailedSatellite).eccentricity >= 0.1 && ((obj as DetailedSatellite).apogee >= 6000 && (obj as DetailedSatellite).perigee < 6000) &&
      !settingsManager.isShowHeoSats;
  }
  isStarlinkSatOff(obj: BaseObject) {
    return obj.name?.includes('STARLINK') && !this.currentColorScheme?.objectTypeFlags.starlink;
  }

  reloadColors() {
    this.colorTheme = settingsManager.colors;
  }

  resetObjectTypeFlags() {
    this.objectTypeFlags.starLow = true;
    this.objectTypeFlags.starMed = true;
    this.objectTypeFlags.starHi = true;

    // eslint-disable-next-line guard-for-in
    for (const colorScheme in this.colorSchemeInstances) {
      this.colorSchemeInstances[colorScheme].resetObjectTypeFlags();
    }
  }

  setColorScheme(scheme: ColorScheme, isForceRecolor?: boolean) {
    try {
      const dotsManagerInstance = keepTrackApi.getDotsManager();
      const uiManagerInstance = keepTrackApi.getUiManager();

      LegendManager.change(scheme.id);
      uiManagerInstance.colorSchemeChangeAlert(scheme);

      scheme ??= this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? this.colorSchemeInstances.DefaultColorScheme;

      if (scheme instanceof ColorScheme) {
        this.currentColorScheme = this.colorSchemeInstances[scheme.id];
        this.currentColorSchemeUpdate = this.colorSchemeInstances[scheme.id].update;
      } else {
        throw new Error('Color scheme is not a valid color scheme');
      }

      this.calculateColorBuffers(isForceRecolor);
      if (this.colorBuffer && this.pickableBuffer) {
        dotsManagerInstance.buffers.color = this.colorBuffer;
        dotsManagerInstance.buffers.pickability = this.pickableBuffer;
      } else {
        throw new Error('Color or pickable buffer is not initialized');
      }
    } catch (error) {
      // If we can't load the color scheme, just use the default
      errorManagerInstance.log(error);
      this.currentColorSchemeUpdate = this.colorSchemeInstances[settingsManager.defaultColorScheme]?.update ?? this.colorSchemeInstances.DefaultColorScheme.update;
      this.calculateColorBuffers(isForceRecolor);
    }
  }

  setToGroupColorScheme() {
    this.isUseGroupColorScheme = true;
  }

  private static getColorIfDisabledSat_(objectData: BaseObject[], i: number): ColorInformation | null {
    let colors: ColorInformation | null = null;

    const sat = objectData[i] as DetailedSatellite;

    if (!settingsManager.isShowNotionalSats && objectData[i].isNotional()) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowVimpelSats && objectData[i].name?.startsWith('JSC Vimpel')) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowLeoSats && sat.apogee < 6000) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowStarlinkSats && objectData[i].name?.includes('STARLINK')) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowHeoSats && (sat.eccentricity >= 0.1 || (sat.apogee >= 6000 && sat.perigee < 6000))) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowMeoSats && sat.perigee <= 32000 && sat.perigee >= 6000) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowGeoSats && sat.perigee > 32000) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowPayloads && objectData[i].type === SpaceObjectType.PAYLOAD) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowRocketBodies && objectData[i].type === SpaceObjectType.ROCKET_BODY) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (!settingsManager.isShowDebris && objectData[i].type === SpaceObjectType.DEBRIS) {
      colors = {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }

    return colors;
  }

  private calcFirstAndLastDot_(isForceRecolor: boolean) {
    let firstDotToColor = 0;
    let lastDotToColor = settingsManager.dotsOnScreen;
    // If this is the same color scheme then we don't need to recolor everything

    if (!isForceRecolor && this.currentColorScheme === this.lastColorScheme) {
      if (this.lastDotColored < settingsManager.dotsOnScreen) {
        firstDotToColor = this.lastDotColored;
        lastDotToColor = firstDotToColor + (settingsManager.dotsPerColor ?? this.DOTS_PER_CALC);
        if (lastDotToColor > settingsManager.dotsOnScreen) {
          lastDotToColor = settingsManager.dotsOnScreen;
        }
      } else {
        lastDotToColor = settingsManager.dotsPerColor ?? this.DOTS_PER_CALC;
        lastDotToColor = Math.min(lastDotToColor, settingsManager.dotsOnScreen);
      }

      this.lastDotColored = lastDotToColor;
    } else {
      this.lastDotColored = 0;
    }

    return { firstDotToColor, lastDotToColor };
  }

  private calculateBufferDataVelocity_(
    firstDotToColor: number,
    lastDotToColor: number,
    satData: BaseObject[],
    satVel: Float32Array,
    params: { year: number; jday: number; orbitDensity: number[][]; orbitDensityMax: number },
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      satData[i].totalVelocity = Math.sqrt(satVel[i * 3] * satVel[i * 3] + satVel[i * 3 + 1] * satVel[i * 3 + 1] + satVel[i * 3 + 2] * satVel[i * 3 + 2]);
      this.calculateBufferData_(i, satData, params);
    }
  }

  private calculateBufferDataLoop_(
    firstDotToColor: number,
    lastDotToColor: number,
    satData: BaseObject[],
    params: { year: number; jday: number; orbitDensity: number[][]; orbitDensityMax: number },
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      this.calculateBufferData_(i, satData, params);
    }
  }

  private calculateBufferData_(i: number, satData: BaseObject[],
    params: { year: number; jday: number; orbitDensity: number[][]; orbitDensityMax: number }) {
    let colors = ColorSchemeManager.getColorIfDisabledSat_(satData, i);

    if (this.isUseGroupColorScheme) {
      colors ??= this.currentColorScheme?.updateGroup(satData[i], params) ?? this.currentColorSchemeUpdate(satData[i], params);
    } else {
      colors ??= this.currentColorScheme?.update(satData[i], params) ?? this.currentColorSchemeUpdate(satData[i], params);
    }

    if (!colors?.color) {
      throw new Error(`Color information is missing for satellite at index ${i}`);
    }

    this.colorData[i * 4] = colors.color[0]; // R
    this.colorData[i * 4 + 1] = colors.color[1]; // G
    this.colorData[i * 4 + 2] = colors.color[2]; // B
    this.colorData[i * 4 + 3] = colors.color[3]; // A
    this.pickableData[i] = colors.pickable;
  }

  private calculateParams_() {
    const params = {
      year: 0,
      jday: 0,
      orbitDensity: [] as number[][],
      orbitDensityMax: 0,
    };

    if (this.currentColorScheme) {
      const params_ = this.currentColorScheme.calculateParams();

      if (params_) {
        params.year = params_.year ?? params.year;
        params.jday = params_.jday ?? params.jday;
        params.orbitDensity = params_.orbitDensity ?? params.orbitDensity;
        params.orbitDensityMax = params_.orbitDensityMax ?? params.orbitDensityMax;
      }
    }

    return params;
  }

  private preValidateColorScheme_(isForceRecolor = false) {
    if (this.isUseGroupColorScheme) {
      const watchlistMenu = getEl('watchlist-menu');
      const watchlistTransform = watchlistMenu?.style.transform ?? '';

      if (
        keepTrackApi.getUiManager().searchManager.getCurrentSearch() === '' &&
        watchlistTransform !== 'translateX(0px)' &&
        !keepTrackApi.getPlugin(TimeMachine)?.isMenuButtonActive &&
        !(<TimeMachine>keepTrackApi.getPlugin(TimeMachine))?.isTimeMachineRunning
      ) {
        this.isUseGroupColorScheme = false;
      }
    }

    if (!isForceRecolor) {
      // Verify we are using a valid color scheme
      for (const colorSchemeInstanceKey in this.colorSchemeInstances) {
        if ((this.colorSchemeInstances[colorSchemeInstanceKey] as ColorScheme) === this.currentColorScheme) {
          return;
        }
      }

      this.setColorScheme(this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? this.colorSchemeInstances.DefaultColorScheme);
    }
  }

  /**
   * Sends the color buffer to the GPU
   */
  private sendColorBufferToGpu() {
    const gl = this.gl_;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    // And update it
    if (!this.colorBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.colorData, gl.DYNAMIC_DRAW);
      this.colorBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colorData);
    }

    // Next the buffer for which objects can be picked -- different than what color they are on the pickable frame (that is in the dots class)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickableBuffer);
    if (!this.pickableBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.pickableData, gl.DYNAMIC_DRAW);
      this.pickableBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pickableData);
    }
  }

  private setSelectedAndHoverBuffer_() {
    const selSat = keepTrackApi.getPlugin(SelectSatManager)?.selectedSat;

    if (selSat && selSat > -1) {
      // Selected satellites are always one color so forget whatever we just did
      this.colorData[selSat * 4] = settingsManager.selectedColor[0]; // R
      this.colorData[selSat * 4 + 1] = settingsManager.selectedColor[1]; // G
      this.colorData[selSat * 4 + 2] = settingsManager.selectedColor[2]; // B
      this.colorData[selSat * 4 + 3] = settingsManager.selectedColor[3]; // A
    }

    const hovSat = keepTrackApi.getHoverManager().hoveringSat;

    if (hovSat === -1 || hovSat === selSat) {
      return;
    }
    /*
     * Hover satellites are always one color so forget whatever we just did
     * We check this last so you can hover over the selected satellite
     */
    this.colorData[hovSat * 4] = settingsManager.hoverColor[0]; // R
    this.colorData[hovSat * 4 + 1] = settingsManager.hoverColor[1]; // G
    this.colorData[hovSat * 4 + 2] = settingsManager.hoverColor[2]; // B
    this.colorData[hovSat * 4 + 3] = settingsManager.hoverColor[3];
  }
}
