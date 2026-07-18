import { StorageKey } from '@app/engine/persistence/storage-key';
import {
  ACCOUNT_STORAGE_KEYS,
  getAccountMergeHook,
  isAccountKey,
  registerAccountMergeHook,
  resetAccountMergeHooks,
  STORAGE_KEY_SCOPES,
  StorageScope,
} from '@app/engine/persistence/storage-scope';

/*
 * The scope registry is the single source of truth for which StorageKeys sync
 * to a logged-in account. These tests are the runtime drift guard behind the
 * compile-time Record<StorageKey, StorageScope> completeness check.
 */
describe('storage-scope registry', () => {
  it('classifies every StorageKey with a valid scope', () => {
    for (const key of Object.values(StorageKey)) {
      expect(Object.values(StorageScope)).toContain(STORAGE_KEY_SCOPES[key]);
    }
  });

  it('has no registry entries for keys outside the enum', () => {
    const validKeys = new Set<string>(Object.values(StorageKey));

    for (const key of Object.keys(STORAGE_KEY_SCOPES)) {
      expect(validKeys.has(key)).toBe(true);
    }
  });

  it('keeps meta/bookkeeping keys device-scoped', () => {
    expect(isAccountKey(StorageKey.SYNC_META)).toBe(false);
    expect(isAccountKey(StorageKey.VERSION)).toBe(false);
    expect(isAccountKey(StorageKey.USER_LAST_SYNCED)).toBe(false);
  });

  it('keeps filter state and graphics/perf keys device-scoped', () => {
    for (const key of Object.values(StorageKey)) {
      if (key.startsWith('v2-filter-settings-') || key.startsWith('v2-keepTrack-graphicsSettings-')) {
        expect(isAccountKey(key)).toBe(false);
      }
    }
  });

  /*
   * Intentional-change guard: syncing a new key to user accounts is a product
   * decision (it changes what leaves the device). Update this snapshot
   * deliberately when the classification changes.
   */
  it('matches the approved account-key list', () => {
    expect([...ACCOUNT_STORAGE_KEYS].sort()).toEqual(
      [
        StorageKey.CURRENT_SENSOR,
        StorageKey.WATCHLIST_LIST,
        StorageKey.SATELLITE_LISTS,
        StorageKey.FAVORITES_LIST,
        StorageKey.NEIGHBORHOOD_WATCH_LIST,
        StorageKey.FIND_SAT_PRO_SAVED_SEARCHES,
        StorageKey.OBSERVATION_STATIONS,
        StorageKey.SCENARIO_LIBRARY,
        StorageKey.ACHIEVEMENT_COUNTERS,
        StorageKey.SETTINGS_DRAW_CAMERA_WIDGET,
        StorageKey.SETTINGS_DRAW_ORBITS,
        StorageKey.SETTINGS_DRAW_TRAILING_ORBITS,
        StorageKey.SETTINGS_DRAW_ECF,
        StorageKey.SETTINGS_DRAW_IN_COVERAGE_LINES,
        StorageKey.SETTINGS_DRAW_BLACK_EARTH,
        StorageKey.SETTINGS_DRAW_ATMOSPHERE,
        StorageKey.SETTINGS_DRAW_MILKY_WAY,
        StorageKey.SETTINGS_GRAY_SKYBOX,
        StorageKey.SETTINGS_ECI_ON_HOVER,
        StorageKey.SETTINGS_HOS,
        StorageKey.SETTINGS_DEMO_MODE,
        StorageKey.SETTINGS_SAT_LABEL_MODE_V2,
        StorageKey.SETTINGS_FREEZE_PROP_RATE_ON_DRAG,
        StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS,
        StorageKey.SETTINGS_FOCUS_ON_SAT_WHEN_SELECTED,
        StorageKey.SETTINGS_DRAW_AURORA,
        StorageKey.SETTINGS_DRAW_GRATICULE,
        StorageKey.SETTINGS_DRAW_FLAT_MAP_TERMINATOR,
        StorageKey.SETTINGS_DRAW_SUN,
        StorageKey.SETTINGS_CONFIDENCE_LEVELS,
        StorageKey.SETTINGS_DRAW_COVARIANCE_ELLIPSOID,
        StorageKey.SETTINGS_COVARIANCE_CONFIDENCE_LEVEL,
        StorageKey.IS_ADVICE_ENABLED,
        StorageKey.SETTINGS_SEARCH_LIMIT,
        StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH,
        StorageKey.SETTINGS_MINIMUM_SEARCH_CHARACTERS,
        StorageKey.SETTINGS_SHOW_VIMPEL_IN_SEARCH,
        StorageKey.SETTINGS_SEARCHABLE_FIELDS,
        StorageKey.SETTINGS_SEARCHABLE_TYPES,
        StorageKey.LAST_MAP,
        StorageKey.COLOR_SCHEME,
        StorageKey.COLOR_SCHEME_OVERRIDES,
        StorageKey.SETTINGS_DOT_COLORS,
        StorageKey.SYMBOLOGY_CONFIG,
        StorageKey.SYMBOLOGY_ENABLED,
        StorageKey.DRAWER_GROUP_STATES,
        StorageKey.DRAWER_RECENT_PLUGINS,
        StorageKey.MULTI_VIEW_SETTINGS,
        StorageKey.STARS_SETTINGS,
        StorageKey.STEREO_MAP_SETTINGS,
      ].sort()
    );
  });
});

describe('account merge hooks', () => {
  afterEach(() => {
    resetAccountMergeHooks();
  });

  it('returns undefined for keys without a registered hook', () => {
    expect(getAccountMergeHook(StorageKey.WATCHLIST_LIST)).toBeUndefined();
  });

  it('registers and retrieves a custom merge', () => {
    const merge = (local: string | null, remote: string | null) => local ?? remote;

    registerAccountMergeHook(StorageKey.ACHIEVEMENT_COUNTERS, merge);
    expect(getAccountMergeHook(StorageKey.ACHIEVEMENT_COUNTERS)).toBe(merge);
  });
});
