/* eslint-disable class-methods-use-this */
import { AnalyticsInstance } from 'analytics';
import { BaseObject, DetailedSatellite, DetailedSensor, Milliseconds } from 'ootk';
import { keepTrackContainer } from './container';
import { Constructor, KeepTrackApiEvents, Singletons } from './interfaces';
import { KeepTrackPlugin } from './plugins/KeepTrackPlugin';
import type { SensorManager } from './plugins/sensor/sensorManager';
import { SoundNames } from './plugins/sounds/SoundNames';
import { SoundManager } from './plugins/sounds/sound-manager';
import { SettingsManager } from './settings/settings';
import { Camera } from './singletons/camera';
import type { CatalogManager } from './singletons/catalog-manager';
import { MissileObject } from './singletons/catalog-manager/MissileObject';
import type { ColorSchemeManager } from './singletons/color-scheme-manager';
import type { DotsManager } from './singletons/dots-manager';
import type { LineManager } from './singletons/draw-manager/line-manager';
import type { MeshManager } from './singletons/draw-manager/mesh-manager';
import { errorManagerInstance } from './singletons/errorManager';
import type { GroupsManager } from './singletons/groups-manager';
import type { HoverManager } from './singletons/hover-manager';
import type { InputManager } from './singletons/input-manager';
import { PanTouchEvent, TapTouchEvent } from './singletons/input-manager/touch-input';
import type { OrbitManager } from './singletons/orbitManager';
import { Scene } from './singletons/scene';
import type { TimeManager } from './singletons/time-manager';
import type { UiManager } from './singletons/uiManager';
import { WebGLRenderer } from './singletons/webgl-renderer';
import { SatMath } from './static/sat-math';
import { SensorMath } from './static/sensor-math';

