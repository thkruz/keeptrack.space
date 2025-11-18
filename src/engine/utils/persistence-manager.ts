import type { DetailedSensor } from '@ootk/src/main';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { errorManagerInstance } from './errorManager';

/**
 * Core storage keys used by the persistence manager
 * Plugins should NOT modify this object - use the registration system instead
 */
export const STORAGE_KEYS = {
  // Aggregated storage keys
  PREFERENCES: 'v2-keepTrack-preferences',
  USER_DATA: 'v2-keepTrack-userData',

  // Legacy keys (for backward compatibility)
  VERSION: 'v2-version',
} as const;

/**
 * Type for storage keys - can be core keys or any string
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | string;

/**
 * Registration information for a preference or userData key
 */
interface KeyRegistration {
  key: string;
  type: 'preference' | 'userData';
  pluginId: string;
}

/**
 * User-specific data structure
 * Plugins can extend this interface using module augmentation:
 *
 * @example
 * declare module '@app/engine/utils/persistence-manager' {
 *   interface UserData {
 *     myPluginData?: MyCustomType;
 *   }
 * }
 */
export interface UserData {
  watchlist?: { id: number; inView: boolean }[];
  currentSensor?: DetailedSensor | string | null;
  customSensors?: DetailedSensor[];
  [key: string]: unknown;
}

/**
 * Preferences (settings) data structure
 * Plugins can extend this interface using module augmentation:
 *
 * @example
 * declare module '@app/engine/utils/persistence-manager' {
 *   interface Preferences {
 *     myPluginSetting?: boolean;
 *   }
 * }
 */
export interface Preferences {
  colors?: Record<string, unknown>;
  dotColors?: Record<string, unknown>;
  isAdviceEnabled?: boolean;
  lastMap?: string;
  colorScheme?: string;
  drawCameraWidget?: boolean;
  drawOrbits?: boolean;
  drawECF?: boolean;
  drawInCoverageLines?: boolean;
  drawBlackEarth?: boolean;
  drawAtmosphere?: boolean;
  drawMilkyWay?: boolean;
  graySkybox?: boolean;
  eciOnHover?: boolean;
  hos?: boolean;
  demoMode?: boolean;
  satLabelMode?: string;
  freezePropRateOnDrag?: boolean;
  disableTimeMachineToasts?: boolean;
  searchLimit?: number;
  drawTrailingOrbits?: boolean;
  drawAurora?: boolean;
  drawSun?: boolean;
  confidenceLevels?: boolean;
  drawCovarianceEllipsoid?: boolean;
  godraysSamples?: number;
  godraysDecay?: number;
  godraysExposure?: number;
  godraysDensity?: number;
  godraysWeight?: number;
  godraysIlluminationDecay?: number;
  earthDayResolution?: string;
  earthNightResolution?: string;
  filterPayloads?: boolean;
  filterRocketBodies?: boolean;
  filterDebris?: boolean;
  filterUnknownType?: boolean;
  filterAgencies?: boolean;
  filterVLEO?: boolean;
  filterLEO?: boolean;
  filterHEO?: boolean;
  filterMEO?: boolean;
  filterGEO?: boolean;
  filterXGEO?: boolean;
  filterVimpel?: boolean;
  filterCelestrak?: boolean;
  filterNotional?: boolean;
  filterUnitedStates?: boolean;
  filterUnitedKingdom?: boolean;
  filterFrance?: boolean;
  filterGermany?: boolean;
  filterJapan?: boolean;
  filterChina?: boolean;
  filterIndia?: boolean;
  filterRussia?: boolean;
  filterUSSR?: boolean;
  filterSouthKorea?: boolean;
  filterAustralia?: boolean;
  filterOtherCountries?: boolean;
  filterStarlink?: boolean;
  sensorTimelineEnabledSensors?: string[];
  [key: string]: unknown;
}

export class PersistenceManager {
  private readonly storage_: Storage;
  private static instance_: PersistenceManager;

  private preferences_: Preferences = {};
  private userData_: UserData = {};

