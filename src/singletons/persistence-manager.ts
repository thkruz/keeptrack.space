import { errorManagerInstance } from './errorManager';

export enum StorageKey {
  CURRENT_SENSOR = 'keepTrack-currentSensor',
  SETTINGS_MANAGER_COLORS = 'settingsManager-colors',
  WATCHLIST_LIST = 'keepTrack-watchlistList',
  SETTINGS_DOT_COLORS = 'keepTrack-settings-dotColors',
  IS_ADVICE_ENABLED = 'isAdviceEnabled',
  LAST_MAP = 'keepTrack-earthTexture',
  COLOR_SCHEME = 'keepTrack-colorScheme',
  SETTINGS_LEO_SATS = 'keepTrack-settings-LEOSats',
  SETTINGS_STARLINK_SATS = 'keepTrack-settings-starlinkSats',
  SETTINGS_HEO_SATS = 'keepTrack-settings-HEOSats',
  SETTINGS_MEO_SATS = 'keepTrack-settings-MEOSats',
  SETTINGS_GEO_SATS = 'keepTrack-settings-GEOSats',
  SETTINGS_PAYLOADS = 'keepTrack-settings-payloads',
  SETTINGS_ROCKET_BODIES = 'keepTrack-settings-rocketBodies',
  SETTINGS_DEBRIS = 'keepTrack-settings-debris',
  SETTINGS_AGENCIES = 'keepTrack-settings-agencies',
  SETTINGS_DRAW_ORBITS = 'keepTrack-settings-drawOrbits',
  SETTINGS_DRAW_ECF = 'keepTrack-settings-drawECF',
  SETTINGS_DRAW_IN_COVERAGE_LINES = 'keepTrack-settings-drawInCoverageLines',
  SETTINGS_DRAW_BLACK_EARTH = 'keepTrack-settings-drawBlackEarth',
  SETTINGS_DRAW_ATMOSPHERE = 'keepTrack-settings-drawAtmosphere',
  SETTINGS_DRAW_MILKY_WAY = 'keepTrack-settings-drawMilkyWay',
  SETTINGS_GRAY_SKYBOX = 'keepTrack-settings-graySkybox',
  SETTINGS_ECI_ON_HOVER = 'keepTrack-settings-eciOnHover',
  SETTINGS_HOS = 'keepTrack-settings-hos',
  SETTINGS_DEMO_MODE = 'keepTrack-settings-demoMode',
  SETTINGS_SAT_LABEL_MODE = 'keepTrack-settings-satLabelMode',
  SETTINGS_FREEZE_PROP_RATE_ON_DRAG = 'keepTrack-settings-freezePropRateOnDrag',
  SETTINGS_DISABLE_TIME_MACHINE_TOASTS = 'keepTrack-settings-disableTimeMachineToasts',
  SETTINGS_SEARCH_LIMIT = 'keepTrack-settings-searchLimit',
  SETTINGS_DRAW_TRAILING_ORBITS = 'keepTrack-settings-drawTrailingOrbits',
  SETTINGS_DRAW_AURORA = 'keepTrack-settings-drawAurora',
  SETTINGS_DRAW_SUN = 'keepTrack-settings-drawSun',
  SETTINGS_NOTIONAL_SATS = 'keepTrack-settings-notionalSats',
  SETTINGS_CONFIDENCE_LEVELS = 'keepTrack-settings-confidenceLevels',
  SETTINGS_CACHED_TLE = 'keepTrack-settings-cached-tle',
  SETTINGS_CACHED_TLE_TIMESTAMP = 'keepTrack-settings-cached-tle-timestamp',
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
    } catch (e) {
      errorManagerInstance.debug(`Failed to save to local storage: ${key}=${value}`);
      errorManagerInstance.info(e);
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
