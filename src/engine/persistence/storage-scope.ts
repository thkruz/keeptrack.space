import { StorageKey } from './storage-key';

/**
 * Persistence scope of a StorageKey.
 *
 * - `Device`: persists in localStorage only. Never leaves this browser profile.
 *   Used for hardware/perf-dependent values (graphics quality), per-device
 *   layout (drawer rail mode), caches, ad dismissals, tool last-used inputs,
 *   and sync bookkeeping.
 * - `Account`: persists in localStorage AND syncs to the logged-in user's
 *   cloud preferences (per-key last-write-wins). Used for preferences and data
 *   the user expects to follow them across devices.
 */
export enum StorageScope {
  Device = 'device',
  Account = 'account',
}

/**
 * The single source of truth for which keys sync to a logged-in account.
 *
 * Typed as Record<StorageKey, StorageScope> deliberately: adding a StorageKey
 * without classifying it here is a compile error, and storage-scope.test.ts
 * guards the same invariant at runtime.
 */
export const STORAGE_KEY_SCOPES: Record<StorageKey, StorageScope> = {
  // --- Account: user data collections -----------------------------------------
  [StorageKey.CURRENT_SENSOR]: StorageScope.Account,
  [StorageKey.WATCHLIST_LIST]: StorageScope.Account,
  [StorageKey.SATELLITE_LISTS]: StorageScope.Account,
  [StorageKey.FAVORITES_LIST]: StorageScope.Account,
  [StorageKey.NEIGHBORHOOD_WATCH_LIST]: StorageScope.Account,
  [StorageKey.FIND_SAT_PRO_SAVED_SEARCHES]: StorageScope.Account,
  [StorageKey.OBSERVATION_STATIONS]: StorageScope.Account,
  [StorageKey.SCENARIO_LIBRARY]: StorageScope.Account,
  [StorageKey.ACHIEVEMENT_COUNTERS]: StorageScope.Account,

  // --- Account: visual/UX preferences (settings menu) -------------------------
  [StorageKey.SETTINGS_DRAW_CAMERA_WIDGET]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_ORBITS]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_TRAILING_ORBITS]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_ECF]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_IN_COVERAGE_LINES]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_BLACK_EARTH]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_ATMOSPHERE]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_MILKY_WAY]: StorageScope.Account,
  [StorageKey.SETTINGS_GRAY_SKYBOX]: StorageScope.Account,
  [StorageKey.SETTINGS_ECI_ON_HOVER]: StorageScope.Account,
  [StorageKey.SETTINGS_HOS]: StorageScope.Account,
  [StorageKey.SETTINGS_DEMO_MODE]: StorageScope.Account,
  [StorageKey.SETTINGS_SAT_LABEL_MODE_V2]: StorageScope.Account,
  [StorageKey.SETTINGS_FREEZE_PROP_RATE_ON_DRAG]: StorageScope.Account,
  [StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS]: StorageScope.Account,
  [StorageKey.SETTINGS_FOCUS_ON_SAT_WHEN_SELECTED]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_AURORA]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_GRATICULE]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_FLAT_MAP_TERMINATOR]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_SUN]: StorageScope.Account,
  [StorageKey.SETTINGS_CONFIDENCE_LEVELS]: StorageScope.Account,
  [StorageKey.SETTINGS_DRAW_COVARIANCE_ELLIPSOID]: StorageScope.Account,
  [StorageKey.SETTINGS_COVARIANCE_CONFIDENCE_LEVEL]: StorageScope.Account,
  [StorageKey.IS_ADVICE_ENABLED]: StorageScope.Account,

  // --- Account: search settings ------------------------------------------------
  [StorageKey.SETTINGS_SEARCH_LIMIT]: StorageScope.Account,
  [StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH]: StorageScope.Account,
  [StorageKey.SETTINGS_MINIMUM_SEARCH_CHARACTERS]: StorageScope.Account,
  [StorageKey.SETTINGS_SHOW_VIMPEL_IN_SEARCH]: StorageScope.Account,
  [StorageKey.SETTINGS_SEARCHABLE_FIELDS]: StorageScope.Account,
  [StorageKey.SETTINGS_SEARCHABLE_TYPES]: StorageScope.Account,

  // --- Account: workspace/layout ----------------------------------------------
  [StorageKey.LAST_MAP]: StorageScope.Account,
  [StorageKey.COLOR_SCHEME]: StorageScope.Account,
  [StorageKey.COLOR_SCHEME_OVERRIDES]: StorageScope.Account,
  [StorageKey.SETTINGS_DOT_COLORS]: StorageScope.Account,
  [StorageKey.SYMBOLOGY_CONFIG]: StorageScope.Account,
  [StorageKey.SYMBOLOGY_ENABLED]: StorageScope.Account,
  [StorageKey.DRAWER_GROUP_STATES]: StorageScope.Account,
  [StorageKey.DRAWER_RECENT_PLUGINS]: StorageScope.Account,
  [StorageKey.MULTI_VIEW_SETTINGS]: StorageScope.Account,
  [StorageKey.STARS_SETTINGS]: StorageScope.Account,
  [StorageKey.STEREO_MAP_SETTINGS]: StorageScope.Account,

  // --- Device: hardware/perf-dependent graphics --------------------------------
  [StorageKey.GRAPHICS_SETTINGS_GODRAYS_SAMPLES]: StorageScope.Device,
  [StorageKey.GRAPHICS_SETTINGS_GODRAYS_DECAY]: StorageScope.Device,
  [StorageKey.GRAPHICS_SETTINGS_GODRAYS_EXPOSURE]: StorageScope.Device,
  [StorageKey.GRAPHICS_SETTINGS_GODRAYS_DENSITY]: StorageScope.Device,
  [StorageKey.GRAPHICS_SETTINGS_GODRAYS_WEIGHT]: StorageScope.Device,
  [StorageKey.GRAPHICS_SETTINGS_GODRAYS_ILLUMINATION_DECAY]: StorageScope.Device,
  [StorageKey.GRAPHICS_SETTINGS_EARTH_DAY_RESOLUTION]: StorageScope.Device,
  [StorageKey.GRAPHICS_SETTINGS_EARTH_NIGHT_RESOLUTION]: StorageScope.Device,

  // --- Device: filter state (explicitly excluded from account sync) ------------
  [StorageKey.FILTER_SETTINGS_OPERATIONAL_PAYLOADS]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_NON_OPERATIONAL_PAYLOADS]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_ROCKET_BODIES]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_DEBRIS]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_UNKNOWN_TYPE]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_VLEO]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_LEO]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_HEO]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_MEO]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_GEO]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_X_GEO]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_VIMPEL]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_CELESTRAK]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_CELESTRAK_SUP]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_SATNOGS]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_NOTIONAL]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_UNITED_STATES]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_UNITED_KINGDOM]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_FRANCE]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_GERMANY]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_JAPAN]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_CHINA]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_INDIA]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_RUSSIA]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_USSR]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_SOUTH_KOREA]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_AUSTRALIA]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_OTHER_COUNTRIES]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_STARLINK]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_GROUND_SENSORS]: StorageScope.Device,
  [StorageKey.FILTER_SETTINGS_LAUNCH_FACILITIES]: StorageScope.Device,

  // --- Device: analyst working state / per-device layout ------------------------
  [StorageKey.SENSOR_TIMELINE_ENABLED_SENSORS]: StorageScope.Device,
  [StorageKey.ACCESS_TIMELINE_ENABLED_SENSORS]: StorageScope.Device,
  [StorageKey.DRAWER_RAIL_MODE]: StorageScope.Device,
  [StorageKey.COMMAND_PALETTE_RECENT]: StorageScope.Device,
  [StorageKey.LAST_CONSTELLATION]: StorageScope.Device,
  [StorageKey.DOPPLER_REF_FREQUENCY]: StorageScope.Device,

  // --- Device: tool last-used inputs -------------------------------------------
  [StorageKey.BEST_PASS_SETTINGS]: StorageScope.Device,
  [StorageKey.PROXIMITY_OPS_SETTINGS]: StorageScope.Device,
  [StorageKey.BREAKUP_SETTINGS]: StorageScope.Device,
  [StorageKey.REPORTS_SETTINGS]: StorageScope.Device,
  [StorageKey.CALCULATOR_SETTINGS]: StorageScope.Device,
  [StorageKey.SEISMIC_ACTIVITY_SETTINGS]: StorageScope.Device,
  [StorageKey.AURORA_AUTO_REFRESH]: StorageScope.Device,
  [StorageKey.AURORA_AUTO_HIGH_ACCURACY]: StorageScope.Device,

  // --- Device: caches, dismissals, migration sources ----------------------------
  [StorageKey.DOPS_TERRAIN_STORE]: StorageScope.Device,
  [StorageKey.SPONSOR_AD_DISMISSED_UNTIL]: StorageScope.Device,
  [StorageKey.BOTTOM_BANNER_AD_DISMISSED_UNTIL]: StorageScope.Device,
  [StorageKey.SETTINGS_SAT_LABEL_MODE]: StorageScope.Device,
  [StorageKey.ONBOARDING_STATE]: StorageScope.Device,
  [StorageKey.PLUGIN_ENABLE_OVERRIDES]: StorageScope.Device,

  // --- Device: meta/bookkeeping (never sync) ------------------------------------
  [StorageKey.VERSION]: StorageScope.Device,
  [StorageKey.USER_LAST_SYNCED]: StorageScope.Device,
  [StorageKey.SYNC_META]: StorageScope.Device,
};

