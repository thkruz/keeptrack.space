/* eslint-disable complexity */
/* eslint-disable newline-before-return */
/* eslint-disable max-lines */
/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2016-2024 Theodore Kruczek
 * @Copyright (C) 2020-2024 Heather Kruczek
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
import { ColorInformation, Colors, Pickable, rgbaArray } from '../interfaces';
import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { CameraType } from './camera';
import { errorManagerInstance } from './errorManager';

import { waitForCruncher } from '@app/lib/waitForCruncher';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, Days, DetailedSatellite, SpaceObjectType, Star } from 'ootk';
import { getDayOfYear } from '../lib/transforms';
import { LegendManager } from '../static/legend-manager';
import { TimeMachine } from './../plugins/time-machine/time-machine';
import { MissileObject } from './catalog-manager/MissileObject';
import { PersistenceManager, StorageKey } from './persistence-manager';
import { TimeManager } from './time-manager';

export class ColorSchemeManager {
  private readonly DOTS_PER_CALC = 450;

  private gl_: WebGL2RenderingContext;

  colorBuffer: WebGLBuffer;
  colorBufferOneTime: boolean;
  // Colors are all 0-255
  colorData: Float32Array;
  colorTheme: Colors;
  currentColorScheme: ColorRuleSet;
  iSensor = 0;
  isReady = false;
  lastColorScheme: ColorRuleSet;
  lastDotColored = 0;
  objectTypeFlags = {
    payload: true,
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
    confidenceHi: true,
    confidenceMed: true,
    confidenceLow: true,
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
    densityPayload: true,
    densityHi: true,
    densityMed: true,
    densityLow: true,
    densityOther: true,
    starlink: true,
    starlinkNot: true,
  };

  pickableBuffer: WebGLBuffer;
  pickableBufferOneTime: boolean;
  pickableData: Int8Array;
  lastSavedColorSchemeName_ = '';

  // eslint-disable-next-line class-methods-use-this
  apogee(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return {
        color: [0.0, 0.0, 0.0, 0.0],
        pickable: Pickable.No,
      };
    }

    const sat = obj as DetailedSatellite;


