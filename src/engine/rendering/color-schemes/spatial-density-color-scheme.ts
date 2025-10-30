/* eslint-disable complexity */
import { DensityBin } from '@app/app/data/catalog-manager';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { BaseObject, DetailedSatellite, Star } from '@ootk/src/main';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';
import { ServiceLocator } from '@app/engine/core/service-locator';

export interface SourceColorSchemeColorMap extends ColorSchemeColorMap {
  spatialDensityLow: rgbaArray;
  densityMed: rgbaArray;
  densityHi: rgbaArray;
  densityOther: rgbaArray;
  sensorAlt: rgbaArray;
}

export class SpatialDensityColorScheme extends ColorScheme {
  readonly label = 'Spatial Density';
  readonly id = 'SpatialDensityColorScheme';
  static readonly id = 'SpatialDensityColorScheme';

  static readonly uniqueObjectTypeFlags = {
    spatialDensityHi: true,
    spatialDensityMed: true,
    spatialDensityLow: true,
    spatialDensityOther: true,
  };

  static readonly uniqueColorTheme = {
    spatialDensityHi: [1, 0, 0, 1] as rgbaArray,
    spatialDensityMed: [1, 0.4, 0, 1] as rgbaArray,
    spatialDensityLow: [1, 1, 0, 0.9] as rgbaArray,
    spatialDensityOther: [0.8, 0.8, 0.8, 0.3] as rgbaArray,
    sensorAlt: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
  };

  private readonly lowDensityThreshold = 1.0e-8;
  private readonly mediumDensityThreshold = 1.0e-7;
  private readonly highDensityThreshold = 1.5e-7;

  constructor() {
    super(SpatialDensityColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...SpatialDensityColorScheme.uniqueObjectTypeFlags,
    };
  }

  calculateParams() {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    return {
      orbitDensity: catalogManagerInstance.orbitDensity,
      orbitDensityMax: catalogManagerInstance.orbitDensityMax,
    };
  }

  update(obj: BaseObject, params?: {
    orbitDensity: DensityBin[];
    orbitDensityMax: number;
  }): ColorInformation {
    /*
     * NOSONAR
     * Hover and Select code might not pass params, so we will handle that here
     * TODO: Hover and select code should be refactored to pass params
     */
    if (!params) {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

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
        color: this.colorTheme.sensorAlt,
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
    const altitude = (sat.apogee + sat.perigee) / 2;
    /*
     * orbit density bins are 25km apart starting at 75 and end at 1050. Find the bin
     * that is closest to the altitude
     */

    const bin = Math.floor((altitude - 75) / 25);
    let orbitDensity = 0;

    if (bin <= 76) {
      if (altitude < params.orbitDensity[bin].minAltitude || altitude > params.orbitDensity[bin].maxAltitude) {
        throw new Error(`Altitude ${altitude} is out of range for bin ${bin}`);
      }

      orbitDensity = params.orbitDensity[bin].density;

      if (this.objectTypeFlags.spatialDensityHi && orbitDensity > this.highDensityThreshold) {
        return {
          color: settingsManager.colors.spatialDensityHi,
          pickable: Pickable.Yes,
        };
      } else if (this.objectTypeFlags.spatialDensityMed && orbitDensity > this.mediumDensityThreshold && orbitDensity <= this.highDensityThreshold) {
        return {
          color: settingsManager.colors.spatialDensityMed,
          pickable: Pickable.Yes,
        };
      } else if (this.objectTypeFlags.spatialDensityLow && orbitDensity > this.lowDensityThreshold && orbitDensity <= this.mediumDensityThreshold) {
        return {
          color: settingsManager.colors.spatialDensityLow,
          pickable: Pickable.Yes,
        };
      }
    }

    if (this.objectTypeFlags.spatialDensityOther && orbitDensity <= this.lowDensityThreshold) {
      return {
        color: settingsManager.colors.spatialDensityOther,
        pickable: Pickable.Yes,
      };
    }

    // Deselected
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  static readonly layersHtml = html`
  <ul id="layers-list-spatialDensityHi">
    <li>
      <div class="Square-Box layers-spatialDensityHi-box"></div>
      High Orbit Density
    </li>
    <li>
      <div class="Square-Box layers-spatialDensityMed-box"></div>
      Med Orbit Density
    </li>
    <li>
      <div class="Square-Box layers-spatialDensityLow-box"></div>
      Low Orbit Density
    </li>
    <li>
      <div class="Square-Box layers-spatialDensityOther-box"></div>
      Other Orbit Density
    </li>
  </ul>
  `.trim();
}
