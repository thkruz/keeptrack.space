import { AtmosphereSettings, EarthDayTextureQuality, EarthNightTextureQuality } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { errorManagerInstance } from '../engine/utils/errorManager';
import { PersistenceManager, StorageKey } from '../engine/utils/persistence-manager';
import type { SettingsManager } from './settings';
import { SatLabelMode } from './ui-settings';

/**
 * One settings-menu-owned setting that round-trips through PersistenceManager.
 *
 * This table is the single source of truth shared by
 * {@link SettingsManager.preserveSettings} (serialize side) and
 * {@link SettingsManager.loadPersistedSettings} (deserialize side), replacing
 * the two hand-maintained lists that used to drift. Remote account sync applies
 * cloud values through the same entries.
 */
export interface PersistedSettingEntry {
  key: StorageKey;
  /** Snapshot current settingsManager state to a raw string; null removes the key. */
  serialize: (sm: SettingsManager) => string | null;
  /** Apply a persisted raw string back onto settingsManager. */
  deserialize: (sm: SettingsManager, raw: string) => void;
  /** Optional boot-time fallback when no persisted value exists (legacy-key migration). */
  deserializeMissing?: (sm: SettingsManager) => void;
}

const bool = (raw: string): boolean => raw === 'true';

export const PERSISTED_SETTINGS_TABLE: readonly PersistedSettingEntry[] = [
  {
    key: StorageKey.SETTINGS_DRAW_CAMERA_WIDGET,
    serialize: (sm) => String(sm.drawCameraWidget),
    deserialize: (sm, raw) => {
      sm.drawCameraWidget = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_ORBITS,
    serialize: (sm) => String(sm.isDrawOrbits),
    deserialize: (sm, raw) => {
      sm.isDrawOrbits = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_TRAILING_ORBITS,
    serialize: (sm) => String(sm.isDrawTrailingOrbits),
    deserialize: (sm, raw) => {
      sm.isDrawTrailingOrbits = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_ECF,
    serialize: (sm) => String(sm.isOrbitCruncherInEcf),
    deserialize: (sm, raw) => {
      sm.isOrbitCruncherInEcf = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_IN_COVERAGE_LINES,
    serialize: (sm) => String(sm.isDrawInCoverageLines),
    deserialize: (sm, raw) => {
      sm.isDrawInCoverageLines = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_SUN,
    serialize: (sm) => String(sm.isDrawSun),
    deserialize: (sm, raw) => {
      sm.isDrawSun = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_COVARIANCE_ELLIPSOID,
    serialize: (sm) => String(sm.isDrawCovarianceEllipsoid),
    deserialize: (sm, raw) => {
      sm.isDrawCovarianceEllipsoid = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_COVARIANCE_CONFIDENCE_LEVEL,
    serialize: (sm) => String(sm.covarianceConfidenceLevel),
    deserialize: (sm, raw) => {
      const level = parseInt(raw, 10);

      if (level >= 1 && level <= 3) {
        sm.covarianceConfidenceLevel = level;
      }
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_BLACK_EARTH,
    serialize: (sm) => String(sm.isBlackEarth),
    deserialize: (sm, raw) => {
      sm.isBlackEarth = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_ATMOSPHERE,
    serialize: (sm) => String(sm.isDrawAtmosphere),
    deserialize: (sm, raw) => {
      sm.isDrawAtmosphere = parseInt(raw, 10) as AtmosphereSettings;
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_AURORA,
    serialize: (sm) => String(sm.isDrawAurora),
    deserialize: (sm, raw) => {
      sm.isDrawAurora = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_GRATICULE,
    serialize: (sm) => String(sm.isDrawGraticule),
    deserialize: (sm, raw) => {
      sm.isDrawGraticule = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_FLAT_MAP_TERMINATOR,
    serialize: (sm) => String(sm.isDrawFlatMapTerminator),
    deserialize: (sm, raw) => {
      sm.isDrawFlatMapTerminator = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DRAW_MILKY_WAY,
    serialize: (sm) => String(sm.isDrawMilkyWay),
    deserialize: (sm, raw) => {
      sm.isDrawMilkyWay = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_GRAY_SKYBOX,
    serialize: (sm) => String(sm.isGraySkybox),
    deserialize: (sm, raw) => {
      sm.isGraySkybox = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_ECI_ON_HOVER,
    serialize: (sm) => String(sm.isEciOnHover),
    deserialize: (sm, raw) => {
      sm.isEciOnHover = bool(raw);
    },
  },
  {
    // Write-only mirror of the hide-other-sats state; the color scheme owns the
    // live value, so nothing is restored here.
    key: StorageKey.SETTINGS_HOS,
    serialize: (sm) => (sm.colors?.transparent ? String(sm.colors.transparent[3] === 0) : null),
    deserialize: () => {
      // Owned by the color scheme pipeline
    },
  },
  {
    // Presence implies enabled: serialize removes the key when false.
    key: StorageKey.SETTINGS_CONFIDENCE_LEVELS,
    serialize: (sm) => (sm.isShowConfidenceLevels ? 'true' : null),
    deserialize: (sm, raw) => {
      sm.isShowConfidenceLevels = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DEMO_MODE,
    serialize: (sm) => String(sm.isDemoModeOn),
    deserialize: (sm, raw) => {
      sm.isDemoModeOn = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_SAT_LABEL_MODE_V2,
    serialize: (sm) => String(sm.satLabelMode),
    deserialize: (sm, raw) => {
      sm.satLabelMode = parseInt(raw, 10) as SatLabelMode;
    },
    deserializeMissing: (sm) => {
      // Migrate from the legacy boolean key
      const oldLabelMode = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_SAT_LABEL_MODE, true) as boolean;

      sm.satLabelMode = oldLabelMode ? SatLabelMode.FOV_ONLY : SatLabelMode.OFF;
    },
  },
  {
    key: StorageKey.SETTINGS_FREEZE_PROP_RATE_ON_DRAG,
    serialize: (sm) => String(sm.isFreezePropRateOnDrag),
    deserialize: (sm, raw) => {
      sm.isFreezePropRateOnDrag = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS,
    serialize: (sm) => String(sm.isDisableTimeMachineToasts),
    deserialize: (sm, raw) => {
      sm.isDisableTimeMachineToasts = bool(raw);
    },
  },
  {
    key: StorageKey.SETTINGS_FOCUS_ON_SAT_WHEN_SELECTED,
    serialize: (sm) => String(sm.isFocusOnSatelliteWhenSelected),
    deserialize: (sm, raw) => {
      sm.isFocusOnSatelliteWhenSelected = bool(raw);
    },
  },
  /*
   * Godray keys are write-only here: GraphicsMenuPlugin owns loading them (it
   * reads the keys directly when building its menu and applying quality).
   */
  {
    key: StorageKey.GRAPHICS_SETTINGS_GODRAYS_SAMPLES,
    serialize: (sm) => sm.godraysSamples?.toString() ?? null,
    deserialize: () => {
      // Owned by GraphicsMenuPlugin
    },
  },
  {
    key: StorageKey.GRAPHICS_SETTINGS_GODRAYS_DECAY,
    serialize: (sm) => sm.godraysDecay?.toString() ?? null,
    deserialize: () => {
      // Owned by GraphicsMenuPlugin
    },
  },
  {
    key: StorageKey.GRAPHICS_SETTINGS_GODRAYS_EXPOSURE,
    serialize: (sm) => sm.godraysExposure?.toString() ?? null,
    deserialize: () => {
      // Owned by GraphicsMenuPlugin
    },
  },
  {
    key: StorageKey.GRAPHICS_SETTINGS_GODRAYS_DENSITY,
    serialize: (sm) => sm.godraysDensity?.toString() ?? null,
    deserialize: () => {
      // Owned by GraphicsMenuPlugin
    },
  },
  {
    key: StorageKey.GRAPHICS_SETTINGS_GODRAYS_WEIGHT,
    serialize: (sm) => sm.godraysWeight?.toString() ?? null,
    deserialize: () => {
      // Owned by GraphicsMenuPlugin
    },
  },
  {
    key: StorageKey.GRAPHICS_SETTINGS_GODRAYS_ILLUMINATION_DECAY,
    serialize: (sm) => sm.godraysIlluminationDecay?.toString() ?? null,
    deserialize: () => {
      // Owned by GraphicsMenuPlugin
    },
  },
  {
    key: StorageKey.GRAPHICS_SETTINGS_EARTH_DAY_RESOLUTION,
    serialize: (sm) => sm.earthDayTextureQuality?.toString() ?? null,
    deserialize: (sm, raw) => {
      sm.earthDayTextureQuality = raw as EarthDayTextureQuality;
    },
  },
  {
    key: StorageKey.GRAPHICS_SETTINGS_EARTH_NIGHT_RESOLUTION,
    serialize: (sm) => sm.earthNightTextureQuality?.toString() ?? null,
    deserialize: (sm, raw) => {
      sm.earthNightTextureQuality = raw as EarthNightTextureQuality;
    },
  },
];

/**
 * The StorageKeys owned by the settings menu's persist/load cycle. Guarded by a
 * drift test so a new settings-menu key cannot be added without a table entry.
 */
export const SETTINGS_MENU_OWNED_KEYS: readonly StorageKey[] = PERSISTED_SETTINGS_TABLE.map((entry) => entry.key);

const tableByKey_ = new Map<StorageKey, PersistedSettingEntry>(PERSISTED_SETTINGS_TABLE.map((entry) => [entry.key, entry]));

/**
 * Apply one persisted raw value (or its absence) onto settingsManager.
 * Returns true when the key belongs to the table.
 */
export const applyPersistedSetting = (sm: SettingsManager, key: StorageKey, raw: string | null): boolean => {
  const entry = tableByKey_.get(key);

  if (!entry) {
    return false;
  }

  // A corrupt or version-incompatible persisted value must NEVER throw and wedge
  // the whole boot (one bad key would otherwise abort loadPersistedSettings and
  // every later setting). Isolate each key: log and skip on failure so the rest
  // still apply and the app boots with sane defaults for the bad one.
  try {
    if (raw !== null) {
      entry.deserialize(sm, raw);
    } else {
      entry.deserializeMissing?.(sm);
    }
  } catch (err) {
    errorManagerInstance.warn(`Skipping corrupt saved setting "${key}": ${err instanceof Error ? err.message : String(err)}`);
  }

  return true;
};