    return {
      color: [1.0 - Math.min(sat.apogee / 45000, 1.0), Math.min(sat.apogee / 45000, 1.0), 0.0, 1.0],
      pickable: Pickable.Yes,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  starlink(obj: BaseObject): ColorInformation {
    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isMarker()) {
      return this.getMarkerColor_();
    }

    if (obj.isSensor() && (this.objectTypeFlags.sensor === false || keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM)) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    if (obj.isMissile()) {
      return this.missileColor_(obj as MissileObject);
    }

    if (obj.type === SpaceObjectType.PAYLOAD) {
      if (!settingsManager.isShowPayloads) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (obj.type === SpaceObjectType.ROCKET_BODY) {
      if (!settingsManager.isShowRocketBodies) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (obj.type === SpaceObjectType.DEBRIS) {
      if (!settingsManager.isShowDebris) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    }

    if (obj.name.toLocaleLowerCase().startsWith('starlink') && obj.type === SpaceObjectType.PAYLOAD) {
      if (this.objectTypeFlags.starlink === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: [0.0, 0.8, 0.0, 0.8],
        pickable: Pickable.Yes,
      };

    }

    if (this.objectTypeFlags.starlinkNot === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: [0.8, 0.0, 0.0, 0.8],
      pickable: Pickable.Yes,
    };

  }

  ageOfElset(
    obj: BaseObject,
    params: {
      jday: number;
      year: string;
    },
  ): ColorInformation {
    /*
     * Hover and Select code might not pass params, so we will handle that here
     * TODO: Hover and select code should be refactored to pass params
     */

    if (!params) {
      // errorManagerInstance.warn('No params passed to ageOfElset');
      const now = new Date();

      params = {
        jday: getDayOfYear(now),
        year: now.getUTCFullYear().toString().substr(2, 2),
      };
    }

    const jday = params?.jday || 0;
    const year = params?.year || '';

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }
    if (obj.isMissile()) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    let daysold: Days;
    const sat = obj as DetailedSatellite;

    if (sat.tle1.substr(18, 2) === year) {
      daysold = (jday - parseInt(sat.tle1.substr(20, 3))) as Days;
    } else {
      daysold = (jday + parseInt(year) * 365 - (parseInt(sat.tle1.substr(18, 2)) * 365 + parseInt(sat.tle1.substr(20, 3)))) as Days;
    }

    if (daysold < 5 && this.objectTypeFlags.age1) {
      return {
        color: this.colorTheme.age1,
        pickable: Pickable.Yes,
      };
    }

    if (daysold >= 5 && daysold < 10 && this.objectTypeFlags.age2) {
      return {
        color: this.colorTheme.age2,
        pickable: Pickable.Yes,
      };
    }
    if (daysold >= 10 && daysold < 15 && this.objectTypeFlags.age3) {
      return {
        color: this.colorTheme.age3,
        pickable: Pickable.Yes,
      };
    }
    if (daysold >= 15 && daysold < 20 && this.objectTypeFlags.age4) {
      return {
        color: this.colorTheme.age4,
        pickable: Pickable.Yes,
      };
    }
    if (daysold >= 20 && daysold < 25 && this.objectTypeFlags.age5) {
      return {
        color: this.colorTheme.age5,
        pickable: Pickable.Yes,
      };
    }
    if (daysold >= 25 && daysold < 30 && this.objectTypeFlags.age6) {
      return {
        color: this.colorTheme.age6,
        pickable: Pickable.Yes,
      };
    }
    if (daysold >= 30 && this.objectTypeFlags.age7) {
      return {
        color: this.colorTheme.age7,
        pickable: Pickable.Yes,
      };
    }

    // Deselected
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  calcColorBufsNextCruncher(): void {
    waitForCruncher({
      cruncher: keepTrackApi.getCatalogManager().satCruncher,
      cb: () => {
        keepTrackApi.getColorSchemeManager().calculateColorBuffers();
      },
      validationFunc: (m: PositionCruncherOutgoingMsg) => m.satInView?.length > 0,
      isSkipFirst: true,
      isRunCbOnFailure: true,
      maxRetries: 5,
    });
  }

  async calculateColorBuffers(isForceRecolor = false): Promise<void> {
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

      // Figure out if we are coloring all of the dots - assume yes initially
      const { firstDotToColor, lastDotToColor } = this.calcFirstAndLastDot_(isForceRecolor);

      // Note the colorscheme for next time
      this.lastColorScheme = this.currentColorScheme;

      if (this.lastSavedColorSchemeName_ !== this.currentColorScheme?.name) {
        PersistenceManager.getInstance().saveItem(StorageKey.COLOR_SCHEME, this.currentColorScheme?.name);
        this.lastSavedColorSchemeName_ = this.currentColorScheme?.name;
      }

      const dotsManagerInstance = keepTrackApi.getDotsManager();

      // We also need the velocity data if we are trying to colorizing that
      const satVel: Float32Array | null = this.currentColorScheme?.name === this.velocity.name ? dotsManagerInstance.getSatVel() : null;

      // Reset Which Sensor we are coloring before the loop begins
      if (firstDotToColor === 0) {
        this.iSensor = 0;
      }

      // Lets loop through all the satellites and color them in one by one
      const params = this.calculateParams_();

      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      // Velocity is a special case - we need to know the velocity of each satellite

      if (this.currentColorScheme?.name === this.velocity.name) {
        this.calculateBufferDataVelocity_(firstDotToColor, lastDotToColor, catalogManagerInstance.objectCache, satVel, params);
      } else {
        this.calculateBufferData_(firstDotToColor, lastDotToColor, catalogManagerInstance.objectCache, params);
      }

      // If we don't do this then everytime the color refreshes it will undo any effect being applied outside of this loop
      this.setSelectedAndHoverBuffer_(); // A

      this.sendColorBufferToGpu();
    } catch (e) {
      errorManagerInstance.debug(e);
    }
  }

  countries(obj: BaseObject): ColorInformation {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.type === SpaceObjectType.PAYLOAD) {
      if (!settingsManager.isShowPayloads) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (obj.type === SpaceObjectType.ROCKET_BODY) {
      if (!settingsManager.isShowRocketBodies) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (obj.type === SpaceObjectType.DEBRIS) {
      if (!settingsManager.isShowDebris) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    }

    return this.checkCountry_(obj);
  }

  default(obj: BaseObject): ColorInformation {
    /*
     * NOTE: The order of these checks is important
     * Grab reference to outside managers for their functions
     * @ts-expect-error
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (obj.isNotional() && (window as any).noNotional) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    // If we are in astronomy mode, hide everything that isn't a star (above)
    if (keepTrackApi.getMainCamera().cameraType === CameraType.ASTRONOMY) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isMarker()) {
      return this.getMarkerColor_();
    }

    if (obj.isSensor() && (this.objectTypeFlags.sensor === false || keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM)) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    if (obj.isMissile()) {
      return this.missileColor_(obj as MissileObject);
    }

    if (obj.type === SpaceObjectType.PAYLOAD) {
      if (!settingsManager.isShowPayloads) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (obj.type === SpaceObjectType.ROCKET_BODY) {
      if (!settingsManager.isShowRocketBodies) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (obj.type === SpaceObjectType.DEBRIS) {
      if (!settingsManager.isShowDebris) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    }

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const sat = obj as DetailedSatellite;

    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.PAYLOAD &&
        this.objectTypeFlags.payload === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.PAYLOAD && this.objectTypeFlags.payload === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        sat.type === SpaceObjectType.PAYLOAD &&
        this.objectTypeFlags.payload === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.ROCKET_BODY &&
        this.objectTypeFlags.rocketBody === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.ROCKET_BODY && this.objectTypeFlags.rocketBody === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        sat.type === SpaceObjectType.ROCKET_BODY &&
        this.objectTypeFlags.rocketBody === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.DEBRIS &&
        this.objectTypeFlags.debris === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.DEBRIS && this.objectTypeFlags.debris === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        sat.type === SpaceObjectType.DEBRIS &&
        this.objectTypeFlags.debris === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    // NOTE: Treat TBA Satellites as SPECIAL if SCC NUM is less than 70000 (ie a real satellite)
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN || sat.type === SpaceObjectType.NOTIONAL) &&
        this.objectTypeFlags.pink === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM &&
        (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN || sat.type === SpaceObjectType.NOTIONAL) &&
        this.objectTypeFlags.pink === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN || sat.type === SpaceObjectType.NOTIONAL) &&
        this.objectTypeFlags.pink === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (dotsManagerInstance.inViewData?.[sat.id] === 1 && this.objectTypeFlags.inFOV === false && keepTrackApi.getMainCamera().cameraType !== CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (dotsManagerInstance.inViewData?.[sat.id] === 1 && keepTrackApi.getMainCamera().cameraType !== CameraType.PLANETARIUM) {
      if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER && typeof sat.vmag === 'undefined') {
        // Intentional
      } else {
        return {
          color: this.colorTheme.inFOV,
          pickable: Pickable.Yes,
        };
      }
    }

    let color: [number, number, number, number];

    if (sat.country === 'ANALSAT') {
      color = this.colorTheme.analyst;
    } else if (sat.type === SpaceObjectType.PAYLOAD) {
      // Payload
      color = this.colorTheme.payload;
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      // Rocket Body
      color = this.colorTheme.rocketBody;
    } else if (sat.type === SpaceObjectType.DEBRIS) {
      // Debris
      color = this.colorTheme.debris;
    } else if (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN) {
      // Special Object
      color = this.colorTheme.pink;
    } else if (sat.type === SpaceObjectType.NOTIONAL) {
      color = this.colorTheme.notional;
    } else {
      color = this.colorTheme.unknown;
    }

    if (typeof color === 'undefined') {
      errorManagerInstance.info(`${sat.id.toString()} has no color!`);

      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    return {
      color,
      pickable: Pickable.Yes,
    };
  }

  geo(obj: BaseObject): ColorInformation {
    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    const sat = obj as DetailedSatellite;

    if (sat.perigee < 35000) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    if (keepTrackApi.getDotsManager().inViewData?.[sat.id] === 1 && this.objectTypeFlags.inFOV === true) {
      return {
        color: this.colorTheme.inFOV,
        pickable: Pickable.Yes,
      };
    }

    if (this.objectTypeFlags.satGEO === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: this.colorTheme.satGEO,
      pickable: Pickable.Yes,
    };

  }

  group(obj: BaseObject): ColorInformation {
    // Show Things in the Group
    if (keepTrackApi.getGroupsManager().selectedGroup.hasObject(obj.id)) {
      if (obj.isMissile()) {
        return this.missileColor_(obj as MissileObject);
      }

      let color: [number, number, number, number];

      switch (obj.type) {
        case SpaceObjectType.PAYLOAD:
          color = this.colorTheme.payload;
          break;
        case SpaceObjectType.ROCKET_BODY:
          color = this.colorTheme.rocketBody;
          break;
        case SpaceObjectType.DEBRIS:
          color = this.colorTheme.debris;
          break;
        case SpaceObjectType.SPECIAL:
          color = this.colorTheme.payload; // Assume Payload
          break;
        case SpaceObjectType.UNKNOWN:
          color = this.colorTheme.debris; // Assume Debris
          break;
        default: // Assume Payload
          color = this.colorTheme.payload;
          break;
      }

      if (keepTrackApi.getDotsManager().inViewData?.[obj.id] === 1) {
        color = this.colorTheme.inFOV;
      }

      return {
        color,
        pickable: Pickable.Yes,
      };
    }

    if (obj.isMarker()) {
      return this.getMarkerColor_();
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    // Hide Everything Else
    return {
      color: this.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }

  groupCountries(obj: BaseObject): ColorInformation {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (keepTrackApi.getGroupsManager().selectedGroup.hasObject(obj.id)) {
      return this.checkCountry_(obj);
    }

    if (obj.isMarker()) {
      return this.getMarkerColor_();
    }

    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  init(): void {
    const renderer = keepTrackApi.getRenderer();

    this.gl_ = renderer.gl;
    this.colorTheme = settingsManager.colors || {
      transparent: [0, 0, 0, 0] as rgbaArray,
      inFOV: [0.0, 1.0, 0.0, 1.0] as rgbaArray,
      deselected: [0.0, 0.0, 0.0, 0.0] as rgbaArray,
      sensor: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      payload: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rocketBody: [0.0, 1.0, 0.0, 1.0] as rgbaArray,
      debris: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
      pink: [1.0, 0.0, 1.0, 1.0] as rgbaArray,
      unknown: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
      starLow: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      starMed: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      starHi: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      satLEO: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      satGEO: [0.0, 1.0, 0.0, 1.0] as rgbaArray,
      satLow: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      satMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      satHi: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      satSmall: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      confidenceHi: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      confidenceMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      confidenceLow: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rcsSmall: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rcsMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rcsLarge: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rcsUnknown: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      age1: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      age2: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      age3: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      age4: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      age5: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      age6: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      age7: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryUS: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryPRC: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryCIS: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryOther: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityPayload: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityHi: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityLow: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityOther: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      analyst: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      facility: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      missile: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      missileInview: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      gradientAmt: 0.0,
      inFOVAlt: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      inGroup: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      length: 0,
      lostobjects: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      marker: [[0.0, 0.0, 0.0, 1.0]] as rgbaArray[],
      umbral: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      penumbral: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      sunlight100: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      sunlight80: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      sunlight60: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      sunlightInview: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      rcsXSmall: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      rcsXXSmall: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      version: '0',
      notional: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    };

    this.resetObjectTypeFlags();
    this.colorBuffer = renderer.gl.createBuffer() as WebGLBuffer;
    this.pickableBuffer = renderer.gl.createBuffer() as WebGLBuffer;

    // Create the color buffers as soon as the position cruncher is ready
    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherReady,
      cbName: 'colorSchemeManager',
      cb: (): void => {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();

        const cachedColorScheme = PersistenceManager.getInstance().getItem(StorageKey.COLOR_SCHEME);

        /*
         * We don't want to reload a cached group color scheme because we might not have a search
         * this can result in all dots turning black
         * if (cachedColorScheme && !(cachedColorScheme === this.group.name || cachedColorScheme === this.groupCountries.name)) {
         */
        if (cachedColorScheme) {
          LegendManager.change(cachedColorScheme);
          const possibleColorScheme = this[cachedColorScheme];

          this.currentColorScheme = possibleColorScheme || this.default;
          if (this.currentColorScheme?.name === this.sunlight.name) {
            catalogManagerInstance.satCruncher.postMessage({
              isSunlightView: true,
              typ: CruncerMessageTypes.SUNLIGHT_VIEW,
            });
          }
        }

        // Generate some buffers
        this.colorData = new Float32Array(catalogManagerInstance.numObjects * 4);
        this.pickableData = new Int8Array(catalogManagerInstance.numObjects);
        this.calculateColorBuffers(true).then(() => {
          this.isReady = true;
        });

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

  isDebrisOff(obj: BaseObject) {
    return obj.type === 3 && this.objectTypeFlags.debris === false;
  }

  isInView(obj: BaseObject) {
    return keepTrackApi.getDotsManager().inViewData?.[obj.id] === 1 && this.objectTypeFlags.inFOV === true;
  }

  isInViewOff(obj: BaseObject) {
    return keepTrackApi.getDotsManager().inViewData?.[obj.id] === 1 && this.objectTypeFlags.inFOV === false;
  }

  isPayloadOff(obj: BaseObject) {
    return obj.type === 1 && this.objectTypeFlags.payload === false;
  }

  isRocketBodyOff(obj: BaseObject) {
    return obj.type === 2 && this.objectTypeFlags.rocketBody === false;
  }

  leo(obj: BaseObject): ColorInformation {
    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    const sat = obj as DetailedSatellite;

    if (sat.apogee > 2000) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    if (this.isInView(sat)) {
      return {
        color: this.colorTheme.inFOV,
        pickable: Pickable.Yes,
      };
    }

    if (this.objectTypeFlags.satLEO === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: this.colorTheme.satLEO,
      pickable: Pickable.Yes,
    };

  }

  lostobjects(obj: BaseObject): ColorInformation {
    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }
    if (obj.isMissile()) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    const sat = obj as DetailedSatellite;
    const now = new Date();
    const jday = getDayOfYear(now);
    const year = now.getUTCFullYear().toString().substr(2, 2);
    let daysold: Days;
    const yearForTle = sat.tle1.substr(18, 2);

    if (yearForTle === year) {
      daysold = (jday - parseInt(sat.tle1.substr(20, 3))) as Days;
    } else if (parseInt(yearForTle) - parseInt(year) > 1) {
      // If the TLE year is more than 1 year behind the current year, then we assume it is lost
      daysold = 99999 as Days;
    } else {
      const isLeapYear = TimeManager.isLeapYear(keepTrackApi.getTimeManager().simulationTimeObj);
      const daysInYear = isLeapYear ? 366 : 365;

      daysold = (jday + daysInYear - parseInt(sat.tle1.substr(20, 3))) as Days;
    }
    // TODO: Readd this idea - (satellite.maxRng !== 0 && sat.perigee > satellite.maxRng)
    if ((sat.sccNum6 && (parseInt(sat.sccNum6) >= 70000 || parseInt(sat.sccNum6) < 0)) || daysold < settingsManager.daysUntilObjectLost) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }
    settingsManager.lostSatStr += settingsManager.lostSatStr === '' ? sat.sccNum6 : `,${sat.sccNum6}`;

    return {
      color: this.colorTheme.lostobjects,
      pickable: Pickable.Yes,
    };

  }

  neighbors(obj: BaseObject, params: any): ColorInformation {
    /*
     * NOSONAR
     * Hover and Select code might not pass params, so we will handle that here
     * TODO: Hover and select code should be refactored to pass params
     */
    if (!params) {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      params = {
        orbitDensity: catalogManagerInstance.orbitDensity,
        orbitDensityMax: catalogManagerInstance.orbitDensityMax,
      };
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }
    if (obj.isMissile()) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    const sat = obj as DetailedSatellite;

    if (sat.type === SpaceObjectType.PAYLOAD) {
      if (this.objectTypeFlags.densityPayload) {
        return {
          color: settingsManager.colors.densityPayload,
          pickable: Pickable.Yes,
        };
      }
      // Deselected
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };

    }

    const orbitDensity = params.orbitDensity[Math.round(sat.inclination)][Math.round(sat.period)];
    const density = orbitDensity / params.orbitDensityMax;

    if (this.objectTypeFlags.densityHi && density > 0.9) {
      return {
        color: settingsManager.colors.densityHi,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.densityMed && density > 0.55) {
      return {
        color: settingsManager.colors.densityMed,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.densityLow && density > 0.35) {
      return {
        color: settingsManager.colors.densityLow,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.densityOther) {
      return {
        color: settingsManager.colors.densityOther,
        pickable: Pickable.Yes,
      };
    }

    // Deselected
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  onlyFOV(obj: BaseObject): ColorInformation {
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    if (dotsManagerInstance.inViewData?.[obj.id] === 1) {
      return {
        color: this.colorTheme.inFOV,
        pickable: Pickable.Yes,
      };
    }

    return {
      color: this.colorTheme.transparent,
      pickable: Pickable.No,
    };

  }

  rcs(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite) {
      return { color: this.colorTheme.transparent, pickable: Pickable.No };
    }

    const sat = obj as DetailedSatellite;

    if (!sat.rcs) {
      return {
        color: this.colorTheme.rcsUnknown,
        pickable: Pickable.Yes,
      };
    }

    if (sat.rcs < 0.1 && this.objectTypeFlags.rcsSmall === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.rcs >= 0.1 && sat.rcs <= 1 && this.objectTypeFlags.rcsMed === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.rcs > 1 && this.objectTypeFlags.rcsLarge === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.rcs === null && this.objectTypeFlags.rcsUnknown === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.rcs < 0.01) {
      return {
        color: this.colorTheme.rcsXXSmall,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs >= 0.01 && sat.rcs <= 0.05) {
      return {
        color: this.colorTheme.rcsXSmall,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs >= 0.05 && sat.rcs <= 0.1) {
      return {
        color: this.colorTheme.rcsSmall,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs >= 0.1 && sat.rcs <= 1) {
      return {
        color: this.colorTheme.rcsMed,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs > 1) {
      return {
        color: this.colorTheme.rcsLarge,
        pickable: Pickable.Yes,
      };
    }
    // Unknowns
    return {
      color: this.colorTheme.rcsUnknown,
      pickable: Pickable.Yes,
    };
  }

  confidence(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }
    const sat = obj as DetailedSatellite;

    const confidenceScore = parseInt(sat.tle1.substring(64, 65)) || 0;
    let pickable: Pickable;
    let color: [number, number, number, number];

    if (confidenceScore >= 7 && this.objectTypeFlags.confidenceHi) {
      color = this.colorTheme.confidenceHi;
      pickable = Pickable.Yes;
    } else if (confidenceScore >= 4 && confidenceScore < 7 && this.objectTypeFlags.confidenceMed) {
      color = this.colorTheme.confidenceMed;
      pickable = Pickable.Yes;
    } else if (confidenceScore >= 0 && confidenceScore < 4 && this.objectTypeFlags.confidenceLow) {
      color = this.colorTheme.confidenceLow;
      pickable = Pickable.Yes;
    } else {
      color = this.colorTheme.transparent;
      pickable = Pickable.No;
    }

    return {
      color,
      pickable,
    };
  }

  reloadColors() {
    this.colorTheme = settingsManager.colors;
  }

  resetObjectTypeFlags() {
    this.objectTypeFlags.payload = true;
    this.objectTypeFlags.rocketBody = true;
    this.objectTypeFlags.debris = true;
    this.objectTypeFlags.facility = true;
    this.objectTypeFlags.sensor = true;
    this.objectTypeFlags.missile = true;
    this.objectTypeFlags.missileInview = true;
    this.objectTypeFlags.pink = true;
    this.objectTypeFlags.inFOV = true;
    this.objectTypeFlags.inViewAlt = true;
    this.objectTypeFlags.starLow = true;
    this.objectTypeFlags.starMed = true;
    this.objectTypeFlags.starHi = true;
    this.objectTypeFlags.satLEO = true;
    this.objectTypeFlags.satGEO = true;
    this.objectTypeFlags.satLow = true;
    this.objectTypeFlags.satMed = true;
    this.objectTypeFlags.satHi = true;
    this.objectTypeFlags.satSmall = true;
    this.objectTypeFlags.confidenceHi = true;
    this.objectTypeFlags.confidenceMed = true;
    this.objectTypeFlags.confidenceLow = true;
    this.objectTypeFlags.rcsSmall = true;
    this.objectTypeFlags.rcsMed = true;
    this.objectTypeFlags.rcsLarge = true;
    this.objectTypeFlags.rcsUnknown = true;
    this.objectTypeFlags.velocitySlow = true;
    this.objectTypeFlags.velocityMed = true;
    this.objectTypeFlags.velocityFast = true;
    this.objectTypeFlags.age1 = true;
    this.objectTypeFlags.age2 = true;
    this.objectTypeFlags.age3 = true;
    this.objectTypeFlags.age4 = true;
    this.objectTypeFlags.age5 = true;
    this.objectTypeFlags.age6 = true;
    this.objectTypeFlags.age7 = true;
    this.objectTypeFlags.starlink = true;
    this.objectTypeFlags.starlinkNot = true;
  }

  async setColorScheme(scheme: ((obj: BaseObject, params?: any) => ColorInformation) | null, isForceRecolor?: boolean) {
    try {
      const dotsManagerInstance = keepTrackApi.getDotsManager();

      scheme ??= this.default;
      const possibleColorScheme = this[scheme.name];

      this.currentColorScheme = possibleColorScheme ? possibleColorScheme : this.default;
      settingsManager.setCurrentColorScheme(this.currentColorScheme); // Deprecated
      this.calculateColorBuffers(isForceRecolor);
      dotsManagerInstance.buffers.color = this.colorBuffer;
      dotsManagerInstance.buffers.pickability = this.pickableBuffer;
    } catch (error) {
      // If we can't load the color scheme, just use the default
      console.debug(error);
      settingsManager.setCurrentColorScheme(this.default);
      this.currentColorScheme = this.default;
      this.calculateColorBuffers(isForceRecolor);
    }
  }

  setToGroupColorScheme() {
    if (this.currentColorScheme?.name === this.countries.name || this.currentColorScheme?.name === this.groupCountries.name) {
      this.setColorScheme(this.groupCountries);
    } else {
      this.setColorScheme(this.group);
    }
  }

  smallsats(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return { color: this.colorTheme.transparent, pickable: Pickable.No };
    }

    const sat = obj as DetailedSatellite;

    if (sat.isPayload() && this.objectTypeFlags.satSmall === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.rcs && sat.rcs < 0.1 && sat.type === SpaceObjectType.PAYLOAD) {
      return {
        color: this.colorTheme.satSmall,
        pickable: Pickable.Yes,
      };
    }

    return {
      color: this.colorTheme.transparent,
      pickable: Pickable.No,
    };

  }

  sunlight(obj: BaseObject): ColorInformation {
    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }
    if (obj.isMarker()) {
      return this.getMarkerColor_();
    }

    if (obj.isSensor()) {
      if (this.objectTypeFlags.sensor === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };

    }

    if (obj.isMissile()) {
      return this.missileColor_(obj as MissileObject);
    }
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    // In FOV
    if (dotsManagerInstance.inViewData?.[obj.id] === 1 && dotsManagerInstance.inSunData[obj.id] > 0 && this.objectTypeFlags.inFOV === true) {
      if (dotsManagerInstance.inSunData[obj.id] == 0) {
        if (this.objectTypeFlags.satLow === true) {
          return {
            color: this.colorTheme.umbral,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };

      }
      // TODO: Work out a system for vmag filtering
      return {
        color: this.colorTheme.sunlightInview,
        pickable: Pickable.Yes,
      };
    }

    // Not in FOV
    const sat = obj as DetailedSatellite;

    if (!dotsManagerInstance.inViewData?.[sat.id]) {
      if (dotsManagerInstance.inSunData[sat.id] == 2 && this.objectTypeFlags.satHi === true) {
        if (sat.vmag !== null) {
          if (sat.vmag < 3) {
            return {
              color: this.colorTheme.sunlight100,
              pickable: Pickable.Yes,
            };
          }
          if (sat.vmag <= 4.5) {
            return {
              color: this.colorTheme.sunlight80,
              pickable: Pickable.Yes,
            };
          }
          if (sat.vmag > 4.5) {
            return {
              color: this.colorTheme.sunlight60,
              pickable: Pickable.Yes,
            };
          }
        }
        if (sat.isPayload()) {
          return {
            color: this.colorTheme.sunlight80,
            pickable: Pickable.Yes,
          };
        }
        if (sat.isRocketBody()) {
          return {
            color: this.colorTheme.sunlight100,
            pickable: Pickable.Yes,
          };
        }
        if (sat.isDebris()) {
          return {
            color: this.colorTheme.sunlight60,
            pickable: Pickable.Yes,
          };
        }

        return {
          color: this.colorTheme.sunlight60,
          pickable: Pickable.Yes,
        };
      }

      if (dotsManagerInstance.inSunData[sat.id] == 1 && this.objectTypeFlags.satMed === true) {
        return {
          color: this.colorTheme.penumbral,
          pickable: Pickable.Yes,
        };
      }

      if (dotsManagerInstance.inSunData[sat.id] == 0 && this.objectTypeFlags.satLow === true) {
        return {
          color: this.colorTheme.umbral,
          pickable: Pickable.No,
        };
      }
      // The color was deselected
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    // The color was deselected
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  updateColorScheme(scheme: (obj: BaseObject, params?: any) => ColorInformation) {
    this.currentColorScheme = scheme;
  }

  velocity(obj: BaseObject): ColorInformation {
    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    // Sensors
    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    const dotsManagerInstance = keepTrackApi.getDotsManager();

    if (dotsManagerInstance.inViewData?.[obj.id] === 1) {
      if (this.objectTypeFlags.inViewAlt === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: this.colorTheme.inFOVAlt,
        pickable: Pickable.Yes,
      };

    }
    if (obj.totalVelocity > 5.5 && this.objectTypeFlags.velocityFast === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.totalVelocity >= 2.5 && obj.totalVelocity <= 5.5 && this.objectTypeFlags.velocityMed === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.totalVelocity < 2.5 && this.objectTypeFlags.velocitySlow === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: [1.0 - Math.min(obj.totalVelocity / 15, 1.0), Math.min(obj.totalVelocity / 15, 1.0), 0.0, 1.0],
      pickable: Pickable.Yes,
    };
  }

  private calcFirstAndLastDot_(isForceRecolor: boolean) {
    let firstDotToColor = 0;
    let lastDotToColor = settingsManager.dotsOnScreen;
    // If this is the same color scheme then we don't need to recolor everything

    if (!isForceRecolor && this.currentColorScheme === this.lastColorScheme) {
      if (this.lastDotColored < settingsManager.dotsOnScreen) {
        firstDotToColor = this.lastDotColored;
        lastDotToColor = firstDotToColor + (settingsManager.dotsPerColor || this.DOTS_PER_CALC);
        if (lastDotToColor > settingsManager.dotsOnScreen) {
          lastDotToColor = settingsManager.dotsOnScreen;
        }
      } else {
        lastDotToColor = settingsManager.dotsPerColor || this.DOTS_PER_CALC;
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
    satVel: any,
    params: { year: string; jday: number; orbitDensity: any[]; orbitDensityMax: number },
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      satData[i].totalVelocity = Math.sqrt(satVel[i * 3] * satVel[i * 3] + satVel[i * 3 + 1] * satVel[i * 3 + 1] + satVel[i * 3 + 2] * satVel[i * 3 + 2]);

      let colors = ColorSchemeManager.getColorIfDisabledSat_(satData, i);

      colors ??= this.currentColorScheme(satData[i], params);

      this.colorData[i * 4] = colors.color[0]; // R
      this.colorData[i * 4 + 1] = colors.color[1]; // G
      this.colorData[i * 4 + 2] = colors.color[2]; // B
      this.colorData[i * 4 + 3] = colors.color[3]; // A
      this.pickableData[i] = colors.pickable;
    }
  }

  private calculateBufferData_(
    firstDotToColor: number,
    lastDotToColor: number,
    satData: BaseObject[],
    params: { year: string; jday: number; orbitDensity: any[]; orbitDensityMax: number },
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      let colors = ColorSchemeManager.getColorIfDisabledSat_(satData, i);

      colors ??= this.currentColorScheme(satData[i], params);

      this.colorData[i * 4] = colors.color[0]; // R
      this.colorData[i * 4 + 1] = colors.color[1]; // G
      this.colorData[i * 4 + 2] = colors.color[2]; // B
      this.colorData[i * 4 + 3] = colors.color[3]; // A
      this.pickableData[i] = colors.pickable;
    }
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

    return colors;
  }

  private calculateParams_() {
    const params = {
      year: '',
      jday: 0,
      orbitDensity: [] as number[][],
      orbitDensityMax: 0,
    };

    if (this.currentColorScheme === this.ageOfElset) {
      const now = new Date();

      params.jday = getDayOfYear(now);
      params.year = now.getUTCFullYear().toString().substr(2, 2);
    }

    if (this.currentColorScheme === this.neighbors) {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      params.orbitDensity = catalogManagerInstance.orbitDensity;
      params.orbitDensityMax = catalogManagerInstance.orbitDensityMax;
    }

    return params;
  }

  private checkCountry_(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const sat = obj as DetailedSatellite;

    switch (sat.country) {
      case 'United States of America':
      case 'United States':
      case 'USA':
      case 'US':
        if (this.objectTypeFlags.countryUS === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryUS,
          pickable: Pickable.Yes,
        };

      case 'Russian Federation':
      case 'CIS':
      case 'RU':
      case 'SU':
      case 'Russia':
        if (this.objectTypeFlags.countryCIS === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryCIS,
          pickable: Pickable.Yes,
        };

      case 'China':
      case 'China, People\'s Reof':
      case 'Hong Kong Special Administrative Region, China':
      case 'China (Republic)':
      case 'PRC':
      case 'CN':
        if (this.objectTypeFlags.countryPRC === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryPRC,
          pickable: Pickable.Yes,
        };

      default:
        if (this.objectTypeFlags.countryOther === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryOther,
          pickable: Pickable.Yes,
        };

    }
  }

  private checkFacility_(sat: BaseObject): ColorInformation | null {
    // Let's see if we can determine color based on the object type
    switch (sat.type) {
      case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
      case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
      case SpaceObjectType.PAYLOAD_OWNER:
      case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
      case SpaceObjectType.PAYLOAD_MANUFACTURER:
        // If the facility flag is off then we don't want to show this
        if (!settingsManager.isShowAgencies || this.objectTypeFlags.facility === false || keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
          // Otherwise we want to show it
        }

        return {
          color: this.colorTheme.starHi,
          pickable: Pickable.Yes,
        };

      case SpaceObjectType.LAUNCH_AGENCY:
      case SpaceObjectType.LAUNCH_SITE:
      case SpaceObjectType.LAUNCH_POSITION:
      case SpaceObjectType.LAUNCH_FACILITY:
      case SpaceObjectType.CONTROL_FACILITY:
        // If the facility flag is off then we don't want to show this
        if (!settingsManager.isShowAgencies || this.objectTypeFlags.facility === false || keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
          // Otherwise we want to show it
        }

        return {
          color: this.colorTheme.facility,
          pickable: Pickable.Yes,
        };

      default: // Since it wasn't one of those continue on
    }

    return null;
  }

  private getMarkerColor_(): ColorInformation {
    return {
      // TODO: Use this for Santa Tracker
      color: [1, 0, 0, 1],
      marker: true,
      pickable: Pickable.No,
    };

  }

  private missileColor_(missile: MissileObject): ColorInformation {
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    if (dotsManagerInstance.inViewData?.[missile.id] === 0) {
      if (this.objectTypeFlags.missile === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: this.colorTheme.missile,
        pickable: Pickable.Yes,
      };

    }
    if (this.objectTypeFlags.missileInview === false || !missile.active) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: this.colorTheme.missileInview,
      pickable: Pickable.Yes,
    };


  }

  private preValidateColorScheme_(isForceRecolor = false) {
    if (this.currentColorScheme === this.group || this.currentColorScheme === this.groupCountries) {
      const watchlistMenu = getEl('watchlist-menu');
      const watchlistTransform = watchlistMenu?.style.transform || '';

      if (
        keepTrackApi.getUiManager().searchManager.getCurrentSearch() === '' &&
        watchlistTransform !== 'translateX(0px)' &&
        !keepTrackApi.getPlugin(TimeMachine)?.isMenuButtonActive &&
        !(<TimeMachine>keepTrackApi.getPlugin(TimeMachine))?.isTimeMachineRunning
      ) {
        if (this.currentColorScheme === this.groupCountries) {
          this.updateColorScheme(this.countries);
        } else {
          this.updateColorScheme(this.default);
        }
      }
    }

    if (!isForceRecolor) {
      switch (this.currentColorScheme) {
        case this.apogee:
        case this.starlink:
        case this.smallsats:
        case this.confidence:
        case this.rcs:
        case this.countries:
        case this.ageOfElset:
        case this.neighbors:
        case this.lostobjects:
        case this.leo:
        case this.geo:
        case this.group:
        case this.groupCountries:
        case this.default: // These don't change over time
        case this.onlyFOV:
        case this.sunlight:
        case this.velocity: // These change over time
          break;
        default:
          // Reset the scheme to the default
          this.updateColorScheme(this.default);
          break;
      }
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

    if (selSat > -1) {
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

  private starColor_(sat: Star): ColorInformation {
    if (!sat.vmag) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (sat.vmag >= 4.7 && this.objectTypeFlags.starLow) {
      return {
        color: this.colorTheme.starLow,
        pickable: Pickable.Yes,
      };
    } else if (sat.vmag >= 3.5 && sat.vmag < 4.7 && this.objectTypeFlags.starMed) {
      return {
        color: this.colorTheme.starMed,
        pickable: Pickable.Yes,
      };
    } else if (sat.vmag < 3.5 && this.objectTypeFlags.starHi) {
      return {
        color: this.colorTheme.starHi,
        pickable: Pickable.Yes,
      };
    }
    // Deselected

    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };

  }
}

export interface ColorSchemeColorMap {
  version: string;
  length: number;
  facility: [number, number, number, number];
  sensor: [number, number, number, number];
  missile: [number, number, number, number];
  missileInview: [number, number, number, number];
  pink: [number, number, number, number];
  inFOV: [number, number, number, number];
  starLow: [number, number, number, number];
  starMed: [number, number, number, number];
  starHi: [number, number, number, number];
  satLow: [number, number, number, number];
  satMed: [number, number, number, number];
  satHi: [number, number, number, number];
  confidenceLow: [number, number, number, number];
  confidenceMed: [number, number, number, number];
  confidenceHi: [number, number, number, number];
  rcsSmall: [number, number, number, number];
  rcsMed: [number, number, number, number];
  rcsLarge: [number, number, number, number];
  rcsUnknown: [number, number, number, number];
  satLEO: [number, number, number, number];
  satGEO: [number, number, number, number];
  countryUS: [number, number, number, number];
  countryCIS: [number, number, number, number];
  countryPRC: [number, number, number, number];
  countryOther: [number, number, number, number];
  age1: [number, number, number, number];
  age2: [number, number, number, number];
  age3: [number, number, number, number];
  age4: [number, number, number, number];
  age5: [number, number, number, number];
  age6: [number, number, number, number];
  age7: [number, number, number, number];
  satSmall: [number, number, number, number];
  densityPayload: [number, number, number, number];
  densityHi: [number, number, number, number];
  densityMed: [number, number, number, number];
  densityLow: [number, number, number, number];
  densityOther: [number, number, number, number];
  sunlight100: [number, number, number, number];
  sunlight80: [number, number, number, number];
  sunlight60: [number, number, number, number];
  marker: [number, number, number, number][];
  deselected: [number, number, number, number];
  inFOVAlt: [number, number, number, number];
  payload: [number, number, number, number];
  rocketBody: [number, number, number, number];
  debris: [number, number, number, number];
  notional: [number, number, number, number];
  unknown: [number, number, number, number];
  analyst: [number, number, number, number];
  transparent: [number, number, number, number];
  sunlightInview: [number, number, number, number];
  penumbral: [number, number, number, number];
  umbral: [number, number, number, number];
  gradientAmt: number;
  rcsXXSmall: [number, number, number, number];
  rcsXSmall: [number, number, number, number];
  lostobjects: [number, number, number, number];
  inGroup: [number, number, number, number];
  starlink: [number, number, number, number];
  starlinkNot: [number, number, number, number];
}
