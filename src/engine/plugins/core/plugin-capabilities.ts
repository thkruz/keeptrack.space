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
import type { BaseObject } from '@ootk/src/main';

// ============================================================================
// Icon Placement
// ============================================================================

/**
 * Where a plugin's icon should appear.
 */
export enum IconPlacement {
  /** Icon appears only in the bottom menu (default). */
  BOTTOM_ONLY = 'bottom',
  /** Icon appears only in the utility panel on the right. */
  UTILITY_ONLY = 'utility',
  /** Icon appears in both the bottom menu and the utility panel. */
  BOTH = 'both',
}

/**
 * Which section of the utility panel a plugin's icon belongs to.
 */
export enum UtilityGroup {
  /** Camera/view mode icons (radio behavior - one active at a time). */
  CAMERA_MODE = 'camera-mode',
  /** Layer toggle icons (checkbox behavior - multiple can be active). */
  LAYER_TOGGLE = 'layer-toggle',
  /** Settings toggle icons (checkbox behavior - multiple can be active). */
  SETTINGS_TOGGLE = 'settings-toggle',
}

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

  /**
   * Where this icon should appear.
   * @default IconPlacement.BOTTOM_ONLY
   */
  placement?: IconPlacement;

  /**
   * Which section of the utility panel this icon belongs to.
   * Only relevant when placement is UTILITY_ONLY or BOTH.
   */
  utilityGroup?: UtilityGroup;
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
 * Everything known about a right-click at the moment the context menu opens.
 * Built once per open by the InputManager and shared with every menu item.
 */
export interface RmbMenuContext {
  /**
   * Whether the click ray hit the globe ('earth') or empty space ('space').
   */
  surface: 'earth' | 'space';

  /**
   * Catalog id of the object under the cursor, or -1 when none.
   */
  targetId: number;

  /**
   * The clicked catalog object, if any. Narrow with instanceof
   * (Satellite, DetailedSensor, LaunchSite, MissileObject, ...).
   */
  target: BaseObject | null;

  /**
   * True when a primary object is currently selected, enabling
   * "relative to selected" actions.
   */
  hasPrimarySelection: boolean;
}

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
   * Omit for a single-action item: clicking the level 1 item then fires
   * onContextMenuAction with the level 1 element id.
   */
  level2Html?: string;

  /**
   * The DOM element ID for the level 2 submenu container.
   * Required when level2Html is provided.
   */
  level2ElementName?: string;

  /**
   * Display order in the context menu.
   * Lower numbers appear first.
   * @default 100
   */
  order?: number;

  /**
   * Fine-grained visibility predicate evaluated every time the menu opens.
   * When provided it takes precedence over the isVisibleOn* flags.
   */
  isVisible?: (ctx: RmbMenuContext) => boolean;

  /**
   * Show this menu item when clicking on Earth.
   * Ignored when {@link isVisible} is provided.
   * @default false
   */
  isVisibleOnEarth?: boolean;

  /**
   * Show this menu item when clicking off Earth (in space).
   * Ignored when {@link isVisible} is provided.
   * @default false
   */
  isVisibleOffEarth?: boolean;

  /**
   * Show this menu item when clicking on a satellite.
   * Ignored when {@link isVisible} is provided.
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

  /**
   * Called each time the context menu opens and this item is visible.
   * Use to show/hide or relabel level 2 items based on the click context.
   */
  onContextMenuOpen?(ctx: RmbMenuContext): void;
}

// ============================================================================
// Help Capability
// ============================================================================

/**
 * An image displayed inside a help section.
 */
export interface IHelpImage {
  /**
   * Image path relative to the install directory (e.g. 'img/help/stereo-map/menu.png').
   * Absolute URLs ('http...') and root-relative paths ('/...') are used as-is.
   */
  src: string;

  /**
   * Alt text for the image.
   */
  alt: string;

  /**
   * Optional caption rendered below the image.
   */
  caption?: string;
}

