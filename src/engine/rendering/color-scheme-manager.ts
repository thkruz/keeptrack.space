/* eslint-disable complexity */
/* eslint-disable newline-before-return */
/* eslint-disable max-lines */
/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { ColorRuleSet } from '@app/engine/core/interfaces';
import { ColorInformation, Pickable, rgbaArray } from '../core/interfaces';
import { errorManagerInstance } from '../utils/errorManager';
import { getEl, hideEl } from '../utils/get-el';

import { DensityBin } from '@app/app/data/catalog-manager';
import { ColorCruncherThreadManager } from '@app/app/threads/color-cruncher-thread-manager';
import { LayersManager } from '@app/app/ui/layers-manager';
import { UrlManager } from '@app/engine/input/url-manager';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CatalogSource, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';
import { TimeMachine } from '../../plugins/time-machine/time-machine';
import { PluginRegistry } from '../core/plugin-registry';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { BaseObject } from '../ootk/src/objects';
import { PersistenceManager, StorageKey } from '../utils/persistence-manager';
import { CelestrakColorScheme } from './color-schemes/celestrak-color-scheme';
import { ColorScheme, ColorSchemeColorMap, ColorSchemeParams } from './color-schemes/color-scheme';
import { ConfidenceColorScheme } from './color-schemes/confidence-color-scheme';
import { CountryColorScheme } from './color-schemes/country-color-scheme';
import { GpAgeColorScheme } from './color-schemes/gp-age-color-scheme';
import { MissionColorScheme } from './color-schemes/mission-color-scheme';
import { ObjectTypeColorScheme, ObjectTypeColorSchemeColorMap } from './color-schemes/object-type-color-scheme';
import { OrbitalPlaneDensityColorScheme } from './color-schemes/orbital-plane-density-color-scheme';
import { RcsColorScheme } from './color-schemes/rcs-color-scheme';
import { ReentryRiskColorScheme } from './color-schemes/reentry-risk-color-scheme';
import { SmallSatColorScheme } from './color-schemes/smallsat-color-scheme';
import { SourceColorScheme } from './color-schemes/source-color-scheme';
import { SpatialDensityColorScheme } from './color-schemes/spatial-density-color-scheme';
import { StarlinkColorScheme } from './color-schemes/starlink-color-scheme';
import { SunlightColorScheme } from './color-schemes/sunlight-color-scheme';
import { VelocityColorScheme } from './color-schemes/velocity-color-scheme';
import { VisualMagnitudeColorScheme } from './color-schemes/visual-magnitude-color-scheme';
import { buildColorDataArrays } from './color-worker/color-data-builder';
import { FilterState, SettingsFlags } from './color-worker/color-worker-messages';
import { WebGLRenderer } from './webgl-renderer';

export class ColorSchemeManager {
  // This is where you confiure addon color schemes
  readonly colorSchemeInstances = {
    CelestrakColorScheme: new CelestrakColorScheme(),
    ObjectTypeColorScheme: new ObjectTypeColorScheme(),
    CountryColorScheme: new CountryColorScheme(),
    RcsColorScheme: new RcsColorScheme(),
    ReentryRiskColorScheme: new ReentryRiskColorScheme(),
    MissionColorScheme: new MissionColorScheme(),
    ConfidenceColorScheme: new ConfidenceColorScheme(),
    OrbitalPlaneDensityColorScheme: new OrbitalPlaneDensityColorScheme(),
    SpatialDensityColorScheme: new SpatialDensityColorScheme(),
    SunlightColorScheme: new SunlightColorScheme(),
    GpAgeColorScheme: new GpAgeColorScheme(),
    SourceColorScheme: new SourceColorScheme(),
    VelocityColorScheme: new VelocityColorScheme(),
    StarlinkColorScheme: new StarlinkColorScheme(),
    SmallSatColorScheme: new SmallSatColorScheme(),
    VisualMagnitudeColorScheme: new VisualMagnitudeColorScheme(),
  };
  private readonly DOTS_PER_CALC = 350;
  private gl_: WebGL2RenderingContext;
  currentColorScheme: ColorScheme = this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? Object.values(this.colorSchemeInstances)[0];
  lastColorScheme: ColorScheme = this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? Object.values(this.colorSchemeInstances)[0];
  isUseGroupColorScheme = false;
  colorBuffer: WebGLBuffer | null = null;
  colorBufferOneTime = false;
  // Colors are all 0-255
  colorData = new Float32Array(0);
  /** Clean color data before FOV fade overlay — used to avoid compounding alpha multiplication. */
  private cleanColorData_: Float32Array | null = null;
  /** Per-satellite alpha multiplier overlay (0–1). Applied before GPU upload. */
  private fovFadeAlpha_: Float32Array | null = null;
  colorTheme: ColorSchemeColorMap & ObjectTypeColorSchemeColorMap;
  /**
   * This is the update function that will be used color the dots
   * it should be set to either the colorscheme class's update function or the group update function
   */
  currentColorSchemeUpdate: ColorRuleSet;
  iSensor = 0;
  isReady = false;
  lastDotColored = 0;
  objectTypeFlags = {
    starLow: true,
    starMed: true,
    starHi: true,
    inViewAlt: true,
    sensor: true,
    inFOV: true,
  };
  pickableBuffer: WebGLBuffer | null = null;
  pickableBufferOneTime = false;
  pickableData = new Int8Array(0);
  private hasRegisteredOffsetListener_ = false;

