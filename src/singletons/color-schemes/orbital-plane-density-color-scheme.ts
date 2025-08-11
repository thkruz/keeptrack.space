/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, DetailedSatellite, Star } from 'ootk';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  sourceUssf: rgbaArray;
  sourceAldoria: rgbaArray;
  sourceCelestrak: rgbaArray;
  sourcePrismnet: rgbaArray;
  sourceVimpel: rgbaArray;
}

export class OrbitalPlaneDensityColorScheme extends ColorScheme {
  readonly label = 'Orbital Plane Density';
  readonly id = 'OrbitalPlaneDensityColorScheme';
  static readonly id = 'OrbitalPlaneDensityColorScheme';

  static readonly uniqueObjectTypeFlags = {
    orbitalPlaneDensityHi: true,
    orbitalPlaneDensityMed: true,
    orbitalPlaneDensityLow: true,
    orbitalPlaneDensityOther: true,
  };

  static readonly uniqueColorTheme = {
    orbitalPlaneDensityHi: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
    orbitalPlaneDensityMed: [1.0, 0.5, 0.0, 1.0] as rgbaArray,
    orbitalPlaneDensityLow: [1.0, 1.0, 0.0, 1.0] as rgbaArray,
    orbitalPlaneDensityOther: [1.0, 1.0, 1.0, 0.3] as rgbaArray,
  };

  constructor() {
    super(OrbitalPlaneDensityColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...OrbitalPlaneDensityColorScheme.uniqueObjectTypeFlags,
    };
  }

  calculateParams() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    return {
      orbitalPlaneDensity: catalogManagerInstance.orbitalPlaneDensity,
      orbitalPlaneDensityMax: catalogManagerInstance.orbitalPlaneDensityMax,
    };
  }

  update(obj: BaseObject, params?: {
    orbitalPlaneDensity: number[][];
    orbitalPlaneDensityMax: number;
  }): ColorInformation {
    /*
     * NOSONAR
     * Hover and Select code might not pass params, so we will handle that here
     * TODO: Hover and select code should be refactored to pass params
     */
    if (!params) {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();

      params = {
        orbitalPlaneDensity: catalogManagerInstance.orbitalPlaneDensity,
        orbitalPlaneDensityMax: catalogManagerInstance.orbitalPlaneDensityMax,
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
    const inc = Math.floor(sat.inclination / 2) * 2;
    const alt = Math.floor(((sat.apogee + sat.perigee) / 2) / 25) * 25;
    const orbitDensity = params.orbitalPlaneDensity[inc][alt];
    const density = orbitDensity / params.orbitalPlaneDensityMax;

    if (this.objectTypeFlags.orbitalPlaneDensityHi && density > 0.75) {
      return {
        color: settingsManager.colors.orbitalPlaneDensityHi ?? this.colorTheme.orbitalPlaneDensityHi,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.orbitalPlaneDensityMed && density > 0.25) {
      return {
        color: settingsManager.colors.orbitalPlaneDensityMed ?? this.colorTheme.orbitalPlaneDensityMed,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.orbitalPlaneDensityLow && density > 0.10) {
      return {
        color: settingsManager.colors.orbitalPlaneDensityLow ?? this.colorTheme.orbitalPlaneDensityLow,
        pickable: Pickable.Yes,
      };
    } else if (this.objectTypeFlags.orbitalPlaneDensityOther) {
      return {
        color: settingsManager.colors.orbitalPlaneDensityOther ?? this.colorTheme.orbitalPlaneDensityOther,
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
  <ul id="legend-list-orbitalPlaneDensity">
    <li>
      <div class="Square-Box legend-orbitalPlaneDensityHi-box"></div>
      High Orbit Density
    </li>
    <li>
      <div class="Square-Box legend-orbitalPlaneDensityMed-box"></div>
      Med Orbit Density
    </li>
    <li>
      <div class="Square-Box legend-orbitalPlaneDensityLow-box"></div>
      Low Orbit Density
    </li>
    <li>
      <div class="Square-Box legend-orbitalPlaneDensityOther-box"></div>
      Other Debris
    </li>
  </ul>
  `.trim();
}
