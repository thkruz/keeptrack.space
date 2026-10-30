/**
 * Thin, stable wrappers over KeepTrack internals for the most common plugin
 * needs. Each helper delegates to the existing manager or plugin; none of them
 * re-implements app behaviour, so a plugin calling a helper gets exactly what
 * a built-in plugin calling the manager directly gets.
 */
import type { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { type ToastAction, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { type TranslationKey, t7e } from '@app/locales/keys';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TooltipsPlugin } from '@app/plugins/tooltips/tooltips';
import type { BaseObject, Satellite } from '@ootk/src/main';

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * The primary selected object (satellite, missile, or ephemeris object).
 *
 * @returns The selected object, or `null` when nothing is selected or the
 * selection plugin is not loaded.
 */
export function getSelectedSat(): BaseObject | null {
  const selected = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

  if (!selected || selected.id === -1) {
    return null;
  }

  return selected;
}

/**
 * Select an object by its catalog index (the `id` on a {@link BaseObject}).
 * Pass `-1` to clear the selection. Same path the app uses when a user clicks a dot.
 *
 * @param id - Catalog index of the object.
 */
export function selectSat(id: number): void {
  PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
}

/**
 * Catalog index of the object with this NORAD catalog number, when that object
 * is in the loaded catalog.
 *
 * @param norad - NORAD catalog number (number or string; alpha-5 accepted).
 * @returns The catalog index, or `null` when no loaded object has that number.
 */
export function findObjectIdByNorad(norad: number | string): number | null {
  const catalogManager = ServiceLocator.getCatalogManager();
  const id = catalogManager.sccNum2Id(norad);

  if (id === null || !catalogManager.getObject(id)) {
    return null;
  }

  return id;
}

/**
 * The loaded catalog satellite with this NORAD catalog number.
 *
 * @param norad - NORAD catalog number (number or string; alpha-5 accepted).
 * @returns The satellite, or `null` when it is not loaded or is not a satellite.
 */
export function getSatByNorad(norad: number | string): Satellite | null {
  return ServiceLocator.getCatalogManager().sccNum2Sat(norad);
}

/**
 * Select the loaded object with this NORAD catalog number.
 *
 * @param norad - NORAD catalog number (number or string; alpha-5 accepted).
 * @returns `true` when the object was found and selected, `false` when it is not in the loaded catalog.
 */
export function selectSatByNorad(norad: number | string): boolean {
  const id = findObjectIdByNorad(norad);

  if (id === null) {
    return false;
  }

  selectSat(id);

  return true;
}

/**
 * Whether `obj` is the current primary selection. Use it to ignore stale
 * `EventBusEvent.selectSatData` payloads that arrive after the user moved on.
 * Called with no argument it reports whether nothing is selected.
 *
 * @param obj - The object from an event payload.
 */
export function isCurrentSelection(obj?: BaseObject): boolean {
  return SatInfoBox.isCurrentSelection(obj);
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/**
 * The current simulation time (which differs from wall-clock time whenever the
 * user has scrubbed, paused, or changed the playback rate).
 *
 * @returns A copy of the simulation clock's Date; mutating it does not move the clock.
 */
export function getSimTime(): Date {
  return new Date(ServiceLocator.getTimeManager().simulationTimeObj.getTime());
}

/**
 * Jump the simulation clock to an absolute time. Preserves the playback state:
 * a paused clock stays paused, a running clock keeps running at its rate.
 *
 * @param time - Target time as a Date or epoch milliseconds.
 */
export function jumpToTime(time: Date | number): void {
  const targetMs = typeof time === 'number' ? time : time.getTime();

  ServiceLocator.getTimeManager().changeSimulationTime(targetMs);
}

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------

/**
 * The primary selected sensor.
 *
 * @returns The sensor, or `null` when no sensor is selected.
 */
export function getSensor(): DetailedSensor | null {
  return ServiceLocator.getSensorManager().getSensor();
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

/**
 * Show a toast notification. The caller localizes `message`.
 *
 * @param message - Text to show.
 * @param type - Severity/style. Defaults to {@link ToastMsgType.normal}.
 * @param isLong - Keep the toast up longer.
 * @param action - Optional action button (e.g. "Undo").
 */
export function toast(message: string, type: ToastMsgType = ToastMsgType.normal, isLong = false, action?: ToastAction): void {
  keepTrackApi.toast(message, type, isLong, action);
}

// ---------------------------------------------------------------------------
// Tooltips and the selected-object info box
// ---------------------------------------------------------------------------

/**
 * Attach the app's tooltip to an element that carries a `kt-tooltip="..."`
 * attribute. Needed for DOM you create after the menu is built (table rows,
 * badges); static menu HTML with `kt-tooltip` is wired automatically.
 * No-op when the tooltip plugin is not loaded.
 *
 * @param el - The element, or its DOM id.
 */
export function createTooltip(el: HTMLElement | string): void {
  PluginRegistry.getPlugin(TooltipsPlugin)?.createTooltip(el);
}

/** Options for {@link addSatInfoBoxSection}. */
export interface SatInfoBoxSectionOptions {
  /**
   * HTML for the section, or a function returning it. Rendered once, when the
   * info box builds its DOM; a function defers string building (and locale
   * lookups) until then.
   */
  html: string | (() => string);
  /** Position among info-box sections; lower renders first. */
  order: number;
  /**
   * DOM id of the section root. When set, the header icon with id
   * `<collapsibleSectionId>-collapse` collapses and expands the section, like
   * the built-in sections.
   */
  collapsibleSectionId?: string;
  /** Runs once the info box DOM exists; attach your event listeners here. */
  onReady?: () => void;
}

/**
 * Add a section to the selected-object info box. Does nothing when the info
 * box plugin is not loaded, so a plugin needs no hard dependency on it.
 * Call it during `addJs()` (before the UI is built). Pair with
 * `EventBusEvent.selectSatData` + {@link isCurrentSelection} to refresh it.
 *
 * @param options - Section HTML, order, and optional collapse/listener wiring.
 */
export function addSatInfoBoxSection(options: SatInfoBoxSectionOptions): void {
  const eventBus = EventBus.getInstance();

  eventBus.on(EventBusEvent.satInfoBoxInit, () => {
    const sectionHtml = typeof options.html === 'function' ? options.html() : options.html;

    PluginRegistry.getPlugin(SatInfoBox)?.addElement({ html: sectionHtml, order: options.order });
  });
  eventBus.on(EventBusEvent.satInfoBoxAddListeners, () => {
    if (options.collapsibleSectionId) {
      PluginRegistry.getPlugin(SatInfoBox)?.addListenerToCollapseElement(getEl(options.collapsibleSectionId, true));
    }
    options.onReady?.();
  });
}

// ---------------------------------------------------------------------------
// Locales
// ---------------------------------------------------------------------------

/**
 * Build a translator for one plugin's locale namespace (`plugins.<configKey>.*`).
 *
 * External plugin keys are not in the host's generated `TranslationKey` union,
 * so this takes a plain string and avoids `as` casts at every call site.
 *
 * @param configKey - The plugin's configKey.
 * @returns `(key, options?) => string`; `key` is relative to `plugins.<configKey>`.
 *
 * @example
 * ```ts
 * const l = pluginT7e('AuroraOverlayPlugin');
 * l('title');                       // plugins.AuroraOverlayPlugin.title
 * l('toasts.count', { count: 3 });  // i18next interpolation
 * ```
 */
export function pluginT7e(configKey: string): (key: string, options?: Record<string, unknown>) => string {
  return (key: string, options?: Record<string, unknown>): string => t7e(`plugins.${configKey}.${key}` as TranslationKey, options);
}
