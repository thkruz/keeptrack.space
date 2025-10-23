/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { BaseObject, Days, DetailedSatellite, getDayOfYear, Star } from '@ootk/src/main';
import { errorManagerInstance } from '../../utils/errorManager';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';
import { html } from '@app/engine/utils/development/formatter';

export interface GpAgeColorSchemeColorMap extends ColorSchemeColorMap {
  age1: rgbaArray;
  age2: rgbaArray;
  age3: rgbaArray;
  age4: rgbaArray;
  age5: rgbaArray;
  age6: rgbaArray;
  age7: rgbaArray;
}

export class GpAgeColorScheme extends ColorScheme {
  readonly label = 'GP Age';
  readonly id = 'GpAgeColorScheme';
  static readonly id = 'GpAgeColorScheme';

  static readonly uniqueObjectTypeFlags = {
    age1: true,
    age2: true,
    age3: true,
    age4: true,
    age5: true,
    age6: true,
    age7: true,
  };

  static readonly uniqueColorTheme = {
    age1: [0, 1.0, 0, 0.9] as rgbaArray,
    age2: [0.6, 0.996, 0, 0.9] as rgbaArray,
    age3: [0.8, 1.0, 0, 0.9] as rgbaArray,
    age4: [1.0, 1.0, 0, 0.9] as rgbaArray,
    age5: [1.0, 0.8, 0.0, 0.9] as rgbaArray,
    age6: [1.0, 0.6, 0.0, 0.9] as rgbaArray,
    age7: [1.0, 0.0, 0.0, 0.9] as rgbaArray,
  };

  constructor() {
    super(GpAgeColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...GpAgeColorScheme.uniqueObjectTypeFlags,
    };
  }

  override calculateParams() {
    const now = new Date();

    return {
      jday: getDayOfYear(now) + ((now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) / 86400),
      year: parseInt(now.getUTCFullYear().toString().substr(2, 2), 10),
    };
  }

  update(
    obj: BaseObject,
    params?: {
      jday?: number;
      year?: number;
    },
  ): ColorInformation {
    /*
     * Hover and Select code might not pass params, so we will handle that here
     * TODO: Hover and select code should be refactored to pass params
     */

    if (!params) {
      errorManagerInstance.debug('No params passed to ageOfElset');
      const now = new Date();

      params = {
        jday: getDayOfYear(now) + ((now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) / 86400),
        year: parseInt(now.getUTCFullYear().toString().substr(2, 2), 10),
      };
    }

    const jday = params?.jday ?? 0;
    const currentYearShort = params?.year ?? 0;

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
    const epochYearShort = parseInt(sat.tle1.substring(18, 20), 10);
    const epochDay = parseFloat(sat.tle1.substring(20, 32));

    const epochYearFull = epochYearShort <= currentYearShort ? 2000 + epochYearShort : 1900 + epochYearShort;
    const currentYearFull = 2000 + currentYearShort;

    const epochJday = epochDay + (epochYearFull * 365);
    const currentJday = jday + (currentYearFull * 365);
    const daysOld = (currentJday) - epochJday as Days;

    if (daysOld < 0.5 && this.objectTypeFlags.age1) {
      return {
        color: this.colorTheme.age1,
        pickable: Pickable.Yes,
      };
    }

    if (daysOld >= 0.5 && daysOld < 1.0 && this.objectTypeFlags.age2) {
      return {
        color: this.colorTheme.age2,
        pickable: Pickable.Yes,
      };
    }
    if (daysOld >= 1.0 && daysOld < 1.5 && this.objectTypeFlags.age3) {
      return {
        color: this.colorTheme.age3,
        pickable: Pickable.Yes,
      };
    }
    if (daysOld >= 1.5 && daysOld < 2.0 && this.objectTypeFlags.age4) {
      return {
        color: this.colorTheme.age4,
        pickable: Pickable.Yes,
      };
    }
    if (daysOld >= 2.0 && daysOld < 2.5 && this.objectTypeFlags.age5) {
      return {
        color: this.colorTheme.age5,
        pickable: Pickable.Yes,
      };
    }
    if (daysOld >= 2.5 && daysOld < 3.0 && this.objectTypeFlags.age6) {
      return {
        color: this.colorTheme.age6,
        pickable: Pickable.Yes,
      };
    }
    if (daysOld >= 3.0 && this.objectTypeFlags.age7) {
      return {
        color: this.colorTheme.age7,
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
  <ul id="layers-list-ageOfElset">
    <li>
      <div class="Square-Box layers-age1-box"></div>
      Less Than 0.5 Days
    </li>
    <li>
      <div class="Square-Box layers-age2-box"></div>
      Between 0.5 and 1 Days
    </li>
    <li>
      <div class="Square-Box layers-age3-box"></div>
      Between 1 and 1.5 Days
    </li>
    <li>
      <div class="Square-Box layers-age4-box"></div>
      Between 1.5 and 2 Days
    </li>
    <li>
      <div class="Square-Box layers-age5-box"></div>
      Between 2 and 2.5 Days
    </li>
    <li>
      <div class="Square-Box layers-age6-box"></div>
      Between 2.5 and 3 Days
    </li>
    <li>
      <div class="Square-Box layers-age7-box"></div>
      More Than 3 Days
    </li>
  </ul>
  `.trim();
}