/**
 * A single content block in a structured help dialog.
 */
export interface IHelpSection {
  /**
   * Optional heading. Use the shared t7e('help.*') keys for standard headings
   * (Overview, How to Use, ...) so they are translated once.
   */
  heading?: string;

  /**
   * The section prose. Simple inline HTML is allowed (<ol>, <ul>, <li>, <strong>).
   */
  content: string;

  /**
   * Optional screenshot or diagram for this section.
   */
  image?: IHelpImage;
}

/**
 * A keyboard shortcut row in the help dialog.
 */
export interface IHelpShortcut {
  /**
   * Keys pressed together, each rendered as a <kbd> chip (e.g. ['Ctrl', 'F']).
   */
  keys: string[];

  /**
   * What the shortcut does.
   */
  description: string;
}

/**
 * Configuration for a plugin's help content.
 *
 * Either provide the legacy `body` HTML string, or the structured
 * `sections`/`tips`/`shortcuts` fields (preferred) which are rendered
 * with consistent styling by `buildHelpHtml`.
 */
export interface IHelpConfig {
  /**
   * The title of the help dialog.
   */
  title: string;

  /**
   * Legacy body content of the help dialog (can be HTML).
   * Ignored when `sections` is provided.
   */
  body?: string;

  /**
   * Ordered content blocks (preferred over `body`).
   */
  sections?: IHelpSection[];

  /**
   * Short, non-obvious usage tips rendered as a highlighted callout list.
   */
  tips?: string[];

  /**
   * Keyboard shortcuts rendered as a table. Should mirror getKeyboardShortcuts().
   */
  shortcuts?: IHelpShortcut[];
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

// ============================================================================
// Command Palette Capability
// ============================================================================

/**
 * A command that can be registered in the command palette.
 */
export interface ICommandPaletteCommand {
  /**
   * Unique identifier for this command.
   * Convention: 'PluginId.commandName' (e.g., 'NightToggle.toggle')
   */
  id: string;

  /**
   * Human-readable label displayed in the palette.
   * @example 'Toggle Night Mode'
   */
  label: string;

  /**
   * Optional category for organizing commands. The palette groups results under
   * a section header per category, so this should be a stable group name shared
   * by related commands (not per-command metadata - use {@link description} for that).
   * @example 'Display', 'Sensors', 'Analysis'
   */
  category?: string;

  /**
   * Optional dim subtitle rendered under the label. Useful for clarifying what a
   * non-obvious command does, or for per-row metadata (e.g. a satellite's NORAD
   * number and country).
   * @example 'Resets all filters to their defaults'
   */
  description?: string;

  /**
   * Optional keyboard shortcut hint displayed alongside the command.
   * This is purely informational - it does not register the shortcut.
   * @example 'N', 'Ctrl+Shift+F'
   */
  shortcutHint?: string;

  /**
   * Optional synonyms/aliases scored by the command palette in addition to
   * the label and category, so commands are findable under alternate names.
   * @example ['dark mode', 'eclipse'] for a night-toggle command
   */
  keywords?: string[];

  /**
   * Callback invoked when the command is selected.
   */
  callback: () => Promise<void> | void;

