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

// ============================================================================
// Bottom Icon Capability
// ============================================================================

/**
 * Configuration for a plugin's bottom menu icon.
 */
export interface IBottomIconConfig {
  /**
   * The DOM element ID for the bottom icon.
   * @example 'countries-bottom-icon'
   */
  elementName: string;

  /**
   * The label displayed below the icon.
   * Should be a localization key or plain text.
   */
  label: string;

  /**
   * The icon image source (imported PNG/SVG).
   */
  image: string;

  /**
   * Menu modes in which this icon is visible.
   * @default [MenuMode.ALL]
   */
  menuMode?: MenuMode[];

  /**
   * Display order of the icon in the bottom menu.
   * Lower numbers appear first.
   * @default 600 (MAX_BOTTOM_ICON_ORDER)
   */
  order?: number;

  /**
   * Whether the icon is disabled on initial load.
   * @default false
   */
  isDisabledOnLoad?: boolean;
}

/**
 * Interface for plugins that display a bottom menu icon.
 */
export interface IBottomIconCapable {
  /**
   * Configuration for the bottom icon.
   */
  getBottomIconConfig(): IBottomIconConfig;

  /**
   * Called when the bottom icon is clicked.
   * Return false to prevent default toggle behavior.
   */
  onBottomIconClick?(): void | boolean;

  /**
   * Called when the bottom icon is deselected.
   */
  onBottomIconDeselect?(): void;
}

// ============================================================================
// Side Menu Capability
// ============================================================================

/**
 * Options for click-and-drag resizing.
 */
export interface IDragOptions {
  /**
   * Left offset for the drag handle.
   */
  leftOffset?: number;

  /**
   * Whether the menu is draggable/resizable.
   * @default false
   */
  isDraggable?: boolean;

  /**
   * Minimum width of the menu when resizing.
   */
  minWidth?: number;

  /**
   * Maximum width of the menu when resizing.
   */
  maxWidth?: number;

  /**
   * Callback when resize is complete.
   */
  onResizeComplete?: () => void;
}

/**
 * Configuration for a plugin's side menu.
 */
export interface ISideMenuConfig {
  /**
   * The DOM element ID for the side menu.
   * @example 'countries-menu'
   */
  elementName: string;

  /**
   * The title displayed at the top of the side menu.
   */
  title: string;

  /**
   * The HTML content of the side menu.
   * This should be the inner content, not including the wrapper.
   */
  html: string;

  /**
   * Options for click-and-drag resizing.
   */
  dragOptions?: IDragOptions;

  /**
   * Z-index of the side menu.
   * @default 5
   */
  zIndex?: number;

  /**
   * Width of the side menu in pixels.
   */
  width?: number;
}

/**
 * Interface for plugins that display a side menu.
 */
export interface ISideMenuCapable {
  /**
   * Configuration for the side menu.
   */
  getSideMenuConfig(): ISideMenuConfig;

  /**
   * Called when the side menu is opened.
   */
  onSideMenuOpen?(): void;

  /**
   * Called when the side menu is closed.
   */
  onSideMenuClose?(): void;
}

// ============================================================================
// Secondary Menu Capability
// ============================================================================

/**
 * Configuration for a plugin's secondary (settings) menu.
 */
export interface ISecondaryMenuConfig {
  /**
   * The HTML content of the secondary menu.
   */
  html: string;

  /**
   * Width of the secondary menu in pixels.
   * @default 300
   */
  width?: number;

  /**
   * Left offset override. If not set, defaults to right edge of side menu.
   */
  leftOffset?: number | null;

  /**
   * Z-index of the secondary menu.
   * @default 3
   */
  zIndex?: number;

  /**
   * Icon to use for the secondary menu button.
   * @default 'settings'
   */
  icon?: string;

  /**
   * Options for click-and-drag resizing.
   */
  dragOptions?: IDragOptions;
}

/**
 * Interface for plugins that display a secondary (settings) menu.
 */
export interface ISecondaryMenuCapable {
  /**
   * Configuration for the secondary menu.
   */
  getSecondaryMenuConfig(): ISecondaryMenuConfig;

  /**
   * Called when the secondary menu is opened.
   */
  onSecondaryMenuOpen?(): void;

  /**
   * Called when the secondary menu is closed.
   */
  onSecondaryMenuClose?(): void;
}

// ============================================================================
// Context Menu (Right Mouse Button) Capability
// ============================================================================

/**
 * Configuration for a plugin's context menu entry.
 */
export interface IContextMenuConfig {
  /**
   * HTML for the level 1 (main) context menu item.
   * @example '<li class="rmb-menu-item">View Info</li>'
   */
  level1Html: string;

  /**
   * The DOM element ID for the level 1 menu item.
   */
  level1ElementName: string;

  /**
   * HTML for the level 2 (submenu) content.
   */
  level2Html: string;

  /**
   * The DOM element ID for the level 2 submenu container.
   */
  level2ElementName: string;

  /**
   * Display order in the context menu.
   * Lower numbers appear first.
   * @default 100
   */
  order?: number;

  /**
   * Show this menu item when clicking on Earth.
   * @default false
   */
  isVisibleOnEarth?: boolean;

  /**
   * Show this menu item when clicking off Earth (in space).
   * @default false
   */
  isVisibleOffEarth?: boolean;

  /**
   * Show this menu item when clicking on a satellite.
   * @default false
   */
  isVisibleOnSatellite?: boolean;
}

/**
 * Interface for plugins that add context menu items.
 */
