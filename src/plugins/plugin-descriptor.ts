import type { PluginConfiguration } from './keeptrack-plugins-configuration';

/**
 * Describes a single plugin for the manifest.
 *
 * Adding a new plugin requires:
 * 1. Add a PluginDescriptor entry to plugin-manifest.ts (import path, class name, default config)
 * 2. Add the config key to KeepTrackPluginsConfiguration if it needs type-safe access from presets/URL manager
 */
export interface PluginDescriptor {
  /** Config key in KeepTrackPluginsConfiguration. Must match the key used in settingsManager.plugins */
  configKey: string;

  /** Dynamic import for the OSS version of the plugin (omit for pro-only plugins) */
  ossImport?: () => Promise<Record<string, unknown>>;

  /** Exported class name in the OSS module (omit for pro-only plugins) */
  ossClassName?: string;

  /** Dynamic import for the Pro version (omit if no pro variant exists) */
  proImport?: () => Promise<Record<string, unknown>>;

  /** Exported class name in the Pro module (defaults to ossClassName if omitted) */
  proClassName?: string;

  /** Default configuration - this is the single source of truth, replaces default-plugins.ts entries */
  defaultConfig: PluginConfiguration;

  /** When true, the plugin is always enabled regardless of user config */
  alwaysEnabled?: boolean;

  /** When true, this plugin requires login to use (shows PRO badge, gates access) */
  isLoginRequired?: boolean;
}
