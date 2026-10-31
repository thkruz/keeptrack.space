import { EMBED_API_VERSION, EMBED_CONFIG_PROPERTY, type EmbedCatalogMode, type EmbedConfig, type EmbedErrorCode, type EmbedUiFlags } from './embed-types';

export type SettingsOverrideLike = Record<string, unknown>;

/** Analyst slots needed in scenario mode; the catalog is empty so a large block is cheap. */
export const SCENARIO_MIN_ANALYST_SLOTS = 1024;

/**
 * Read the config the SDK set on the hosting <iframe>. Null when not embedded, when the config is
 * absent, or when the parent is cross-origin (frameElement access throws or returns null).
 */
export function readEmbedBootConfig(): EmbedConfig | null {
  try {
    const frame = (window as unknown as { frameElement?: Record<string, unknown> | null }).frameElement;
    const config = frame?.[EMBED_CONFIG_PROPERTY];

    return config !== null && typeof config === 'object' ? (config as EmbedConfig) : null;
  } catch {
    return null;
  }
}

function majorOf(version: string): string {
  return version.split('.')[0] ?? '';
}

/** VERSION_MISMATCH when the host asked for a different API major; null when compatible or unspecified. */
export function checkApiVersion(config: EmbedConfig): EmbedErrorCode | null {
  if (config.apiVersion === undefined) {
    return null;
  }

  return majorOf(String(config.apiVersion)) === majorOf(EMBED_API_VERSION) ? null : 'VERSION_MISMATCH';
}

export function catalogModeOf(config: EmbedConfig | null): EmbedCatalogMode {
  return config?.catalog?.mode ?? 'full';
}

/** UI flags after defaults and ownership rules (time controls are forced off when the host owns time). */
export function resolveUiFlags(config: EmbedConfig): Partial<EmbedUiFlags> {
  const flags: Partial<EmbedUiFlags> = { ...config.ui };

  if (config.ownership?.time === 'host') {
    flags.timeControls = false;
  }

  return flags;
}

/**
 * Convert an EmbedConfig into settingsOverride keys, merged over baseOverride. config.settings wins
 * last. Pure: returns a new object.
 *
 * Mapping:
 *  - always: isEmbedMode, isAutoStart, isDisableServiceWorker, isDisableTelemetry, isDisableOnboarding,
 *    isBlockPersistence, isDisableLoginGate, isShowSplashScreen=false, isShowLoadingHints=false,
 *    isShowSecondaryLogo=false, isDisableUrlBar
 *  - catalog.mode 'scenario': noCatalogOnLoad, maxAnalystSats (>= 1024), isEnableJscCatalog=false,
 *    isDisableLaunchSites, isDisableControlSites
 *  - plugins.allow: plugins {id: {enabled: true}} + isStrictPluginList
 *  - ui.bottomMenu/search/keyboard/contextMenu/toasts: isDisableBottomMenu / isDisableSearchBox /
 *    isDisableKeyboard / isAllowRightClick / isDisableToasts. topMenu, timeControls and infoBox have no
 *    setting; they are hidden with CSS (embed-ui.ts).
 *  - ownership.selection 'host': isDisableSelectSat (the facade lifts it around host calls)
 */
export function mapEmbedConfigToSettings(config: EmbedConfig, baseOverride: SettingsOverrideLike = {}): SettingsOverrideLike {
  const out: SettingsOverrideLike = {
    ...baseOverride,
    isEmbedMode: true,
    isAutoStart: true,
    isDisableServiceWorker: true,
    isDisableTelemetry: true,
    isDisableOnboarding: true,
    isBlockPersistence: true,
    isDisableLoginGate: true,
    isShowSplashScreen: false,
    isShowLoadingHints: false,
    isShowSecondaryLogo: false,
    isDisableUrlBar: true,
  };

  if (config.catalog?.mode === 'scenario') {
    const baseSlots = typeof baseOverride.maxAnalystSats === 'number' ? baseOverride.maxAnalystSats : 0;

    out.noCatalogOnLoad = true;
    out.maxAnalystSats = Math.max(baseSlots, SCENARIO_MIN_ANALYST_SLOTS, (config.catalog.objects?.length ?? 0) + 256);
    out.isEnableJscCatalog = false;
    out.isDisableLaunchSites = true;
    out.isDisableControlSites = true;
  }

  const allow = config.plugins?.allow;

  if (Array.isArray(allow)) {
    const plugins: Record<string, unknown> = {};

    for (const id of allow) {
      plugins[id] = { enabled: true };
    }
    out.plugins = { ...(baseOverride.plugins as Record<string, unknown> | undefined), ...plugins };
    out.isStrictPluginList = true;
  }

  const ui = resolveUiFlags(config);

  if (ui.bottomMenu === false) {
    out.isDisableBottomMenu = true;
  }
  if (ui.search === false) {
    out.isDisableSearchBox = true;
  }
  if (ui.keyboard === false) {
    out.isDisableKeyboard = true;
  }
  if (ui.contextMenu === false) {
    out.isAllowRightClick = false;
  }
  if (ui.toasts === false) {
    out.isDisableToasts = true;
  }

  if (config.ownership?.selection === 'host') {
    out.isDisableSelectSat = true;
  }

  if (config.settings && typeof config.settings === 'object') {
    Object.assign(out, config.settings);
  }

  return out;
}
