/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, SpaceObjectType } from 'ootk';
import { CameraType } from '../camera';
import { MissileObject } from '../catalog-manager/MissileObject';
import { ColorScheme } from './color-scheme';

export class StarlinkColorScheme extends ColorScheme {
  readonly label = 'Starlink';
  readonly id = 'StarlinkColorScheme';
  static readonly id = 'StarlinkColorScheme';
  isOptionInRmbMenu = false;

  static readonly uniqueObjectTypeFlags = {
    starlink: true,
    starlinkNot: true,
  };

  static readonly uniqueColorTheme = {
    starlink: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    starlinkNot: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
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

    if (obj.name.toLocaleLowerCase().startsWith('starlink') && obj.type === SpaceObjectType.PAYLOAD) {
      if (this.objectTypeFlags.starlink === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: [0.0, 0.8, 0.0, 0.8],
        pickable: Pickable.Yes,
      };

    }

    if (this.objectTypeFlags.starlinkNot === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: [0.8, 0.0, 0.0, 0.8],
      pickable: Pickable.Yes,
    };

  }

  static readonly legendHtml = keepTrackApi.html`
  <ul id="legend-list-starlink">
    <li>
      <div class="Square-Box legend-starlink-box"></div>
      Starlink
    </li>
    <li>
      <div class="Square-Box legend-starlinkNot-box"></div>
      Not Starlink
    </li>
  </ul>
  `.trim();
}