  /**
   * Optional predicate returning false to hide this command when conditions
   * are not met (e.g., sensor not selected). Defaults to always visible.
   */
  isAvailable?: () => boolean;
}

/**
 * Interface for plugins that register commands in the command palette.
 */
export interface ICommandPaletteCapable {
  /**
   * Get the list of commands this plugin exposes to the command palette.
   */
  getCommandPaletteCommands(): ICommandPaletteCommand[];
}

/**
 * Type guard to check if a plugin has command palette capability.
 */
export function hasCommandPaletteCommands(plugin: unknown): plugin is ICommandPaletteCapable {
  return typeof plugin === 'object' && plugin !== null && 'getCommandPaletteCommands' in plugin;
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

// ============================================================================
// Settings Contribution Capability
// ============================================================================

/**
 * Discriminator for the variants of {@link ISettingControl}.
 */
export type SettingControlType = 'toggle' | 'number' | 'select' | 'button';

/**
 * Fields shared by every settings control variant. Not intended to be used
 * directly - consume {@link ISettingControl} instead.
 */
interface ISettingControlBase {
  /**
   * Identifier for this control, unique within its contribution.
   * Convention: camelCase, descriptive of the underlying setting.
   * @example 'disableToasts', 'maxSearchResults'
   */
  id: string;

  /**
   * Pre-translated label rendered next to the control.
   * Plugins should call {@link t7e} before populating this field.
   */
  label: string;

  /**
   * Pre-translated tooltip / help text shown on hover.
   */
  helpText?: string;

  /**
   * Optional predicate returning false to hide this control. Defaults to
   * always visible. Emit {@link EventBusEvent.settingsMenuRefresh} if the
   * value would change after the menu has been rendered.
   */
  isAvailable?: () => boolean;

  /**
   * Optional predicate returning true to render this control in a disabled
   * (read-only) state - e.g., feature gated behind a pro license.
   */
  isDisabled?: () => boolean;
}

/**
 * Boolean checkbox / switch.
 */
export interface ISettingToggleControl extends ISettingControlBase {
  type: 'toggle';
  get: () => boolean;
  set: (next: boolean) => void;
}

/**
 * Numeric input. Optional min / max / step / unit drive rendering only -
 * plugins must still validate inside {@link set} if invariants matter.
 */
export interface ISettingNumberControl extends ISettingControlBase {
  type: 'number';
  get: () => number;
  set: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /**
   * Unit suffix rendered after the input.
   * @example 'km', '°', 'ms'
   */
  unit?: string;
}

/**
 * Dropdown with a fixed set of string options.
 */
export interface ISettingSelectControl<T extends string = string> extends ISettingControlBase {
  type: 'select';
  options: ReadonlyArray<{ value: T; label: string }>;
  get: () => T;
  set: (next: T) => void;
}

/**
 * Action button. Useful for one-shot operations like "Reset to defaults".
 */
export interface ISettingButtonControl extends ISettingControlBase {
  type: 'button';
  buttonLabel: string;
  onClick: () => void;
}

/**
 * Discriminated union of every supported settings control. Renderers switch
 * on {@link SettingControlType} via the `type` field.
 */
export type ISettingControl = ISettingToggleControl | ISettingNumberControl | ISettingSelectControl | ISettingButtonControl;

/**
 * One settings section, contributed by a single plugin. Rendered as a labeled
 * group inside the settings menu. Plugins persist their own state inside the
 * control's {@link ISettingControlBase.set} callback - settings-menu is
 * unaware of where the value lives.
 */
export interface ISettingsContribution {
  /**
   * Identifier for this section, unique across plugins.
   * Convention: the plugin's `id`.
   */
  sectionId: string;

  /**
   * Pre-translated section header.
   */
  sectionLabel: string;

  /**
   * Sort key (ascending). Sections without `order` are placed after sections
   * that specify one, preserving plugin manifest order as a tiebreaker.
   */
  order?: number;

  /**
   * Controls rendered inside this section, in declaration order.
   */
  controls: ISettingControl[];
}

/**
 * Interface for plugins that contribute one section to the settings menu.
 * Implementing this is the supported path for plugin-specific settings -
 * see issue #681. Do not add entries directly to the settings-menu plugin.
 */
export interface ISettingsContributor {
  /**
   * Returns this plugin's settings section. Called every time the settings
   * menu is opened, and again on {@link EventBusEvent.settingsMenuRefresh}.
   */
  getSettingsContribution(): ISettingsContribution;
}

/**
 * Type guard to check if a plugin contributes a settings section.
 */
export function hasSettingsContribution(plugin: unknown): plugin is ISettingsContributor {
  return typeof plugin === 'object' && plugin !== null && 'getSettingsContribution' in plugin;
}
