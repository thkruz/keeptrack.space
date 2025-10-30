/* eslint-disable complexity */
import { SunStatus } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { hideEl } from '@app/engine/utils/get-el';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, DetailedSatellite, Star } from '@ootk/src/main';
import { ColorScheme } from './color-scheme';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SunlightColorScheme extends ColorScheme {
  readonly label = 'Sunlight Status';
  readonly id = 'SunlightColorScheme';
  static readonly id = 'SunlightColorScheme';

  static readonly uniqueObjectTypeFlags = {
    satHi: true,
    satMed: true,
    satLow: true,
    sunlightFov: true,
    sensor: true,
  };

  static readonly uniqueColorTheme = {
    sunlight100: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    sunlight80: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    sunlight60: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    sunlightInview: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    umbral: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    penumbral: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
  };

  constructor() {
    super(SunlightColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...SunlightColorScheme.uniqueObjectTypeFlags,
    };
    EventBus.getInstance().on(
      EventBusEvent.onKeepTrackReady,
      (): void => {
        const catalogManagerInstance = ServiceLocator.getCatalogManager();
        const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

        if (colorSchemeManagerInstance.currentColorScheme === this) {
          catalogManagerInstance.satCruncher.postMessage({
            isSunlightView: true,
            typ: CruncerMessageTypes.SUNLIGHT_VIEW,
          });
        }
      },
    );

    EventBus.getInstance().on(EventBusEvent.layerUpdated, () => {
      if (settingsManager.isDisableSensors) {
        this.objectTypeFlags.sunlightFov = false;
        const sunlightFovBox = document.querySelector('.layers-sunlightFov-box')?.parentElement as HTMLElement;

        if (sunlightFovBox) {
          hideEl(sunlightFovBox);
        }
      }
    });
  }

  onSelected(): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    catalogManagerInstance.satCruncher.postMessage({
      isSunlightView: true,
      typ: CruncerMessageTypes.SUNLIGHT_VIEW,
    });
    waitForCruncher({
      cruncher: catalogManagerInstance.satCruncher,
      cb: () => {
        colorSchemeManagerInstance.setColorScheme(this, true);
      },
      validationFunc: (data) => data.satInSun,
    });
  }

  update(obj: BaseObject): ColorInformation {
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    if ((dotsManagerInstance.inSunData?.length ?? -1) < obj.id) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const checkFacility = this.checkFacility_(obj);

    if (checkFacility) {
      return checkFacility;
    }

    if (obj.isStar()) {
      return this.starColor_(obj as Star);
    }
    if (obj.isMarker()) {
      return this.getMarkerColor_();
    }

    if (obj.isSensor()) {
      if (this.objectTypeFlags.sensor === false) {
        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };
      }

      return {
        color: this.colorTheme.sensor,
        pickable: Pickable.Yes,
      };

    }

    if (obj.isMissile()) {
      return this.missileColor_(obj as MissileObject);
    }

    // In FOV
    if (dotsManagerInstance.inViewData?.[obj.id] === 1 && dotsManagerInstance.inSunData[obj.id] > 0 && this.objectTypeFlags.sunlightFov) {
      if (dotsManagerInstance.inSunData[obj.id] === 0) {
        if (this.objectTypeFlags.satLow) {
          return {
            color: this.colorTheme.umbral,
            pickable: Pickable.No,
          };
        }

        return {
          color: this.colorTheme.deselected,
          pickable: Pickable.No,
        };

      }

      // TODO: Work out a system for vmag filtering
      return {
        color: this.colorTheme.sunlightInview,
        pickable: Pickable.Yes,
      };
    }

    // Not in FOV
    const sat = obj as DetailedSatellite;

    if (!dotsManagerInstance.inViewData?.[sat.id]) {
      if (dotsManagerInstance.inSunData[sat.id] === SunStatus.SUN && this.objectTypeFlags.satHi) {
        if (sat.vmag !== null) {
          if (sat.vmag < 3) {
            return {
              color: this.colorTheme.sunlight100,
              pickable: Pickable.Yes,
            };
          }
          if (sat.vmag <= 4.5) {
            return {
              color: this.colorTheme.sunlight80,
              pickable: Pickable.Yes,
            };
          }
          if (sat.vmag > 4.5) {
            return {
              color: this.colorTheme.sunlight60,
              pickable: Pickable.Yes,
            };
          }
        }
        if (sat.isPayload()) {
          return {
            color: this.colorTheme.sunlight80,
            pickable: Pickable.Yes,
          };
        }
        if (sat.isRocketBody()) {
          return {
            color: this.colorTheme.sunlight100,
            pickable: Pickable.Yes,
          };
        }
        if (sat.isDebris()) {
          return {
            color: this.colorTheme.sunlight60,
            pickable: Pickable.Yes,
          };
        }

        return {
          color: this.colorTheme.sunlight60,
          pickable: Pickable.Yes,
        };
      }

      if (dotsManagerInstance.inSunData[sat.id] === SunStatus.PENUMBRAL && this.objectTypeFlags.satMed) {
        return {
          color: this.colorTheme.penumbral,
          pickable: Pickable.Yes,
        };
      }

      if (dotsManagerInstance.inSunData[sat.id] === SunStatus.UMBRAL && this.objectTypeFlags.satLow) {
        return {
          color: this.colorTheme.umbral,
          pickable: Pickable.No,
        };
      }

      // The color was deselected
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    // The color was deselected
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }

  static readonly layersHtml = html`
  <ul id="layers-list-sunlight">
    <li>
      <div class="Square-Box layers-satLow-box"></div>
      In Umbral
    </li>
    <li>
      <div class="Square-Box layers-satMed-box"></div>
      In Penumbral
    </li>
    <li>
      <div class="Square-Box layers-satHi-box"></div>
      In Sunlight
    </li>
    <li>
      <div class="Square-Box layers-sunlightFov-box"></div>
      Satellite in FOV
    </li>
    <li>
      <div class="Square-Box layers-facility-box"></div>
      Launch Site
    </li>
  </ul>
  `.trim();
}
