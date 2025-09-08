import type { AnalyticsInstance } from 'analytics';
import type { SatMath } from './app/analysis/sat-math';
import type { ToastMsgType } from './engine/core/interfaces';
import type { SettingsManager } from './settings/settings';

import { PluginRegistry } from './engine/core/plugin-registry';
import { ServiceLocator } from './engine/core/service-locator';
import { EventBus } from './engine/events/event-bus';
import { saveCsv, saveVariable } from './engine/utils/saveVariable';


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

  containerRoot = null as unknown as HTMLDivElement;
  isInitialized = false;

  // UI related methods
  toast(toastText: string, type: ToastMsgType, isLong = false) {
    const uiManagerInstance = ServiceLocator.getUiManager();

    if (!uiManagerInstance) {
      console.error(toastText);

      return;
    }

    uiManagerInstance.toast(toastText, type, isLong);
  }

  // Event bus methods
  on = EventBus.getInstance().on.bind(EventBus.getInstance());
  once = EventBus.getInstance().once.bind(EventBus.getInstance());
  emit = EventBus.getInstance().emit.bind(EventBus.getInstance());
  unregister = EventBus.getInstance().unregister.bind(EventBus.getInstance());
  events = EventBus.getInstance().events;
  methods = EventBus.getInstance().methods;

  // Plugin registry methods
  getPlugin = PluginRegistry.getPlugin.bind(PluginRegistry);
  checkIfLoaded = PluginRegistry.checkIfLoaded.bind(PluginRegistry);
  getPluginByName = PluginRegistry.getPluginByName.bind(PluginRegistry);
  unregisterAllPlugins = PluginRegistry.unregisterAllPlugins.bind(PluginRegistry);

  // Service locator methods
  getSoundManager = ServiceLocator.getSoundManager;
  getRenderer = ServiceLocator.getRenderer;
  getScene = ServiceLocator.getScene;
  getCatalogManager = ServiceLocator.getCatalogManager;
  getSensorManager = ServiceLocator.getSensorManager;
  getUiManager = ServiceLocator.getUiManager;
  getInputManager = ServiceLocator.getInputManager;
  getGroupsManager = ServiceLocator.getGroupsManager;
  getTimeManager = ServiceLocator.getTimeManager;
  getOrbitManager = ServiceLocator.getOrbitManager;
  getColorSchemeManager = ServiceLocator.getColorSchemeManager;
  getDotsManager = ServiceLocator.getDotsManager;
  getSensorMath = ServiceLocator.getSensorMath;
  getLineManager = ServiceLocator.getLineManager;
  getHoverManager = ServiceLocator.getHoverManager;
  getMainCamera = ServiceLocator.getMainCamera;
  getMeshManager = ServiceLocator.getMeshManager;

  // Save utilities
  saveCsv = saveCsv;
  saveVariable = saveVariable;
}

export const keepTrackApi = new KeepTrackApi();
