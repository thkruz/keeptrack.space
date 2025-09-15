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
  getSoundManager = ServiceLocator.getSoundManager.bind(ServiceLocator);
  getRenderer = ServiceLocator.getRenderer.bind(ServiceLocator);
  getScene = ServiceLocator.getScene.bind(ServiceLocator);
  getCatalogManager = ServiceLocator.getCatalogManager.bind(ServiceLocator);
  getSensorManager = ServiceLocator.getSensorManager.bind(ServiceLocator);
  getUiManager = ServiceLocator.getUiManager.bind(ServiceLocator);
  getInputManager = ServiceLocator.getInputManager.bind(ServiceLocator);
  getGroupsManager = ServiceLocator.getGroupsManager.bind(ServiceLocator);
  getTimeManager = ServiceLocator.getTimeManager.bind(ServiceLocator);
  getOrbitManager = ServiceLocator.getOrbitManager.bind(ServiceLocator);
  getColorSchemeManager = ServiceLocator.getColorSchemeManager.bind(ServiceLocator);
  getDotsManager = ServiceLocator.getDotsManager.bind(ServiceLocator);
  getSensorMath = ServiceLocator.getSensorMath.bind(ServiceLocator);
  getLineManager = ServiceLocator.getLineManager.bind(ServiceLocator);
  getHoverManager = ServiceLocator.getHoverManager.bind(ServiceLocator);
  getMainCamera = ServiceLocator.getMainCamera.bind(ServiceLocator);
  getMeshManager = ServiceLocator.getMeshManager.bind(ServiceLocator);

  // Save utilities
  saveCsv = saveCsv;
  saveVariable = saveVariable;
}

export const keepTrackApi = new KeepTrackApi();