declare global {
  interface Window {
    settingsManager: SettingsManager;
    jQuery: unknown;
    $: unknown;
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

type KeepTrackApiEventArguments = {
  [KeepTrackApiEvents.bottomMenuClick]: [string];
  [KeepTrackApiEvents.hideSideMenus]: [];
  [KeepTrackApiEvents.nightToggle]: [WebGL2RenderingContext, WebGLTexture, WebGLTexture];
  [KeepTrackApiEvents.orbitManagerInit]: [];
  [KeepTrackApiEvents.drawManagerLoadScene]: [];
  [KeepTrackApiEvents.drawOptionalScenery]: [];
  [KeepTrackApiEvents.updateLoop]: [];
  [KeepTrackApiEvents.rmbMenuActions]: [string, number];
  [KeepTrackApiEvents.rightBtnMenuAdd]: [];
  [KeepTrackApiEvents.updateDateTime]: [Date];
  [KeepTrackApiEvents.uiManagerFinal]: [];
  [KeepTrackApiEvents.resetSensor]: [];
  [KeepTrackApiEvents.setSensor]: [DetailedSensor | string, number];
  [KeepTrackApiEvents.changeSensorMarkers]: [string];
  [KeepTrackApiEvents.resize]: [];
  [KeepTrackApiEvents.altCanvasResize]: [];
  [KeepTrackApiEvents.endOfDraw]: [Milliseconds];
  [KeepTrackApiEvents.onWatchlistUpdated]: [{ id: number, inView: boolean }[]];
  [KeepTrackApiEvents.staticOffsetChange]: [number];
  [KeepTrackApiEvents.onLineAdded]: [LineManager];
  [KeepTrackApiEvents.sensorDotSelected]: [DetailedSensor];
  [KeepTrackApiEvents.canvasMouseDown]: [MouseEvent];
  [KeepTrackApiEvents.touchStart]: [TapTouchEvent | PanTouchEvent];
  [KeepTrackApiEvents.onCruncherMessage]: [];
  [KeepTrackApiEvents.onCruncherReady]: [];
  [KeepTrackApiEvents.onHelpMenuClick]: [];
  [KeepTrackApiEvents.onKeepTrackReady]: [];
  [KeepTrackApiEvents.selectSatData]: [DetailedSatellite | MissileObject | BaseObject, number];
  [KeepTrackApiEvents.setSecondarySat]: [DetailedSatellite, number];
  [KeepTrackApiEvents.uiManagerInit]: [];
  [KeepTrackApiEvents.uiManagerOnReady]: [];
  [KeepTrackApiEvents.updateSelectBox]: [DetailedSatellite | MissileObject];
  [KeepTrackApiEvents.ConeMeshUpdate]: [];
};

interface KeepTrackApiRegisterParams<T extends KeepTrackApiEvents> {
  event: T;
  cbName: string;
  cb: (...args: KeepTrackApiEventArguments[T]) => void;
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
    page: () => {
      // Do nothing
    },
    track: () => {
      // Do nothing
    },
  } as unknown as AnalyticsInstance;
  /**
   * Unregisters all events in the KeepTrackApi. Used for testing.
   */
  unregisterAllEvents() {
    for (const event of Object.values(KeepTrackApiEvents)) {
      this.events[event] = [];
    }
  }

  unregisterAllPlugins() {
    this.loadedPlugins = [];
  }

  containerRoot = <HTMLDivElement>null;
  isInitialized = false;
  loadedPlugins = <KeepTrackPlugin[]>[];
  rmbMenuItems = <rmbMenuItem[]>[];
  events = {
    altCanvasResize: [] as KeepTrackApiRegisterParams<KeepTrackApiEvents.altCanvasResize>[],
    nightToggle: [] as KeepTrackApiRegisterParams<KeepTrackApiEvents.nightToggle>[],
  } as {
      [K in KeepTrackApiEvents]: KeepTrackApiRegisterParams<K>[];
    };

  methods = {
    nightToggle: (gl: WebGL2RenderingContext, nightTexture: WebGLTexture, texture: WebGLTexture) => {
      this.events.nightToggle.forEach((cb) => cb.cb(gl, nightTexture, texture));
    },
    altCanvasResize: (): boolean => this.events.altCanvasResize.some((cb) => cb.cb()),
  };

  runEvent<T extends KeepTrackApiEvents>(event: T, ...args: KeepTrackApiEventArguments[T]) {
    this.verifyEvent_(event);

    if (event === KeepTrackApiEvents.bottomMenuClick) {
      this.getSoundManager()?.play(SoundNames.BEEP);
    }

    (<KeepTrackApiRegisterParams<T>[]>this.events[event]).forEach((cb: KeepTrackApiRegisterParams<T>) => cb.cb(...args));
  }

  /** If the callback does not exist, create it */
  private verifyEvent_(event: KeepTrackApiEvents) {
    if (typeof this.events[event] === 'undefined') {
      this.events[event] = [];
    }
  }

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
    if (this.loadedPlugins.some((plugin: KeepTrackPlugin) => plugin.constructor.name === pluginName)) {
      return this.loadedPlugins.find((plugin: KeepTrackPlugin) => plugin.constructor.name === pluginName) as T;
    }

    return null;
  }

  /**
   * This is not a standard function. It is used in development for formatting template literals.
   * example: keepTrackApi.html\`\<div>example\</div>\`
   * TODO: This should be a static method
   */
  html(strings: TemplateStringsArray, ...placeholders: string[]) {
    for (const placeholder of placeholders) {
      if (typeof placeholder !== 'string') {
        errorManagerInstance.error(new Error('Invalid input'), 'keepTrackApi.html');
      }
    }

    return String.raw(strings, ...placeholders);
  }

  /**
   * This is not a standard function. It is used in development for formatting template literals.
   * example: keepTrackApi.glsl\`uniform float example\`
   * TODO: This should be a static method
   */
  // eslint-disable-next-line class-methods-use-this
  glsl(literals: TemplateStringsArray, ...placeholders): string {
    let str = '';

    for (let i = 0; i < placeholders.length; i++) {
      str += literals[i];
      str += placeholders[i];
    }
    str += literals[literals.length - 1];

    return str;
  }

  /**
   * Registers a callback function for a specific event.
   * @param {KeepTrackApiEvents} params.event - The name of the event to register the callback for.
   * @param {string} params.cbName - The name of the callback function.
   * @param params.cb - The callback function to register.
   * @throws An error if the event is invalid.
   */
  register<T extends KeepTrackApiEvents>(params: { event: T; cbName: string; cb: (...args: KeepTrackApiEventArguments[T]) => void }) {
    this.verifyEvent_(params.event);

    // Add the callback
    this.events[params.event].push({
      cbName: params.cbName, cb: params.cb,
      event: null,
    });
  }

  unregister(params: { event: KeepTrackApiEvents; cbName: string }) {
    for (let i = 0; i < this.events[params.event].length; i++) {
      if (this.events[params.event][i].cbName === params.cbName) {
        this.events[params.event].splice(i, 1);

        return;
      }
    }
    // If we got this far, it means we couldn't find the callback
    errorManagerInstance.error(new Error(`Callback "${params.cbName} not found"!`), 'keepTrackApi.unregister');
  }

  getSoundManager = () => keepTrackContainer.get<SoundManager>(Singletons.SoundManager);
  getRenderer = () => keepTrackContainer.get<WebGLRenderer>(Singletons.WebGLRenderer);
  getScene = () => keepTrackContainer.get<Scene>(Singletons.Scene);
  getCatalogManager = () => keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
  getSensorManager = () => keepTrackContainer.get<SensorManager>(Singletons.SensorManager);
  getUiManager = () => keepTrackContainer.get<UiManager>(Singletons.UiManager);
  getInputManager = () => keepTrackContainer.get<InputManager>(Singletons.InputManager);
  getGroupsManager = () => keepTrackContainer.get<GroupsManager>(Singletons.GroupsManager);
  getTimeManager = () => keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
  getOrbitManager = () => keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
  getColorSchemeManager = () => keepTrackContainer.get<ColorSchemeManager>(Singletons.ColorSchemeManager);
  getDotsManager = () => keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
  getSensorMath = () => keepTrackContainer.get<SensorMath>(Singletons.SensorMath);
  getLineManager = () => keepTrackContainer.get<LineManager>(Singletons.LineManager);
  getHoverManager = () => keepTrackContainer.get<HoverManager>(Singletons.HoverManager);
  getMainCamera = () => keepTrackContainer.get<Camera>(Singletons.MainCamera);
  getMeshManager = () => keepTrackContainer.get<MeshManager>(Singletons.MeshManager);
}

export const keepTrackApi = new KeepTrackApi();
