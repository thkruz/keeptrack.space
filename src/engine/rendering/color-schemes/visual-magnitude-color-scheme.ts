/* eslint-disable complexity */
import { SatMath } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { Sun } from '@app/engine/rendering/draw-manager/sun';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import { ColorScheme } from './color-scheme';

export class VisualMagnitudeColorScheme extends ColorScheme {
  readonly label = t7e('colorSchemes.VisualMagnitudeColorScheme.label' as Parameters<typeof t7e>[0]);
  readonly id = 'VisualMagnitudeColorScheme';
  static readonly id = 'VisualMagnitudeColorScheme';

  static readonly uniqueObjectTypeFlags = {
    vmagBright: true,
    vmagBright2: true,
    vmagMed1: true,
    vmagMed2: true,
    vmagDim1: true,
    vmagDim2: true,
    vmagFaint: true,
    vmagUnknown: true,
  };

  static readonly uniqueColorTheme = {
    vmagBright: [0, 1.0, 0, 0.9] as rgbaArray,
    vmagBright2: [0.6, 0.996, 0, 0.9] as rgbaArray,
    vmagMed1: [0.8, 1.0, 0, 0.9] as rgbaArray,
    vmagMed2: [1.0, 1.0, 0, 0.9] as rgbaArray,
    vmagDim1: [1.0, 0.8, 0, 0.9] as rgbaArray,
    vmagDim2: [1.0, 0.6, 0, 0.9] as rgbaArray,
    vmagFaint: [1.0, 0, 0, 0.9] as rgbaArray,
    vmagUnknown: [0.5, 0.5, 0.5, 0.6] as rgbaArray,
  };

  // Cached per-recolor: set in calculateParams(), read in update()
  private sensor_: DetailedSensor | null = null;
  private sun_: Sun | null = null;
  private propTime_: Date | null = null;

  constructor() {
    super(VisualMagnitudeColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...VisualMagnitudeColorScheme.uniqueObjectTypeFlags,
    };
  }

  override calculateParams() {
    const sensorManager = ServiceLocator.getSensorManager();

    this.sensor_ = sensorManager?.isSensorSelected() ? sensorManager.getSensor() : null;
    this.sun_ = Scene.getInstance().sun ?? null;
    this.propTime_ = ServiceLocator.getTimeManager()?.simulationTimeObj ?? null;

    return null;
  }

  update(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return { color: this.colorTheme.transparent, pickable: Pickable.No };
    }

    const sat = obj as Satellite;

    let mag: number | null = null;

    if (this.sensor_ && this.sun_ && this.propTime_) {
      try {
        mag = SatMath.calculateVisMag(sat, this.sensor_, this.propTime_, this.sun_);
      } catch {
        mag = null;
      }
    }

    if (mag === null) {
      mag = typeof sat.vmag === 'number' ? sat.vmag : null;
    }

    if (mag === null) {
      if (this.objectTypeFlags.vmagUnknown) {
        return {
          color: this.colorTheme.vmagUnknown,
          pickable: Pickable.Yes,
        };
      }

      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (mag < 0 && this.objectTypeFlags.vmagBright) {
      return {
        color: this.colorTheme.vmagBright,
        pickable: Pickable.Yes,
      };
    }
    if (mag >= 0 && mag < 3 && this.objectTypeFlags.vmagBright2) {
      return {
        color: this.colorTheme.vmagBright2,
        pickable: Pickable.Yes,
      };
    }
    if (mag >= 3 && mag < 4.5 && this.objectTypeFlags.vmagMed1) {
      return {
        color: this.colorTheme.vmagMed1,
        pickable: Pickable.Yes,
      };
    }
    if (mag >= 4.5 && mag < 6 && this.objectTypeFlags.vmagMed2) {
      return {
        color: this.colorTheme.vmagMed2,
        pickable: Pickable.Yes,
      };
    }
    if (mag >= 6 && mag < 7.5 && this.objectTypeFlags.vmagDim1) {
      return {
        color: this.colorTheme.vmagDim1,
        pickable: Pickable.Yes,
      };
    }
    if (mag >= 7.5 && mag < 9 && this.objectTypeFlags.vmagDim2) {
      return {
        color: this.colorTheme.vmagDim2,
        pickable: Pickable.Yes,
      };
    }
    if (mag >= 9 && this.objectTypeFlags.vmagFaint) {
      return {
        color: this.colorTheme.vmagFaint,
        pickable: Pickable.Yes,
      };
    }

    // Flag must have been turned off
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  static readonly layersHtml = html`
  <ul id="layers-list-vmag">
    <li>
      <div class="Square-Box layers-vmagBright-box"></div>
      Brighter Than 0
    </li>
    <li>
      <div class="Square-Box layers-vmagBright2-box"></div>
      Between 0 and 3
    </li>
    <li>
      <div class="Square-Box layers-vmagMed1-box"></div>
      Between 3 and 4.5
    </li>
    <li>
      <div class="Square-Box layers-vmagMed2-box"></div>
      Between 4.5 and 6
    </li>
    <li>
      <div class="Square-Box layers-vmagDim1-box"></div>
      Between 6 and 7.5
    </li>
    <li>
      <div class="Square-Box layers-vmagDim2-box"></div>
      Between 7.5 and 9
    </li>
    <li>
      <div class="Square-Box layers-vmagFaint-box"></div>
      Dimmer Than 9
    </li>
    <li>
      <div class="Square-Box layers-vmagUnknown-box"></div>
      No Public Data
    </li>
  </ul>
  `.trim();
}