export const isAccountKey = (key: StorageKey): boolean => STORAGE_KEY_SCOPES[key] === StorageScope.Account;

export const ACCOUNT_STORAGE_KEYS: readonly StorageKey[] = Object.values(StorageKey).filter(isAccountKey);

/**
 * Custom conflict merge for an account key. Runs INSTEAD of last-write-wins on
 * every pull: both sides' raw values go in, the merged raw value comes out
 * (null = key absent/tombstoned on both sides). Must be commutative and
 * idempotent so devices converge regardless of sync order.
 */
export type AccountMergeFn = (localValue: string | null, remoteValue: string | null) => string | null;

const accountMergeHooks_ = new Map<StorageKey, AccountMergeFn>();

/**
 * Register a custom merge for an account key (e.g. ACHIEVEMENT_COUNTERS unions
 * monotonic counters instead of letting a smaller count overwrite a larger one).
 * Pro plugins register domain-specific merges here at init.
 */
export const registerAccountMergeHook = (key: StorageKey, merge: AccountMergeFn): void => {
  accountMergeHooks_.set(key, merge);
};

export const getAccountMergeHook = (key: StorageKey): AccountMergeFn | undefined => accountMergeHooks_.get(key);

/** Test-only: clear registered merge hooks between suites. */
export const resetAccountMergeHooks = (): void => {
  accountMergeHooks_.clear();
};
