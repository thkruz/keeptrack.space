import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { hideEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite, SpaceObjectType, Star } from '@ootk/src/main';
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
  readonly label = t7e('colorSchemes.ObjectTypeColorScheme.label' as Parameters<typeof t7e>[0]);
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
      ...this.objectTypeFlags,
      ...ObjectTypeColorScheme.uniqueObjectTypeFlags,
    };

    EventBus.getInstance().on(EventBusEvent.layerUpdated, () => {
      if (settingsManager.isDisableSensors) {
        this.objectTypeFlags.sensor = false;
        this.objectTypeFlags.inFOV = false;
      }

      if (settingsManager.isDisableLaunchSites) {
        this.objectTypeFlags.facility = false;
      }

      if (!settingsManager.plugins?.MissileSimulatorPlugin?.enabled) {
        this.objectTypeFlags.missile = false;
        const missileBox = document.querySelector('.layers-missile-box')?.parentElement as HTMLElement;

        if (missileBox) {
          hideEl(missileBox);
        }
      }
    });
  }

  update(obj: BaseObject): ColorInformation {
    const earlyExit = this.earlyExitColor_(obj);

    if (earlyExit) {
      return earlyExit;
    }

    const sensorResult = this.checkSensorVisibility_(obj, 'sensor', 'sensor');

    if (sensorResult) {
      return sensorResult;
    }

    if (obj.isMissile()) {
      return this.missileColor_(obj as MissileObject);
    }

    const settingsResult = this.checkSettingsVisibility_(obj);

    if (settingsResult) {
      return settingsResult;
    }

    const sat = obj as Satellite;

    if (
      this.isTypeFlagFiltered_(sat, { types: SpaceObjectType.PAYLOAD, flagKey: 'payload' }) ||
      this.isTypeFlagFiltered_(sat, { types: SpaceObjectType.ROCKET_BODY, flagKey: 'rocketBody' }) ||
      this.isTypeFlagFiltered_(sat, { types: SpaceObjectType.DEBRIS, flagKey: 'debris' }) ||
      this.isTypeFlagFiltered_(sat, {
        types: [SpaceObjectType.SPECIAL, SpaceObjectType.UNKNOWN, SpaceObjectType.NOTIONAL],
        flagKey: 'pink',
      })
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const fovResult = this.checkInFovVisibility_(sat, 'inFOV', 'inFOV');

    if (fovResult) {
      return fovResult;
    }

    let color: [number, number, number, number];

    if (sat.country === 'ANALSAT') {
      color = this.colorTheme.analyst;
    } else if (sat.type === SpaceObjectType.PAYLOAD) {
      color = this.colorTheme.payload;
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      color = this.colorTheme.rocketBody;
    } else if (sat.type === SpaceObjectType.DEBRIS) {
      color = this.colorTheme.debris;
    } else if (sat.type === SpaceObjectType.SPECIAL || sat.type === SpaceObjectType.UNKNOWN) {
      color = this.colorTheme.pink;
    } else if (sat.type === SpaceObjectType.NOTIONAL) {
      color = this.colorTheme.notional;
    } else {
      color = this.colorTheme.unknown;
    }

    if (typeof color === 'undefined') {
      return this.undefinedColorFallback_(sat.id);
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
