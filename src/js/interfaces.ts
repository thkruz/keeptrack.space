import { Degrees, EciVec3, GreenwichMeanSiderealTime, Kilometers, Meters, Milliseconds, Radians, SatelliteRecord, TleLine1, TleLine2, Vec3Flat } from 'ootk';
import { Camera, ZoomValue } from './singletons/camera';
import { GroupType, ObjectGroup } from './singletons/object-group';

import { mat4 } from 'gl-matrix';
import { SensorList } from './catalogs/sensors';
import { SpaceObjectType } from './lib/space-object-type';
import { MissileManager } from './plugins/missile/missileManager';
import { WatchlistPlugin } from './plugins/watchlist/watchlist';
import { SatLinkManager } from './singletons/catalog-manager/satLinkManager';
import { Earth } from './singletons/draw-manager/earth';
import { LineManager } from './singletons/draw-manager/line-manager';
import { HoverManager } from './singletons/hover-manager';
import { SearchManager } from './singletons/search-manager';
import { StarManager } from './singletons/starManager';
import { SatMath } from './static/sat-math';
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
  missile: boolean;
  latList: number[];
  lonList: number[];
  altList: number[];
};

export type EChartsData = {
  name: string;
  value: [number, number, number][];
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
  radarData: rgbaArray;
  radarDataMissile: rgbaArray;
  radarDataSatellite: rgbaArray;
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

export interface LaunchInfoObject {
  agency: string;
  agencyURL: string;
  country: string;
  location: string;
  locationURL: string;
  mission: string;
  missionName: string;
  missionType: string;
  missionURL: string;
  name: string;
  rocket: string;
  rocketConfig: string;
  rocketFamily: string;
  rocketURL: string;
  updated: Date;
  windowEnd: Date;
  windowStart: Date;
}

export interface MediaRecorderOptions {
  audio: boolean;
  video: {
    cursor: string;
  };
}

export interface UiInputInterface {
  canvasClick: any;
  canvasMouseDown: any;
  canvasMouseMove: any;
  canvasMouseUp: any;
  canvasTouchEnd: any;
  canvasTouchMove: any;
  canvasTouchStart: any;
  canvasWheel: any;
  clientWaitAsync: any;
  getBufferSubDataAsync: any;
  getEarthScreenPoint: any;
  getSatIdFromCoord: any;
  getSatIdFromCoordAlt: any;
  init: any;
  isAsyncWorking: boolean;
  isMouseMoving: boolean;
  isStartedOnCanvas: boolean;
  mouseMoveTimeout: any;
  mouseSat: any;
  openRmbMenu: any;
  readPixelsAsync: any;
  rmbMenuActions: any;
  unProject: any;
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

export declare interface BaseObject {
  id: number;
  active: boolean;
  position: EciVec3;
  type: SpaceObjectType;
  velocity: {
    total: number;
    x: number;
    y: number;
    z: number;
  };
}

export declare interface SatObject extends BaseObject {
  FMISSED?: any;
  NOTES?: string;
  ORPO?: string;
  TLE1: TleLine1;
  TLE2: TleLine2;
  TTP?: string;
  alt?: number;
  altId: string;
  apogee: number;
  argPe: number;
  associates?: any;
  az: number;
  bf?: string;
  bus?: string;
  configuration?: string;
  constellation?: any;
  country?: string;
  dec: number;
  desc?: string;
  diameter?: string;
  dryMass?: string;
  eccentricity: number;
  el: number;
  equipment?: string;
  /**Degrees */
  inclination: number;
  intlDes?: string;
  isInGroup?: boolean;
  isRadarData?: boolean;
  lat?: number;
  launchDate?: string;
  launchMass?: string;
  launchSite?: string;
  launchVehicle?: string;
  length?: string;
  lifetime?: string | number;
  lon?: number;
  maneuver?: string;
  manufacturer?: string;
  marker?: boolean;
  meanMotion: number;
  missile?: boolean;
  missileComplex?: number;
  mission?: string;
  motor?: string;
  name?: string;
  owner?: string;
  payload?: string;
  perigee: number;
  period: number;
  pname?: string;
  power?: string;
  purpose?: string;
  ra: number;
  raan: number;
  rae: any;
  rcs?: string;
  satrec: any;
  sccNum?: string;
  semiMajorAxis: number;
  semiMinorAxis: number;
  setRAE: any;
  shape?: string;
  source: string;
  span?: string;
  static?: boolean;
  staticNum: number;
  status?: string;
  user?: string;
  vmag?: number;
}

export interface MissileObject extends SatObject {
  altList: number[];
  latList: number[];
  lonList: number[];
  maxAlt: number;
  startTime: number;
}

export interface RadarDataObject {
  mId: string;
  trackId: string;
  objectId: string;
  missileObject: string;
  sccNum: string;
  rae: any;
  t: Date;
  position: EciArr3;
  rcs: string;
  azError: any;
  elError: any;
  active: boolean;
  missile: false;
  missileComplex?: number;
  name: string;
  static: true;
  type: SpaceObjectType.RADAR_MEASUREMENT | SpaceObjectType.RADAR_TRACK | SpaceObjectType.RADAR_OBJECT | SpaceObjectType.UNKNOWN;
}

export interface SensorObject {
  alt: Kilometers;
  beamwidth?: Degrees;
  changeObjectInterval?: Milliseconds;
  country: string;
  id: number;
  lat: Degrees;
  linkAehf?: boolean;
  linkGalileo?: boolean;
  linkIridium?: boolean;
  linkStarlink?: boolean;
  linkWgs?: boolean;
  lon: Degrees;
  name: string;
  observerGd?: {
    lat: Radians;
    lon: Radians;
    alt: Kilometers;
  };
  obsmaxaz: Degrees;
  obsmaxaz2?: Degrees;
  obsmaxel: Degrees;
  obsmaxel2?: Degrees;
  obsmaxrange: Kilometers;
  obsmaxrange2?: Kilometers;
  obsminaz: Degrees;
  obsminaz2?: Degrees;
  obsminel: Degrees;
  obsminel2?: Degrees;
  obsminrange: Kilometers;
  obsminrange2?: Kilometers;
  shortName: string;
  static?: boolean;
  staticNum?: number;
  sun: string;
  type?: SpaceObjectType;
  url?: string;
  volume: boolean;
  zoom: ZoomValue;
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
  obsmaxaz: Degrees;
  obsmaxaz2?: Degrees;
  obsmaxel: Degrees;
  obsmaxel2?: Degrees;
  obsmaxrange: Kilometers;
  obsmaxrange2?: Kilometers;
  obsminaz: Degrees;
  obsminaz2?: Degrees;
  obsminel: Degrees;
  obsminel2?: Degrees;
  obsminrange: Kilometers;
  obsminrange2?: Kilometers;
  shortName: string;
  staticNum: number;
  sun: string;
  type?: SpaceObjectType;
  url?: string;
  volume: boolean;
  zoom: string;
}

export interface InView {
  inView: boolean;
}

export interface CatalogSearches {
  bus(satData: SatObject[], text: string): SatObject[];
  name(satData: SatObject[], regex: RegExp): SatObject[];
  shape(satData: SatObject[], text: string): SatObject[];
  type(satData: SatObject[], type: SpaceObjectType): SatObject[];
  year(satData: SatObject[], yr: number): SatObject[];
  yearOrLess(satData: SatObject[], yr: number): SatObject[];
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

export type sccPassTimes = {
  sccNum: string;
  time: number;
};

export interface SoundManager {
  isMute: boolean;
  sounds: any;
  voices: any[];

  loadVoices(): void;
  play(arg0: string): void;
  speak(arg0: string): void;
}

export interface SatChngObject {
  SCC: number;
  date: Date;
  inc: number;
  meanmo: number;
}

export interface SatChangePlugin {
  satChngTable: SatChngObject[];
}

export interface PhotoManager {}

export interface MapManager {
  isMapMenuOpen: any;
  options: any;
  satCrunchNow: number;

  braun(arg0: { lon: any; lat: any }, arg1: { meridian: number; latLimit: number }): any;
  updateMap();
}

export interface SensorFovPlugin {
  enableFovView: any;
}
export interface AdviceManager {
  showAdvice(header: string, text: string): void;
}

export interface GamepadPlugin {
  buttonsPressedHistory: number[];
  currentState: any;
  getController: any;
  index: number;
  settings: any;
  vibrate: any;
}

export interface SocratesPlugin {
  socratesObjOne: any;
  socratesObjTwo: any;
}

export interface KeepTrackPrograms {
  // starManager: StarManager;
  astronomy: any;
  debug: any;
  // depricated
  earth: Earth;
  gamepad: GamepadPlugin;
  mapManager: MapManager;
  missileManager: MissileManager;
  photoManager: PhotoManager;
  satChange: SatChangePlugin;
  satCruncher: any;
  satellite: SatMath;
  sensorFov: SensorFovPlugin;
  socrates: SocratesPlugin;
  soundManager: SoundManager;
  starManager: StarManager;
  watchlist: WatchlistPlugin;
}

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
  radarData: boolean;
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
export interface ColorSchemeManager {
  calculateColorBuffers: (force: boolean) => void;
  colorBuf: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  colorBufferOneTime: boolean;
  colorData: Float32Array;
  colorRuleSet: ColorRuleSet;
  colors: any;
  gl: WebGL2RenderingContext;
  hoverSat: number;
  iSensor: number;
  isSunlightColorScheme: boolean;
  isVelocityColorScheme: boolean;
  now: number;
  pickableBuf: WebGLBuffer;
  pickableBuffer: WebGLBuffer;
  pickableBufferOneTime: boolean;
  pickableData: Int8Array;
  satData: SatObject[];
  satInSun: Int8Array;
  satInView: Int8Array;
  satVel: number[];
  setColorScheme: (scheme: (sat: SatObject, params?: any) => ColorInformation, isForceRecolor?: boolean) => void;
  tempNumOfSats: number;
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

export type ColorRuleSet = (sat: SatObject, params?: any) => ColorInformation;

/************************************************************
 * Singletons
 * **********************************************************/

export interface GroupsManager {
  clearSelect: () => void;
  createGroup: (type: GroupType, data: any, name?: string) => ObjectGroup;
  groupList: ObjectGroup[];
  selectGroup: (group: ObjectGroup) => void;
  selectedGroup: ObjectGroup;
  stopUpdatingInViewSoon: boolean;
}

export interface CatalogManager {
  analSatSet: SatObject[];
  cosparIndex: { [key: string]: number };
  fieldOfViewSet: SatObject[];
  gotExtraData: boolean;
  isLaunchSiteManagerLoaded: boolean;
  isSensorManagerLoaded: boolean;
  isStarManagerLoaded: boolean;
  launchSites: SatObject[];
  missileSats: number;
  missileSet: MissileObject[];
  numSats: number;
  orbitDensity: number[];
  orbitDensityMax: number;
  orbitalSats: number;
  radarDataSet: RadarDataObject[];
  satCruncher: Worker;
  satData: SatObject[];
  satExtraData: undefined;
  satLinkManager: SatLinkManager;
  sccIndex: { [key: string]: number };
  secondarySat: number;
  secondarySatObj: SatObject;
  selectedSat: number;
  sensorMarkerArray: number[];
  starIndex1: number;
  starIndex2: number;
  staticSet: SensorObject[];
  updateCruncherBuffers: (mData: SatCruncherMessageData) => void;
  panToStar(c: SatObject): void;
  calcSatrec(sat: SatObject): SatelliteRecord;
  id2satnum(satIdArray: number[]): string[];
  convertSatnumArrayToIdArray(satnumArray: number[]): number[];
  cruncherExtraData(mData: SatCruncherMessageData): void;
  cruncherExtraUpdate(mData: SatCruncherMessageData): void;
  getIdFromIntlDes(intlDes: string): number | null;
  getIdFromObjNum(objNum: number, isExtensiveSearch?: boolean): number | null;
  getIdFromStarName(starName: string, starIndex1: number, starIndex2: number): number | null;
  getSat(i: number | null, type?: GetSatType): SatObject | null;
  getSatFromObjNum(objNum: number): SatObject | null;
  getSensorFromSensorName(sensorName: string): number | null;
  init(satCruncherOveride?: Worker): Promise<void>;
  initObjects(): void;
  insertNewAnalystSatellite(TLE1: string, TLE2: string, id: number, sccNum?: string): any;
  lastSelectedSat(id?: number): number;
  satCruncherOnMessage({ data }: { data: SatCruncherMessageData }): void;
  selectSat(i: number): void;
  setSat(i: number, sat: SatObject): void;
  setSecondarySat(id: number): void;
  setSelectedSat(id: number): void;
  switchPrimarySecondary(): void;
}

export interface OrbitManager {
  orbitWorker: Worker;
  tempTransColor: [number, number, number, number];

  addInViewOrbit(satId: number): void;
  changeOrbitBufferData(satId: number, TLE1?: string, TLE2?: string): void;
  clearHoverOrbit(): void;
  clearInViewOrbit(): void;
  clearSelectOrbit(isSecondary: boolean): void;
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
  setSelectOrbit(satId: number, isSecondary: boolean): void;
  updateAllVisibleOrbits(uiManagerInstance: UiManager): void;
  updateOrbitBuffer(satId: number, missileParams?: MissileParams): void;
}

export interface SensorManager {
  lastMultiSiteArray: TearrData[];
  currentSensors: SensorObject[];
  customSensors: SensorObject[];
  defaultSensor: SensorObject[];
  isCustomSensorMenuOpen: boolean;
  isLookanglesMenuOpen: boolean;
  secondarySensors: SensorObject[];
  sensorListUS: SensorObject[];
  sensorTitle: string;
  sensors: SensorList;
  stfSensors: SensorObject[];
  /** Deprecated - Stop using this */
  whichRadar: string;

  addCustomSensor(sensor: SensorObject): SensorObject[];
  addSecondarySensor(sensor: SensorObject): void;
  addStf(sensor: SensorObject): void;
  clearCustomSensors(): void;
  clearSecondarySensors(): void;
  clearStf(): void;
  isSensorSelected(): boolean;
  removeLastSensor(): void;
  removeSecondarySensor(sensor: SensorObject): void;
  removeStf(sensor?: SensorObject): void;
  resetSensorSelected(): void;
  setCurrentSensor(sensor: SensorObject[] | null): void;
  setSensor(selectedSensor: SensorObject | string, staticNum?: number): void;
  updateCruncherOnCustomSensors(): void;
  verifySensors(sensors: SensorObject[]): SensorObject[];
  calculateSensorPos(now: Date, sensors?: SensorObject[]): { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime };
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
  hoverSatId: number;
  colorSchemeChangeAlert(newScheme: ColorRuleSet): void;
  doSearch(searchString: string, isPreventDropDown?: boolean): void;
  footerToggle(): void;
  hideUi(): void;
  init(): void;
  initMenuController(): void;
  legendHoverMenuClick(legendType: string): void;
  onReady(): void;
  toast(toastText: string, type: ToastMsgType, isLong?: boolean): void;
  updateSelectBox(realTime: Milliseconds, lastBoxUpdateTime: Milliseconds, sat: SatObject): void;
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
  DrawManager = 'DrawManager',
  DotsManager = 'DotsManager',
  SensorManager = 'SensorManager',
  SelectSatManager = 'SelectSatManager',
  InputManager = 'InputManager',
  SoundManager = 'SoundManager',
  SensorMath = 'SensorMathManager',
  MainCamera = 'MainCamera',
}
