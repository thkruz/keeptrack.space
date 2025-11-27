/* eslint-disable complexity */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Planet } from '@app/app/objects/planet';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { hideEl } from '@app/engine/utils/get-el';
import { BaseObject, DetailedSatellite, SpaceObjectType, Star } from '@ootk/src/main';
import { CameraType } from '../../camera/camera';
import { errorManagerInstance } from '../../utils/errorManager';
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

    EventBus.getInstance().on(EventBusEvent.layerUpdated, () => {
      if (settingsManager.isDisableSensors) {
        this.objectTypeFlags.sensor = false;
        this.objectTypeFlags.inFOV = false;
      }

      if (settingsManager.isDisableLaunchSites) {
        this.objectTypeFlags.facility = false;
      }

      if (!settingsManager.plugins?.MissilePlugin?.enabled) {
        this.objectTypeFlags.missile = false;
        const missileBox = document.querySelector('.layers-missile-box')?.parentElement as HTMLElement;

        if (missileBox) {
          hideEl(missileBox);
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

    if (obj.isSensor() && (this.objectTypeFlags.sensor === false || ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM)) {
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

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const sat = obj as DetailedSatellite;

    if (
      ((!dotsManagerInstance.inViewData || (dotsManagerInstance.inViewData && dotsManagerInstance.inViewData?.[sat.id] === 0)) &&
        sat.type === SpaceObjectType.PAYLOAD &&
        this.objectTypeFlags.payload === false) ||
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.PAYLOAD && this.objectTypeFlags.payload === false) ||
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
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.ROCKET_BODY && this.objectTypeFlags.rocketBody === false) ||
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
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM && sat.type === SpaceObjectType.DEBRIS && this.objectTypeFlags.debris === false) ||
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
      (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM &&
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

    if (dotsManagerInstance.inViewData?.[sat.id] === 1 && this.objectTypeFlags.inFOV === false && ServiceLocator.getMainCamera().cameraType !== CameraType.PLANETARIUM) {
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
    if (ServiceLocator.getGroupsManager().selectedGroup?.hasObject(obj.id)) {
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

      if (ServiceLocator.getDotsManager().inViewData?.[obj.id] === 1) {
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

  static readonly layersHtml = html`
  <ul id="layers-list-default-sensor">
    <li>
      <div class="Square-Box layers-payload-box"></div>
      Payload
    </li>
    <li>
      <div class="Square-Box layers-rocketBody-box"></div>
      Rocket Body
    </li>
    <li>
      <div class="Square-Box layers-debris-box"></div>
      Debris
    </li>
    <li>
      <div class="Square-Box layers-pink-box"></div>
      Special Sats
    </li>
    <li>
      <div class="Square-Box layers-inFOV-box"></div>
      Satellite In View
    </li>
    <li>
      <div class="Square-Box layers-missile-box"></div>
      Missile
    </li>
    <li>
      <div class="Square-Box layers-missileInview-box"></div>
      Missile In View
    </li>
    <li>
      <div class="Square-Box layers-sensor-box"></div>
      Sensor
    </li>
    <li>
      <div class="Square-Box layers-facility-box"></div>
      Launch Site
    </li>
  </ul>
  `.trim();
}
