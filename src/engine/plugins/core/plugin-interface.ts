/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { MenuMode } from '@app/engine/core/interfaces';

/**
 * Core interface for all KeepTrack plugins.
 *
 * This interface defines the minimal contract that all plugins must fulfill.
 * Plugins should implement additional capability interfaces (IBottomIconCapable,
 * ISideMenuCapable, etc.) to opt-in to specific features.
 */
export interface IKeepTrackPlugin {
  /**
   * Unique identifier for the plugin.
   * This should be the same as the class name to avoid minification issues.
   */
  readonly id: string;

  /**
   * List of plugin IDs that this plugin depends on.
   * Dependencies must be loaded before this plugin.
   */
  readonly dependencies: readonly string[];

  /**
   * Menu modes in which this plugin is available.
   * @default [MenuMode.ALL]
   */
  readonly menuMode: MenuMode[];

  /**
   * Initialize the plugin.
   * Called during application startup after dependencies are loaded.
   */
  init(): void;

  /**
   * Clean up plugin resources.
   * Called when the plugin is being unloaded or the application is shutting down.
   */
  destroy?(): void;

  /**
   * Check if the plugin is available in the current application mode.
   * Used to conditionally show/hide plugin UI based on rendering mode.
   */
  isAvailableInCurrentMode?(): boolean;
}

/**
 * Plugin lifecycle states.
 */
export enum PluginState {
  /** Plugin has been created but not initialized */
  Created = 'created',
  /** Plugin is currently initializing */
  Initializing = 'initializing',
  /** Plugin is fully initialized and active */
  Active = 'active',
  /** Plugin is being destroyed */
  Destroying = 'destroying',
  /** Plugin has been destroyed */
  Destroyed = 'destroyed',
  /** Plugin initialization failed */
  Error = 'error',
}

/**
 * Plugin metadata for registration and discovery.
 */
export interface PluginMetadata {
  /** Plugin ID */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Plugin description */
  description?: string;
  /** Plugin version */
  version?: string;
  /** Plugin author */
  author?: string;
  /** Dependencies on other plugins */
  dependencies: readonly string[];
  /** Whether the plugin requires WebGL rendering */
  requiresWebGL?: boolean;
}
