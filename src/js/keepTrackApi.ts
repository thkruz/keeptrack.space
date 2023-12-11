import { Milliseconds } from 'ootk';
import { keepTrackContainer } from './container';
import {
  CatalogManager,
  ColorSchemeManager,
  Constructor,
  GroupsManager,
  MissileObject,
  OrbitManager,
  SatObject,
  SensorManager,
  SensorObject,
  Singletons,
  SoundManager,
  UiManager,
} from './interfaces';
import { KeepTrackPlugin } from './plugins/KeepTrackPlugin';
import { SelectSatManager } from './plugins/select-sat-manager/select-sat-manager';
import { SettingsManager } from './settings/settings';
import { Camera } from './singletons/camera';
import { StandardColorSchemeManager } from './singletons/color-scheme-manager';
import { DotsManager } from './singletons/dots-manager';
import { LineManager } from './singletons/draw-manager/line-manager';
import { errorManagerInstance } from './singletons/errorManager';
import { HoverManager } from './singletons/hover-manager';
import { InputManager } from './singletons/input-manager';
import { Scene } from './singletons/scene';
import { StarManager } from './singletons/starManager';
import { TimeManager } from './singletons/time-manager';
import { WebGLRenderer } from './singletons/webgl-renderer';
import { SatMath } from './static/sat-math';
import { SensorMath } from './static/sensor-math';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    settingsManager: SettingsManager;
    jQuery: unknown;
    $: unknown;
    gremlins: any;
    randomizer: any;
    keepTrackApi: KeepTrackApi;
    dataLayer: any; // For Google Tag Manager
    _numeric: any;
    satellite: SatMath;
    M: any;
  }
}

export type KeepTrackApiRegisterParams = {
  event: KeepTrackApiEvents | string;
  cbName: string;
  cb:
    | ((iconName: string) => void)
    | (() => void)
    | (() => boolean)
    | ((sat: SatObject, satId: number) => void)
    | ((sensor: SensorObject) => void)
    | ((gl: WebGL2RenderingContext, nightTexture: WebGLTexture, texture: WebGLTexture) => void)
    | ((sensor: SensorObject | string, staticNum: number) => void)
    | ((watchlistList: number[]) => void)
    | ((lineManager: LineManager) => void);
};

/**
 * Registers a callback function for a specific event.
 * @param {KeepTrackApiEvents} params.event - The name of the event to register the callback for.
 * @param {string} params.cbName - The name of the callback function.
 * @param params.cb - The callback function to register.
 * @throws An error if the event is invalid.
 */
export const register = (params: KeepTrackApiRegisterParams) => {
  // If this is a valid callback
  if (typeof keepTrackApi.callbacks[params.event] !== 'undefined') {
    // TODO: Pass the parameters to a validation function to ensure they are correct
    // Add the callback
    keepTrackApi.callbacks[params.event].push({ name: params.cbName, cb: params.cb });
  } else {
    errorManagerInstance.error(new Error(`Invalid callback "${params.event}"!`), 'keepTrackApi.register');
  }
};
export const unregister = (params: { event: string; cbName: string }) => {
  // If this is a valid callback
  if (typeof keepTrackApi.callbacks[params.event] !== 'undefined') {
    for (let i = 0; i < keepTrackApi.callbacks[params.event].length; i++) {
      if (keepTrackApi.callbacks[params.event][i].name == params.cbName) {
        keepTrackApi.callbacks[params.event].splice(i, 1);
        return;
      }
    }
    // If we got this far, it means we couldn't find the callback
    errorManagerInstance.error(new Error(`Callback "${params.cbName} not found"!`), 'keepTrackApi.unregister');
  } else {
    // Couldn't find the method
    errorManagerInstance.error(new Error(`Invalid callback "${params.event}"!`), 'keepTrackApi.unregister');
  }
};
export const glsl = (literals: TemplateStringsArray, ...placeholders: Array<any>): string => {
  let str = '';
  for (let i = 0; i < placeholders.length; i++) {
    str += literals[i];
    str += placeholders[i];
  }
  str += literals[literals.length - 1];
  return str;
};

