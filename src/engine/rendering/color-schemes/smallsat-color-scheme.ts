/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { BaseObject, DetailedSatellite, SpaceObjectType } from '@ootk/src/main';
import { ColorScheme } from './color-scheme';

export class SmallSatColorScheme extends ColorScheme {
  readonly label = 'Small Satellites';
  readonly id = 'SmallSatColorScheme';
  static readonly id = 'SmallSatColorScheme';
  isOptionInRmbMenu = false;

  static readonly uniqueObjectTypeFlags = {
    satSmall: true,
  };

  static readonly uniqueColorTheme = {
    satSmall: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(SmallSatColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...SmallSatColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return { color: this.colorTheme.transparent, pickable: Pickable.No };
    }

    const sat = obj as DetailedSatellite;

    // Check if it is a small payload
    if (sat.rcs && sat.rcs < 0.5 && sat.type === SpaceObjectType.PAYLOAD) {
      if (!this.objectTypeFlags.satSmall) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: this.colorTheme.satSmall,
        pickable: Pickable.Yes,
      };
    }

    return {
      color: this.colorTheme.transparent,
      pickable: Pickable.No,
    };

  }

  static readonly layersHtml = html`
  <ul id="layers-list-small">
    <li>
      <div class="Square-Box layers-satSmall-box"></div>
      Small Satellite
    </li>
  </ul>
  `.trim();
}
