/**
 * `@keeptrack/plugin-api`: the public, versioned surface for KeepTrack plugins.
 *
 * External plugins (src/plugins-external/<name>) import ONLY from this module,
 * `@keeptrack/plugin-api/testing` (in tests), `ootk`, `vitest`, and their own
 * relative files. Everything here is a curated re-export or a thin wrapper over
 * existing app code; internal modules can be refactored freely as long as this
 * file keeps its contract.
 *
 * The contract is versioned by `PLUGIN_API_VERSION`. Removing, renaming, or
 * incompatibly changing an export is a MAJOR bump; adding one is MINOR. The
 * facade grows by demand: add an export only when a real plugin needs it, and
 * record it in docs/plugin-api.md.
 *
 * Exports are grouped by the module they come from (Biome keeps re-exports
 * sorted by source). Each specifier carries its own doc comment.
 *
 * Docs: docs/plugin-api.md
 *
 * @packageDocumentation
 */

/** Sensor types. */
export type {
  /** A ground sensor with KeepTrack's display metadata, as returned by `getSensor()`. */
  DetailedSensor,
} from '@app/app/sensors/DetailedSensor';

/** Menu groups and toast types. */
export {
  /** Drawer/bottom-menu groups a plugin icon is listed under (`IBottomIconConfig.menuMode`). */
  MenuMode,
  /** Optional action button on a toast (e.g. "Undo"). */
  type ToastAction,
  /** Toast severity/style for `toast()`. */
  ToastMsgType,
} from '@app/engine/core/interfaces';

/** The app-wide event bus. */
export {
  /** Payload tuple for each event: `EngineEventMap[EventBusEvent.x]`. */
  type EngineEventMap,
  /** The event bus singleton: `EventBus.getInstance().on(EventBusEvent.x, handler)`, `.emit(...)`. */
  EventBus,
} from '@app/engine/events/event-bus';

/** Event names. */
export {
  /** Every event the bus emits (`uiManagerInit`, `uiManagerFinal`, `selectSatData`, `update`, ...). */
  EventBusEvent,
} from '@app/engine/events/event-bus-events';

/** Plugin base class. */
export {
  /** Options for a side menu's click-and-drag resize. */
  type ClickDragOptions,
  /** Base class every plugin extends. Capabilities are opt-in getters (`getBottomIconConfig()`, `getSideMenuConfig()`, ...). */
  KeepTrackPlugin,
} from '@app/engine/plugins/base-plugin';

/** Capability config types returned by the plugin's getters. */
export {
  /** Return type of `getBottomIconConfig()`: the drawer icon. */
  type IBottomIconConfig,
  /** One entry of `getCommandPaletteCommands()`. */
  type ICommandPaletteCommand,
  /** Return type of `getContextMenuConfig()`: right-click menu entries. */
  type IContextMenuConfig,
  /** Where a plugin's icon is placed (drawer, utility strip, both). */
  IconPlacement,
  /** Side-menu drag/resize options (`ISideMenuConfig.dragOptions`). */
  type IDragOptions,
  /** Return type of `getHelpConfig()`: the plugin's help panel. */
  type IHelpConfig,
  /** An image in a help panel. */
  type IHelpImage,
  /** One section of a help panel. */
  type IHelpSection,
  /** A keyboard-shortcut row in a help panel. */
  type IHelpShortcut,
  /** One entry of `getKeyboardShortcuts()`. */
  type IKeyboardShortcut,
  /** Return type of `getSecondaryMenuConfig()`: a second panel beside the side menu. */
  type ISecondaryMenuConfig,
  /** A button control in a settings contribution. */
  type ISettingButtonControl,
  /** Any one Settings-menu control (toggle, number, select, button). */
  type ISettingControl,
  /** A number control in a settings contribution. */
  type ISettingNumberControl,
  /** A select control in a settings contribution. */
  type ISettingSelectControl,
  /** Return type of `getSettingsContribution()`: controls added to the Settings menu. */
  type ISettingsContribution,
  /** A toggle control in a settings contribution. */
  type ISettingToggleControl,
  /** Return type of `getSideMenuConfig()`: the side menu. */
  type ISideMenuConfig,
  /** Context passed to right-click menu visibility predicates. */
  type RmbMenuContext,
  /** Utility-strip group for icons placed with `IconPlacement.UTILITY_ONLY`. */
  UtilityGroup,
} from '@app/engine/plugins/core/plugin-capabilities';