/** This is not a standard function. It is used in development for formatting template literals.
example: keepTrackApi.html\`\<div>example\</div>\`
 */
export const html = (strings: TemplateStringsArray, ...placeholders: any[]) => {
  for (const placeholder of placeholders) {
    if (typeof placeholder !== 'string') {
      errorManagerInstance.error(new Error('Invalid input'), 'keepTrackApi.html');
    }
  }
  return String.raw(strings, ...placeholders);
};

export type KeepTrackApi = typeof keepTrackApi;

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

export const keepTrackApi = {
  html: html,
  glsl: glsl,
  register: register,
  initializeKeepTrack: null,
  unregister: unregister,
  isInitialized: false,
  callbacks: {
    onKeepTrackReady: [],
    selectSatData: [],
    setSecondarySat: [],
    updateSelectBox: [],
    onCruncherReady: [],
    onCruncherMessage: [],
    onHelpMenuClick: [],
    uiManagerInit: [],
    uiManagerOnReady: [],
    bottomMenuClick: [],
    hideSideMenus: [],
    nightToggle: [],
    orbitManagerInit: [],
    drawManagerLoadScene: [],
    drawOptionalScenery: [],
    updateLoop: [],
    rmbMenuActions: [],
    rightBtnMenuAdd: [],
    updateDateTime: [],
    uiManagerFinal: [],
    resetSensor: [],
    setSensor: [],
    changeSensorMarkers: [],
    altCanvasResize: [],
    endOfDraw: [],
    onWatchlistUpdated: [],
    staticOffsetChange: [],
    onLineAdded: [],
  },
  methods: {
    onHelpMenuClick: () => {
      if (keepTrackApi.callbacks.onHelpMenuClick.some((cb: { cb: () => boolean }) => cb.cb())) {
        return;
      }
    },
    selectSatData: (sat: SatObject, satId: number) => {
      keepTrackApi.getSoundManager()?.play('whoosh');
      keepTrackApi.callbacks.selectSatData.forEach((cb: any) => cb.cb(sat, satId));
    },
    setSecondarySat: (sat: SatObject, satId: number) => {
      keepTrackApi.callbacks.setSecondarySat.forEach((cb: any) => cb.cb(sat, satId));
    },
    onKeepTrackReady: () => {
      keepTrackApi.callbacks.onKeepTrackReady.forEach((cb: any) => cb.cb());
    },
    updateSelectBox: (sat: any) => {
      keepTrackApi.callbacks.updateSelectBox.forEach((cb: any) => cb.cb(sat));
    },
    onCruncherReady: () => {
      keepTrackApi.callbacks.onCruncherReady.forEach((cb: any) => cb.cb());
    },
    onCruncherMessage: () => {
      keepTrackApi.callbacks.onCruncherMessage.forEach((cb: any) => cb.cb());
    },
    uiManagerInit: () => {
      keepTrackApi.callbacks.uiManagerInit.forEach((cb: any) => cb.cb());
    },
    uiManagerOnReady: () => {
      keepTrackApi.callbacks.uiManagerOnReady.forEach((cb: any) => cb.cb());
    },
    bottomMenuClick: (iconName: string) => {
      try {
        keepTrackApi.getSoundManager()?.play('genericBeep');
      } catch {
        // ignore
      }
      keepTrackApi.callbacks.bottomMenuClick.forEach((cb: any) => cb.cb(iconName));
    },
    hideSideMenus: () => {
      keepTrackApi.callbacks.hideSideMenus.forEach((cb: any) => cb.cb());
    },
    nightToggle: (gl: WebGL2RenderingContext, nightTexture: WebGLTexture, texture: WebGLTexture) => {
      keepTrackApi.callbacks.nightToggle.forEach((cb: any) => cb.cb(gl, nightTexture, texture));
    },
    orbitManagerInit: () => {
      keepTrackApi.callbacks.orbitManagerInit.forEach((cb: any) => cb.cb());
    },
    drawManagerLoadScene: () => {
      keepTrackApi.callbacks.drawManagerLoadScene.forEach((cb: any) => cb.cb());
    },
    drawOptionalScenery: () => {
      keepTrackApi.callbacks.drawOptionalScenery.forEach((cb: any) => cb.cb());
    },
    updateLoop: () => {
      keepTrackApi.callbacks.updateLoop.forEach((cb: any) => cb.cb());
    },
    rmbMenuActions: (menuName: string, satnum = -1) => {
      keepTrackApi.callbacks.rmbMenuActions.forEach((cb: any) => cb.cb(menuName, satnum));
    },
    rightBtnMenuAdd: () => {
      keepTrackApi.callbacks.rightBtnMenuAdd.forEach((cb: any) => cb.cb());
    },
    updateDateTime: (date: Date) => {
      keepTrackApi.callbacks.updateDateTime.forEach((cb: any) => cb.cb(date));
    },
    uiManagerFinal: () => {
      keepTrackApi.callbacks.uiManagerFinal.forEach((cb: any) => cb.cb());
    },
    resetSensor: () => {
      keepTrackApi.callbacks.resetSensor.forEach((cb: any) => cb.cb());
    },
    setSensor: (sensor: SensorObject | string, id: number) => {
      keepTrackApi.callbacks.setSensor.forEach((cb: any) => cb.cb(sensor, id));
    },
    changeSensorMarkers: (caller: string) => {
      keepTrackApi.callbacks.changeSensorMarkers.forEach((cb: any) => cb.cb(caller));
    },
    altCanvasResize: (): boolean => keepTrackApi.callbacks.altCanvasResize.some((cb: any) => cb.cb()),
    endOfDraw: (dt?: Milliseconds) => {
      keepTrackApi.callbacks.endOfDraw.forEach((cb: any) => cb.cb(dt));
    },
    onWatchlistUpdated: (watchlist: number[]) => {
      keepTrackApi.callbacks.onWatchlistUpdated.forEach((cb: any) => cb.cb(watchlist));
    },
    staticOffsetChange: (staticOffset: number) => {
      keepTrackApi.callbacks.staticOffsetChange.forEach((cb: any) => cb.cb(staticOffset));
    },
    onLineAdded: () => {
      keepTrackApi.callbacks.onLineAdded.forEach((cb: any) => cb.cb(keepTrackApi.getLineManager()));
    },
  },
  loadedPlugins: <KeepTrackPlugin[]>[],
  getPlugin: (pluginClass: Constructor<KeepTrackPlugin>) => {
    if (keepTrackApi.loadedPlugins.some((plugin: KeepTrackPlugin) => plugin instanceof pluginClass))
      return keepTrackApi.loadedPlugins.find((plugin: KeepTrackPlugin) => plugin instanceof pluginClass);
    return null;
  },
  rmbMenuItems: <rmbMenuItem[]>[],
  getSoundManager: () => keepTrackContainer.get<SoundManager>(Singletons.SoundManager),
  getStarManager: () => keepTrackContainer.get<StarManager>(Singletons.StarManager),
  getRenderer: () => keepTrackContainer.get<WebGLRenderer>(Singletons.WebGLRenderer),
  getScene: () => keepTrackContainer.get<Scene>(Singletons.Scene),
  getCatalogManager: () => keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager),
  getSensorManager: () => keepTrackContainer.get<SensorManager>(Singletons.SensorManager),
  getUiManager: () => keepTrackContainer.get<UiManager>(Singletons.UiManager),
  getInputManager: () => keepTrackContainer.get<InputManager>(Singletons.InputManager),
  getGroupsManager: () => keepTrackContainer.get<GroupsManager>(Singletons.GroupsManager),
  getTimeManager: () => keepTrackContainer.get<TimeManager>(Singletons.TimeManager),
  getOrbitManager: () => keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager),
  getColorSchemeManager: () => <StandardColorSchemeManager>(<unknown>keepTrackContainer.get<ColorSchemeManager>(Singletons.ColorSchemeManager)),
  getDotsManager: () => keepTrackContainer.get<DotsManager>(Singletons.DotsManager),
  getSensorMath: () => keepTrackContainer.get<SensorMath>(Singletons.SensorMath),
  getLineManager: () => keepTrackContainer.get<LineManager>(Singletons.LineManager),
  getHoverManager: () => keepTrackContainer.get<HoverManager>(Singletons.HoverManager),
  getSelectSatManager: () => keepTrackContainer.get<SelectSatManager>(Singletons.SelectSatManager),
  getMainCamera: () => keepTrackContainer.get<Camera>(Singletons.MainCamera),
};