  // ─── Worker Mode ───────────────────────────────────────────────────────
  private colorCruncher_: ColorCruncherThreadManager | null = null;
  private useWorkerMode_ = false;
  private workerReady_ = false; // true once worker has received catalog; useWorkerMode_ can be toggled per-scheme
  private catalogSeqNum_ = 0;

  /** Scheme IDs the color worker knows how to compute. Plugin schemes not in this set fall back to main-thread. */
  private static readonly WORKER_SUPPORTED_SCHEMES_ = new Set([
    'ObjectTypeColorScheme',
    'CelestrakColorScheme',
    'CountryColorScheme',
    'VelocityColorScheme',
    'SunlightColorScheme',
    // RcsColorScheme intentionally excluded: it relies on the estimator
    // cascade (preset → catalog-mining → geometric → vmag-derived) which only
    // runs on the main thread. The worker's `rcsScheme` only reads the raw
    // catalog rcs and would show every object without a published value as
    // Unknown, defeating the point of the estimator. The performance cost of
    // main-thread coloring is acceptable here because recolors are
    // infrequent (scheme change, settings change, sensor change).
    'ConfidenceColorScheme',
    'GpAgeColorScheme',
    'MissionColorScheme',
    'ReentryRiskColorScheme',
    'SpatialDensityColorScheme',
    'OrbitalPlaneDensityColorScheme',
    'SourceColorScheme',
    'StarlinkColorScheme',
    'SmallSatColorScheme',
  ]);

  /**
   * Resets buffer flags and color data so that the next onCruncherReady
   * event re-creates everything for a new catalog.
   */
  resetForCatalogSwap(): void {
    this.colorBufferOneTime = false;
    this.pickableBufferOneTime = false;
    this.colorData = new Float32Array(0);
    this.pickableData = new Int8Array(0);
    this.isReady = false;
    this.lastDotColored = 0;
    // Worker will receive new catalog on next onCruncherReady
    this.useWorkerMode_ = false;
    this.workerReady_ = false;
  }

  calcColorBufsNextCruncher(): void {
    waitForCruncher({
      cruncher: ServiceLocator.getCatalogManager().satCruncher,
      cb: () => {
        ServiceLocator.getColorSchemeManager().calculateColorBuffers();
      },
      validationFunc: (m: PositionCruncherOutgoingMsg) => (!!((m.satInView?.length && m.satInView?.length > 0))),
      skipNumber: 2,
      isRunCbOnFailure: true,
      maxRetries: 5,
    });
  }

  calculateColorBuffers(isForceRecolor = false): void {
    try {
      /*
       * These two variables only need to be set once, but we want to make sure they aren't called before the satellites
       * are loaded into catalogManagerInstance. Don't move the buffer data creation into the constructor!
       */
      if (this.pickableData.length === 0 || this.colorData.length === 0) {
        return;
      }

      // In worker mode, delegate to the color worker instead of running main-thread loop
      if (this.useWorkerMode_ && this.colorCruncher_) {
        if (isForceRecolor) {
          this.sendAllStateToWorker_();
          this.colorCruncher_.sendForceRecolor();
        }

        return;
      }

      // Revert colorscheme if search box is empty
      this.preValidateColorScheme_(isForceRecolor);

      if (this.isUseGroupColorScheme) {
        // current.updateGroup -> current.update -> settings.default.updateGroupupdateGroup -> default.updateGroup
        this.currentColorSchemeUpdate = this.currentColorScheme.updateGroup ?? this.currentColorScheme.update ??
          this.colorSchemeInstances[settingsManager.defaultColorScheme].updateGroup ?? Object.values(this.colorSchemeInstances)[0].updateGroup;

        // If the group color scheme is the same as the current color scheme, then we don't need to use the group color scheme
        if (this.currentColorSchemeUpdate === this.currentColorScheme.update) {
          this.isUseGroupColorScheme = false;
        }
      } else {
        // current.update -> settings.default.update -> default.update
        this.currentColorSchemeUpdate = this.currentColorScheme.update ?? this.colorSchemeInstances[settingsManager.defaultColorScheme].update ??
          Object.values(this.colorSchemeInstances)[0].update;
      }

      // Figure out if we are coloring all of the dots - assume yes initially
      const { firstDotToColor, lastDotToColor } = this.calcFirstAndLastDot_(isForceRecolor);


      // Reset Which Sensor we are coloring before the loop begins
      if (firstDotToColor === 0) {
        this.iSensor = 0;
      }

      // Restore clean (pre-overlay) color data before the scheme loop so that
      // dots NOT recolored in this partial batch start from un-overlaid values.
      // Without this, partial updates compound the overlay on untouched dots.
      if (this.fovFadeAlpha_ && this.cleanColorData_ && this.cleanColorData_.length === this.colorData.length) {
        this.colorData.set(this.cleanColorData_);
      }

      // Lets loop through all the satellites and color them in one by one
      const params = this.calculateParams_();
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      // Velocity is a special case - we need to know the velocity of each satellite
      if (this.currentColorScheme?.id === VelocityColorScheme.id) {
        // We also need the velocity data if we are trying to colorizing that
        const dotsManagerInstance = ServiceLocator.getDotsManager();
        const satVel: Float32Array | null = this.currentColorScheme?.id === VelocityColorScheme.id ? dotsManagerInstance.getSatVel() : null;

        this.calculateBufferDataVelocity_(firstDotToColor, lastDotToColor, catalogManagerInstance.objectCache, satVel as Float32Array, params);
      } else {
        this.calculateBufferDataLoop_(firstDotToColor, lastDotToColor, catalogManagerInstance.objectCache, params);
      }

      // Save clean copy after loop (before overlay) so setFovFadeAlpha can reapply without compounding
      if (this.fovFadeAlpha_) {
        if (!this.cleanColorData_ || this.cleanColorData_.length !== this.colorData.length) {
          this.cleanColorData_ = new Float32Array(this.colorData.length);
        }
        this.cleanColorData_.set(this.colorData);
      }
      // If we don't do this then every time the color refreshes it will undo any effect being applied outside of this loop
      this.applyFovFadeOverlay_();
      this.setSelectedAndHoverBuffer_();
      this.sendColorBufferToGpu();

      // Save the color scheme if needed
      if (this.currentColorScheme?.id && this.lastColorScheme?.id !== this.currentColorScheme?.id) {
        UrlManager.updateURL();
        PersistenceManager.getInstance().saveItem(StorageKey.COLOR_SCHEME, this.currentColorScheme.id);
        // Note the colorscheme for next time
        this.lastColorScheme = this.currentColorScheme;
      }
    } catch (e) {
      this.currentColorScheme ??= this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? Object.values(this.colorSchemeInstances)[0];
      this.lastColorScheme = this.currentColorScheme;
      this.isUseGroupColorScheme = false;
      errorManagerInstance.debug(e);
    }
  }