export interface IContextMenuCapable {
  /**
   * Configuration for the context menu.
   */
  getContextMenuConfig(): IContextMenuConfig;

  /**
   * Called when a context menu action is triggered.
   * @param targetId The ID of the menu item clicked.
   * @param clickedSatId The ID of the satellite that was right-clicked, if any.
   */
  onContextMenuAction(targetId: string, clickedSatId?: number): void;
}

// ============================================================================
// Help Capability
// ============================================================================

/**
 * Configuration for a plugin's help content.
 */
export interface IHelpConfig {
  /**
   * The title of the help dialog.
   */
  title: string;

  /**
   * The body content of the help dialog (can be HTML).
   */
  body: string;
}

/**
 * Interface for plugins that provide help content.
 */
export interface IHelpCapable {
  /**
   * Configuration for the help content.
   */
  getHelpConfig(): IHelpConfig;
}

// ============================================================================
// Form Submit Capability
// ============================================================================

/**
 * Interface for plugins with form submission handling.
 */
export interface IFormSubmitCapable {
  /**
   * Called when the plugin's form is submitted.
   */
  onFormSubmit(): void;
}

// ============================================================================
// Download Capability
// ============================================================================

/**
 * Interface for plugins that support downloading/exporting data.
 */
export interface IDownloadCapable {
  /**
   * Called when the download button is clicked.
   */
  onDownload(): void;
}

// ============================================================================
// Keyboard Shortcut Capability
// ============================================================================

/**
 * Configuration for a keyboard shortcut.
 */
export interface IKeyboardShortcut {
  /**
   * The key to listen for (e.g., 'N', 'Escape', 'Enter').
   */
  key: string;

  /**
   * The key code to listen for (e.g., 'KeyN', 'Escape', 'Enter').
   */
  code?: string;

  /**
   * Whether Ctrl/Cmd must be held.
   * @default false
   */
  ctrl?: boolean;

  /**
   * Whether Shift must be held.
   * @default false
   */
  shift?: boolean;

  /**
   * Whether Alt must be held.
   * @default false
   */
  alt?: boolean;

  /**
   * Callback when the shortcut is triggered.
   */
  callback: () => void;
}

/**
 * Interface for plugins that define keyboard shortcuts.
 */
export interface IKeyboardShortcutCapable {
  /**
   * Get the list of keyboard shortcuts for this plugin.
   */
  getKeyboardShortcuts(): IKeyboardShortcut[];
}

// ============================================================================
// Sensor/Satellite Requirements
// ============================================================================

/**
 * Interface for plugins that require a sensor to be selected.
 */
export interface IRequiresSensor {
  /**
   * Whether a sensor must be selected to use this plugin.
   */
  readonly requiresSensorSelected: boolean;
}

/**
 * Interface for plugins that require a satellite to be selected.
 */
export interface IRequiresSatellite {
  /**
   * Whether a satellite must be selected to use this plugin.
   */
  readonly requiresSatelliteSelected: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a plugin has bottom icon capability.
 */
export function hasBottomIcon(plugin: unknown): plugin is IBottomIconCapable {
  return typeof plugin === 'object' && plugin !== null && 'getBottomIconConfig' in plugin;
}

/**
 * Type guard to check if a plugin has side menu capability.
 */
export function hasSideMenu(plugin: unknown): plugin is ISideMenuCapable {
  return typeof plugin === 'object' && plugin !== null && 'getSideMenuConfig' in plugin;
}

/**
 * Type guard to check if a plugin has secondary menu capability.
 */
export function hasSecondaryMenu(plugin: unknown): plugin is ISecondaryMenuCapable {
  return typeof plugin === 'object' && plugin !== null && 'getSecondaryMenuConfig' in plugin;
}

/**
 * Type guard to check if a plugin has context menu capability.
 */
export function hasContextMenu(plugin: unknown): plugin is IContextMenuCapable {
  return typeof plugin === 'object' && plugin !== null && 'getContextMenuConfig' in plugin;
}

/**
 * Type guard to check if a plugin has help capability.
 */
export function hasHelp(plugin: unknown): plugin is IHelpCapable {
  return typeof plugin === 'object' && plugin !== null && 'getHelpConfig' in plugin;
}

/**
 * Type guard to check if a plugin has form submit capability.
 */
export function hasFormSubmit(plugin: unknown): plugin is IFormSubmitCapable {
  return typeof plugin === 'object' && plugin !== null && 'onFormSubmit' in plugin;
}

/**
 * Type guard to check if a plugin has download capability.
 */
export function hasDownload(plugin: unknown): plugin is IDownloadCapable {
  return typeof plugin === 'object' && plugin !== null && 'onDownload' in plugin;
}

/**
 * Type guard to check if a plugin has keyboard shortcut capability.
 */
export function hasKeyboardShortcuts(plugin: unknown): plugin is IKeyboardShortcutCapable {
  return typeof plugin === 'object' && plugin !== null && 'getKeyboardShortcuts' in plugin;
}

/**
 * Type guard to check if a plugin requires a sensor.
 */
export function requiresSensor(plugin: unknown): plugin is IRequiresSensor {
  return typeof plugin === 'object' && plugin !== null && 'requiresSensorSelected' in plugin;
}

/**
 * Type guard to check if a plugin requires a satellite.
 */
export function requiresSatellite(plugin: unknown): plugin is IRequiresSatellite {
  return typeof plugin === 'object' && plugin !== null && 'requiresSatelliteSelected' in plugin;
}
