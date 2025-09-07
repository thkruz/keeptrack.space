/* eslint-disable class-methods-use-this */
import { AnalyticsInstance } from 'analytics';
import type { SatMath } from './app/analysis/sat-math';
import { Constructor, ToastMsgType } from './engine/core/interfaces';
import { ServiceLocator } from './engine/core/service-locator';
import { EventBus } from './engine/events/event-bus';
import { KeepTrackPlugin } from './engine/plugins/base-plugin';
import { saveCsv, saveVariable } from './engine/utils/saveVariable';
import { SettingsManager } from './settings/settings';

declare global {
  interface Window {
    settingsManager: SettingsManager;
    gremlins: unknown;
    randomizer: unknown;
    // eslint-disable-next-line no-use-before-define
    keepTrackApi: KeepTrackApi;
    dataLayer: IArguments[]; // For Google Tag Manager
    _numeric: unknown;
    satellite: SatMath;
    M: {
      AutoInit: () => void;
      Toast: {
        dismissAll: () => void;
      };
      toast: (options: { unsafeHTML?: string, html?: string; displayLength?: number }) => {
        $el: NodeListOf<HTMLElement>;
        timeRemaining: number;
        dismiss: () => void;
      };
      Dropdown: {
        init: (el: NodeListOf<Element>) => void;
      };
      keys: {
        TAB: number;
        ENTER: number;
        ESC: number;
        ARROW_UP: number;
        ARROW_DOWN: number;
      };
    }
  }
}

type rmbMenuItem = {
  /**
   * Element ID of the main menu item
   */
  elementIdL1: string;
  /**
   * Element ID of the sub menu container
   */
  elementIdL2: string;
  /**
   * The sorting order for the menus
   */
  order: number;
  /**
   * Determines if the menu item is visible when right clicking on the earth
   */
  isRmbOnEarth: boolean;
  /**
   * Determines if the menu item is visible when right clicking off the earth
   */
  isRmbOffEarth: boolean;
  /**
   * Determines if the menu item is visible when right clicking on a satellite
   */
  isRmbOnSat: boolean;
};

export class KeepTrackApi {
  analytics: AnalyticsInstance = {
    identify: () => {
      // do nothing
    },
    track: () => {
      // do nothing
    },
    page: () => {
      // do nothing
    },
    user: () => ({
      anonymousId: '',
      id: '',
    }),
    reset: () => {
      // do nothing
    },
    ready: () => Promise.resolve(),
    on: () => {
      // do nothing
    },
    once: () => {
      // do nothing
    },
    getState: () => ({
      plugins: {},
    }),
  } as unknown as AnalyticsInstance;
  unregisterAllPlugins() {
    this.loadedPlugins = [];
  }

  on = EventBus.getInstance().on.bind(EventBus.getInstance());
  once = EventBus.getInstance().once.bind(EventBus.getInstance());
  emit = EventBus.getInstance().emit.bind(EventBus.getInstance());
  unregister = EventBus.getInstance().unregister.bind(EventBus.getInstance());
  events = EventBus.getInstance().events;
  methods = EventBus.getInstance().methods;

  containerRoot = null as unknown as HTMLDivElement;
  isInitialized = false;
  loadedPlugins = <KeepTrackPlugin[]>[];
  rmbMenuItems = <rmbMenuItem[]>[];

  getPlugin<T extends KeepTrackPlugin>(pluginClass: Constructor<T>): T | null {
    if (this.loadedPlugins.some((plugin: KeepTrackPlugin) => plugin instanceof pluginClass)) {
      return this.loadedPlugins.find((plugin: KeepTrackPlugin) => plugin instanceof pluginClass) as T;
    }

    return null;
  }

  /**
   * Retrieves a plugin by its name.
   *
   * This is for debugging and should not be used in production.
   * @deprecated
   *
   * @param pluginName - The name of the plugin to retrieve.
   * @returns The plugin with the specified name, or null if not found.
   */
  getPluginByName<T extends KeepTrackPlugin>(pluginName: string): T | null {
    if (this.loadedPlugins.some((plugin: KeepTrackPlugin) => plugin.id === pluginName)) {
      return this.loadedPlugins.find((plugin: KeepTrackPlugin) => plugin.id === pluginName) as T;
    }

    return null;
  }

  toast(toastText: string, type: ToastMsgType, isLong = false) {
    ServiceLocator.getUiManager().toast(toastText, type, isLong);
  }

  getSoundManager = ServiceLocator.getSoundManager;
  getRenderer = () => ServiceLocator.getRenderer();
  getScene = () => ServiceLocator.getScene();
  getCatalogManager = () => ServiceLocator.getCatalogManager();
  getSensorManager = () => ServiceLocator.getSensorManager();
  getUiManager = () => ServiceLocator.getUiManager();
  getInputManager = () => ServiceLocator.getInputManager();
  getGroupsManager = () => ServiceLocator.getGroupsManager();
  getTimeManager = () => ServiceLocator.getTimeManager();
  getOrbitManager = () => ServiceLocator.getOrbitManager();
  getColorSchemeManager = () => ServiceLocator.getColorSchemeManager();
  getDotsManager = () => ServiceLocator.getDotsManager();
  getSensorMath = () => ServiceLocator.getSensorMath();
  getLineManager = () => ServiceLocator.getLineManager();
  getHoverManager = () => ServiceLocator.getHoverManager();
  getMainCamera = () => ServiceLocator.getMainCamera();
  getMeshManager = () => ServiceLocator.getMeshManager();

  saveCsv = saveCsv;
  saveVariable = saveVariable;
}

export const keepTrackApi = new KeepTrackApi();