  init(renderer: WebGLRenderer, threadsRegistry?: WebWorkerThreadManager[]): void {
    this.gl_ = renderer.gl;
    this.colorTheme = settingsManager.colors ?? <ColorSchemeColorMap & ObjectTypeColorSchemeColorMap>{
      transparent: [0, 0, 0, 0] as rgbaArray,
      deselected: [0.0, 0.0, 0.0, 0.0] as rgbaArray,
      starLow: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      starMed: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      starHi: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      analyst: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      facility: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      missile: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      missileInview: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
      gradientAmt: 0.0,
      inFOVAlt: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      inGroup: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
      length: 0,
      marker: [[0.0, 0.0, 0.0, 1.0]] as rgbaArray[],
      version: '0',
      notional: [0.0, 0.0, 0.0, 1.0] as rgbaArray,
    };

    this.resetObjectTypeFlags();
    this.colorBuffer = renderer.gl.createBuffer();
    this.pickableBuffer = renderer.gl.createBuffer();

    // Initialize color worker if registry is provided
    if (threadsRegistry) {
      this.initColorWorker_(threadsRegistry);
    }

    // Create the color buffers as soon as the position cruncher is ready
    EventBus.getInstance().on(
      EventBusEvent.onCruncherReady,
      (): void => {
        const catalogManagerInstance = ServiceLocator.getCatalogManager();
        const cachedColorScheme = PersistenceManager.getInstance().getItem(StorageKey.COLOR_SCHEME);
        let possibleColorScheme: ColorScheme | null = null;

        /*
         * We don't want to reload a cached group color scheme because we might not have a search
         * this can result in all dots turning black
         */
        if (cachedColorScheme) {
          LayersManager.change(cachedColorScheme);
          possibleColorScheme = this.colorSchemeInstances[cachedColorScheme] as ColorScheme;
        }
        this.currentColorScheme = possibleColorScheme ?? this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? Object.values(this.colorSchemeInstances)[0];
        this.lastColorScheme = this.currentColorScheme;

        // Generate some buffers
        this.colorData = new Float32Array(catalogManagerInstance.numObjects * 4);
        this.pickableData = new Int8Array(catalogManagerInstance.numObjects);

        // Send catalog data to color worker
        if (this.colorCruncher_?.isReady) {
          this.sendCatalogToWorker_();
          this.sendAllStateToWorker_();
          this.workerReady_ = true;
          this.useWorkerMode_ = ColorSchemeManager.WORKER_SUPPORTED_SCHEMES_.has(this.currentColorScheme?.id);
        }

        this.calculateColorBuffers(true);
        this.isReady = true;

        // This helps keep the inview colors up to date
        if (!this.hasRegisteredOffsetListener_) {
          this.hasRegisteredOffsetListener_ = true;
          EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
            setTimeout(() => {
              if (this.useWorkerMode_) {
                this.colorCruncher_?.sendForceRecolor();
              } else {
                this.calcColorBufsNextCruncher();
              }
            }, 1000);
          });
        }

      },
    );

    // Handle color buffer results from worker
    EventBus.getInstance().on(EventBusEvent.onColorBufferReady, () => {
      if (!this.colorCruncher_) {
        return;
      }
      const data = this.colorCruncher_.consumeColorData();

      if (data && data.colorData.length === this.colorData.length) {
        this.colorData.set(data.colorData);
        this.pickableData.set(data.pickableData);
        // Save clean copy before overlay so setFovFadeAlpha can reapply without compounding
        if (this.fovFadeAlpha_) {
          if (!this.cleanColorData_ || this.cleanColorData_.length !== this.colorData.length) {
            this.cleanColorData_ = new Float32Array(this.colorData.length);
          }
          this.cleanColorData_.set(this.colorData);
        }
        this.applyFovFadeOverlay_();
        this.setSelectedAndHoverBuffer_();
        this.sendColorBufferToGpu();
      }
    });

    // Forward position cruncher data to color worker
    EventBus.getInstance().on(EventBusEvent.onCruncherMessage, () => {
      if (!this.useWorkerMode_ || !this.colorCruncher_) {
        return;
      }
      const dotsManager = ServiceLocator.getDotsManager();

      this.colorCruncher_.sendDynamicUpdate(
        dotsManager.inViewData,
        dotsManager.inSunData,
        dotsManager.getSatVel(),
        settingsManager.dotsOnScreen,
      );
    });

    EventBus.getInstance().on(EventBusEvent.layerUpdated, () => {
      if (settingsManager.isDisableSensors) {
        const sensorBox = document.querySelector('.layers-sensor-box')?.parentElement as HTMLElement;
        const inFOVBox = document.querySelector('.layers-inFOV-box')?.parentElement as HTMLElement;

        if (sensorBox) {
          hideEl(sensorBox);
        }

        if (inFOVBox) {
          hideEl(inFOVBox);
        }
      }

      if (settingsManager.isDisableLaunchSites) {
        const launchSiteBox = document.querySelector('.layers-facility-box')?.parentElement as HTMLElement;

        if (launchSiteBox) {
          hideEl(launchSiteBox);
        }
      }

      // Forward updated layer/flag state to worker
      this.forwardObjectTypeFlagsToWorker_();
    });

    // Forward filter changes (from FilterMenuPlugin) to worker
    EventBus.getInstance().on(EventBusEvent.filterChanged, () => {
      if (this.useWorkerMode_ && this.colorCruncher_) {
        this.forwardFiltersToWorker_();
        // Filter menu also bridges isDisableSensors/isDisableLaunchSites,
        // so forward updated settings and flags to the worker too.
        this.forwardSettingsToWorker_();
        this.forwardObjectTypeFlagsToWorker_();
        this.colorCruncher_.sendForceRecolor();
      }
    });

    // Forward sensor changes to worker so isSensorManagerLoaded/sensorType stay current
    EventBus.getInstance().on(EventBusEvent.setSensor, () => {
      if (this.useWorkerMode_ && this.colorCruncher_) {
        this.forwardSettingsToWorker_();
      }
    });
    EventBus.getInstance().on(EventBusEvent.resetSensor, () => {
      if (this.useWorkerMode_ && this.colorCruncher_) {
        this.forwardSettingsToWorker_();
      }
    });

    EventBus.getInstance().on(EventBusEvent.update, () => {
      // In worker mode, colors arrive asynchronously via onColorBufferReady
      if (this.useWorkerMode_) {
        // Still need to apply selected/hover overlay each frame for responsiveness
        this.setSelectedAndHoverBuffer_();
        this.sendColorBufferToGpu();

        return;
      }
      /*
       * Update Colors
       * NOTE: We used to skip this when isDragging was true, but its so efficient that doesn't seem necessary anymore
       */
      this.calculateColorBuffers(false); // avoid recalculating ALL colors
    });

    LayersManager.change(this.currentColorScheme.id);
  }

  isInView(obj: BaseObject) {
    return ServiceLocator.getDotsManager().inViewData?.[Number(obj.id)] === 1 && this.currentColorScheme?.objectTypeFlags.inFOV;
  }
  isInViewOff(obj: BaseObject) {
    return ServiceLocator.getDotsManager().inViewData?.[Number(obj.id)] === 1 && !this.currentColorScheme?.objectTypeFlags.inFOV;
  }
  isOperationalPayloadOff(obj: BaseObject) {
    return settingsManager.filter?.operationalPayloads === false && obj.type === SpaceObjectType.PAYLOAD &&
      (obj as Satellite).status !== PayloadStatus.NONOPERATIONAL && (obj as Satellite).status !== PayloadStatus.UNKNOWN;
  }
  isNonOperationalPayloadOff(obj: BaseObject) {
    return settingsManager.filter?.nonOperationalPayloads === false && obj.type === SpaceObjectType.PAYLOAD &&
      ((obj as Satellite).status === PayloadStatus.NONOPERATIONAL || (obj as Satellite).status === PayloadStatus.UNKNOWN);
  }
  isRocketBodyOff(obj: BaseObject) {
    return settingsManager.filter?.rocketBodies === false && obj.type === SpaceObjectType.ROCKET_BODY;
  }
  isDebrisOff(obj: BaseObject) {
    return settingsManager.filter?.debris === false && obj.type === SpaceObjectType.DEBRIS;
  }
  isUnknownTypeOff(obj: BaseObject) {
    return settingsManager.filter?.unknownType === false && obj.type === SpaceObjectType.UNKNOWN;
  }
  isNotionalSatOff(obj: BaseObject) {
    return settingsManager.filter?.notionalSatellites === false && obj.type === SpaceObjectType.NOTIONAL;
  }
  isvLeoSatOff(obj: BaseObject) {
    return settingsManager.filter?.vLEOSatellites === false && (obj as Satellite).apogee < 400;
  }
  isLeoSatOff(obj: BaseObject) {
    return settingsManager.filter?.lEOSatellites === false && (obj as Satellite).apogee < 6000 && (obj as Satellite).apogee >= 400;
  }
  isMeoSatOff(obj: BaseObject) {
    return settingsManager.filter?.mEOSatellites === false && (obj as Satellite).eccentricity < 0.1 && ((obj as Satellite).apogee >= 6000 &&
      (obj as Satellite).apogee < 34786);
  }
  isHeoSatOff(obj: BaseObject) {
    return settingsManager.filter?.hEOSatellites === false &&
      (obj as Satellite).eccentricity >= 0.1 && ((obj as Satellite).apogee <= 39786);
  }
  isGeoSatOff(obj: BaseObject) {
    return settingsManager.filter?.gEOSatellites === false && (obj as Satellite).eccentricity < 0.1 && ((obj as Satellite).apogee >= 34786 &&
      (obj as Satellite).apogee < 36786);
  }
  isXGeoSatOff(obj: BaseObject) {
    return settingsManager.filter?.xGEOSatellites === false &&
      (((obj as Satellite).eccentricity < 0.1 && ((obj as Satellite).apogee > 36786)) || ((obj as Satellite).apogee > 39786));
  }
  isUnitedStatesOff(obj: BaseObject) {
    return settingsManager.filter?.unitedStates === false && (obj as Satellite)?.country === 'US';
  }
  isUnitedKingdomOff(obj: BaseObject) {
    return settingsManager.filter?.unitedKingdom === false && (obj as Satellite)?.country === 'UK';
  }
  isFranceOff(obj: BaseObject) {
    return settingsManager.filter?.france === false && (obj as Satellite)?.country === 'F';
  }
  isGermanyOff(obj: BaseObject) {
    return settingsManager.filter?.germany === false && (obj as Satellite)?.country === 'D';
  }
  isJapanOff(obj: BaseObject) {
    return settingsManager.filter?.japan === false && (obj as Satellite)?.country === 'J';
  }
  isChinaOff(obj: BaseObject) {
    return settingsManager.filter?.china === false && (obj as Satellite)?.country === 'CN';
  }
  isIndiaOff(obj: BaseObject) {
    return settingsManager.filter?.india === false && (obj as Satellite)?.country === 'IN';
  }
  isRussiaOff(obj: BaseObject) {
    return settingsManager.filter?.russia === false && (obj as Satellite)?.country === 'RU';
  }
  isUssrOff(obj: BaseObject) {
    return settingsManager.filter?.uSSR === false && (obj as Satellite)?.country === 'SU';
  }
  isSouthKoreaOff(obj: BaseObject) {
    return settingsManager.filter?.southKorea === false && (obj as Satellite)?.country === 'KR';
  }
  isAustraliaOff(obj: BaseObject) {
    return settingsManager.filter?.australia === false && (obj as Satellite)?.country === 'AU';
  }
  isOtherCountriesOff(obj: BaseObject) {
    return settingsManager.filter?.otherCountries === false &&
      !['US', 'UK', 'F', 'D', 'J', 'CN', 'IN', 'RU', 'SU', 'KR', 'AU'].includes((obj as Satellite)?.country);
  }
  isJscVimpelSatOff(obj: BaseObject) {
    return settingsManager.filter?.vimpelSatellites === false && (obj as Satellite)?.source === CatalogSource.VIMPEL;
  }
  isCelestrakSatOff(obj: BaseObject) {
    return settingsManager.filter?.celestrakSatellites === false && (obj as Satellite)?.source === CatalogSource.CELESTRAK;
  }
  isStarlinkSatOff(obj: BaseObject) {
    return settingsManager.filter?.starlinkSatellites === false && obj.name?.includes('STARLINK');
  }

  reloadColors() {
    this.colorTheme = settingsManager.colors;
  }

  resetObjectTypeFlags() {
    this.objectTypeFlags.starLow = true;
    this.objectTypeFlags.starMed = true;
    this.objectTypeFlags.starHi = true;

    for (const colorScheme in this.colorSchemeInstances) {
      if (Object.prototype.hasOwnProperty.call(this.colorSchemeInstances, colorScheme)) {
        this.colorSchemeInstances[colorScheme].resetObjectTypeFlags();
      }
    }
  }

  setColorScheme(scheme: ColorScheme, isForceRecolor?: boolean) {
    try {
      const dotsManagerInstance = ServiceLocator.getDotsManager();
      const uiManagerInstance = ServiceLocator.getUiManager();

      LayersManager.change(scheme.id);
      uiManagerInstance.colorSchemeChangeAlert(scheme);

      scheme ??= this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? Object.values(this.colorSchemeInstances)[0];

      if (scheme instanceof ColorScheme) {
        this.currentColorScheme = this.colorSchemeInstances[scheme.id];
        this.currentColorSchemeUpdate = this.colorSchemeInstances[scheme.id].update;
      } else {
        throw new Error('Color scheme is not a valid color scheme');
      }

      // Toggle worker mode based on whether this scheme is worker-supported
      if (this.workerReady_ && this.colorCruncher_) {
        const isSupported = ColorSchemeManager.WORKER_SUPPORTED_SCHEMES_.has(scheme.id);

        this.useWorkerMode_ = isSupported;
        if (isSupported) {
          this.colorCruncher_.sendSchemeChange(scheme.id, this.isUseGroupColorScheme);
          this.forwardObjectTypeFlagsToWorker_();
          this.forwardParamsToWorker_();
          this.forwardColorThemeToWorker_();
          this.forwardSettingsToWorker_();
        }
      }

      this.calculateColorBuffers(isForceRecolor);
      if (this.colorBuffer && this.pickableBuffer) {
        dotsManagerInstance.buffers.color = this.colorBuffer;
        dotsManagerInstance.buffers.pickability = this.pickableBuffer;
      } else {
        throw new Error('Color or pickable buffer is not initialized');
      }

      EventBus.getInstance().emit(EventBusEvent.colorSchemeChanged, scheme);
    } catch (error) {
      // If we can't load the color scheme, just use the default
      errorManagerInstance.log(error);
      this.currentColorSchemeUpdate = this.colorSchemeInstances[settingsManager.defaultColorScheme]?.update ?? Object.values(this.colorSchemeInstances)[0].update;
      this.calculateColorBuffers(isForceRecolor);
    }
  }

  setToGroupColorScheme() {
    this.isUseGroupColorScheme = true;
    // Forward to worker
    if (this.useWorkerMode_ && this.colorCruncher_) {
      this.colorCruncher_.sendSchemeChange(this.currentColorScheme.id, true);
      this.forwardGroupToWorker_();
    }
  }

  private getColorIfDisabledSat_(objectData: BaseObject[], i: number): ColorInformation | null {
    const sat = objectData[i] as Satellite;

    // Optimize for the most common cases first

    if (this.isDebrisOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isJscVimpelSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isStarlinkSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isCelestrakSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isUnitedStatesOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isUnitedKingdomOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isFranceOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isGermanyOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isJapanOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isChinaOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isIndiaOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isRussiaOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isUssrOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isSouthKoreaOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isAustraliaOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isOtherCountriesOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isvLeoSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isXGeoSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isLeoSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isOperationalPayloadOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isNonOperationalPayloadOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isRocketBodyOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isUnknownTypeOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isNotionalSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isHeoSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isMeoSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }
    if (this.isGeoSatOff(sat)) {
      return {
        color: [0, 0, 0, 0],
        pickable: Pickable.No,
      };
    }

    return null;
  }

  private calcFirstAndLastDot_(isForceRecolor: boolean) {
    let firstDotToColor = 0;
    let lastDotToColor = settingsManager.dotsOnScreen;
    // If this is the same color scheme then we don't need to recolor everything

    if (!isForceRecolor && this.currentColorScheme === this.lastColorScheme) {
      if (this.lastDotColored < settingsManager.dotsOnScreen) {
        firstDotToColor = this.lastDotColored;
        lastDotToColor = firstDotToColor + (settingsManager.dotsPerColor ?? this.DOTS_PER_CALC);
        if (lastDotToColor > settingsManager.dotsOnScreen) {
          lastDotToColor = settingsManager.dotsOnScreen;
        }
      } else {
        lastDotToColor = settingsManager.dotsPerColor ?? this.DOTS_PER_CALC;
        lastDotToColor = Math.min(lastDotToColor, settingsManager.dotsOnScreen);
      }

      this.lastDotColored = lastDotToColor;
    } else {
      this.lastDotColored = 0;
    }

    return { firstDotToColor, lastDotToColor };
  }

  private calculateBufferDataVelocity_(
    firstDotToColor: number,
    lastDotToColor: number,
    satData: BaseObject[],
    satVel: Float32Array,
    params: ColorSchemeParams,
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      (satData[i] as unknown as { totalVelocity: number }).totalVelocity = Math.sqrt(
        satVel[i * 3] * satVel[i * 3] + satVel[i * 3 + 1] * satVel[i * 3 + 1] + satVel[i * 3 + 2] * satVel[i * 3 + 2],
      );
      this.calculateBufferData_(i, satData, params);
    }
  }

  private calculateBufferDataLoop_(
    firstDotToColor: number,
    lastDotToColor: number,
    satData: BaseObject[],
    params: ColorSchemeParams,
  ) {
    for (let i = firstDotToColor; i < lastDotToColor; i++) {
      this.calculateBufferData_(i, satData, params);
    }
  }

  private calculateBufferData_(i: number, satData: BaseObject[],
    params: ColorSchemeParams) {
    let colors = this.getColorIfDisabledSat_(satData, i);

    if (this.isUseGroupColorScheme) {
      colors ??= this.currentColorScheme?.updateGroup(satData[i], params) ?? this.currentColorSchemeUpdate(satData[i], params);
    } else {
      colors ??= this.currentColorScheme?.update(satData[i], params) ?? this.currentColorSchemeUpdate(satData[i], params);
    }

    if (!colors?.color) {
      throw new Error(`Color information is missing for satellite at index ${i}`);
    }

    this.colorData[i * 4] = colors.color[0]; // R
    this.colorData[i * 4 + 1] = colors.color[1]; // G
    this.colorData[i * 4 + 2] = colors.color[2]; // B
    this.colorData[i * 4 + 3] = colors.color[3]; // A
    this.pickableData[i] = colors.pickable;
  }

  private calculateParams_(): ColorSchemeParams {
    const params = {
      year: 0,
      jday: 0,
      orbitDensity: [] as DensityBin[],
      orbitDensityMax: 0,
      orbitalPlaneDensity: [] as number[][],
      orbitalPlaneDensityMax: 0,
    };

    if (this.currentColorScheme) {
      const params_ = this.currentColorScheme.calculateParams();

      if (params_) {
        params.year = params_.year ?? params.year;
        params.jday = params_.jday ?? params.jday;
        params.orbitDensity = params_.orbitDensity ?? params.orbitDensity;
        params.orbitDensityMax = params_.orbitDensityMax ?? params.orbitDensityMax;
        params.orbitalPlaneDensity = params_.orbitalPlaneDensity ?? params.orbitalPlaneDensity;
        params.orbitalPlaneDensityMax = params_.orbitalPlaneDensityMax ?? params.orbitalPlaneDensityMax;
      }
    }

    return params;
  }

  private preValidateColorScheme_(isForceRecolor = false) {
    // Confirm we are using a valid color scheme
    if (!Object.keys(this.colorSchemeInstances).includes(this.currentColorScheme.id)) {
      this.currentColorScheme = this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? Object.values(this.colorSchemeInstances)[0];
    }

    if (this.isUseGroupColorScheme) {
      const watchlistMenu = getEl('watchlist-menu');
      const watchlistTransform = watchlistMenu?.style.transform ?? '';

      if (
        ServiceLocator.getUiManager().searchManager.getCurrentSearch() === '' &&
        watchlistTransform !== 'translateX(0px)' &&
        !PluginRegistry.getPlugin(TimeMachine)?.isMenuButtonActive &&
        !(<TimeMachine>PluginRegistry.getPlugin(TimeMachine))?.isTimeMachineRunning
      ) {
        this.isUseGroupColorScheme = false;
      }
    }

    if (!isForceRecolor) {
      // Verify we are using a valid color scheme
      for (const colorSchemeInstanceKey in this.colorSchemeInstances) {
        if ((this.colorSchemeInstances[colorSchemeInstanceKey] as ColorScheme) === this.currentColorScheme) {
          return;
        }
      }

      this.setColorScheme(this.colorSchemeInstances[settingsManager.defaultColorScheme] ?? Object.values(this.colorSchemeInstances)[0]);
    }
  }

  /**
   * Set or clear the FOV fade alpha overlay.
   * When set, each satellite's alpha is multiplied by the corresponding value before GPU upload.
   */
  setFovFadeAlpha(alpha: Float32Array | null): void {
    this.fovFadeAlpha_ = alpha;

    if (this.colorData.length === 0) {
      return;
    }

    // Restore clean color data before reapplying overlay to avoid compounding
    if (this.cleanColorData_ && this.cleanColorData_.length === this.colorData.length) {
      this.colorData.set(this.cleanColorData_);
    }

    if (!alpha) {
      // Clearing the overlay — discard clean copy
      this.cleanColorData_ = null;
    }

    this.applyFovFadeOverlay_();
    this.setSelectedAndHoverBuffer_();
    this.sendColorBufferToGpu();
  }

  /** Multiply each object's alpha channel by the FOV fade multiplier. */
  private applyFovFadeOverlay_(): void {
    if (!this.fovFadeAlpha_) {
      return;
    }
    const n = Math.min(this.colorData.length / 4, this.fovFadeAlpha_.length);

    for (let i = 0; i < n; i++) {
      this.colorData[i * 4 + 3] *= this.fovFadeAlpha_[i];
    }
  }

  /**
   * Sends the color buffer to the GPU
   */
  private sendColorBufferToGpu() {
    const gl = this.gl_;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    // And update it
    if (!this.colorBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.colorData, gl.DYNAMIC_DRAW);
      this.colorBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colorData);
    }

    // Next the buffer for which objects can be picked -- different than what color they are on the pickable frame (that is in the dots class)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickableBuffer);
    if (!this.pickableBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.pickableData, gl.DYNAMIC_DRAW);
      this.pickableBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pickableData);
    }
  }

  /** Plugin-provided override for selected satellite dot color (e.g. flat map uses red since mesh is hidden). */
  static selectedColorOverride: rgbaArray | null = null;

  private setSelectedAndHoverBuffer_() {
    const selSat = PluginRegistry.getPlugin(SelectSatManager)?.selectedSat;

    if (typeof selSat !== 'undefined' && selSat !== -1) {
      // Selected satellites are always one color so forget whatever we just did
      const selSatNum = selSat;

      const color = ColorSchemeManager.selectedColorOverride ?? settingsManager.selectedColor;

      this.colorData[selSatNum * 4] = color[0]; // R
      this.colorData[selSatNum * 4 + 1] = color[1]; // G
      this.colorData[selSatNum * 4 + 2] = color[2]; // B
      this.colorData[selSatNum * 4 + 3] = color[3]; // A
    }

    const hovSat = ServiceLocator.getHoverManager().hoveringSat;

    if (hovSat === -1 || hovSat === selSat) {
      return;
    }
    /*
     * Hover satellites are always one color so forget whatever we just did
     * We check this last so you can hover over the selected satellite
     */
    const hovSatNum = hovSat;

    this.colorData[hovSatNum * 4] = settingsManager.hoverColor[0]; // R
    this.colorData[hovSatNum * 4 + 1] = settingsManager.hoverColor[1]; // G
    this.colorData[hovSatNum * 4 + 2] = settingsManager.hoverColor[2]; // B
    this.colorData[hovSatNum * 4 + 3] = settingsManager.hoverColor[3];
  }

  // ─── Color Worker Integration ────────────────────────────────────────

  private initColorWorker_(threadsRegistry: WebWorkerThreadManager[]): void {
    try {
      this.colorCruncher_ = new ColorCruncherThreadManager(threadsRegistry);
      this.colorCruncher_.init();
    } catch (e) {
      errorManagerInstance.debug(e);
      this.colorCruncher_ = null;
      this.useWorkerMode_ = false;
    }
  }

  private sendCatalogToWorker_(): void {
    if (!this.colorCruncher_) {
      return;
    }
    const catalogManager = ServiceLocator.getCatalogManager();

    this.catalogSeqNum_++;
    const data = buildColorDataArrays(catalogManager.objectCache);

    this.colorCruncher_.sendCatalogData(data, this.catalogSeqNum_);
  }

  /** Send all current state to the worker — used after catalog init */
  private sendAllStateToWorker_(): void {
    if (!this.colorCruncher_) {
      return;
    }

    // Scheme
    this.colorCruncher_.sendSchemeChange(this.currentColorScheme.id, this.isUseGroupColorScheme);

    // Filters
    this.forwardFiltersToWorker_();

    // Settings
    this.forwardSettingsToWorker_();

    // Object type flags
    this.forwardObjectTypeFlagsToWorker_();

    // Color theme
    this.forwardColorThemeToWorker_();

    // Params (density, year/jday)
    this.forwardParamsToWorker_();

    // Group
    this.forwardGroupToWorker_();

    // Dynamic data (inView, inSun, velocity)
    const dotsManager = ServiceLocator.getDotsManager();

    this.colorCruncher_.sendDynamicUpdate(
      dotsManager.inViewData,
      dotsManager.inSunData,
      dotsManager.getSatVel(),
      settingsManager.dotsOnScreen,
    );
  }

  private forwardFiltersToWorker_(): void {
    if (!this.colorCruncher_ || !settingsManager.filter) {
      return;
    }

    const f = settingsManager.filter;
    const filter: FilterState = {
      debris: f.debris ?? true,
      operationalPayloads: f.operationalPayloads ?? true,
      nonOperationalPayloads: f.nonOperationalPayloads ?? true,
      rocketBodies: f.rocketBodies ?? true,
      unknownType: f.unknownType ?? true,
      notionalSatellites: f.notionalSatellites ?? true,
      vLEOSatellites: f.vLEOSatellites ?? true,
      lEOSatellites: f.lEOSatellites ?? true,
      mEOSatellites: f.mEOSatellites ?? true,
      hEOSatellites: f.hEOSatellites ?? true,
      gEOSatellites: f.gEOSatellites ?? true,
      xGEOSatellites: f.xGEOSatellites ?? true,
      unitedStates: f.unitedStates ?? true,
      unitedKingdom: f.unitedKingdom ?? true,
      france: f.france ?? true,
      germany: f.germany ?? true,
      japan: f.japan ?? true,
      china: f.china ?? true,
      india: f.india ?? true,
      russia: f.russia ?? true,
      uSSR: f.uSSR ?? true,
      southKorea: f.southKorea ?? true,
      australia: f.australia ?? true,
      otherCountries: f.otherCountries ?? true,
      vimpelSatellites: f.vimpelSatellites ?? true,
      celestrakSatellites: f.celestrakSatellites ?? true,
      celestrakSupSatellites: f.celestrakSupSatellites ?? true,
      satnogsSatellites: f.satnogsSatellites ?? true,
      starlinkSatellites: f.starlinkSatellites ?? true,
    };

    this.colorCruncher_.sendFilterUpdate(filter);
  }

  private forwardSettingsToWorker_(): void {
    if (!this.colorCruncher_) {
      return;
    }

    const sensorManager = ServiceLocator.getSensorManager();
    const catalogManager = ServiceLocator.getCatalogManager();

    const flags: SettingsFlags = {
      cameraType: ServiceLocator.getMainCamera().cameraType,
      isShowPayloads: settingsManager.isShowPayloads,
      isShowRocketBodies: settingsManager.isShowRocketBodies,
      isShowDebris: settingsManager.isShowDebris,
      isShowAgencies: settingsManager.isShowAgencies,
      isDisableLaunchSites: settingsManager.isDisableLaunchSites,
      isDisableSensors: settingsManager.isDisableSensors,
      isSensorManagerLoaded: catalogManager.isSensorManagerLoaded,
      sensorType: sensorManager?.currentSensors?.[0]?.type ?? 0,
      maxZoomDistance: settingsManager.maxZoomDistance,
      isMissilePluginEnabled: !!settingsManager.plugins?.MissilePlugin?.enabled,
    };

    this.colorCruncher_.sendSettingsUpdate(flags);
  }

  private forwardObjectTypeFlagsToWorker_(): void {
    if (!this.colorCruncher_) {
      return;
    }

    // Merge global objectTypeFlags with the current scheme's flags
    const flags = {
      ...this.objectTypeFlags,
      ...this.currentColorScheme?.objectTypeFlags,
    };

    this.colorCruncher_.sendObjectTypeFlags(flags);
  }

  private forwardColorThemeToWorker_(): void {
    if (!this.colorCruncher_) {
      return;
    }

    // Send only array-valued entries from colorTheme
    const theme: Record<string, number[]> = {};

    for (const key in this.colorTheme) {
      if (Array.isArray(this.colorTheme[key])) {
        theme[key] = this.colorTheme[key] as number[];
      }
    }

    // Also include current scheme's unique color theme
    if (this.currentColorScheme?.colorTheme) {
      for (const key in this.currentColorScheme.colorTheme) {
        if (Array.isArray(this.currentColorScheme.colorTheme[key])) {
          theme[key] = this.currentColorScheme.colorTheme[key] as number[];
        }
      }
    }

    this.colorCruncher_.sendColorTheme(theme);
  }

  private forwardParamsToWorker_(): void {
    if (!this.colorCruncher_) {
      return;
    }

    const params = this.calculateParams_();

    this.colorCruncher_.sendParamsUpdate(params);
  }

  private forwardGroupToWorker_(): void {
    if (!this.colorCruncher_) {
      return;
    }

    const groupsManager = ServiceLocator.getGroupsManager();
    const group = groupsManager?.selectedGroup;

    if (group) {
      // Extract object ids from the group
      const ids: number[] = [];

      if (group.ids) {
        for (const id of group.ids) {
          ids.push(Number(id));
        }
      }
      this.colorCruncher_.sendGroupUpdate(ids);
    } else {
      this.colorCruncher_.sendGroupUpdate(null);
    }
  }
}
