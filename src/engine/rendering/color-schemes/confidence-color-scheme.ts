/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { BaseObject, DetailedSatellite } from '@ootk/src/main';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceAldoria: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourcePrismnet: rgbaArray;
  sourceVimpel: rgbaArray;
}

export class ConfidenceColorScheme extends ColorScheme {
  readonly label = 'Confidence';
  readonly id = 'ConfidenceColorScheme';
  static readonly id = 'ConfidenceColorScheme';

  static readonly uniqueObjectTypeFlags = {
    confidenceHi: true,
    confidenceMed: true,
    confidenceLow: true,
  };

  static readonly uniqueColorTheme = {
    confidenceHi: [0.0, 1.0, 0.0, 1.0] as rgbaArray,
    confidenceMed: [1.0, 1.0, 0.0, 1.0] as rgbaArray,
    confidenceLow: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(ConfidenceColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...ConfidenceColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }
    const sat = obj as DetailedSatellite;

    const confidenceScore = parseInt(sat.tle1.substring(64, 65)) || 0;
    let pickable: Pickable;
    let color: [number, number, number, number];

    if (confidenceScore >= 7 && this.objectTypeFlags.confidenceHi) {
      color = this.colorTheme.confidenceHi;
      pickable = Pickable.Yes;
    } else if (confidenceScore >= 4 && confidenceScore < 7 && this.objectTypeFlags.confidenceMed) {
      color = this.colorTheme.confidenceMed;
      pickable = Pickable.Yes;
    } else if (confidenceScore >= 0 && confidenceScore < 4 && this.objectTypeFlags.confidenceLow) {
      color = this.colorTheme.confidenceLow;
      pickable = Pickable.Yes;
    } else {
      color = this.colorTheme.transparent;
      pickable = Pickable.No;
    }

    return {
      color,
      pickable,
    };
  }

  static readonly layersHtml = html`
  <ul id="layers-list-confidence">
    <li>
      <div class="Square-Box layers-confidenceLow-box"></div>
      3 or Lower
    </li>
    <li>
      <div class="Square-Box layers-confidenceMed-box"></div>
      Between 3 and 7
    </li>
    <li>
      <div class="Square-Box layers-confidenceHi-box"></div>
      7 or Higher
    </li>
  </ul>
  `.trim();
}
