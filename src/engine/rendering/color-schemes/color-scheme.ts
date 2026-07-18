import { DensityBin } from '@app/app/data/catalog-manager';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Planet } from '@app/app/objects/planet';
import { CameraType } from '@app/engine/camera/camera-type';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { BaseObject, Satellite, Star } from '@app/engine/ootk/src/objects';
import { SpaceObjectType } from '@ootk/src/main';
import { errorManagerInstance } from '../../utils/errorManager';

export interface TypeFlagFilterConfig {
  types: SpaceObjectType | SpaceObjectType[];
  flagKey: string;
  extraCondition?: (sat: Satellite) => boolean;
}

export interface ColorSchemeColorMap {
  version: string;
  length: number;
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
  countryUS: [number, number, number, number];
  countryCIS: [number, number, number, number];
  countryPRC: [number, number, number, number];
  countryOther: [number, number, number, number];
  satSmall: [number, number, number, number];
  densityPayload: [number, number, number, number];
  spatialDensityHi: [number, number, number, number];
  spatialDensityMed: [number, number, number, number];
  spatialDensityLow: [number, number, number, number];
  spatialDensityOther: [number, number, number, number];
  orbitalPlaneDensityHi?: rgbaArray;
  orbitalPlaneDensityMed?: rgbaArray;
  orbitalPlaneDensityLow?: rgbaArray;
  orbitalPlaneDensityOther?: rgbaArray;
  sunlight100: [number, number, number, number];
  sunlight80: [number, number, number, number];
  sunlight60: [number, number, number, number];
  deselected: [number, number, number, number];
  inFOVAlt: [number, number, number, number];
  transparent: [number, number, number, number];
  sunlightInview: [number, number, number, number];
  penumbral: [number, number, number, number];
  umbral: [number, number, number, number];
  gradientAmt: number;
  rcsXXXSmall: [number, number, number, number];
  rcsXXSmall: [number, number, number, number];
  rcsXSmall: [number, number, number, number];
  rcsXLarge: [number, number, number, number];
  lostobjects: [number, number, number, number];
  inGroup: [number, number, number, number];
  starlink: [number, number, number, number];
  starlinkNot: [number, number, number, number];
  facility: rgbaArray;
  sensor: rgbaArray;
  sensorAlt: rgbaArray;
  marker: rgbaArray[];
  inViewAlt?: rgbaArray;
  inFOV: rgbaArray;
}

export interface ColorSchemeParams {
  year: number;
  jday: number;
  orbitDensity: DensityBin[];
  orbitDensityMax: number;
  orbitalPlaneDensity: number[][];
  orbitalPlaneDensityMax: number;
}

export abstract class ColorScheme {
  colorTheme: Record<string, rgbaArray> = {};
  objectTypeFlags: Record<string, boolean>;
  static readonly uniqueColorTheme: Record<string, rgbaArray>;
  static readonly uniqueObjectTypeFlags: Record<string, boolean>;
  layersHtml: string = '';
  /** This is used in the UI */
  readonly label: string = 'Default Color Scheme';
  /** This is used in code for matching. Must be the class name. */
  readonly id: string = 'ColorScheme';
  /** This is used in code for matching. Must be the class name. */
  static readonly id: string = 'ColorScheme';
  isOptionInColorMenu: boolean = true;
  isOptionInRmbMenu: boolean = true;

  constructor(uniqueColorTheme: Record<string, rgbaArray>) {
    // Ensure that settingsManager.colors are all defined
    for (const color in uniqueColorTheme) {
      if (!settingsManager.colors[color]) {
        settingsManager.colors[color] = uniqueColorTheme[color];
      }
    }

    this.colorTheme = {
      ...this.colorTheme,
      ...uniqueColorTheme,
    };

    for (const color in settingsManager.colors) {
      // If it is an array then it is a color
      if (Array.isArray(settingsManager.colors[color])) {
        this.colorTheme[color] = settingsManager.colors[color] as rgbaArray;
      }
    }

    this.objectTypeFlags = {
      facility: true,
      missile: true,
      missileInview: true,
      starLow: true,
      starMed: true,
      starHi: true,
    };
  }

