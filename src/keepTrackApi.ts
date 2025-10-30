import type { AnalyticsInstance } from 'analytics';
import type { SatMath } from './app/analysis/sat-math';
import type { ToastMsgType } from './engine/core/interfaces';
import type { SettingsManager } from './settings/settings';

import { PluginRegistry } from './engine/core/plugin-registry';
import { ServiceLocator } from './engine/core/service-locator';
import { EventBus } from './engine/events/event-bus';
import { saveCsv, saveVariable } from './engine/utils/saveVariable';

import type { CatalogManager } from './app/data/catalog-manager';
import type { GroupsManager } from './app/data/groups-manager';
import type { OrbitManager } from './app/rendering/orbit-manager';
import type { SensorMath } from './app/sensors/sensor-math';
import type { SensorManager } from './app/sensors/sensorManager';
import type { HoverManager } from './app/ui/hover-manager';
import type { UiManager } from './app/ui/ui-manager';
import type { Camera } from './engine/camera/camera';
import type { Scene } from './engine/core/scene';
import type { TimeManager } from './engine/core/time-manager';
import type { InputManager } from './engine/input/input-manager';
import HorizonsAPI from './engine/ootk/src/fetch/horizons';
import { KeepTrackPlugin } from './engine/plugins/base-plugin';
import type { ColorSchemeManager } from './engine/rendering/color-scheme-manager';
import type { DotsManager } from './engine/rendering/dots-manager';
import type { LineManager } from './engine/rendering/line-manager';
import type { MeshManager } from './engine/rendering/mesh-manager';
import type { WebGLRenderer } from './engine/rendering/webgl-renderer';
import type { SoundManager } from './plugins/sounds/sound-manager';


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
  getPlugin: <T extends KeepTrackPlugin>(pluginClass: new (...args: unknown[]) => T) => T | null =
    <T extends KeepTrackPlugin>(pluginClass: new (...args: unknown[]) => T) => PluginRegistry.getPlugin(pluginClass);
  checkIfLoaded = PluginRegistry.checkIfLoaded.bind(PluginRegistry);
  getPluginByName = PluginRegistry.getPluginByName.bind(PluginRegistry);
  unregisterAllPlugins = PluginRegistry.unregisterAllPlugins.bind(PluginRegistry);

  // Service locator methods
  getSoundManager: () => SoundManager = ServiceLocator.getSoundManager.bind(ServiceLocator);
  getRenderer: () => WebGLRenderer = ServiceLocator.getRenderer.bind(ServiceLocator);
  getScene: () => Scene = ServiceLocator.getScene.bind(ServiceLocator);
  getCatalogManager: () => CatalogManager = ServiceLocator.getCatalogManager.bind(ServiceLocator);
  getSensorManager: () => SensorManager = ServiceLocator.getSensorManager.bind(ServiceLocator);
  getUiManager: () => UiManager = ServiceLocator.getUiManager.bind(ServiceLocator);
  getInputManager: () => InputManager = ServiceLocator.getInputManager.bind(ServiceLocator);
  getGroupsManager: () => GroupsManager = ServiceLocator.getGroupsManager.bind(ServiceLocator);
  getTimeManager: () => TimeManager = ServiceLocator.getTimeManager.bind(ServiceLocator);
  getOrbitManager: () => OrbitManager = ServiceLocator.getOrbitManager.bind(ServiceLocator);
  getColorSchemeManager: () => ColorSchemeManager = ServiceLocator.getColorSchemeManager.bind(ServiceLocator);
  getDotsManager: () => DotsManager = ServiceLocator.getDotsManager.bind(ServiceLocator);
  getSensorMath: () => SensorMath = ServiceLocator.getSensorMath.bind(ServiceLocator);
  getLineManager: () => LineManager = ServiceLocator.getLineManager.bind(ServiceLocator);
  getHoverManager: () => HoverManager = ServiceLocator.getHoverManager.bind(ServiceLocator);
  getMainCamera: () => Camera = ServiceLocator.getMainCamera.bind(ServiceLocator);
  getMeshManager: () => MeshManager = ServiceLocator.getMeshManager.bind(ServiceLocator);

  // Save utilities
  saveCsv = saveCsv;
  saveVariable = saveVariable;

  horizonsApi = new HorizonsAPI();
}

export const keepTrackApi = new KeepTrackApi();
