import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, GreenwichMeanSiderealTime, Kilometers, Meters, Milliseconds, Radians, SpaceObjectType, Vec3Flat } from 'ootk';
import { Camera } from './singletons/camera';
import { GroupType, ObjectGroup } from './singletons/object-group';

import { mat4 } from 'gl-matrix';
import { ZoomValue } from 'ootk/lib/objects/DetailedSensor';
import { MissileObject } from './singletons/catalog-manager/MissileObject';
import { ColorSchemeManager } from './singletons/color-scheme-manager';
import { LineManager } from './singletons/draw-manager/line-manager';
import { HoverManager } from './singletons/hover-manager';
import { SearchManager } from './singletons/search-manager';
import { TearrData } from './static/sensor-math';

/** Array of ECI Coordinates [x, y, z] */
export type EciArr3 = Vec3Flat<number>;

/** Array of ECF Coordinates [x, y, z] */
export type EcfArr3 = Vec3Flat<number>;

export type Constructor<I> = new (...args: any[]) => I;

export interface SatShader {
  blurFactor1: string;
  blurFactor2: string;
  blurFactor3: string;
  blurFactor4: string;
  distanceBeforeGrow: string;
  dynamicSizeScalar: number;
  isUseDynamicSizing: boolean;
  largeObjectMaxZoom: number;
  largeObjectMinZoom: number;
  maxAllowedSize: number;
  maxSizePlanetarium: number;
  minSizePlanetarium: number;
  starSize: string;
}

export enum GetSatType {
  DEFAULT = 0,
  EXTRA_ONLY = 1,
  POSITION_ONLY = 2,
  SKIP_POS_VEL = 3,
}

export type MissileParams = {
  desc: string;
  active: boolean;
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
  timeList: number[];
  startTime: number;
  maxAlt: number;
  country: string;
  launchVehicle: string;
};

export type EChartsData = {
  name: string;
  satId?: number;
  country?: string;
  value?: [number, number, number][];
  data?: [number, number, number][];
}[];

export type rgbaArray = [number, number, number, number];

export interface Colors {
  notional: rgbaArray;
  ageLost: rgbaArray;
  ageMed: rgbaArray;
  ageNew: rgbaArray;
  ageOld: rgbaArray;
  analyst: rgbaArray;
  countryCIS: rgbaArray;
  countryOther: rgbaArray;
  countryPRC: rgbaArray;
  countryUS: rgbaArray;
  debris: rgbaArray;
  densityHi: rgbaArray;
  densityLow: rgbaArray;
  densityMed: rgbaArray;
  densityOther: rgbaArray;
  densityPayload: rgbaArray;
  deselected: rgbaArray;
  facility: rgbaArray;
  gradientAmt: number;
  inFOV: rgbaArray;
  inFOVAlt: rgbaArray;
  inGroup: rgbaArray;
  length: number;
  lostobjects: rgbaArray;
  marker: rgbaArray[];
  missile: rgbaArray;
  missileInview: rgbaArray;
  payload: rgbaArray;
  penumbral: rgbaArray;
  pink: rgbaArray;
  confidenceHi: rgbaArray;
  confidenceLow: rgbaArray;
  confidenceMed: rgbaArray;
  rcsLarge: rgbaArray;
  rcsMed: rgbaArray;
  rcsSmall: rgbaArray;
  rcsUnknown: rgbaArray;
  rcsXSmall: rgbaArray;
  rcsXXSmall: rgbaArray;
  rocketBody: rgbaArray;
  satGEO: rgbaArray;
  satHi: rgbaArray;
  satLEO: rgbaArray;
  satLow: rgbaArray;
  satMed: rgbaArray;
  satSmall: rgbaArray;
  sensor: rgbaArray;
  starHi: rgbaArray;
  starLow: rgbaArray;
  starMed: rgbaArray;
  sunlight100: rgbaArray;
  sunlight60: rgbaArray;
  sunlight80: rgbaArray;
  sunlightInview: rgbaArray;
  transparent: rgbaArray;
  trusat: rgbaArray;
  umbral: rgbaArray;
  unknown: rgbaArray;
  version: string;
}

export interface SatCruncherMessageData {
  data: {
    typ?: string;
    time?: number;
    propRate?: number;
    staticOffset?: number;
    dynamicOffsetEpoch?: number;
    badSatNumber?: number;
  };
}

