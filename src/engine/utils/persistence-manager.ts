import { errorManagerInstance } from './errorManager';

export enum StorageKey {
  // OfflineMode Only
  CURRENT_SENSOR = 'v2-keepTrack-currentSensor',
  WATCHLIST_LIST = 'v2-keepTrack-watchlistList',

  // Others
  SETTINGS_MANAGER_COLORS = 'v2-settingsManager-colors',
  SETTINGS_DOT_COLORS = 'v2-keepTrack-settings-dotColors',
  IS_ADVICE_ENABLED = 'v2-isAdviceEnabled',
  LAST_MAP = 'v2-keepTrack-earthTexture',
  COLOR_SCHEME = 'v2-keepTrack-colorScheme',
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
  SETTINGS_DRAW_COVARIANCE_ELLIPSOID = 'v2-keepTrack-settings-drawCovarianceEllipsoid',
  GRAPHICS_SETTINGS_GODRAYS_SAMPLES = 'v2-keepTrack-graphicsSettings-godraysSamples',
  GRAPHICS_SETTINGS_GODRAYS_DECAY = 'v2-keepTrack-graphicsSettings-godraysDecay',
  GRAPHICS_SETTINGS_GODRAYS_EXPOSURE = 'v2-keepTrack-graphicsSettings-godraysExposure',
  GRAPHICS_SETTINGS_GODRAYS_DENSITY = 'v2-keepTrack-graphicsSettings-godraysDensity',
  GRAPHICS_SETTINGS_GODRAYS_WEIGHT = 'v2-keepTrack-graphicsSettings-godraysWeight',
  GRAPHICS_SETTINGS_GODRAYS_ILLUMINATION_DECAY = 'v2-keepTrack-graphicsSettings-godraysIlluminationDecay',
  GRAPHICS_SETTINGS_EARTH_DAY_RESOLUTION = 'v2-keepTrack-graphicsSettings-earthDayResolution',
  GRAPHICS_SETTINGS_EARTH_NIGHT_RESOLUTION = 'v2-keepTrack-graphicsSettings-earthNightResolution',
  FILTER_SETTINGS_PAYLOADS = 'v2-filter-settings-payload',
  FILTER_SETTINGS_ROCKET_BODIES = 'v2-filter-settings-rocket-bodies',
  FILTER_SETTINGS_DEBRIS = 'v2-filter-settings-debris',
  FILTER_SETTINGS_UNKNOWN_TYPE = 'v2-filter-settings-unknown-type',
  FILTER_SETTINGS_AGENCIES = 'v2-filter-settings-agencies',
  FILTER_SETTINGS_VLEO = 'v2-filter-settings-vleo',
  FILTER_SETTINGS_LEO = 'v2-filter-settings-leo',
  FILTER_SETTINGS_HEO = 'v2-filter-settings-heo',
  FILTER_SETTINGS_MEO = 'v2-filter-settings-meo',
  FILTER_SETTINGS_GEO = 'v2-filter-settings-geo',
  FILTER_SETTINGS_X_GEO = 'v2-filter-settings-x-geo',
  FILTER_SETTINGS_VIMPEL = 'v2-filter-settings-vimpel',
  FILTER_SETTINGS_CELESTRAK = 'v2-filter-settings-celestrak',
  FILTER_SETTINGS_NOTIONAL = 'v2-filter-settings-notional',
  FILTER_SETTINGS_UNITED_STATES = 'v2-filter-settings-united-states',
  FILTER_SETTINGS_UNITED_KINGDOM = 'v2-filter-settings-united-kingdom',
  FILTER_SETTINGS_FRANCE = 'v2-filter-settings-france',
  FILTER_SETTINGS_GERMANY = 'v2-filter-settings-germany',
  FILTER_SETTINGS_JAPAN = 'v2-filter-settings-japan',
  FILTER_SETTINGS_CHINA = 'v2-filter-settings-china',
  FILTER_SETTINGS_INDIA = 'v2-filter-settings-india',
  FILTER_SETTINGS_RUSSIA = 'v2-filter-settings-russia',
  FILTER_SETTINGS_USSR = 'v2-filter-settings-ussr',
  FILTER_SETTINGS_SOUTH_KOREA = 'v2-filter-settings-south-korea',
  FILTER_SETTINGS_AUSTRALIA = 'v2-filter-settings-australia',
  FILTER_SETTINGS_OTHER_COUNTRIES = 'v2-filter-settings-other-countries',
  FILTER_SETTINGS_STARLINK = 'v2-filter-settings-starlink',
  SENSOR_TIMELINE_ENABLED_SENSORS = 'v2-sensor-timeline-enabled-sensors',

  VERSION = 'v2-version',
}
export class PersistenceManager {
  private readonly storage_: Storage;

  private static instance_: PersistenceManager;

  private constructor() {
    this.storage_ = localStorage;
    this.validateStorage();
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

  validateStorage(): void {
    const currentVersion = this.storage_.getItem(StorageKey.VERSION);

    if (
      typeof currentVersion === 'string' &&
      typeof settingsManager.versionNumber === 'string' &&
      this.compareSemver_(currentVersion, settingsManager.versionNumber) < 0
    ) {
      // Handle version mismatch
      console.warn(`Version mismatch: ${currentVersion} < ${settingsManager.versionNumber}`);
      console.warn('Clearing local storage...');
      // Perform any necessary migration or cleanup
      this.storage_.clear();
    }

    // Save the current version to storage
    this.storage_.setItem(StorageKey.VERSION, settingsManager.versionNumber);
  }

  /**
   * Compares two semantic version strings.
   *
   * Splits each version string by '.' and compares each numeric part sequentially.
   * Returns -1 if `a` is less than `b`, 1 if `a` is greater than `b`, and 0 if they are equal.
   * Handles versions of different lengths by treating missing parts as 0.
   *
   * @param a - The first semantic version string (e.g., "1.2.3").
   * @param b - The second semantic version string (e.g., "1.2.4").
   * @returns A number indicating the comparison result:
   *          -1 if `a` < `b`, 1 if `a` > `b`, 0 if equal.
   */
  private compareSemver_(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;

      if (na < nb) {
        return -1;
      }
      if (na > nb) {
        return 1;
      }
    }

    return 0;
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
    if (settingsManager.isBlockPersistence) {
      return null;
    }
    PersistenceManager.verifyKey_(key);

    const value = this.storage_.getItem(key);

    if (value === null) {
      return null;
    }

    return value;
  }

  checkIfEnabled(key: string, fallback: boolean | undefined): boolean | undefined {
    PersistenceManager.verifyKey_(key);

    const value = this.storage_.getItem(key);

    if (value === null) {
      return fallback;
    }

    return value === 'true';
  }

  saveItem(key: string, value: string): void {
    if (settingsManager.isBlockPersistence) {
      return;
    }

    if (value === null || typeof value === 'undefined') {
      this.removeItem(key);

      return;
    }

    PersistenceManager.verifyKey_(key);
    try {
      this.storage_.setItem(key, value);
    } catch {
      errorManagerInstance.debug(`Failed to save to local storage: ${key}=${value}`);
    }
  }

  clear(): void {
    for (const key of Object.values(StorageKey)) {
      this.storage_.removeItem(key);
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
