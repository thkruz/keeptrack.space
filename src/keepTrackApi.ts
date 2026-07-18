import type { Sgp4Wasm, Sgp4XpWasm } from '@ootk/src/main';
import type { SatMath } from './app/analysis/sat-math';
import type { CatalogManager } from './app/data/catalog-manager';
import type { GroupsManager } from './app/data/groups-manager';
import type { OrbitManager } from './app/rendering/orbit-manager';
import type { SensorMath } from './app/sensors/sensor-math';
import type { SensorManager } from './app/sensors/sensorManager';
import type { HoverManager } from './app/ui/hover-manager';
import type { UiManager } from './app/ui/ui-manager';
import type { SoundManager } from './engine/audio/sound-manager';
import type { Camera } from './engine/camera/camera';
import type { ToastMsgType } from './engine/core/interfaces';
import { PluginRegistry } from './engine/core/plugin-registry';
import type { Scene } from './engine/core/scene';
import { ServiceLocator } from './engine/core/service-locator';
import type { TimeManager } from './engine/core/time-manager';
import { EventBus } from './engine/events/event-bus';
import type { InputManager } from './engine/input/input-manager';
import { KeepTrackPlugin } from './engine/plugins/base-plugin';
import type { ColorSchemeManager } from './engine/rendering/color-scheme-manager';
import type { DotsManager } from './engine/rendering/dots-manager';
import type { LineManager } from './engine/rendering/line-manager';
import type { MeshManager } from './engine/rendering/mesh-manager';
import type { WebGLRenderer } from './engine/rendering/webgl-renderer';
import { errorManagerInstance } from './engine/utils/errorManager';
import { copyTsvToClipboard, saveCsv, saveVariable, saveXlsx } from './engine/utils/saveVariable';
import type { SettingsManager } from './settings/settings';

declare global {
  interface Window {
    settingsManager: SettingsManager;
    gremlins: unknown;
    randomizer: unknown;
    // eslint-disable-next-line no-use-before-define
    keepTrackApi: KeepTrackApi;
    dataLayer?: unknown[]; // For Google Tag Manager / gtag
    _numeric: unknown;
    satellite: SatMath;
  }
}

export class KeepTrackApi {
  analytics: { track: (event: string, params?: Record<string, unknown>) => void } = {
    track: () => {
      // no-op when telemetry not initialized
    },
  };

  // UI related methods
  toast(toastText: string, type: ToastMsgType, isLong = false) {
    const uiManagerInstance = ServiceLocator.getUiManager();

    if (!uiManagerInstance) {
      errorManagerInstance.warn(toastText);

      return;
    }

    uiManagerInstance.toast(toastText, type, isLong);
  }

  // Event bus methods
  on = EventBus.getInstance().on.bind(EventBus.getInstance());
  once = EventBus.getInstance().once.bind(EventBus.getInstance());
  emit = EventBus.getInstance().emit.bind(EventBus.getInstance());
  emitAsync = EventBus.getInstance().emitAsync.bind(EventBus.getInstance());
  unregister = EventBus.getInstance().unregister.bind(EventBus.getInstance());
  events = EventBus.getInstance().events;
  methods = EventBus.getInstance().methods;

  // Plugin registry methods
  getPlugin: <T extends KeepTrackPlugin>(pluginClass: new (...args: unknown[]) => T) => T | null = <T extends KeepTrackPlugin>(pluginClass: new (...args: unknown[]) => T) =>
    PluginRegistry.getPlugin(pluginClass);
  checkIfLoaded = PluginRegistry.checkIfLoaded.bind(PluginRegistry);
  getPluginByName = PluginRegistry.getPluginByName.bind(PluginRegistry);
  /**
   * The list of all loaded plugins. For debugging/tooling from the console
   * (e.g. enumerating side menus); mirrors the getPluginByName debug helper.
   */
  getPluginList: () => readonly KeepTrackPlugin[] = () => PluginRegistry.plugins;
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
  saveXlsx = saveXlsx;
  copyTsvToClipboard = copyTsvToClipboard;
  saveVariable = saveVariable;

  /*
   * USSF Astro Standards SGP4 wasm propagators (optional, license-restricted
   * artifacts served from dist/wasm/sgp4prop/ when present locally). Loaded
   * lazily so the wasm loader stays out of the static import graph.
   */
  loadSgp4Wasm = async (): Promise<Sgp4Wasm> => (await import('./engine/utils/sgp4-wasm-loader')).loadSgp4Wasm();
  loadSgp4XpWasm = async (): Promise<Sgp4XpWasm> => (await import('./engine/utils/sgp4-wasm-loader')).loadSgp4XpWasm();
  /** Whether main-thread Sgp4 propagation is routed through the wasm backend. */
  isWasmPropagatorActive = async (): Promise<boolean> => (await import('./engine/utils/sgp4-wasm-loader')).isWasmPropagatorActive();
}

export const keepTrackApi = new KeepTrackApi();