  private isUseLocalStorage_ = false;
  private isUseRemoteStorage_ = false;
  private debounceTimer_: ReturnType<typeof setTimeout> | null = null;
  private hasChanges_ = false;
  private isInitialized_ = false;
  private readonly DEBOUNCE_DELAY_MS = 3000;

  // Key registration system
  private keyRegistry_ = new Map<string, KeyRegistration>();

  private constructor() {
    this.storage_ = localStorage;
    this.loadFromLocalStorage_();
    this.setupEventListeners_();
    this.isInitialized_ = true;
  }

  get storage(): Storage {
    return this.storage_;
  }

  get preferences(): Preferences {
    return this.preferences_;
  }

  set preferences(value: Preferences) {
    this.preferences_ = value;
    this.markChanged_();
  }

  get userData(): UserData {
    return this.userData_;
  }

  set userData(value: UserData) {
    this.userData_ = value;
    this.markChanged_();
  }

  get isUseLocalStorage(): boolean {
    return this.isUseLocalStorage_;
  }

  set isUseLocalStorage(value: boolean) {
    this.isUseLocalStorage_ = value;
  }

  get isUseRemoteStorage(): boolean {
    return this.isUseRemoteStorage_;
  }

  set isUseRemoteStorage(value: boolean) {
    this.isUseRemoteStorage_ = value;
  }

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance_) {
      PersistenceManager.instance_ = new PersistenceManager();
    }

    return PersistenceManager.instance_;
  }

  /**
   * Register a key for use in preferences or userData
   * This helps prevent key collisions between plugins
   *
   * @param key - The key name to register
   * @param type - Whether this is a 'preference' or 'userData' key
   * @param pluginId - The ID of the plugin registering this key
   * @throws Error in debug mode if key is already registered
   *
   * @example
   * // In your plugin's init method:
   * PersistenceManager.getInstance().registerKey('myPluginEnabled', 'preference', 'MyPlugin');
   * PersistenceManager.getInstance().registerKey('myPluginData', 'userData', 'MyPlugin');
   *
   * // Then use it:
   * const pm = PersistenceManager.getInstance();
   * pm.preferences.myPluginEnabled = true;
   * pm.userData.myPluginData = { foo: 'bar' };
   */
  registerKey(key: string, type: 'preference' | 'userData', pluginId: string): void {
    const existing = this.keyRegistry_.get(key);

    if (existing) {
      const errorMsg = `[PersistenceManager] Duplicate key registration: "${key}" already registered by "${existing.pluginId}" (attempted by "${pluginId}")`;

      if (errorManagerInstance.isDebug) {
        throw new Error(errorMsg);
      }
      errorManagerInstance.warn(errorMsg);

      return;
    }

    this.keyRegistry_.set(key, { key, type, pluginId });
    errorManagerInstance.debug(`[PersistenceManager] Registered ${type} key "${key}" for plugin "${pluginId}"`);
  }

  /**
   * Unregister a previously registered key
   *
   * @param key - The key to unregister
   */
  unregisterKey(key: string): void {
    this.keyRegistry_.delete(key);
  }

  /**
   * Check if a key is registered
   *
   * @param key - The key to check
   * @returns true if the key is registered
   */
  isKeyRegistered(key: string): boolean {
    return this.keyRegistry_.has(key);
  }

  /**
   * Get all registered keys for debugging
   *
   * @returns Array of all registered keys with their metadata
   */
  getRegisteredKeys(): KeyRegistration[] {
    return Array.from(this.keyRegistry_.values());
  }

  /**
   * Set up event listeners for data and preferences updates
   */
  private setupEventListeners_(): void {
    const eventBus = EventBus.getInstance();

    // Listen for data updates (watchlist, sensor changes, etc.)
    eventBus.on(EventBusEvent.buildDataUpdate, () => {
      this.buildUserData_();
    });

    // Listen for preferences updates (settings changes)
    eventBus.on(EventBusEvent.buildPreferencesUpdate, () => {
      this.buildPreferences_();
    });

    // Listen to specific events that trigger data updates
    eventBus.on(EventBusEvent.onWatchlistAdd, () => {
      this.buildUserData_();
    });

    eventBus.on(EventBusEvent.onWatchlistRemove, () => {
      this.buildUserData_();
    });

    eventBus.on(EventBusEvent.setSensor, () => {
      this.buildUserData_();
    });

    // Listen to settings save event
    eventBus.on(EventBusEvent.saveSettings, () => {
      this.buildPreferences_();
    });
  }

  /**
   * Build user data from current application state
   */
  private buildUserData_(): void {
    // This will be populated by plugins/managers via the userData setter
    // or by directly accessing the userData object and modifying it
    this.markChanged_();
  }

  /**
   * Build preferences from current application state
   */
  private buildPreferences_(): void {
    // This will be populated by settings manager via the preferences setter
    // or by directly accessing the preferences object and modifying it
    this.markChanged_();
  }

  /**
   * Mark that changes have occurred and trigger debounced sync
   */
  private markChanged_(): void {
    if (!this.isInitialized_) {
      return;
    }

    this.hasChanges_ = true;

    // Only run sync loop if at least one storage method is enabled
    if (this.isUseLocalStorage_ || this.isUseRemoteStorage_) {
      this.debouncedSync_();
    }
  }

  /**
   * Debounced sync - waits 3 seconds after last change before syncing
   */
  private debouncedSync_(): void {
    if (this.debounceTimer_) {
      clearTimeout(this.debounceTimer_);
    }

    this.debounceTimer_ = setTimeout(() => {
      this.sync_();
    }, this.DEBOUNCE_DELAY_MS);
  }

  /**
   * Perform the actual sync operation
   */
  private sync_(): void {
    if (!this.hasChanges_) {
      return;
    }

    // Save to localStorage if enabled
    if (this.isUseLocalStorage_) {
      this.saveToLocalStorage_();
    }

    // Emit event for external systems (e.g., user-account plugin for Supabase sync)
    EventBus.getInstance().emit(EventBusEvent.debouncedSync);

    this.hasChanges_ = false;
  }

  /**
   * Load preferences and userData from localStorage
   */
  private loadFromLocalStorage_(): void {
    try {
      // Load preferences
      const prefsData = this.storage_.getItem(STORAGE_KEYS.PREFERENCES);

      if (prefsData) {
        this.preferences_ = JSON.parse(prefsData);
      }

      // Load user data
      const userDataStr = this.storage_.getItem(STORAGE_KEYS.USER_DATA);

      if (userDataStr) {
        this.userData_ = JSON.parse(userDataStr);
      }
    } catch (error) {
      errorManagerInstance.error(error as Error, 'PersistenceManager.loadFromLocalStorage_', 'Failed to load from localStorage');
    }
  }

  /**
   * Save preferences and userData to localStorage
   */
  private saveToLocalStorage_(): void {
    try {
      // Serialize and save preferences
      const prefsData = JSON.stringify(this.preferences_);

      this.storage_.setItem(STORAGE_KEYS.PREFERENCES, prefsData);

      // Serialize and save user data
      const userDataStr = JSON.stringify(this.userData_);

      this.storage_.setItem(STORAGE_KEYS.USER_DATA, userDataStr);
    } catch (error) {
      errorManagerInstance.error(error as Error, 'PersistenceManager.saveToLocalStorage_', 'Failed to save to localStorage');
    }
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.preferences_ = {};
    this.userData_ = {};

    if (this.isUseLocalStorage_) {
      this.storage_.removeItem(STORAGE_KEYS.PREFERENCES);
      this.storage_.removeItem(STORAGE_KEYS.USER_DATA);
    }

    this.hasChanges_ = false;
  }

  /**
   * Force an immediate sync (bypassing debounce)
   */
  forceSync(): void {
    if (this.debounceTimer_) {
      clearTimeout(this.debounceTimer_);
      this.debounceTimer_ = null;
    }
    this.sync_();
  }
}
