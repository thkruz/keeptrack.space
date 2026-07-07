/**
 * Shared types for the plugin CLI. The on-disk `keeptrack-plugin.json` schema
 * and the `external-plugins.json` lockfile schema live here.
 */

/** One plugin entry inside a repo's keeptrack-plugin.json `plugins` array. */
export interface PluginEntry {
  /** Config key — MUST equal the plugin class's `readonly id`. */
  configKey: string;
  /** Named export in `entry` to instantiate. */
  className: string;
  /** Repo-relative path to the entry module (explicit extension, POSIX separators). */
  entry: string;
  /** Default configuration folded into settingsManager.plugins. */
  defaultConfig: { enabled: boolean; menuMode?: unknown; order?: number; hideBottomIcon?: boolean };
  /** configKeys of built-in plugins this plugin needs (dev harness strict-list boot set). */
  dependencies?: string[];
  /** When true, always enabled regardless of user config. */
  alwaysEnabled?: boolean;
}

/** A repo's keeptrack-plugin.json manifest. */
export interface KeepTrackPluginManifest {
  formatVersion: number;
  name: string;
  version: string;
  description?: string;
  author?: string;
  repository?: string;
  engine: string;
  plugins: PluginEntry[];
  localesDir?: string;
  workers?: unknown[];
  runtime?: { bundle?: string; format?: string };
}

/** One installed plugin recorded in external-plugins.json. */
export interface LockEntry {
  url: string;
  ref: string;
  commit: string;
  installedAt: string;
  /** True for `create`/local-path installs — restore warns instead of cloning. */
  local?: boolean;
}

/** The external-plugins.json lockfile. */
export interface Lockfile {
  formatVersion: number;
  plugins: Record<string, LockEntry>;
}
