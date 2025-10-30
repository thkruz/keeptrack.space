/* eslint-disable complexity */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { BaseObject, DetailedSatellite, PayloadStatus, SpaceObjectType } from '@ootk/src/main';
import { CameraType } from '../../camera/camera';
import { ColorScheme } from './color-scheme';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class StarlinkColorScheme extends ColorScheme {
  readonly label = 'Starlink';
  readonly id = 'StarlinkColorScheme';
  static readonly id = 'StarlinkColorScheme';
  isOptionInRmbMenu = false;

  static readonly uniqueObjectTypeFlags = {
    starlinkOperational: true,
    starlinkOther: true,
    starlinkNot: true,
  };

  static readonly uniqueColorTheme = {
    starlinkOperational: [0.0, 0.8, 0.0, 0.8] as rgbaArray,
    starlinkOther: [0.8, 0.8, 0.0, 0.8] as rgbaArray,
    starlinkNot: [0.8, 0.0, 0.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(StarlinkColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...StarlinkColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
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

    if (obj.name.toLocaleLowerCase().startsWith('starlink') && obj.type === SpaceObjectType.PAYLOAD) {
      if ((obj as DetailedSatellite).status === PayloadStatus.OPERATIONAL) {
        if (this.objectTypeFlags.starlinkOperational === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.starlinkOperational,
          pickable: Pickable.Yes,
        };
      }

      if ((obj as DetailedSatellite).status !== PayloadStatus.OPERATIONAL) {
        if (this.objectTypeFlags.starlinkOther === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.starlinkOther,
          pickable: Pickable.Yes,
        };
      }

    }

    if (this.objectTypeFlags.starlinkNot === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: this.colorTheme.starlinkNot,
      pickable: Pickable.Yes,
    };
  }

  static readonly layersHtml = html`
  <ul id="layers-list-starlink">
    <li>
      <div class="Square-Box layers-starlinkOperational-box"></div>
      Operational Starlink
    </li>
    <li>
      <div class="Square-Box layers-starlinkOther-box"></div>
      Other Starlink
    </li>
    <li>
      <div class="Square-Box layers-starlinkNot-box"></div>
      Not Starlink
    </li>
  </ul>
  `.trim();
}
