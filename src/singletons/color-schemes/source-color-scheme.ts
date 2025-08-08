/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, DetailedSatellite, Star } from 'ootk';
import { CameraType } from '../camera';
import { MissileObject } from '../catalog-manager/MissileObject';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceAldoria: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourcePrismnet: rgbaArray;
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
  };

  static readonly uniqueColorTheme = {
    sourceUssf: [0.2, 1.0, 1.0, 0.7] as rgbaArray,
    sourceCelestrak: [0, 0.2, 1.0, 0.85] as rgbaArray,
    sourceVimpel: [1.0, 0, 0, 0.6] as rgbaArray,
  };

  constructor() {
    super(SourceColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...SourceColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
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

  static readonly legendHtml = keepTrackApi.html`
  <ul id="legend-list-dataSource">
    <li>
      <div class="Square-Box legend-sourceCelestrak-box"></div>
      Celestrak
    </li>
    <li>
      <div class="Square-Box legend-sourceUssf-box"></div>
      18 SDS
    </li>
    <li>
      <div class="Square-Box legend-sourceVimpel-box"></div>
      Vimpel
    </li>
    <li>
      <div class="Square-Box legend-countryOther-box"></div>
      Other
    </li>
  </ul>
  `.trim();
}
