/* eslint-disable complexity */
import { ColorInformation, KeepTrackApiEvents, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { hideEl } from '@app/lib/get-el';
import { BaseObject, DetailedSatellite, PayloadStatus, SpaceObjectType, Star } from 'ootk';
import { CameraType } from '../camera';
import { MissileObject } from '../catalog-manager/MissileObject';
import { errorManagerInstance } from '../errorManager';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface CelestrakColorSchemeColorMap extends ColorSchemeColorMap {
  celestrakDefaultRocketBody: rgbaArray;
  celestrakDefaultDebris: rgbaArray;
  celestrakDefaultActivePayload: rgbaArray;
  celestrakDefaultInactivePayload: rgbaArray;
  celestrakDefaultUnknown: rgbaArray;
  celestrakDefaultSensor: rgbaArray;
  celestrakDefaultFov: rgbaArray;
}

export class CelestrakColorScheme extends ColorScheme {
  readonly label = 'Celestrak';
  readonly id = 'CelestrakColorScheme';
  static readonly id = 'CelestrakColorScheme';

  static readonly uniqueObjectTypeFlags = {
    celestrakDefaultActivePayload: true,
    celestrakDefaultInactivePayload: true,
    celestrakDefaultRocketBody: true,
    celestrakDefaultDebris: true,
    celestrakDefaultSensor: true,
    celestrakDefaultFov: true,
    celestrakDefaultUnknown: true,
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
    super(CelestrakColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...CelestrakColorScheme.uniqueObjectTypeFlags,
    };

    keepTrackApi.on(KeepTrackApiEvents.legendUpdated, () => {
      if (settingsManager.isDisableSensors) {
        this.objectTypeFlags.celestrakDefaultSensor = false;
        this.objectTypeFlags.celestrakDefaultFov = false;
        const sensorBox = document.querySelector('.legend-celestrakDefaultSensor-box')?.parentElement as HTMLElement;
        const inFOVBox = document.querySelector('.legend-celestrakDefaultFov-box')?.parentElement as HTMLElement;

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

    if (obj.isSensor() && (this.objectTypeFlags.celestrakDefaultSensor === false || keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM)) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.isSensor()) {
      return {
        color: this.colorTheme.celestrakDefaultSensor,
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
        sat.status !== PayloadStatus.NONOPERATIONAL && sat.status !== PayloadStatus.UNKNOWN &&
        this.objectTypeFlags.celestrakDefaultActivePayload === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM &&
        sat.type === SpaceObjectType.PAYLOAD &&
        sat.status !== PayloadStatus.NONOPERATIONAL && sat.status !== PayloadStatus.UNKNOWN &&
        this.objectTypeFlags.celestrakDefaultActivePayload === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        sat.type === SpaceObjectType.PAYLOAD &&
        sat.status !== PayloadStatus.NONOPERATIONAL && sat.status !== PayloadStatus.UNKNOWN &&
        this.objectTypeFlags.celestrakDefaultActivePayload === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.PAYLOAD &&
        (sat.status === PayloadStatus.NONOPERATIONAL || sat.status === PayloadStatus.UNKNOWN) &&
        this.objectTypeFlags.celestrakDefaultInactivePayload === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM &&
        sat.type === SpaceObjectType.PAYLOAD &&
        (sat.status === PayloadStatus.NONOPERATIONAL || sat.status === PayloadStatus.UNKNOWN) &&
        this.objectTypeFlags.celestrakDefaultInactivePayload === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        sat.type === SpaceObjectType.PAYLOAD &&
        (sat.status === PayloadStatus.NONOPERATIONAL || sat.status === PayloadStatus.UNKNOWN) &&
        this.objectTypeFlags.celestrakDefaultInactivePayload === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.UNKNOWN &&
        this.objectTypeFlags.celestrakDefaultUnknown === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM &&
        sat.type === SpaceObjectType.UNKNOWN &&
        this.objectTypeFlags.celestrakDefaultUnknown === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        sat.type === SpaceObjectType.UNKNOWN &&
        this.objectTypeFlags.celestrakDefaultUnknown === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.ROCKET_BODY &&
        this.objectTypeFlags.celestrakDefaultRocketBody === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.ROCKET_BODY &&
        this.objectTypeFlags.celestrakDefaultRocketBody === false) || (catalogManagerInstance.isSensorManagerLoaded &&
          sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
          typeof sat.vmag === 'undefined' &&
          sat.type === SpaceObjectType.ROCKET_BODY &&
          this.objectTypeFlags.celestrakDefaultRocketBody === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.DEBRIS &&
        this.objectTypeFlags.celestrakDefaultDebris === false) ||
      (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.DEBRIS && this.objectTypeFlags.celestrakDefaultDebris === false) ||
      (catalogManagerInstance.isSensorManagerLoaded &&
        sensorManagerInstance.currentSensors[0].type === SpaceObjectType.OBSERVER &&
        typeof sat.vmag === 'undefined' &&
        sat.type === SpaceObjectType.DEBRIS &&
        this.objectTypeFlags.celestrakDefaultDebris === false)
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (dotsManagerInstance.inViewData?.[sat.id] === 1 && this.objectTypeFlags.celestrakDefaultFov === false &&
      keepTrackApi.getMainCamera().cameraType !== CameraType.PLANETARIUM) {
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
          color: this.colorTheme.inFOVAlt,
          pickable: Pickable.Yes,
        };
      }
    }

    let color: rgbaArray;
    /*
     * Green:  OBJECT_TYPE = PAY, OPS_STATUS_CODE = +
     * Orange: OBJECT_TYPE = PAY, OPS_STATUS_CODE = -
     * Red: R/B
     * Gray: DEB
     * White: UNK
     */

    if (sat.type === SpaceObjectType.PAYLOAD) {
      // Payload
      if (sat.status !== PayloadStatus.NONOPERATIONAL && sat.status !== PayloadStatus.UNKNOWN) {
        color = this.colorTheme.celestrakDefaultActivePayload;
      } else {
        color = this.colorTheme.celestrakDefaultInactivePayload;
      }
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      // Rocket Body
      color = this.colorTheme.celestrakDefaultRocketBody;
    } else if (sat.type === SpaceObjectType.DEBRIS) {
      // Debris
      color = this.colorTheme.celestrakDefaultDebris;
    } else {
      color = this.colorTheme.celestrakDefaultUnknown;
    }

    if (typeof color === 'undefined') {
      errorManagerInstance.debug(`${sat.id.toString()} has no color!`);

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

  static readonly legendHtml = keepTrackApi.html`
  <ul id="legend-list-celestrakDefault-sensor">
  <li>
      <div class="Square-Box legend-celestrakDefaultActivePayload-box"></div>
      Active Payload
    </li>
    <li>
      <div class="Square-Box legend-celestrakDefaultInactivePayload-box"></div>
      Inactive Payload
    </li>
    <li>
      <div class="Square-Box legend-celestrakDefaultRocketBody-box"></div>
      Rocket Body
    </li>
    <li>
      <div class="Square-Box legend-celestrakDefaultDebris-box"></div>
      Debris
    </li>
    <li>
      <div class="Square-Box legend-celestrakDefaultUnknown-box"></div>
      Unknown
    </li>
    <li>
      <div class="Square-Box legend-celestrakDefaultFov-box"></div>
      In Field of View
    </li>
    <li>
      <div class="Square-Box legend-celestrakDefaultSensor-box"></div>
      Sensor
    </li>
    <li>
      <div class="Square-Box legend-facility-box"></div>
      Launch Site
    </li>
  </ul>
  `.trim();
}
