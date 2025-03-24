/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, DetailedSatellite, SpaceObjectType, Star } from 'ootk';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceAldoria: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourcePrismnet: rgbaArray;
  sourceVimpel: rgbaArray;
}

export class DensityColorScheme extends ColorScheme {
  colorTheme: Record<string, rgbaArray>;
  objectTypeFlags: Record<string, boolean>;
  label = 'Orbit Density';
  name = DensityColorScheme.name;

  static readonly uniqueObjectTypeFlags = {
    densityPayload: true,
    densityHi: true,
    densityMed: true,
    densityLow: true,
    densityOther: true,
  };

  static readonly uniqueColorTheme = {
    densityPayload: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    densityHi: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    densityMed: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    densityLow: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
    densityOther: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(DensityColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...DensityColorScheme.uniqueObjectTypeFlags,
    };
  }

  calculateParams() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    return {
      orbitDensity: catalogManagerInstance.orbitDensity,
      orbitDensityMax: catalogManagerInstance.orbitDensityMax,
    };
  }

  update(obj: BaseObject, params?: {
    orbitDensity: number[][];
    orbitDensityMax: number;
  }): ColorInformation {
    /*
     * NOSONAR
     * Hover and Select code might not pass params, so we will handle that here
     * TODO: Hover and select code should be refactored to pass params
     */
    if (!params) {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      params = {
        orbitDensity: catalogManagerInstance.orbitDensity,
        orbitDensityMax: catalogManagerInstance.orbitDensityMax,
      };
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }
    if (obj.isMissile()) {
      return {
        color: this.colorTheme.transparent,
        pickable: Pickable.No,
      };
    }

    const sat = obj as DetailedSatellite;

    if (sat.type === SpaceObjectType.PAYLOAD) {
      if (this.objectTypeFlags.densityPayload) {
        return {
          color: settingsManager.colors.densityPayload,
          pickable: Pickable.Yes,
        };
      }

      // Deselected
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };

    }

    const orbitDensity = params.orbitDensity[Math.round(sat.inclination)][Math.round(sat.period)];
    const density = orbitDensity / params.orbitDensityMax;

    if (this.objectTypeFlags.densityHi && density > 0.9) {
      return {
        color: settingsManager.colors.densityHi,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.densityMed && density > 0.55) {
      return {
        color: settingsManager.colors.densityMed,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.densityLow && density > 0.35) {
      return {
        color: settingsManager.colors.densityLow,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.densityOther) {
      return {
        color: settingsManager.colors.densityOther,
        pickable: Pickable.Yes,
      };
    }

    // Deselected
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  static readonly legendHtml = keepTrackApi.html`
  <ul id="legend-list-default-sensor">
    <li>
      <div class="Square-Box legend-densityPayload-box"></div>
      Payload
    </li>
    <li>
      <div class="Square-Box legend-densityHi-box"></div>
      High Orbit Density
    </li>
    <li>
      <div class="Square-Box legend-densityMed-box"></div>
      Med Orbit Density
    </li>
    <li>
      <div class="Square-Box legend-densityLow-box"></div>
      Low Orbit Density
    </li>
    <li>
      <div class="Square-Box legend-densityOther-box"></div>
      Other Debris
    </li>
  </ul>
  `.trim();
}