/**
 * Enum containing the registrable events used in the KeepTrack API.
 */
export enum KeepTrackApiEvents {
  onHelpMenuClick = 'onHelpMenuClick',
  /**
   * Run at the end of catalogManager.selectSat with parameters (sat: SatObject, satId: number)
   */
  selectSatData = 'selectSatData',
  /**
   * Run at the end of catalogManager.setSecondarySat with parameters (sat: SatObject, satId: number)
   */
  setSecondarySat = 'setSecondarySat',
  onKeepTrackReady = 'onKeepTrackReady',
  updateSelectBox = 'updateSelectBox',
  onCruncherReady = 'onCruncherReady',
  onCruncherMessage = 'onCruncherMessage',
  uiManagerInit = 'uiManagerInit',
  uiManagerOnReady = 'uiManagerOnReady',
  bottomMenuClick = 'bottomMenuClick',
  hideSideMenus = 'hideSideMenus',
  nightToggle = 'nightToggle',
  orbitManagerInit = 'orbitManagerInit',
  drawManagerLoadScene = 'drawManagerLoadScene',
  drawOptionalScenery = 'drawOptionalScenery',
  updateLoop = 'updateLoop',
  rmbMenuActions = 'rmbMenuActions',
  rightBtnMenuAdd = 'rightBtnMenuAdd',
  updateDateTime = 'updateDateTime',
  uiManagerFinal = 'uiManagerFinal',
  resetSensor = 'resetSensor',
  /**
   * Run in the setSensor method of SensorManager instance with parameters (sensor: SensorObject | string, staticId: number)
   */
  setSensor = 'setSensor',
  changeSensorMarkers = 'changeSensorMarkers',
  altCanvasResize = 'altCanvasResize',
  endOfDraw = 'endOfDraw',
  /**
   * Run in the updateWatchlist method of CatalogManager instance with parameters (watchlist: number[])
   */
  onWatchlistUpdated = 'onWatchlistUpdated',
  /**
   * Run in the staticOffset setter of TimeManager instance with parameters (staticOffset: number)
   */
  staticOffsetChange = 'staticOffsetChange',
  /**
   * Runs when a line is added to the line manager
   */
  onLineAdded = 'onLineAdded',
}

/**
 * Represents an object that can be in the catalog, such as a satellite, missile, or sensor.
 */
type CatalogObject = SatObject | MissileObject | SensorObject;

export const isSensorObject = (sat: CatalogObject): boolean =>
  !!((<SensorObject>sat).observerGd?.lat || (<SensorObject>sat).observerGd?.lon || (<SensorObject>sat).observerGd?.alt);
export const isMissileObject = (sat: CatalogObject): boolean => !!(<MissileObject>sat).missile;
export const isSatObject = (sat: CatalogObject): boolean => {
  if (!sat) return false;

  return !!((<SatObject>sat).sccNum || (<SatObject>sat).intlDes || (<SatObject>sat).TLE1);
};
