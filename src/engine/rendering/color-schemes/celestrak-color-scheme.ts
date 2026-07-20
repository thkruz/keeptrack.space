import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { BaseObject, PayloadStatus, Satellite, SpaceObjectType } from '@app/engine/ootk/src/main';
import { html } from '@app/engine/utils/development/formatter';
import { hideEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
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
  readonly label = t7e('colorSchemes.CelestrakColorScheme.label' as Parameters<typeof t7e>[0]);
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
      ...this.objectTypeFlags,
      ...CelestrakColorScheme.uniqueObjectTypeFlags,
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
    const earlyExit = this.earlyExitColor_(obj);

    if (earlyExit) {
      return earlyExit;
    }

    const sensorResult = this.checkSensorVisibility_(obj, 'celestrakDefaultSensor', 'celestrakDefaultSensor');

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
    const isActive = (s: Satellite) => s.status !== PayloadStatus.NONOPERATIONAL && s.status !== PayloadStatus.UNKNOWN;
    const isInactive = (s: Satellite) => s.status === PayloadStatus.NONOPERATIONAL || s.status === PayloadStatus.UNKNOWN;

    if (
      this.isTypeFlagFiltered_(sat, {
        types: SpaceObjectType.PAYLOAD,
        flagKey: 'celestrakDefaultActivePayload',
        extraCondition: isActive,
      }) ||
      this.isTypeFlagFiltered_(sat, {
        types: SpaceObjectType.PAYLOAD,
        flagKey: 'celestrakDefaultInactivePayload',
        extraCondition: isInactive,
      }) ||
      this.isTypeFlagFiltered_(sat, { types: SpaceObjectType.UNKNOWN, flagKey: 'celestrakDefaultUnknown' }) ||
      this.isTypeFlagFiltered_(sat, { types: SpaceObjectType.ROCKET_BODY, flagKey: 'celestrakDefaultRocketBody' }) ||
      this.isTypeFlagFiltered_(sat, { types: SpaceObjectType.DEBRIS, flagKey: 'celestrakDefaultDebris' })
    ) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const fovResult = this.checkInFovVisibility_(sat, 'celestrakDefaultFov', 'inFOVAlt');

    if (fovResult) {
      return fovResult;
    }

    let color: rgbaArray;

    if (sat.type === SpaceObjectType.PAYLOAD) {
      color = isActive(sat) ? this.colorTheme.celestrakDefaultActivePayload : this.colorTheme.celestrakDefaultInactivePayload;
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      color = this.colorTheme.celestrakDefaultRocketBody;
    } else if (sat.type === SpaceObjectType.DEBRIS) {
      color = this.colorTheme.celestrakDefaultDebris;
    } else {
      color = this.colorTheme.celestrakDefaultUnknown;
    }

    if (typeof color === 'undefined') {
      return this.undefinedColorFallback_(sat.id, 'debug');
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