export interface SensorObjectCruncher {
  alt: Kilometers;
  beamwidth?: Degrees;
  changeObjectInterval?: Milliseconds;
  country: string;
  lat: Degrees;
  linkAehf?: boolean;
  linkWgs?: boolean;
  lon: Degrees;
  name: string;
  observerGd: {
    lat: Radians;
    lon: Radians;
    alt: Kilometers;
  };
  maxAz: Degrees;
  maxAz2?: Degrees;
  maxEl: Degrees;
  maxEl2?: Degrees;
  maxRng: Kilometers;
  maxRng2?: Kilometers;
  minAz: Degrees;
  minAz2?: Degrees;
  minEl: Degrees;
  minEl2?: Degrees;
  minRng: Kilometers;
  minRng2?: Kilometers;
  shortName: string;
  sensorId: number;
  sun: string;
  type?: SpaceObjectType;
  url?: string;
  volume: boolean;
  zoom: ZoomValue;
  objName: string;
  uiName: string;
  system: string;
  operator: string;
}

export type lookanglesRow = {
  sortTime: number;
  scc: string;
  score: number;
  startDate: Date;
  startTime: Date;
  startAz: string;
  startEl: string;
  startrng: string;
  stopDate: Date;
  stopTime: Date;
  stopAz: string;
  stopEl: string;
  stoprng: string;
  tic: number;
  minrng: string;
  passMaxEl: string;
};

export type SatPassTimes = {
  sat: DetailedSatellite;
  time: Date;
};

export type ToastMsgType = 'standby' | 'normal' | 'caution' | 'serious' | 'critical' | 'error';

export type GeolocationPosition = {
  coords: {
    latitude: Degrees | number;
    longitude: Degrees | number;
    altitude: Meters | number;
  };
};

export interface SensorGeolocation {
  alt: Kilometers;
  lat: Degrees;
  lon: Degrees;
  maxaz: Degrees;
  maxel: Degrees;
  maxrange: Kilometers;
  minaz: Degrees;
  minel: Degrees;
  minrange: Kilometers;
}

export interface ObjectTypeFlags {
  ageLost: boolean;
  ageMed: boolean;
  ageNew: boolean;
  ageOld: boolean;
  countryCIS: boolean;
  countryOther: boolean;
  countryPRC: boolean;
  countryUS: boolean;
  debris: boolean;
  densityHi: boolean;
  densityLow: boolean;
  densityMed: boolean;
  densityOther: boolean;
  densityPayload: boolean;
  facility: boolean;
  inFOV: boolean;
  inViewAlt: boolean;
  missile: boolean;
  missileInview: boolean;
  payload: boolean;
  pink: boolean;
  rcsLarge: boolean;
  rcsMed: boolean;
  rcsSmall: boolean;
  rcsUnknown: boolean;
  rocketBody: boolean;
  satGEO: boolean;
  satHi: boolean;
  satLEO: boolean;
  satLow: boolean;
  satMed: boolean;
  satSmall: boolean;
  sensor: boolean;
  starHi: boolean;
  starLow: boolean;
  starMed: boolean;
  velocityFast: boolean;
  velocityMed: boolean;
  velocitySlow: boolean;
}

export enum Pickable {
  Yes = 1,
  No = 0,
}

export type ColorInformation = {
  color: [number, number, number, number];
  marker?: boolean;
  pickable: Pickable;
};

export interface ColorRuleParams {
  satInSun?: Int8Array;
  satInView?: Int8Array;
}

export type ColorRuleSet = (obj: BaseObject, params?: any) => ColorInformation;

/************************************************************
 * Singletons
 *
 * Using these interfaces will allow us to create replaceable
 * singletons. In the future, we can create new classes that
 * implement these interfaces and replace the singletons with
 * the new classes. Example: A new class that implements the
 * CatalogManager interface but is more resource intensive
 * for better accuracy.
 *
 * **********************************************************/

export interface GroupsManager {
  clearSelect: () => void;
  createGroup: (type: GroupType, data: any, name?: string) => ObjectGroup;
  groupList: Record<string, ObjectGroup>;
  selectGroup: (group: ObjectGroup) => void;
  selectedGroup: ObjectGroup;
  stopUpdatingInViewSoon: boolean;
}

export interface OrbitManager {
  orbitWorker: Worker;
  tempTransColor: [number, number, number, number];

  addInViewOrbit(satId: number): void;
  changeOrbitBufferData(satId: number, TLE1?: string, TLE2?: string): void;
  clearHoverOrbit(): void;
  clearInViewOrbit(): void;
  drawOrbitsSettingChanged(): void;
  clearSelectOrbit(isSecondary?: boolean): void;
  draw(
    pMatrix: mat4,
    camMatrix: mat4,
    tgtBuffer: WebGLFramebuffer,
    hoverManagerInstance: HoverManager,
    colorSchemeManagerInstance: ColorSchemeManager,
    mainCameraInstance: Camera
  ): void;
  init(lineManagerInstance: LineManager, gl: WebGL2RenderingContext, orbitWorker?: Worker): void;
  removeInViewOrbit(satId: number): void;
  setHoverOrbit(satId: number): void;
  setSelectOrbit(satId: number, isSecondary?: boolean): void;
  updateAllVisibleOrbits(uiManagerInstance: UiManager): void;
  updateOrbitBuffer(
    satId: number,
    missileParams?: {
      latList: Degrees[];
      lonList: Degrees[];
      altList: Kilometers[];
    }
  ): void;
}

