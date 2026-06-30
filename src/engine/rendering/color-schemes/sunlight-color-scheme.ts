/* eslint-disable complexity */
import { SunStatus } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { hideEl } from '@app/engine/utils/get-el';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite, Star } from '@ootk/src/main';
import { ColorScheme } from './color-scheme';

export class SunlightColorScheme extends ColorScheme {
  readonly label = t7e('colorSchemes.SunlightColorScheme.label' as Parameters<typeof t7e>[0]);
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
    sunlightFov: [1.0, 0.5, 0.0, 0.8] as rgbaArray,
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
          catalogManagerInstance.satCruncherThread.sendSunlightViewToggle(true);
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

    catalogManagerInstance.satCruncherThread.sendSunlightViewToggle(true);
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

    if ((dotsManagerInstance.inSunData?.length ?? -1) < Number(obj.id)) {
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
    if (dotsManagerInstance.inViewData?.[obj.id] === 1) {
      return this.getInViewColor_(obj);
    }

    // Not in FOV
    return this.getNotInViewColor_(obj as Satellite);
  }

  private getInViewColor_(obj: BaseObject): ColorInformation {
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    if (this.objectTypeFlags.sunlightFov === false) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    if (dotsManagerInstance.inSunData[obj.id] > 0) {
      // TODO: Work out a system for vmag filtering
      return {
        color: this.colorTheme.sunlightInview,
        pickable: Pickable.Yes,
      };
    }

    // In FOV but in umbral
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

  private getNotInViewColor_(sat: Satellite): ColorInformation {
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    if (dotsManagerInstance.inViewData?.[sat.id]) {
      // The color was deselected
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const sunStatus = dotsManagerInstance.inSunData[sat.id];

    if (sunStatus === SunStatus.SUN && this.objectTypeFlags.satHi) {
      return this.getSunlitSatColor_(sat);
    }

    if (sunStatus === SunStatus.PENUMBRAL && this.objectTypeFlags.satMed) {
      return {
        color: this.colorTheme.penumbral,
        pickable: Pickable.Yes,
      };
    }

    if (sunStatus === SunStatus.UMBRAL && this.objectTypeFlags.satLow) {
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

  private getSunlitSatColor_(sat: Satellite): ColorInformation {
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
