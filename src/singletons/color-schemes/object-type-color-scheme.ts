/* eslint-disable complexity */
import { ColorInformation, KeepTrackApiEvents, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { hideEl } from '@app/lib/get-el';
import { BaseObject, DetailedSatellite, SpaceObjectType, Star } from 'ootk';
import { CameraType } from '../camera';
import { MissileObject } from '../catalog-manager/MissileObject';
import { errorManagerInstance } from '../errorManager';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface ObjectTypeColorSchemeColorMap extends ColorSchemeColorMap {
  payload: rgbaArray;
  rocketBody: rgbaArray;
  debris: rgbaArray;
  notional: rgbaArray;
  unknown: rgbaArray;
  analyst: rgbaArray;
  missile: rgbaArray;
  missileInview: rgbaArray;
  pink: rgbaArray;
  inFOV: rgbaArray;
}

export class ObjectTypeColorScheme extends ColorScheme {
  readonly label = 'Object Type';
  readonly id = 'ObjectTypeColorScheme';
  static readonly id = 'ObjectTypeColorScheme';

  static readonly uniqueObjectTypeFlags = {
    payload: true,
    rocketBody: true,
    debris: true,
    notional: true,
    unknown: true,
    analyst: true,
    facility: true,
    sensor: true,
    missile: true,
    missileInview: true,
    pink: true,
    inFOV: true,
    marker: true,
  };

  static readonly uniqueColorTheme = {
    celestrakDefaultActivePayload: [0.0, 1.0, 0.0, 0.85] as rgbaArray,
    celestrakDefaultInactivePayload: [1.0, 0.5, 0.0, 1.0] as rgbaArray,
    celestrakDefaultRocketBody: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
    celestrakDefaultDebris: [0.5, 0.5, 0.5, 0.9] as rgbaArray,
    celestrakDefaultSensor: [0.0, 0.0, 1.0, 0.85] as rgbaArray,
    celestrakDefaultFov: [0.0, 0.0, 1.0, 0.85] as rgbaArray,
    celestrakDefaultUnknown: [1, 1, 1, 0.85] as rgbaArray,
  };

  constructor() {
    super(ObjectTypeColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...ObjectTypeColorScheme.uniqueObjectTypeFlags,
    };

    keepTrackApi.on(KeepTrackApiEvents.legendUpdated, () => {
      if (settingsManager.isDisableSensors) {
        this.objectTypeFlags.sensor = false;
        this.objectTypeFlags.inFOV = false;
        const sensorBox = document.querySelector('.legend-sensor-box')?.parentElement as HTMLElement;
        const inFOVBox = document.querySelector('.legend-inFOV-box')?.parentElement as HTMLElement;

        if (sensorBox) {
          hideEl(sensorBox);
        }

        if (inFOVBox) {
          hideEl(inFOVBox);
        }
      }

      if (settingsManager.isDisableLaunchSites) {
        this.objectTypeFlags.facility = false;
        const launchSiteBox = document.querySelector('.legend-facility-box')?.parentElement as HTMLElement;

        if (launchSiteBox) {
          hideEl(launchSiteBox);
        }
      }

      if (!settingsManager.plugins?.MissilePlugin) {
        this.objectTypeFlags.missile = false;
        const missileBox = document.querySelector('.legend-missile-box')?.parentElement as HTMLElement;

        if (missileBox) {
          hideEl(missileBox);
        }
      }
    });
  }

  update(obj: BaseObject): ColorInformation {
    /*
     * NOTE: The order of these checks is important
     * Grab reference to outside managers for their functions
     * @ts-expect-error
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (obj.isNotional()) {
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
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
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
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
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
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
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
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
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
      if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER && typeof sat.vmag === 'undefined') {
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
        color: settingsManager.colors.transparent ?? this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    return {
      color,
      pickable: Pickable.Yes,
    };
  }

  updateGroup(obj: BaseObject): ColorInformation {
    // Show Things in the Group
    if (keepTrackApi.getGroupsManager().selectedGroup?.hasObject(obj.id)) {
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
      color: settingsManager.colors.transparent ?? this.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }

  static readonly legendHtml = keepTrackApi.html`
  <ul id="legend-list-default-sensor">
    <li>
      <div class="Square-Box legend-payload-box"></div>
      Payload
    </li>
    <li>
      <div class="Square-Box legend-rocketBody-box"></div>
      Rocket Body
    </li>
    <li>
      <div class="Square-Box legend-debris-box"></div>
      Debris
    </li>
    <li>
      <div class="Square-Box legend-pink-box"></div>
      Special Sats
    </li>
    <li>
      <div class="Square-Box legend-inFOV-box"></div>
      Satellite In View
    </li>
    <li>
      <div class="Square-Box legend-missile-box"></div>
      Missile
    </li>
    <li>
      <div class="Square-Box legend-missileInview-box"></div>
      Missile In View
    </li>
    <li>
      <div class="Square-Box legend-sensor-box"></div>
      Sensor
    </li>
    <li>
      <div class="Square-Box legend-facility-box"></div>
      Launch Site
    </li>
  </ul>
  `.trim();
}
