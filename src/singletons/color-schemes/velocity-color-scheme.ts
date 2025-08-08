/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, Star } from 'ootk';
import { ColorScheme } from './color-scheme';

export class VelocityColorScheme extends ColorScheme {
  readonly label = 'Velocity';
  readonly id = 'VelocityColorScheme';
  static readonly id = 'VelocityColorScheme';
  isOptionInRmbMenu = false;

  static readonly uniqueObjectTypeFlags = {
    velocitySlow: true,
    velocityMed: true,
    velocityFast: true,
  };

  static readonly uniqueColorTheme = {
    velocitySlow: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
    velocityMed: [1.0, 0.5, 0.0, 1.0] as rgbaArray,
    velocityFast: [1.0, 1.0, 0.0, 1.0] as rgbaArray,
    deselected: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
    inFOVAlt: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
    selected: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
    sensor: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(VelocityColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...VelocityColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    // Sensors
    if (obj.isSensor()) {
      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };
    }

    const dotsManagerInstance = keepTrackApi.getDotsManager();

    if (dotsManagerInstance.inViewData?.[obj.id] === 1) {
      if (this.objectTypeFlags.inViewAlt === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: this.colorTheme.inFOVAlt,
        pickable: Pickable.Yes,
      };

    }
    if (obj.totalVelocity > 5.5 && this.objectTypeFlags.velocityFast === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.totalVelocity >= 2.5 && obj.totalVelocity <= 5.5 && this.objectTypeFlags.velocityMed === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }
    if (obj.totalVelocity < 2.5 && this.objectTypeFlags.velocitySlow === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: [1.0 - Math.min(obj.totalVelocity / 15, 1.0), Math.min(obj.totalVelocity / 15, 1.0), 0.0, 1.0],
      pickable: Pickable.Yes,
    };
  }

  static readonly legendHtml = keepTrackApi.html`
  <ul id="legend-list-velocity">
    <li>
      <div class="Square-Box legend-velocityFast-box"></div>
      ~7 km/s Velocity
    </li>
    <li>
      <div class="Square-Box legend-velocityMed-box"></div>
      ~4 km/s Velocity
    </li>
    <li>
      <div class="Square-Box legend-velocitySlow-box"></div>
      ~1 km/s Velocity
    </li>
  </ul>
  `.trim();
}