  abstract update(obj: BaseObject, params?: ColorSchemeParams): ColorInformation;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateGroup(obj: BaseObject, _params?): ColorInformation {
    if (!ServiceLocator.getGroupsManager().selectedGroup?.hasObject(obj.id)) {
      // Hide Everything Else
      return {
        color: settingsManager.colors.transparent ?? this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    return this.update(obj, _params);
  }

  resetObjectTypeFlags() {
    for (const key in this.objectTypeFlags) {
      if (Object.hasOwn(this.objectTypeFlags, key)) {
        this.objectTypeFlags[key] = true;
      }
    }
  }

  // This is called when the color scheme is selected
  onSelected(): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    catalogManagerInstance.satCruncherThread.sendSunlightViewToggle(false);
  }

  calculateParams(): {
    year?: number;
    jday?: number;
    orbitDensity?: DensityBin[];
    orbitDensityMax?: number;
    orbitalPlaneDensity?: number[][];
    orbitalPlaneDensityMax?: number;
  } | null {
    return null;
  }

  checkFacility_(sat: BaseObject): ColorInformation | null {
    // Let's see if we can determine color based on the object type
    switch (sat.type) {
      case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
      case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
      case SpaceObjectType.PAYLOAD_OWNER:
      case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
      case SpaceObjectType.PAYLOAD_MANUFACTURER:
      case SpaceObjectType.LAUNCH_AGENCY:
      case SpaceObjectType.CONTROL_FACILITY:
        // Agencies/operators are no longer drawn on the globe. They are not
        // loaded into the catalog (see StringExtractor.controlSiteTypeFilter),
        // but keep them hidden defensively in case the data is referenced.
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };

      case SpaceObjectType.LAUNCH_SITE:
      case SpaceObjectType.LAUNCH_POSITION:
      case SpaceObjectType.LAUNCH_FACILITY:
        // If the facility flag is off then we don't want to show this
        if (settingsManager.isDisableLaunchSites || this.objectTypeFlags.facility === false || ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM) {
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

  getMarkerColor_(): ColorInformation {
    return {
      // TODO: Use this for Santa Tracker
      color: [1, 0, 0, 1],
      marker: true,
      pickable: Pickable.No,
    };
  }

  earlyExitColor_(obj: BaseObject): ColorInformation | null {
    if (obj instanceof Planet) {
      return {
        color: obj.color,
        pickable: Pickable.Yes,
      };
    }

    const oemSource = (obj as OemSatellite).source ?? '';

    if (oemSource === 'OEM Import' || oemSource === 'KeepTrack') {
      return {
        color: (obj as OemSatellite).dotColor,
        pickable: Pickable.Yes,
      };
    }

    if (settingsManager.maxZoomDistance > 2e6) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (obj.isNotional()) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    if (ServiceLocator.getMainCamera().cameraType === CameraType.ASTRONOMY) {
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

    return null;
  }

  checkSensorVisibility_(obj: BaseObject, sensorFlagKey: string, sensorColorKey: string): ColorInformation | null {
    if (
      obj.isSensor() &&
      (settingsManager.isDisableSensors || this.objectTypeFlags[sensorFlagKey] === false || ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.isSensor()) {
      return {
        color: this.colorTheme[sensorColorKey],
        pickable: Pickable.Yes,
      };
    }

    return null;
  }

  checkSettingsVisibility_(obj: BaseObject): ColorInformation | null {
    if (obj.type === SpaceObjectType.PAYLOAD && !settingsManager.isShowPayloads) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.type === SpaceObjectType.ROCKET_BODY && !settingsManager.isShowRocketBodies) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.type === SpaceObjectType.DEBRIS && !settingsManager.isShowDebris) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return null;
  }

  isTypeFlagFiltered_(sat: Satellite, config: TypeFlagFilterConfig): boolean {
    if (this.objectTypeFlags[config.flagKey] !== false) {
      return false;
    }

    const types = Array.isArray(config.types) ? config.types : [config.types];
    const typeMatch = types.includes(sat.type) && (config.extraCondition?.(sat) ?? true);

    if (!typeMatch) {
      return false;
    }

    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const notInView = !dotsManagerInstance.inViewData || dotsManagerInstance.inViewData[sat.id] === 0;

    if (notInView) {
      return true;
    }

    if (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      return true;
    }

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER && typeof sat.vmag === 'undefined') {
      return true;
    }

    return false;
  }

  checkInFovVisibility_(sat: Satellite, fovFlagKey: string, fovColorKey: string): ColorInformation | null {
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const camera = ServiceLocator.getMainCamera();

    if (dotsManagerInstance.inViewData?.[sat.id] === 1 && camera.cameraType !== CameraType.PLANETARIUM) {
      if (this.objectTypeFlags[fovFlagKey] === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const sensorManagerInstance = ServiceLocator.getSensorManager();

      if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER && typeof sat.vmag === 'undefined') {
        return null;
      }

      return {
        color: this.colorTheme[fovColorKey],
        pickable: Pickable.Yes,
      };
    }

    return null;
  }

  undefinedColorFallback_(satId: number, logLevel: 'info' | 'debug' = 'info'): ColorInformation {
    errorManagerInstance[logLevel](`${satId.toString()} has no color!`);

    return {
      color: settingsManager.colors.transparent ?? this.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }

  missileColor_(missile: MissileObject): ColorInformation {
    const dotsManagerInstance = ServiceLocator.getDotsManager();

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

  starColor_(sat: Star): ColorInformation {
    if (!sat.vmag) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    // Use color temperature when available for realistic star colors
    if (sat.colorTemp) {
      const rgba = ColorScheme.colorTempToRgba_(sat.colorTemp, sat.vmag);

      // Check magnitude-based visibility flags
      if (sat.vmag >= 4.7 && !this.objectTypeFlags.starLow) {
        return { color: this.colorTheme.deselected, pickable: Pickable.No };
      }
      if (sat.vmag >= 3.5 && sat.vmag < 4.7 && !this.objectTypeFlags.starMed) {
        return { color: this.colorTheme.deselected, pickable: Pickable.No };
      }
      if (sat.vmag < 3.5 && !this.objectTypeFlags.starHi) {
        return { color: this.colorTheme.deselected, pickable: Pickable.No };
      }

      return { color: rgba, pickable: Pickable.Yes };
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

    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  /**
   * Convert color temperature to RGBA, with brightness scaled by visual magnitude.
   */
  private static colorTempToRgba_(kelvin: number, vmag: number): [number, number, number, number] {
    const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;

    let r: number;
    let g: number;
    let b: number;

    if (temp <= 66) {
      r = 255;
    } else {
      r = Math.max(0, Math.min(255, 329.698727446 * (temp - 60) ** -0.1332047592));
    }

    if (temp <= 66) {
      g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
    } else {
      g = Math.max(0, Math.min(255, 288.1221695283 * (temp - 60) ** -0.0755148492));
    }

    if (temp >= 66) {
      b = 255;
    } else if (temp <= 19) {
      b = 0;
    } else {
      b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    }

    // Each magnitude step reduces brightness by ~35% for higher contrast
    const mag = typeof vmag === 'number' ? vmag : 3.0;
    const brightness = Math.max(0.08, Math.min(1.0, 0.65 ** Math.max(0, mag + 1.0)));

    return [r / 255, g / 255, b / 255, brightness];
  }
}
