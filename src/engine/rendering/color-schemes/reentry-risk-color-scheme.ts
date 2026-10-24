/* eslint-disable complexity */

import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';
import { legendLabel } from './legend-label';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceAldoria: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourcePrismnet: rgbaArray;
  sourceVimpel: rgbaArray;
}

export class ReentryRiskColorScheme extends ColorScheme {
  readonly label = t7e('colorSchemes.ReentryRiskColorScheme.label' as Parameters<typeof t7e>[0]);
  readonly id = 'ReentryRiskColorScheme';
  static readonly id = 'ReentryRiskColorScheme';

  static readonly uniqueObjectTypeFlags = {
    reentryRiskVeryHigh: true,
    reentryRiskHigh: true,
    reentryRiskMedium: true,
    reentryRiskLow: true,
    reentryRiskVeryLow: true,
  };

  static readonly uniqueColorTheme = {
    reentryRiskVeryHigh: [1.0, 0.0, 0.0, 0.8] as rgbaArray, // Red
    reentryRiskHigh: [1.0, 0.5, 0.0, 0.8] as rgbaArray, // Orange
    reentryRiskMedium: [1.0, 1.0, 0.0, 0.8] as rgbaArray, // Yellow
    reentryRiskLow: [0.5, 1.0, 0.0, 0.8] as rgbaArray, // Light Green
    reentryRiskVeryLow: [0.0, 0.8, 0.0, 0.8] as rgbaArray, // Dark Green
  };

  constructor() {
    super(ReentryRiskColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags,
      ...ReentryRiskColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite) {
      return { color: this.colorTheme.transparent, pickable: Pickable.No };
    }

    const sat = obj as Satellite;

    if (sat.perigee < 180 && this.objectTypeFlags.reentryRiskVeryHigh) {
      return {
        color: this.colorTheme.reentryRiskVeryHigh,
        pickable: Pickable.Yes,
      };
    }
    if (sat.perigee >= 180 && sat.perigee < 220 && this.objectTypeFlags.reentryRiskHigh) {
      return {
        color: this.colorTheme.reentryRiskHigh,
        pickable: Pickable.Yes,
      };
    }
    if (sat.perigee >= 220 && sat.perigee < 300 && this.objectTypeFlags.reentryRiskMedium) {
      return {
        color: this.colorTheme.reentryRiskMedium,
        pickable: Pickable.Yes,
      };
    }
    if (sat.perigee >= 300 && sat.perigee < 400 && this.objectTypeFlags.reentryRiskLow) {
      return {
        color: this.colorTheme.reentryRiskLow,
        pickable: Pickable.Yes,
      };
    }
    if (sat.perigee >= 400 && this.objectTypeFlags.reentryRiskVeryLow) {
      return {
        color: this.colorTheme.reentryRiskVeryLow,
        pickable: Pickable.Yes,
      };
    }

    // Flag must have been turned off
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  static get layersHtml(): string {
    return html`
  <div class="layers-info-message" style="text-align: center; color: #666; font-size: 0.95em; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
    ${legendLabel('reentryInfo')}
  </div>
  <ul id="layers-list-rcs">
    <li>
      <div class="Square-Box layers-reentryRiskVeryHigh-box"></div>
      ${legendLabel('reentryImminent')}
    </li>
    <li>
      <div class="Square-Box layers-reentryRiskHigh-box"></div>
      ${legendLabel('reentryDays')}
    </li>
    <li>
      <div class="Square-Box layers-reentryRiskMedium-box"></div>
      ${legendLabel('reentryWeeks')}
    </li>
    <li>
      <div class="Square-Box layers-reentryRiskLow-box"></div>
      ${legendLabel('reentryMonths')}
    </li>
    <li>
      <div class="Square-Box layers-reentryRiskVeryLow-box"></div>
      ${legendLabel('noRisk')}
    </li>
  </ul>
  `.trim();
  }
}
