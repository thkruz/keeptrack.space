import { DensityBin } from '@app/app/data/catalog-manager';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { BaseObject, Star } from '@app/engine/ootk/src/objects';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { SpaceObjectType } from '@ootk/src/main';
import { CameraType } from '../../camera/camera';
import { ServiceLocator } from '@app/engine/core/service-locator';

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
  rcsXXSmall: [number, number, number, number];
  rcsXSmall: [number, number, number, number];
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
      ...this.colorTheme, ...uniqueColorTheme,
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
    if (!ServiceLocator.getGroupsManager().selectedGroup.hasObject(obj.id)) {
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
      if (Object.prototype.hasOwnProperty.call(this.objectTypeFlags, key)) {
        this.objectTypeFlags[key] = true;
      }
    }
  }

  // This is called when the color scheme is selected
  onSelected(): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    catalogManagerInstance.satCruncher.postMessage({
      isSunlightView: false,
      typ: CruncerMessageTypes.SUNLIGHT_VIEW,
    });
  }

  calculateParams(): {
    year?: number,
    jday?: number,
    orbitDensity?: DensityBin[],
    orbitDensityMax?: number,
    orbitalPlaneDensity?: number[][],
    orbitalPlaneDensityMax?: number,
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
        // If the facility flag is off then we don't want to show this
        if (!settingsManager.isShowAgencies || this.objectTypeFlags.facility === false || ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM) {
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
