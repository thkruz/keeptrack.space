/* eslint-disable complexity */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Planet } from '@app/app/objects/planet';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { BaseObject, DetailedSatellite, PayloadStatus, SpaceObjectType, Star } from '@app/engine/ootk/src/main';
import { html } from '@app/engine/utils/development/formatter';
import { hideEl } from '@app/engine/utils/get-el';
import { CameraType } from '../../camera/camera';
import { errorManagerInstance } from '../../utils/errorManager';
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

    EventBus.getInstance().on(EventBusEvent.layerUpdated, () => {
      if (settingsManager.isDisableSensors) {
        this.objectTypeFlags.celestrakDefaultSensor = false;
        this.objectTypeFlags.celestrakDefaultFov = false;
        const sensorBox = document.querySelector('.layers-celestrakDefaultSensor-box')?.parentElement as HTMLElement;
        const inFOVBox = document.querySelector('.layers-celestrakDefaultFov-box')?.parentElement as HTMLElement;

        if (sensorBox) {
          hideEl(sensorBox);
        }

        if (inFOVBox) {
          hideEl(inFOVBox);
        }
      }

      if (settingsManager.isDisableLaunchSites) {
        this.objectTypeFlags.facility = false;
        const launchSiteBox = document.querySelector('.layers-facility-box')?.parentElement as HTMLElement;

        if (launchSiteBox) {
          hideEl(launchSiteBox);
        }
      }
    });
  }

  update(obj: BaseObject): ColorInformation {
    /*
     * NOTE: The order of these checks is important
     */

    if (
      obj.type === SpaceObjectType.TERRESTRIAL_PLANET ||
      obj.type === SpaceObjectType.GAS_GIANT ||
      obj.type === SpaceObjectType.ICE_GIANT ||
      obj.type === SpaceObjectType.DWARF_PLANET ||
      obj.type === SpaceObjectType.MOON
    ) {
      return {
        color: (obj as Planet).color,
        pickable: Pickable.Yes,
      };
    }

    if (((obj as OemSatellite).source ?? '') === 'OEM Import') {
      return {
        color: (obj as OemSatellite).dotColor,
        pickable: Pickable.Yes,
      };
    }

    if (settingsManager.maxZoomDistance > 2e6) {
      // If zoomed out beyond 2 million km, hide everything except planets
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (obj.type === SpaceObjectType.NOTIONAL) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    // If we are in astronomy mode, hide everything that isn't a star (above)
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

    if (obj.isSensor() && (this.objectTypeFlags.celestrakDefaultSensor === false || ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM)) {
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

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const sat = obj as DetailedSatellite;

    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.PAYLOAD &&
        sat.status !== PayloadStatus.NONOPERATIONAL && sat.status !== PayloadStatus.UNKNOWN &&
        this.objectTypeFlags.celestrakDefaultActivePayload === false) ||
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM &&
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
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM &&
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
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM &&
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
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.ROCKET_BODY &&
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
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.DEBRIS && this.objectTypeFlags.celestrakDefaultDebris === false) ||
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
      ServiceLocator.getMainCamera().cameraType !== CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (dotsManagerInstance.inViewData?.[sat.id] === 1 && ServiceLocator.getMainCamera().cameraType !== CameraType.PLANETARIUM) {
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

  static readonly layersHtml = html`
  <ul id="layers-list-celestrakDefault-sensor">
  <li>
      <div class="Square-Box layers-celestrakDefaultActivePayload-box"></div>
      Active Payload
    </li>
    <li>
      <div class="Square-Box layers-celestrakDefaultInactivePayload-box"></div>
      Inactive Payload
    </li>
    <li>
      <div class="Square-Box layers-celestrakDefaultRocketBody-box"></div>
      Rocket Body
    </li>
    <li>
      <div class="Square-Box layers-celestrakDefaultDebris-box"></div>
      Debris
    </li>
    <li>
      <div class="Square-Box layers-celestrakDefaultUnknown-box"></div>
      Unknown
    </li>
    <li>
      <div class="Square-Box layers-celestrakDefaultFov-box"></div>
      In Field of View
    </li>
    <li>
      <div class="Square-Box layers-celestrakDefaultSensor-box"></div>
      Sensor
    </li>
    <li>
      <div class="Square-Box layers-facility-box"></div>
      Launch Site
    </li>
  </ul>
  `.trim();
}
