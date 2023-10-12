/**
 * /*! /////////////////////////////////////////////////////////////////////////////
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

import { keepTrackContainer } from '../container';
import { CatalogManager, ColorInformation, ColorRuleSet, Colors, Pickable, rgbaArray, SatObject, Singletons, UiManager } from '../interfaces';
import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { SpaceObjectType } from '../lib/space-object-type';
import { CameraType } from './camera';
import { errorManagerInstance } from './errorManager';

import { getDayOfYear } from '../lib/transforms';
import { TimeMachine } from './../plugins/time-machine/time-machine';
import { DotsManager } from './dots-manager';
import { DrawManager } from './draw-manager';

export class StandardColorSchemeManager {
  private readonly DOTS_PER_CALC = 450;

  private gl_: WebGL2RenderingContext;

  public colorBuffer: WebGLBuffer;
  public colorBufferOneTime: boolean;
  // Colors are all 0-255
  public colorData: Float32Array;
  public colorTheme: Colors;
  public currentColorScheme = <ColorRuleSet>null;
  public iSensor = 0;
  public isReady = false;
  public lastColorScheme = <ColorRuleSet>null;
  public lastDotColored = 0;
  public objectTypeFlags = {
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
    densityPayload: true,
    densityHi: true,
    densityMed: true,
    densityLow: true,
    densityOther: true,
  };

  public pickableBuffer: WebGLBuffer;
  public pickableBufferOneTime: boolean;
  public pickableData: Int8Array;

  public static apogee(sat: SatObject): ColorInformation {
    return {
      color: [1.0 - Math.min(sat.apogee / 45000, 1.0), Math.min(sat.apogee / 45000, 1.0), 0.0, 1.0],
      pickable: Pickable.Yes,
    };
  }

  public ageOfElset(
    sat: SatObject,
    params: {
      jday: number;
      year: string;
    }
  ): ColorInformation {
    // Hover and Select code might not pass params, so we will handle that here
    // TODO: Hover and select code should be refactored to pass params

    if (!params) {
      errorManagerInstance.warn('No params passed to ageOfElset');
      const now = new Date();
      params = {
        jday: getDayOfYear(now),
        year: now.getUTCFullYear().toString().substr(2, 2),
      };
    }

    const jday = params?.jday || 0;
    const year = params?.year || '';

    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }
    if (sat.missile) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    let daysold;
    if (sat.TLE1.substr(18, 2) === year) {
      daysold = jday - parseInt(sat.TLE1.substr(20, 3));
    } else {
      daysold = jday + parseInt(year) * 365 - (parseInt(sat.TLE1.substr(18, 2)) * 365 + parseInt(sat.TLE1.substr(20, 3)));
    }

    if (daysold < 3 && this.objectTypeFlags.ageNew) {
      return {
        color: this.colorTheme.ageNew,
        pickable: Pickable.Yes,
      };
    }

    if (daysold >= 3 && daysold < 14 && this.objectTypeFlags.ageMed) {
      return {
        color: this.colorTheme.ageMed,
        pickable: Pickable.Yes,
      };
    }
    if (daysold >= 14 && daysold < 60 && this.objectTypeFlags.ageOld) {
      return {
        color: this.colorTheme.ageOld,
        pickable: Pickable.Yes,
      };
    }
    if (daysold >= 60 && this.objectTypeFlags.ageLost) {
      return {
        color: this.colorTheme.ageLost,
        pickable: Pickable.Yes,
      };
    }

    // Deselected
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  public async calculateColorBuffers(isForceRecolor?: boolean): Promise<void> {
    try {
      // These two variables only need to be set once, but we want to make sure they aren't called before the satellites
      // are loaded into catalogManagerInstance. Don't move the buffer data creation into the constructor!
      if (!this.pickableData || !this.colorData) return;

      // Revert colorscheme if search box is empty
      this.preValidateColorScheme_(isForceRecolor);

      // Figure out if we are coloring all of the dots - assume yes initially
      let { firstDotToColor, lastDotToColor } = this.calcFirstAndLastDot_(isForceRecolor);

      // Note the colorscheme for next time
      this.lastColorScheme = this.currentColorScheme;

      const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);

      // We also need the velocity data if we are trying to colorizing that
      let satVel = null;
      if (this.currentColorScheme === this.velocity) {
        satVel = this.currentColorScheme === this.velocity ? dotsManagerInstance.getSatVel() : null;
      }

      // Reset Which Sensor we are coloring before the loop begins
      if (firstDotToColor === 0) {
        this.iSensor = 0;
      }

      // Lets loop through all the satellites and color them in one by one
      let params = this.calculateParams_();

      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
      // Velocity is a special case - we need to know the velocity of each satellite
      if (this.currentColorScheme === this.velocity) {
        this.calculateBufferDataVelocity_(firstDotToColor, lastDotToColor, catalogManagerInstance.satData, satVel, params);
      } else {
        this.calculateBufferData_(firstDotToColor, lastDotToColor, catalogManagerInstance.satData, params);
      }

      // If we don't do this then everytime the color refreshes it will undo any effect being applied outside of this loop
      this.setSelectedAndHoverBuffer_(); // A

      this.sendColorBufferToGpu();
    } catch (e) {
      errorManagerInstance.debug(e);
    }
  }

  public countries(sat: SatObject): ColorInformation {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.type === SpaceObjectType.PAYLOAD) {
      if (!settingsManager.isShowPayloads) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      if (!settingsManager.isShowRocketBodies) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (sat.type === SpaceObjectType.DEBRIS) {
      if (!settingsManager.isShowDebris) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    }

    return this.checkCountry_(sat);
  }

  public default(sat: SatObject): ColorInformation {
    // NOTE: The order of these checks is important
    // Grab reference to outside managers for their functions
    if (sat.type === SpaceObjectType.NOTIONAL) {
      // @ts-ignore
      if (window.noNotional) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      } else {
        return {
          color: this.colorTheme.notional,
          pickable: Pickable.Yes,
        };
      }
    }

    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    // If we are in astronomy mode, hide everything that isn't a star (above)
    if (keepTrackApi.getMainCamera().cameraType === CameraType.ASTRONOMY) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.marker) return this.getMarkerColor_(sat);

    if (sat.isRadarData && !this.objectTypeFlags.radarData) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.isRadarData) {
      if (sat.missileComplex >= 0) {
        // || sat.missileObject >= 0
        return {
          color: this.colorTheme.radarDataMissile,
          pickable: Pickable.Yes,
        };
      }
      if (parseInt(sat.sccNum) >= 0) {
        return {
          color: this.colorTheme.radarDataSatellite,
          pickable: Pickable.Yes,
        };
      }
      return {
        color: this.colorTheme.radarData,
        pickable: Pickable.Yes,
      };
    }

    if (sat.static && (this.objectTypeFlags.sensor === false || keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM)) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    if (sat.missile) return this.missileColor_(sat);

    if (sat.type === SpaceObjectType.PAYLOAD) {
      if (!settingsManager.isShowPayloads) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      if (!settingsManager.isShowRocketBodies) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
    } else if (sat.type === SpaceObjectType.DEBRIS) {
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
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.PAYLOAD &&
        this.objectTypeFlags.payload === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.PAYLOAD && this.objectTypeFlags.payload === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER &&
        typeof sat.vmag == 'undefined' &&
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
        typeof sat.vmag == 'undefined' &&
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
        typeof sat.vmag == 'undefined' &&
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
        (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN) &&
        this.objectTypeFlags.pink === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM &&
        (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN) &&
        this.objectTypeFlags.pink === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER &&
        typeof sat.vmag == 'undefined' &&
        (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN) &&
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
      if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].type == SpaceObjectType.OBSERVER && typeof sat.vmag == 'undefined') {
        // Intentional
      } else {
        return {
          color: this.colorTheme.inFOV,
          pickable: Pickable.Yes,
        };
      }
    }

    let color: [number, number, number, number] = [0, 0, 0, 0];
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
    } else {
      color = this.colorTheme.unknown;
    }

    if (typeof color == 'undefined') {
      errorManagerInstance.info(sat.id.toString() + ' has no color!');
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }
    return {
      color: color,
      pickable: Pickable.Yes,
    };
  }

  public geo(sat: SatObject): ColorInformation {
    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    if (sat.perigee < 35000) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    } else {
      const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
      if (dotsManagerInstance.inViewData[sat.id] === 1 && this.objectTypeFlags.inFOV === true) {
        return {
          color: this.colorTheme.inFOV,
          pickable: Pickable.Yes,
        };
      } else {
        return {
          color: this.colorTheme.satGEO,
          pickable: Pickable.Yes,
        };
      }
    }
  }

  public group(sat: SatObject): ColorInformation {
    // Show Things in the Group
    if (sat.isInGroup) {
      if (sat.missile) return this.missileColor_(sat);

      let color: [number, number, number, number] = [0, 0, 0, 0];
      switch (sat.type) {
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
      return {
        color: color,
        pickable: Pickable.Yes,
      };
    }

    if (sat.marker) return this.getMarkerColor_(sat);

    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    // Hide Everything Else
    return {
      color: this.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }

  public groupCountries(sat: SatObject): ColorInformation {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (sat.isInGroup) {
      return this.checkCountry_(sat);
    }

    if (sat.marker) return this.getMarkerColor_(sat);

    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  public init(): void {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

    this.gl_ = drawManagerInstance.gl;
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
      rcsSmall: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rcsMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rcsLarge: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      rcsUnknown: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      ageNew: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      ageMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      ageOld: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      ageLost: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryUS: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryPRC: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryCIS: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      countryOther: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityPayload: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityHi: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityLow: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      densityOther: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      radarData: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      radarDataSatellite: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      radarDataMissile: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
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
      trusat: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      version: '0',
    };

    this.resetObjectTypeFlags();
    this.colorBuffer = drawManagerInstance.gl.createBuffer();
    this.pickableBuffer = drawManagerInstance.gl.createBuffer();

    // Create the color buffers as soon as the position cruncher is ready
    keepTrackApi.register({
      method: 'onCruncherReady',
      cbName: 'colorSchemeManager',
      cb: (): void => {
        const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

        // Generate some public buffers
        this.colorData = new Float32Array(catalogManagerInstance.numSats * 4);
        this.pickableData = new Int8Array(catalogManagerInstance.numSats);
        this.calculateColorBuffers().then(() => {
          this.isReady = true;
        });
      },
    });
  }

  public isDebrisOff(sat: SatObject) {
    return sat.type === 3 && this.objectTypeFlags.debris === false;
  }

  public isInViewOff(sat: SatObject) {
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    return dotsManagerInstance.inViewData[sat.id] === 1 && this.objectTypeFlags.inFOV === false;
  }

  public isPayloadOff(sat: SatObject) {
    return sat.type === 1 && this.objectTypeFlags.payload === false;
  }

  public isRocketBodyOff(sat: SatObject) {
    return sat.type === 2 && this.objectTypeFlags.rocketBody === false;
  }

  public leo(sat: SatObject): ColorInformation {
    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    var ap = sat.apogee;
    if (ap > 2000) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    } else {
      const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
      if (dotsManagerInstance.inViewData[sat.id] === 1 && this.objectTypeFlags.inFOV === true) {
        return {
          color: this.colorTheme.inFOV,
          pickable: Pickable.Yes,
        };
      } else {
        return {
          color: this.colorTheme.satLEO,
          pickable: Pickable.Yes,
        };
      }
    }
  }

  public lostobjects(sat: SatObject): ColorInformation {
    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }
    if (sat.missile) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    const now = new Date();
    const jday = getDayOfYear(now);
    const year = now.getUTCFullYear().toString().substr(2, 2);
    let daysold;
    if (sat.TLE1.substr(18, 2) === year) {
      daysold = jday - parseInt(sat.TLE1.substr(20, 3));
    } else {
      daysold = jday - parseInt(sat.TLE1.substr(20, 3)) + parseInt(sat.TLE1.substr(17, 2)) * 365;
    }
    // NOTE: This will need to be adjusted if Alpha-5 satellites become numbers instead of alphanumeric
    // TODO: Readd this idea - (satellite.obsmaxrange !== 0 && sat.perigee > satellite.obsmaxrange)
    if (parseInt(sat.sccNum) >= 70000 || daysold < settingsManager.daysUntilObjectLost) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    } else {
      settingsManager.lostSatStr += settingsManager.lostSatStr === '' ? sat.sccNum : `,${sat.sccNum}`;
      return {
        color: this.colorTheme.lostobjects,
        pickable: Pickable.Yes,
      };
    }
  }

  public neighbors(sat: SatObject, params: any): ColorInformation {
    // NOSONAR
    // Hover and Select code might not pass params, so we will handle that here
    // TODO: Hover and select code should be refactored to pass params
    if (!params) {
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

      params = {
        orbitDensity: catalogManagerInstance.orbitDensity,
        orbitDensityMax: catalogManagerInstance.orbitDensityMax,
      };
    }

    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }
    if (sat.missile) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    if (sat.type === SpaceObjectType.PAYLOAD) {
      if (this.objectTypeFlags.densityPayload) {
        return {
          color: settingsManager.colors.densityPayload,
          pickable: Pickable.Yes,
        };
      } else {
        // Deselected
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
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

  public onlyFOV(sat: SatObject): ColorInformation {
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    if (dotsManagerInstance.inViewData[sat.id] === 1) {
      return {
        color: this.colorTheme.inFOV,
        pickable: Pickable.Yes,
      };
    } else {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }
  }

  public rcs(sat: SatObject): ColorInformation {
    const rcs: number = parseFloat(sat.rcs);
    if (rcs < 0.1 && this.objectTypeFlags.rcsSmall === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (rcs >= 0.1 && rcs <= 1 && this.objectTypeFlags.rcsMed === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (rcs > 1 && this.objectTypeFlags.rcsLarge === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if ((typeof rcs === 'undefined' || isNaN(rcs) || rcs === null || typeof sat.rcs === 'undefined' || sat.rcs === 'N/A') && this.objectTypeFlags.rcsUnknown === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (rcs < 0.01) {
      return {
        color: this.colorTheme.rcsXXSmall,
        pickable: Pickable.Yes,
      };
    }
    if (rcs >= 0.01 && rcs <= 0.05) {
      return {
        color: this.colorTheme.rcsXSmall,
        pickable: Pickable.Yes,
      };
    }
    if (rcs >= 0.05 && rcs <= 0.1) {
      return {
        color: this.colorTheme.rcsSmall,
        pickable: Pickable.Yes,
      };
    }
    if (rcs >= 0.1 && rcs <= 1) {
      return {
        color: this.colorTheme.rcsMed,
        pickable: Pickable.Yes,
      };
    }
    if (rcs > 1) {
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

  public reloadColors() {
    this.colorTheme = settingsManager.colors;
  }

  public resetObjectTypeFlags() {
    this.objectTypeFlags.payload = true;
    this.objectTypeFlags.radarData = true;
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
    this.objectTypeFlags.rcsSmall = true;
    this.objectTypeFlags.rcsMed = true;
    this.objectTypeFlags.rcsLarge = true;
    this.objectTypeFlags.rcsUnknown = true;
    this.objectTypeFlags.velocitySlow = true;
    this.objectTypeFlags.velocityMed = true;
    this.objectTypeFlags.velocityFast = true;
    this.objectTypeFlags.ageNew = true;
    this.objectTypeFlags.ageMed = true;
    this.objectTypeFlags.ageOld = true;
    this.objectTypeFlags.ageLost = true;
  }

  public async setColorScheme(scheme: (sat: SatObject, params?: any) => ColorInformation, isForceRecolor?: boolean) {
    try {
      const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);

      settingsManager.setCurrentColorScheme(scheme); // Deprecated
      this.currentColorScheme = scheme;
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

  public setToGroupColorScheme() {
    if (this.currentColorScheme === this.countries || this.currentColorScheme === this.groupCountries) {
      this.setColorScheme(this.groupCountries);
    } else {
      this.setColorScheme(this.group);
    }
  }

  public smallsats(sat: SatObject): ColorInformation {
    if (sat.type === SpaceObjectType.PAYLOAD && this.objectTypeFlags.satSmall === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (parseFloat(sat.rcs) < 0.1 && sat.type === SpaceObjectType.PAYLOAD) {
      return {
        color: this.colorTheme.satSmall,
        pickable: Pickable.Yes,
      };
    } else {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }
  }

  public sunlight(sat: SatObject): ColorInformation {
    if (sat.static && (sat.type === SpaceObjectType.LAUNCH_FACILITY || sat.type === SpaceObjectType.CONTROL_FACILITY) && this.objectTypeFlags.facility === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    if (sat.marker) return this.getMarkerColor_(sat);

    if (sat.static && this.objectTypeFlags.sensor === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    if (sat.missile && dotsManagerInstance.inViewData[sat.id] === 0) {
      return {
        color: this.colorTheme.missile,
        pickable: Pickable.Yes,
      };
    }
    if (sat.missile && dotsManagerInstance.inViewData[sat.id] === 1) {
      return {
        color: this.colorTheme.missileInview,
        pickable: Pickable.Yes,
      };
    }

    if (dotsManagerInstance.inViewData[sat.id] === 1 && dotsManagerInstance.inSunData[sat.id] > 0 && this.objectTypeFlags.inFOV === true) {
      if (typeof sat.vmag == 'undefined') {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }
      return {
        color: this.colorTheme.sunlightInview,
        pickable: Pickable.Yes,
      };
    }

    if (dotsManagerInstance.inViewData[sat.id] === 0 && typeof sat.vmag !== 'undefined') {
      if (dotsManagerInstance.inSunData[sat.id] == 2 && this.objectTypeFlags.satHi === true) {
        // If vmag is undefined color it like a star
        if (sat.vmag < 3) {
          return {
            color: this.colorTheme.starHi,
            pickable: Pickable.Yes,
          };
        }
        if (sat.vmag <= 4.5) {
          return {
            color: this.colorTheme.starMed,
            pickable: Pickable.Yes,
          };
        }
        if (sat.vmag > 4.5) {
          return {
            color: this.colorTheme.starLow,
            pickable: Pickable.Yes,
          };
        }
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
          pickable: Pickable.Yes,
        };
      }
      // Not in the vmag database
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  public updateColorScheme(scheme: ColorRuleSet) {
    this.currentColorScheme = scheme;
  }

  public velocity(sat: SatObject): ColorInformation {
    if (sat.static && sat.type === SpaceObjectType.STAR) return this.starColor_(sat);

    const checkFacility = this.checkFacility_(sat);
    if (checkFacility) return checkFacility;

    // Sensors
    if (sat.static) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    if (dotsManagerInstance.inViewData[sat.id] === 1) {
      if (this.objectTypeFlags.inViewAlt === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      } else {
        return {
          color: this.colorTheme.inFOVAlt,
          pickable: Pickable.Yes,
        };
      }
    }
    if (sat.velocity.total > 5.5 && this.objectTypeFlags.velocityFast === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.velocity.total >= 2.5 && sat.velocity.total <= 5.5 && this.objectTypeFlags.velocityMed === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (sat.velocity.total < 2.5 && this.objectTypeFlags.velocitySlow === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    /*
    NOTE: Removed variable declaration to reduce garbage collection

    const gradientAmt = Math.min(sat.velocity.total / 15, 1.0);
    const velGradient = [1.0 - gradientAmt, gradientAmt, 0.0, 1.0];
    return {
      color: velGradient
      pickable: Pickable.Yes,
    };
    */
    return {
      color: [1.0 - Math.min(sat.velocity.total / 15, 1.0), Math.min(sat.velocity.total / 15, 1.0), 0.0, 1.0],
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
        if (lastDotToColor > settingsManager.dotsOnScreen) lastDotToColor = settingsManager.dotsOnScreen;
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
    satData: SatObject[],
    satVel: any,
    params: { year: string; jday: number; orbitDensity: any[]; orbitDensityMax: number }
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      let colors: ColorInformation = null;
      satData[i].velocity.total = Math.sqrt(satVel[i * 3] * satVel[i * 3] + satVel[i * 3 + 1] * satVel[i * 3 + 1] + satVel[i * 3 + 2] * satVel[i * 3 + 2]);

      if (!settingsManager.isShowLeoSats && satData[i].apogee < 6000) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
      if (!settingsManager.isShowHeoSats && (satData[i].eccentricity >= 0.1 || (satData[i].apogee >= 6000 && satData[i].perigee < 6000))) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
      if (!settingsManager.isShowMeoSats && satData[i].perigee <= 32000 && satData[i].perigee >= 6000) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
      if (!settingsManager.isShowGeoSats && satData[i].perigee > 32000) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
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
    satData: SatObject[],
    params: { year: string; jday: number; orbitDensity: any[]; orbitDensityMax: number }
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      let colors: ColorInformation = null;
      if (!settingsManager.isShowLeoSats && satData[i].apogee < 6000) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
      if (!settingsManager.isShowHeoSats && (satData[i].eccentricity >= 0.1 || (satData[i].apogee >= 6000 && satData[i].perigee < 6000))) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
      if (!settingsManager.isShowMeoSats && satData[i].perigee <= 32000 && satData[i].perigee >= 6000) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
      if (!settingsManager.isShowGeoSats && satData[i].perigee > 32000) {
        colors = {
          color: [0, 0, 0, 0],
          pickable: Pickable.No,
        };
      }
      colors ??= this.currentColorScheme(satData[i], params);

      this.colorData[i * 4] = colors.color[0]; // R
      this.colorData[i * 4 + 1] = colors.color[1]; // G
      this.colorData[i * 4 + 2] = colors.color[2]; // B
      this.colorData[i * 4 + 3] = colors.color[3]; // A
      this.pickableData[i] = colors.pickable;
    }
  }

  private calculateParams_() {
    let params = {
      year: '',
      jday: 0,
      orbitDensity: [],
      orbitDensityMax: 0,
    };

    if (this.currentColorScheme === this.ageOfElset) {
      let now = new Date();
      params.jday = getDayOfYear(now);
      params.year = now.getUTCFullYear().toString().substr(2, 2);
    }

    if (this.currentColorScheme === this.neighbors) {
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

      params.orbitDensity = catalogManagerInstance.orbitDensity;
      params.orbitDensityMax = catalogManagerInstance.orbitDensityMax;
    }
    return params;
  }

  private checkCountry_(sat: SatObject): ColorInformation {
    switch (sat.country) {
      case 'United States of America':
      case 'United States':
      case 'US':
        if (this.objectTypeFlags.countryUS === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        } else {
          return {
            color: this.colorTheme.countryUS,
            pickable: Pickable.Yes,
          };
        }
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
        } else {
          return {
            color: this.colorTheme.countryCIS,
            pickable: Pickable.Yes,
          };
        }
      case 'China':
      case `China, People's Republic of`:
      case `Hong Kong Special Administrative Region, China`:
      case 'China (Republic)':
      case 'PRC':
      case 'CN':
        if (this.objectTypeFlags.countryPRC === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        } else {
          return {
            color: this.colorTheme.countryPRC,
            pickable: Pickable.Yes,
          };
        }
      default:
        if (this.objectTypeFlags.countryOther === false || !sat.TLE1) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }
    }
    return {
      color: this.colorTheme.countryOther,
      pickable: Pickable.Yes,
    };
  }

  private checkFacility_(sat: SatObject): ColorInformation | null {
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
        } else {
          return {
            color: this.colorTheme.starHi,
            pickable: Pickable.Yes,
          };
        }
      case SpaceObjectType.LAUNCH_AGENCY:
      case SpaceObjectType.LAUNCH_SITE:
      case SpaceObjectType.LAUNCH_POSITION:
        // If the facility flag is off then we don't want to show this
        if (!settingsManager.isShowAgencies || this.objectTypeFlags.facility === false || keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
          // Otherwise we want to show it
        } else {
          return {
            color: this.colorTheme.facility,
            pickable: Pickable.Yes,
          };
        }
      default: // Since it wasn't one of those continue on
    }
    return null;
  }

  private getMarkerColor_(sat: SatObject): ColorInformation {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    // This doesn't apply to sat overfly mode
    if (!settingsManager.isSatOverflyModeOn) {
      // But it doesn't work if we don't have marker info from the sensor
      if (typeof this.iSensor !== 'undefined' && typeof catalogManagerInstance.sensorMarkerArray !== 'undefined') {
        // if we have sensor markers enabled then we need to rotate colors as the marker numbers increase
        if (sat.id === catalogManagerInstance.sensorMarkerArray[this.iSensor + 1]) {
          this.iSensor++;
        }
      }
    }
    if (this.iSensor >= 0) {
      return {
        color: this.colorTheme.marker[this.iSensor],
        marker: true,
        pickable: Pickable.No,
      };
    } else {
      return {
        // Failsafe
        color: this.colorTheme.marker[0],
        marker: true,
        pickable: Pickable.No,
      };
    }
  }

  private missileColor_(sat: SatObject): ColorInformation {
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);

    if (dotsManagerInstance.inViewData?.[sat.id] === 0) {
      if (this.objectTypeFlags.missile === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      } else {
        return {
          color: this.colorTheme.missile,
          pickable: Pickable.Yes,
        };
      }
    } else {
      if (this.objectTypeFlags.missileInview === false || !sat.active) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      } else {
        return {
          color: this.colorTheme.missileInview,
          pickable: Pickable.Yes,
        };
      }
    }
  }

  private preValidateColorScheme_(isForceRecolor: boolean = false) {
    if (this.currentColorScheme === this.group || this.currentColorScheme === this.groupCountries) {
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

      const watchlistMenu = getEl('watchlist-menu');
      const watchlistTransform = watchlistMenu?.style.transform || '';

      if (
        uiManagerInstance.searchManager.getCurrentSearch() === '' &&
        watchlistTransform !== 'translateX(0px)' &&
        !keepTrackApi.getPlugin(TimeMachine).isMenuButtonEnabled &&
        !(<TimeMachine>keepTrackApi.getPlugin(TimeMachine)).isTimeMachineRunning
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
        case StandardColorSchemeManager.apogee:
        case this.smallsats:
        case this.rcs:
        case this.countries:
        case this.ageOfElset:
        case this.neighbors:
        case this.lostobjects:
        case this.leo:
        case this.geo:
        case this.group:
        case this.groupCountries:
          // These don't change over time
          return;
        case this.default:
        case this.onlyFOV:
        case this.sunlight:
        case this.velocity:
          // These change over time
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
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    const selSat = catalogManagerInstance.selectedSat;
    // Selected satellites are always one color so forget whatever we just did
    this.colorData[selSat * 4] = settingsManager.selectedColor[0]; // R
    this.colorData[selSat * 4 + 1] = settingsManager.selectedColor[1]; // G
    this.colorData[selSat * 4 + 2] = settingsManager.selectedColor[2]; // B
    this.colorData[selSat * 4 + 3] = settingsManager.selectedColor[3]; // A

    const hovSat = keepTrackApi.getHoverManager().hoveringSat;
    // Hover satellites are always one color so forget whatever we just did
    // We check this last so you can hover over the selected satellite
    this.colorData[hovSat * 4] = settingsManager.hoverColor[0]; // R
    this.colorData[hovSat * 4 + 1] = settingsManager.hoverColor[1]; // G
    this.colorData[hovSat * 4 + 2] = settingsManager.hoverColor[2]; // B
    this.colorData[hovSat * 4 + 3] = settingsManager.hoverColor[3];
  }

  private starColor_(sat: SatObject): ColorInformation {
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
    } else {
      // Deselected
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
  }
}