/** Top-menu plugin base class. */
export {
  /** Base class for an icon in the top menu bar instead of the drawer. */
  TopMenuPlugin,
} from '@app/engine/plugins/top-menu-plugin';

/** Styled dropdowns. */
export {
  /** Style the `<select>` elements under `root` (call in your `uiManagerFinal` handler). */
  initMaterialSelects,
} from '@app/engine/ui/material-select';

/** Side-menu tab bars. */
export {
  /** Build the HTML for a tab bar plus panels inside a side menu. */
  buildSideMenuTabsHtml,
  /** Activate a tab bar built by `buildSideMenuTabsHtml` (call after the DOM exists). */
  initSideMenuTabs,
  /** One tab of `buildSideMenuTabsHtml`. */
  type SideMenuTabDef,
} from '@app/engine/ui/side-menu-tabs';

/** The modal "colorbox" viewer. */
export {
  /** Close the colorbox opened by `openColorbox`. */
  closeColorbox,
  /** Open a URL (iframe) or image (`{ image: true }`) in the app's modal viewer. */
  openColorbox,
} from '@app/engine/utils/colorbox';

/** HTML templating. */
export {
  /** Template tag for HTML strings (whitespace-normalizing; interpolated values are NOT escaped). */
  html,
} from '@app/engine/utils/development/formatter';

/** Logging and error reporting. */
export {
  /** The app's logger/error reporter: `.debug()`, `.log()`, `.info()`, `.warn()`, `.error(err, funcName)`. */
  errorManagerInstance,
} from '@app/engine/utils/errorManager';

/** DOM lookup. */
export {
  /** `document.getElementById` that logs a warning on a missing id (pass `true` as the 2nd arg when absence is expected). */
  getEl,
} from '@app/engine/utils/get-el';

/** File export. */
export {
  /** Copy an array of row objects to the clipboard as tab-separated text (pastes into spreadsheets). */
  copyTsvToClipboard,
  /** Download an array of row objects as a CSV file. */
  saveCsv,
  /** Download any value as a JSON/text file. */
  saveVariable,
  /** Download an array of row objects as an .xlsx file. */
  saveXlsx,
} from '@app/engine/utils/saveVariable';

/** The loading overlay. */
export {
  /** Hide the loading overlay shown by `showLoading`. */
  hideLoading,
  /** Show the loading overlay, run `callback`, then hide it (pass `delay = -1` to keep it up). */
  showLoading,
} from '@app/engine/utils/showLoading';

/** The service entry point. */
export {
  /** Type of `keepTrackApi`. */
  type KeepTrackApi,
  /**
   * Toast, event-bus shortcuts, plugin lookup (`getPlugin`), and getters for the app's managers
   * (`getCatalogManager()`, `getTimeManager()`, `getSensorManager()`, ...). Prefer the narrow
   * helpers in this module when one fits; managers are larger and change more often.
   */
  keepTrackApi,
} from '@app/keepTrackApi';

/** Host locales. */
export {
  /** Union of every host locale key. */
  type TranslationKey,
  /** Translate a host locale key (`t7e('help.overview')`). For your own plugin's keys use `pluginT7e`. */
  t7e,
} from '@app/locales/keys';

/** App settings. */
export {
  /** The live app settings (`settingsManager.apiServer`, `settingsManager.plugins[configKey]`, ...). Treat as read-mostly. */
  settingsManager,
} from '@app/settings/settings';

/** Catalog object types (runtime ootk classes come from the `ootk` package itself). */
export type {
  /** Any catalog object (type only; import the class from `ootk` for `instanceof`). */
  BaseObject,
  /** A TLE-propagated catalog satellite (type only; import the class from `ootk` for `instanceof`). */
  Satellite,
} from '@ootk/src/main';

/** Selection, time, sensor, toast, tooltip, info-box, and locale helpers (documented in ./helpers). */
export {
  addSatInfoBoxSection,
  createTooltip,
  findObjectIdByNorad,
  getSatByNorad,
  getSelectedSat,
  getSensor,
  getSimTime,
  isCurrentSelection,
  jumpToTime,
  pluginT7e,
  type SatInfoBoxSectionOptions,
  selectSat,
  selectSatByNorad,
  toast,
} from './helpers';

/** Namespaced per-plugin storage (documented in ./plugin-storage). */
export { createPluginStorage, type PluginStorage } from './plugin-storage';

/** Semver of this facade. A plugin declares the range it needs as `pluginApi` in keeptrack-plugin.json. */
export { PLUGIN_API_VERSION } from './version';
