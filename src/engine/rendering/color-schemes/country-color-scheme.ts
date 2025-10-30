/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { BaseObject, DetailedSatellite, SpaceObjectType } from '@ootk/src/main';
import { CameraType } from '../../camera/camera';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';
import { ServiceLocator } from '@app/engine/core/service-locator';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceAldoria: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourcePrismnet: rgbaArray;
  sourceVimpel: rgbaArray;
}

export class CountryColorScheme extends ColorScheme {
  readonly label = 'Country';
  readonly id = 'CountryColorScheme';
  static readonly id = 'CountryColorScheme';

  static readonly uniqueObjectTypeFlags = {
    countryUS: true,
    countryPRC: true,
    countryCIS: true,
    countryOther: true,
  };

  static readonly uniqueColorTheme = {
    countryUS: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    countryPRC: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    countryCIS: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    countryOther: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(CountryColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...CountryColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
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

    return this.checkCountry_(obj);
  }

  updateGroup(obj: BaseObject): ColorInformation {
    if (ServiceLocator.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (ServiceLocator.getGroupsManager().selectedGroup?.hasObject(obj.id)) {
      return this.checkCountry_(obj);
    }

    if (obj.isMarker()) {
      return this.getMarkerColor_();
    }

    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  private checkCountry_(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const sat = obj as DetailedSatellite;

    switch (sat.country) {
      case 'United States of America':
      case 'United States':
      case 'USA':
      case 'US':
        if (this.objectTypeFlags.countryUS === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryUS,
          pickable: Pickable.Yes,
        };

      case 'Russian Federation':
      case 'CIS':
      case 'RU':
      case 'SU':
      case 'Russia':
        if (this.objectTypeFlags.countryCIS === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryCIS,
          pickable: Pickable.Yes,
        };

      case 'China':
      case 'China, People\'s Reof':
      case 'Hong Kong Special Administrative Region, China':
      case 'China (Republic)':
      case 'PRC':
      case 'CN':
        if (this.objectTypeFlags.countryPRC === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryPRC,
          pickable: Pickable.Yes,
        };

      default:
        if (this.objectTypeFlags.countryOther === false) {
          return {
            color: this.colorTheme.deselected,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.countryOther,
          pickable: Pickable.Yes,
        };

    }
  }

  static readonly layersHtml = html`
  <ul id="layers-list-countries">
    <li>
      <div class="Square-Box layers-countryUS-box"></div>
      United States
    </li>
    <li>
      <div class="Square-Box layers-countryCIS-box"></div>
      Russia
    </li>
    <li>
      <div class="Square-Box layers-countryPRC-box"></div>
      China
    </li>
    <li>
      <div class="Square-Box layers-countryOther-box"></div>
      Other
    </li>
    <li>
      <div class="Square-Box layers-facility-box"></div>
      Launch Site
    </li>
  </ul>
  `.trim();
}
