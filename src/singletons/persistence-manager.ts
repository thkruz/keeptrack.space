import { errorManagerInstance } from './errorManager';

export enum StorageKey {
  CURRENT_SENSOR = 'v2-keepTrack-currentSensor',
  SETTINGS_MANAGER_COLORS = 'v2-settingsManager-colors',
  WATCHLIST_LIST = 'v2-keepTrack-watchlistList',
  SETTINGS_DOT_COLORS = 'v2-keepTrack-settings-dotColors',
  IS_ADVICE_ENABLED = 'v2-isAdviceEnabled',
  LAST_MAP = 'v2-keepTrack-earthTexture',
  COLOR_SCHEME = 'v2-keepTrack-colorScheme',
  SETTINGS_NOTIONAL_SATS = 'v2-keepTrack-settings-notionalSats',
  SETTINGS_VIMPEL_SATS = 'v2-keepTrack-settings-vimpelSats',
  SETTINGS_LEO_SATS = 'v2-keepTrack-settings-LEOSats',
  SETTINGS_STARLINK_SATS = 'v2-keepTrack-settings-starlinkSats',
  SETTINGS_HEO_SATS = 'v2-keepTrack-settings-HEOSats',
  SETTINGS_MEO_SATS = 'v2-keepTrack-settings-MEOSats',
  SETTINGS_GEO_SATS = 'v2-keepTrack-settings-GEOSats',
  SETTINGS_PAYLOADS = 'v2-keepTrack-settings-payloads',
  SETTINGS_ROCKET_BODIES = 'v2-keepTrack-settings-rocketBodies',
  SETTINGS_DEBRIS = 'v2-keepTrack-settings-debris',
  SETTINGS_AGENCIES = 'v2-keepTrack-settings-agencies',
  SETTINGS_DRAW_CAMERA_WIDGET = 'v2-keepTrack-settings-drawCameraWidget',
  SETTINGS_DRAW_ORBITS = 'v2-keepTrack-settings-drawOrbits',
  SETTINGS_DRAW_ECF = 'v2-keepTrack-settings-drawECF',
  SETTINGS_DRAW_IN_COVERAGE_LINES = 'v2-keepTrack-settings-drawInCoverageLines',
  SETTINGS_DRAW_BLACK_EARTH = 'v2-keepTrack-settings-drawBlackEarth',
  SETTINGS_DRAW_ATMOSPHERE = 'v2-keepTrack-settings-drawAtmosphere',
  SETTINGS_DRAW_MILKY_WAY = 'v2-keepTrack-settings-drawMilkyWay',
  SETTINGS_GRAY_SKYBOX = 'v2-keepTrack-settings-graySkybox',
  SETTINGS_ECI_ON_HOVER = 'v2-keepTrack-settings-eciOnHover',
  SETTINGS_HOS = 'v2-keepTrack-settings-hos',
  SETTINGS_DEMO_MODE = 'v2-keepTrack-settings-demoMode',
  SETTINGS_SAT_LABEL_MODE = 'v2-keepTrack-settings-satLabelMode',
  SETTINGS_FREEZE_PROP_RATE_ON_DRAG = 'v2-keepTrack-settings-freezePropRateOnDrag',
  SETTINGS_DISABLE_TIME_MACHINE_TOASTS = 'v2-keepTrack-settings-disableTimeMachineToasts',
  SETTINGS_SEARCH_LIMIT = 'v2-keepTrack-settings-searchLimit',
  SETTINGS_DRAW_TRAILING_ORBITS = 'v2-keepTrack-settings-drawTrailingOrbits',
  SETTINGS_DRAW_AURORA = 'v2-keepTrack-settings-drawAurora',
  SETTINGS_DRAW_SUN = 'v2-keepTrack-settings-drawSun',
  SETTINGS_CONFIDENCE_LEVELS = 'v2-keepTrack-settings-confidenceLevels',
  GRAPHICS_SETTINGS_GODRAYS_SAMPLES = 'v2-keepTrack-graphicsSettings-godraysSamples',
  GRAPHICS_SETTINGS_GODRAYS_DECAY = 'v2-keepTrack-graphicsSettings-godraysDecay',
  GRAPHICS_SETTINGS_GODRAYS_EXPOSURE = 'v2-keepTrack-graphicsSettings-godraysExposure',
  GRAPHICS_SETTINGS_GODRAYS_DENSITY = 'v2-keepTrack-graphicsSettings-godraysDensity',
  GRAPHICS_SETTINGS_GODRAYS_WEIGHT = 'v2-keepTrack-graphicsSettings-godraysWeight',
  GRAPHICS_SETTINGS_GODRAYS_ILLUMINATION_DECAY = 'v2-keepTrack-graphicsSettings-godraysIlluminationDecay',
  GRAPHICS_SETTINGS_EARTH_DAY_RESOLUTION = 'v2-keepTrack-graphicsSettings-earthDayResolution',
  GRAPHICS_SETTINGS_EARTH_NIGHT_RESOLUTION = 'v2-keepTrack-graphicsSettings-earthNightResolution',
}
export class PersistenceManager {
  private readonly storage_: Storage;

  private static instance_: PersistenceManager;

  private constructor() {
    this.storage_ = localStorage;
    this.verifyStorage();
  }

  get storage(): Storage {
    return this.storage_;
  }

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance_) {
      PersistenceManager.instance_ = new PersistenceManager();
    }

    return PersistenceManager.instance_;
  }

  verifyStorage(): void {
    for (let i = 0; i < this.storage_.length; i++) {
      const key = this.storage_.key(i);

      if (!Object.values(StorageKey).includes(key as StorageKey)) {
        // Delete any keys that are not in the StorageKey enum
        this.storage_.removeItem(key as string);
      }
    }
  }

  getItem(key: string): string | null {
    PersistenceManager.verifyKey_(key);

    const value = this.storage_.getItem(key);

    if (value === null) {
      return null;
    }

    return value;
  }

  saveItem(key: string, value: string): void {
    PersistenceManager.verifyKey_(key);
    try {
      this.storage_.setItem(key, value);
    } catch {
      errorManagerInstance.debug(`Failed to save to local storage: ${key}=${value}`);
    }
  }

  removeItem(key: string): void {
    PersistenceManager.verifyKey_(key);
    this.storage_.removeItem(key);
  }

  private static verifyKey_(key: string) {
    if (!Object.values(StorageKey).includes(key as StorageKey)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }
}
