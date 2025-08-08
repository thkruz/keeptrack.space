/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, DetailedSatellite } from 'ootk';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceAldoria: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourcePrismnet: rgbaArray;
  sourceVimpel: rgbaArray;
}

export class RcsColorScheme extends ColorScheme {
  readonly label = 'Radar Cross Section';
  readonly id = 'RcsColorScheme';
  static readonly id = 'RcsColorScheme';

  static readonly uniqueObjectTypeFlags = {
    rcsXXSmall: true,
    rcsXSmall: true,
    rcsSmall: true,
    rcsMed: true,
    rcsLarge: true,
    rcsUnknown: true,
  };

  static readonly uniqueColorTheme = {
    rcsXXSmall: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    rcsXSmall: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    rcsSmall: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    rcsMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    rcsLarge: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    rcsUnknown: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(RcsColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...RcsColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite) {
      return { color: this.colorTheme.transparent, pickable: Pickable.No };
    }

    const sat = obj as DetailedSatellite;

    if (!sat.rcs) {
      if (this.objectTypeFlags.rcsUnknown) {
        return {
          color: this.colorTheme.rcsUnknown,
          pickable: Pickable.Yes,
        };
      }

      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };

    }
    if (sat.rcs < 0.01 && this.objectTypeFlags.rcsXXSmall) {
      return {
        color: this.colorTheme.rcsXXSmall,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs >= 0.01 && sat.rcs <= 0.05 && this.objectTypeFlags.rcsXSmall) {
      return {
        color: this.colorTheme.rcsXSmall,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs >= 0.05 && sat.rcs <= 0.1 && this.objectTypeFlags.rcsSmall) {
      return {
        color: this.colorTheme.rcsSmall,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs >= 0.1 && sat.rcs <= 1 && this.objectTypeFlags.rcsMed) {
      return {
        color: this.colorTheme.rcsMed,
        pickable: Pickable.Yes,
      };
    }
    if (sat.rcs > 1 && this.objectTypeFlags.rcsLarge) {
      return {
        color: this.colorTheme.rcsLarge,
        pickable: Pickable.Yes,
      };
    }

    // Flag must have been turned off
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  static readonly legendHtml = keepTrackApi.html`
  <ul id="legend-list-rcs">
  <li>
      <div class="Square-Box legend-rcsXXSmall-box"></div>
      Less Than 0.01 sq m
    </li>
    <li>
      <div class="Square-Box legend-rcsXSmall-box"></div>
      Between 0.01 sq m and 0.05 sq m
    </li>
    <li>
      <div class="Square-Box legend-rcsSmall-box"></div>
      Between 0.05 sq m and 0.1 sq m
    </li>
    <li>
      <div class="Square-Box legend-rcsMed-box"></div>
      Between 0.1 and 1 sq m
    </li>
    <li>
      <div class="Square-Box legend-rcsLarge-box"></div>
      More Than 1 sq m
    </li>
    <li>
      <div class="Square-Box legend-rcsUnknown-box"></div>
      No Public Data
    </li>
  </ul>
  `.trim();
}
