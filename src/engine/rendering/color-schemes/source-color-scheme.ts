/* eslint-disable complexity */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { BaseObject, DetailedSatellite, Star } from '@ootk/src/main';
import { CameraType } from '../../camera/camera';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';
import { ServiceLocator } from '@app/engine/core/service-locator';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourceVimpel: rgbaArray;
}

export class SourceColorScheme extends ColorScheme {
  readonly label = 'Data Source';
  readonly id = 'SourceColorScheme';
  static readonly id = 'SourceColorScheme';

  static readonly uniqueObjectTypeFlags = {
    sourceUssf: true,
    sourceCelestrak: true,
    sourceVimpel: true,
    sourceOemImport: true,
  };

  static readonly uniqueColorTheme = {
    sourceUssf: [0.2, 1.0, 1.0, 0.7] as rgbaArray,
    sourceCelestrak: [0, 0.2, 1.0, 0.85] as rgbaArray,
    sourceVimpel: [1.0, 0, 0, 0.6] as rgbaArray,
    sourceOemImport: [1.0, 1.0, 0.2, 1.0] as rgbaArray,
  };

  constructor() {
    super(SourceColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...SourceColorScheme.uniqueObjectTypeFlags,
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

    // Apply only for satellites
    if (!obj.isSatellite()) {
      if (obj.isMarker()) {
        return this.getMarkerColor_();
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
      if (obj.isStar()) {
        return this.starColor_(obj as Star);
      }

      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    // Check the source of the data
    const sat = obj as DetailedSatellite;

    if (sat.source) {
      switch (sat.source) {
        case 'USSF':
          if (this.objectTypeFlags.sourceUssf === false) {
            return {
              color: this.colorTheme.deselected,
              pickable: Pickable.No,
            };
          }

          return {
            color: this.colorTheme.sourceUssf,
            pickable: Pickable.Yes,
          };

        case 'Celestrak':
          if (this.objectTypeFlags.sourceCelestrak === false) {
            return {
              color: this.colorTheme.deselected,
              pickable: Pickable.No,
            };
          }

          return {
            color: this.colorTheme.sourceCelestrak,
            pickable: Pickable.Yes,
          };

        case 'OEM Import':
          if (this.objectTypeFlags.sourceOemImport === false) {
            return {
              color: this.colorTheme.deselected,
              pickable: Pickable.No,
            };
          }

          return {
            color: this.colorTheme.sourceOemImport,
            pickable: Pickable.Yes,
          };

        case 'JSC Vimpel':
          if (this.objectTypeFlags.sourceVimpel === false) {
            return {
              color: this.colorTheme.deselected,
              pickable: Pickable.No,
            };
          }

          return {
            color: this.colorTheme.sourceVimpel,
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

  static readonly layersHtml = html`
  <ul id="layers-list-dataSource">
    <li>
      <div class="Square-Box layers-sourceCelestrak-box"></div>
      Celestrak
    </li>
    <li>
      <div class="Square-Box layers-sourceUssf-box"></div>
      18 SDS
    </li>
    <li>
      <div class="Square-Box layers-sourceVimpel-box"></div>
      Vimpel
    </li>
    <li>
      <div class="Square-Box layers-sourceOemImport-box"></div>
      OEM Import
    </li>
    <li>
      <div class="Square-Box layers-countryOther-box"></div>
      Other
    </li>
  </ul>
  `.trim();
}
