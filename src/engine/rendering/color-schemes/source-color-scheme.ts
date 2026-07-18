/* eslint-disable complexity */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { CameraType } from '@app/engine/camera/camera-type';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { BaseObject, CatalogSource, Satellite, Star } from '@ootk/src/main';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourceCelestrakSup: rgbaArray;
  sourceVimpel: rgbaArray;
  sourceSatnogs: rgbaArray;
}

export class SourceColorScheme extends ColorScheme {
  readonly label = t7e('colorSchemes.SourceColorScheme.label' as Parameters<typeof t7e>[0]);
  readonly id = 'SourceColorScheme';
  static readonly id = 'SourceColorScheme';

  static readonly uniqueObjectTypeFlags = {
    sourceUssf: true,
    sourceCelestrak: true,
    sourceCelestrakSup: true,
    sourceVimpel: true,
    sourceSatnogs: true,
    sourceOemImport: true,
    countryOther: true,
  };

  static readonly uniqueColorTheme = {
    sourceUssf: [1.0, 0.6, 0.0, 0.85] as rgbaArray,
    sourceCelestrak: [0, 0.2, 1.0, 0.85] as rgbaArray,
    sourceCelestrakSup: [0.7, 0.3, 1.0, 0.85] as rgbaArray,
    sourceVimpel: [1.0, 0.1, 0.1, 0.7] as rgbaArray,
    sourceSatnogs: [0.0, 1.0, 0.0, 0.8] as rgbaArray,
    sourceOemImport: [1.0, 1.0, 0.2, 1.0] as rgbaArray,
  };

  constructor() {
    super(SourceColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags,
      ...SourceColorScheme.uniqueObjectTypeFlags,
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
    const sat = obj as Satellite;

    if (sat.source) {
      switch (sat.source) {
        case CatalogSource.USSF:
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

        case CatalogSource.CELESTRAK:
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

        case CatalogSource.CELESTRAK_SUP:
          if (this.objectTypeFlags.sourceCelestrakSup === false) {
            return {
              color: this.colorTheme.deselected,
              pickable: Pickable.No,
            };
          }

          return {
            color: this.colorTheme.sourceCelestrakSup,
            pickable: Pickable.Yes,
          };

        case CatalogSource.SATNOGS:
          if (this.objectTypeFlags.sourceSatnogs === false) {
            return {
              color: this.colorTheme.deselected,
              pickable: Pickable.No,
            };
          }

          return {
            color: this.colorTheme.sourceSatnogs,
            pickable: Pickable.Yes,
          };

        case 'OEM Import':
        case 'KeepTrack':
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

        case CatalogSource.VIMPEL:
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
      <div class="Square-Box layers-sourceCelestrakSup-box"></div>
      Celestrak Sup
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
      <div class="Square-Box layers-sourceSatnogs-box"></div>
      SatNOGS
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