export interface SensorManager {
  lastMultiSiteArray: TearrData[];
  currentSensors: DetailedSensor[];
  customSensors: DetailedSensor[];
  defaultSensor: DetailedSensor[];
  isCustomSensorMenuOpen: boolean;
  isLookanglesMenuOpen: boolean;
  secondarySensors: DetailedSensor[];
  sensorListUS: DetailedSensor[];
  sensorTitle: string;
  stfSensors: DetailedSensor[];
  /** Deprecated - Stop using this */
  whichRadar: string;

  addSecondarySensor(sensor: DetailedSensor): void;
  addStf(sensor: DetailedSensor): void;
  clearSecondarySensors(): void;
  clearStf(): void;
  isSensorSelected(): boolean;
  removeSecondarySensor(sensor: DetailedSensor): void;
  removeStf(sensor?: DetailedSensor): void;
  resetSensorSelected(): void;
  setCurrentSensor(sensor: DetailedSensor[] | null): void;
  setSensor(selectedSensor: DetailedSensor | string | null, sensorId?: number): void;
  updateCruncherOnCustomSensors(): void;
  verifySensors(sensors: DetailedSensor[]): DetailedSensor[];
  calculateSensorPos(now: Date, sensors?: DetailedSensor[]): { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime };
}

export interface UiManager {
  bottomIconPress: (el: HTMLElement) => void;
  hideSideMenus: () => void;
  dismissAllToasts: () => void;
  isAnalysisMenuOpen: boolean;
  isCurrentlyTyping: boolean;
  isUiVisible: boolean;
  lastBoxUpdateTime: number;
  lastColorScheme: ColorRuleSet;
  lastNextPassCalcSatId: number;
  lastNextPassCalcSensorShortName: string;
  lastToast: string;
  lookAtLatLon: undefined;
  searchManager: SearchManager;
  updateInterval: number;
  updateNextPassOverlay: (boolean) => void;
  searchHoverSatId: number;
  colorSchemeChangeAlert: (scheme: ColorRuleSet) => void;
  doSearch(searchString: string, isPreventDropDown?: boolean): void;
  footerToggle(): void;
  hideUi(): void;
  init(): void;
  initMenuController(): void;
  legendHoverMenuClick(legendType: string): void;
  onReady(): void;
  toast(toastText: string, type: ToastMsgType, isLong?: boolean): void;
  updateSelectBox(realTime: Milliseconds, lastBoxUpdateTime: Milliseconds, satOrMislObj: DetailedSatellite | MissileObject): void;
}

export enum Singletons {
  CatalogManager = 'CatalogManager',
  OrbitManager = 'OrbitManager',
  GroupsManager = 'GroupManager',
  UiManager = 'UiManager',
  ColorSchemeManager = 'ColorScheme',
  HoverManager = 'HoverManager',
  LineManager = 'LineManager',
  StarManager = 'StarManager',
  TimeManager = 'TimeManager',
  WebGLRenderer = 'DrawManager',
  DotsManager = 'DotsManager',
  SensorManager = 'SensorManager',
  SelectSatManager = 'SelectSatManager',
  InputManager = 'InputManager',
  SoundManager = 'SoundManager',
  SensorMath = 'SensorMathManager',
  MainCamera = 'MainCamera',
  PersistenceManager = 'PersistenceManager',
  Scene = 'Scene',
  MeshManager = 'MeshManager',
}
/**
 * Enum containing the registrable events used in the KeepTrack API.
 */

export enum KeepTrackApiEvents {
  onHelpMenuClick = 'onHelpMenuClick',
  /**
   * Run at the end of SelectSatManager.selectSat with parameters (sat: SatObject, satId: number)
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
  /**
   * Run as the default case in the rmbMenuActions event with parameters (targetId: string, clickedSat: number)
   */
  rmbMenuActions = 'rmbMenuActions',
  /**
   * Runs during inputManager.init immediately before adding the clear lines and clear screen buttons
   */
  rightBtnMenuAdd = 'rightBtnMenuAdd',
  updateDateTime = 'updateDateTime',
  uiManagerFinal = 'uiManagerFinal',
  resetSensor = 'resetSensor',
  /**
   * Run in the setSensor method of SensorManager instance with parameters (sensor: DetailedSensor | string, staticId: number)
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
  /**
   * Runs when a sensor dot is selected but not when a sensor is selected from the sensor menu
   */
  sensorDotSelected = 'sensorDotSelected',
  canvasMouseDown = 'canvasMouseDown',
  touchStart = 'touchStart',
}
