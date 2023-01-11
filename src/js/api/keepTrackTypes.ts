import * as glm from 'gl-matrix';

import { ColorRuleSet, ColorSchemeManager } from '../colorManager/colorSchemeManager';

import { Camera } from '../camera/camera';
import { CatalogManager } from '../satSet/satSet';
import { DrawManager } from '../drawManager/drawManager';
import { EarthObject } from '../drawManager/sceneManager/earth';
import { GroupsManager } from '../groupsManager/groupsManager';
import { LineFactory } from '../drawManager/sceneManager/line-factory';
import { MissileManager } from '../plugins/missile/missileManager';
import { ObjectManager } from '../objectManager/objectManager';
import { OrbitManager } from '../orbitManager/orbitManager';
import { PlanetariumManager } from '../plugins/planetarium/planetarium';
import { SatMath } from '../satMath/satMath';
import { SensorManager } from '../plugins/sensor/sensorManager';
import { SpaceObjectType } from './SpaceObjectType';
import { StarManager } from '../starManager/starManager';
import { TimeManager } from '../timeManager/timeManager';
import { UiManager } from '../uiManager/uiManager';

export enum CameraType {
  current = 0,
  Default = 1,
  Offset = 2,
  FixedToSat = 3,
  Fps = 4,
  Planetarium = 5,
  Satellite = 6,
  Astronomy = 7,
}

export type ZoomValue = 'leo' | 'geo';

export interface PostProcessingManager {
  init: any;
  createProgram: any;
  curBuffer: any;
  programs: any;
  setupOcclusion: any;
  createFrameBufferInfo: any;
  switchFrameBuffer: any;
  getFrameBufferInfo: any;
  clearAll: any;
  shaderCode: any;
}

/** Array of ECI Coordinates [x, y, z] */
export interface EciArr3 {
  [Symbol.iterator](): IterableIterator<number>;
}

/** Array of ECF Coordinates [x, y, z] */
export interface EcfArr3 {
  [Symbol.iterator](): IterableIterator<number>;
}

export interface TearrData {
  inView?: boolean;
  time?: string;
  alt?: number;
  lat?: number;
  lon?: number;
  az: number;
  el: number;
  rng: number;
  name: string;
}

export interface SatGroupCollection {
  satId: number;
  isIntlDes?: boolean;
  isObjnum?: boolean;
  missile?: boolean;
}

export interface SatShader {
  largeObjectMinZoom: number;
  largeObjectMaxZoom: number;
  minSize: number;
  minSizePlanetarium: number;
  maxSizePlanetarium: number;
  maxAllowedSize: number;
  isUseDynamicSizing: boolean;
  dynamicSizeScalar: number;
  starSize: string;
  distanceBeforeGrow: string;
  blurFactor1: string;
  blurFactor2: string;
  blurFactor3: string;
  blurFactor4: string;
  maxSize: number;
}

export interface MissileParams {
  missile?: boolean;
  latList?: number[];
  lonList?: number[];
  altList?: number[];
}

export interface Colors {
  pink: [number, number, number, number];
  inFOV: [number, number, number, number];
  inFOVAlt: [number, number, number, number];
  sunlight60: [number, number, number, number];
  sunlight80: [number, number, number, number];
  sunlight100: [number, number, number, number];
  length: number;
  version: string;
  facility: [number, number, number, number];
  starHi: [number, number, number, number];
  starMed: [number, number, number, number];
  starLow: [number, number, number, number];
  sensor: [number, number, number, number];
  marker: [number, number, number, number][];
  deselected: [number, number, number, number];
  radarData: [number, number, number, number];
  radarDataMissile: [number, number, number, number];
  radarDataSatellite: [number, number, number, number];
  payload: [number, number, number, number];
  rocketBody: [number, number, number, number];
  debris: [number, number, number, number];
  unknown: [number, number, number, number];
  trusat: [number, number, number, number];
  analyst: [number, number, number, number];
  missile: [number, number, number, number];
  missileInview: [number, number, number, number];
  transparent: [number, number, number, number];
  satHi: [number, number, number, number];
  satMed: [number, number, number, number];
  satLow: [number, number, number, number];
  sunlightInview: [number, number, number, number];
  penumbral: [number, number, number, number];
  umbral: [number, number, number, number];
  gradientAmt: number;
  satSmall: [number, number, number, number];
  rcsSmall: [number, number, number, number];
  rcsMed: [number, number, number, number];
  rcsLarge: [number, number, number, number];
  rcsUnknown: [number, number, number, number];
  ageNew: [number, number, number, number];
  ageMed: [number, number, number, number];
  ageOld: [number, number, number, number];
  ageLost: [number, number, number, number];
  lostobjects: [number, number, number, number];
  satLEO: [number, number, number, number];
  satGEO: [number, number, number, number];
  inGroup: [number, number, number, number];
  countryPRC: [number, number, number, number];
  countryUS: [number, number, number, number];
  countryCIS: [number, number, number, number];
  countryOther: [number, number, number, number];
  densityPayload: [number, number, number, number];
  densityHi: [number, number, number, number];
  densityMed: [number, number, number, number];
  densityLow: [number, number, number, number];
  densityOther: [number, number, number, number];
}

export interface DrawProgram extends WebGLProgram {
  aPos: number;
  aColor: number;
  aStar: number;
  pMvCamMatrix: WebGLUniformLocation;
  minSize: WebGLUniformLocation;
  maxSize: WebGLUniformLocation;
  vertShader: WebGLShader;
  fragShader: WebGLShader;
}

export interface PickingProgram extends WebGLProgram {
  aColor: number;
  aPos: number;
  aPickable: number;
  pMvCamMatrix: WebGLUniformLocation;
  vertShader: WebGLShader;
  fragShader: WebGLShader;
}

export interface DotsManager {
  inViewData: Int8Array;
  inSunData: Int8Array;
  colorBuffer: any;
  pickingBuffer: any;
  init(gl: WebGL2RenderingContext): void;
  createPickingProgram(gl: WebGL2RenderingContext): void;
  updatePositionBuffer(length: number, orbitalSats: number, timeManager: TimeManager): void;
  updatePMvCamMatrix(pMatrix: glm.mat4, mainCamera: Camera): void;
  draw(mainCamera: Camera, colorSchemeManager: ColorSchemeManager, curBuffer: WebGLBuffer): void;
  drawGpuPickingFrameBuffer(mainCamera: Camera, ColorSchemeManager: ColorSchemeManager): void;
  setupPickingBuffer(satDataLen: number): void;
  updateSizeBuffer(bufferLen: number): void;
  pickingDotSize: string;
  gl: WebGL2RenderingContext;
  emptyMat4: import('gl-matrix').mat4;
  positionBuffer: WebGLBuffer;
  sizeBuffer: WebGLBuffer;
  loaded: boolean;
  pMvCamMatrix: import('gl-matrix').mat4;
  drawProgram: DrawProgram;
  positionBufferOneTime: any;
  positionData: Float32Array;
  pickingProgram: PickingProgram;
  pickingColorBuffer: WebGLBuffer;
  drawShaderCode: { frag: string; vert: string };
  pickingShaderCode: { vert: string; frag: string };
  pickingTexture: WebGLTexture;
  pickingRenderBuffer: WebGLRenderbuffer;
  velocityData: Float32Array;
  drawDivisor: number;
  satDataLenInDraw: any;
  satDataLenInDraw3: number;
  orbitalSats3: number;
  drawI: number;
  sizeBufferOneTime: any;
  sizeData: Float32Array;
  starIndex1: number;
  starIndex2: number;
  pickingColorData: any[];
  pickReadPixelBuffer: any;
  pickingFrameBuffer: WebGLFramebuffer;
}

export interface SettingsManager {
  selectedColorFallback: [number, number, number, number];
  isEnableExtendedCatalog: boolean;
  isFreezePropRateOnDrag: any;
  isNotionalDebris: boolean;
  isUseExtendedCatalog: boolean;
  isDrawTrailingOrbits: boolean;
  isShowSplashScreen: boolean;
  isGlobalErrorTrapOn: boolean;
  isDisableAsciiCatalog: boolean;
  settingsManager: {};
  isShowAgencies: any;
  isShowGeoSats: boolean;
  isShowHeoSats: boolean;
  isShowMeoSats: boolean;
  isShowLeoSats: boolean;
  maxOribtsDisplayedDesktopAll: any;
  orbitGroupAlpha: number;
  loopTimeMachine: any;
  isDisableSelectSat: any;
  timeMachineLongToast: boolean;
  timeMachineString(yearStr: string);
  lastInteractionTime: number;
  isDisableExtraCatalog: boolean;
  orbitSegments: number;
  lastGamepadMovement: number;
  isLimitedGamepadControls: any;
  isEPFL: boolean;
  isUseNullForBadGetEl: any;
  isDisableUrlBar: any;
  meshListOverride: string[];
  isDebrisOnly: boolean;
  isDisableCss: boolean;
  isAllowRightClick: any;
  onLoadCb: any;
  isDrawConstellationBoundaries: any;
  isDrawNasaConstellations: any;
  isDrawSun: any;
  isDrawInCoverageLines: boolean;
  isDrawOrbits: any;
  isEciOnHover: boolean;
  isDrawMilkyWay: boolean;
  isDragging: boolean;
  isOrbitCruncherInEcf: boolean;
  lastSearch: any;
  db: any;
  isGroupOverlayDisabled: any;
  nearZoomLevel: number;
  isPreventColorboxClose: boolean;
  isDayNightToggle: boolean;
  isUseHigherFOVonMobile: any;
  lostSatStr: string;
  maxOribtsDisplayed: any;
  isOrbitOverlayVisible: boolean;
  classificationStr: string;
  isShowSatNameNotOrbit: any;
  isShowNextPass: boolean;
  dotsOnScreen: number;
  isShowSurvFence: boolean;
  hiResWidth: number;
  hiResHeight: number;
  versionDate: string;
  versionNumber: string;
  geolocation: any;
  trusatMode: any;
  isExtraSatellitesAdded: any;
  altMsgNum: any;
  screenshotMode: any;
  lastBoxUpdateTime: number;
  altLoadMsgs: boolean;
  autoPanSpeed: { x: number; y: number };
  autoRotateSpeed: number;
  blueImages: boolean;
  camDistBuffer: number;
  cameraDecayFactor: number;
  cameraMovementSpeed: number;
  cameraMovementSpeedMin: number;
  colors: Colors;
  copyrightOveride: boolean;
  cruncherReady: boolean;
  currentColorScheme: ColorRuleSet;
  currentLegend: string;
  daysUntilObjectLost: number;
  demoModeInterval: number;
  desktopMaxLabels: number;
  desktopMinimumWidth: number;
  disableCameraControls: boolean;
  disableDefaultContextMenu: boolean;
  disableNormalEvents: boolean;
  disableUI: boolean;
  disableWindowScroll: boolean;
  disableWindowTouchMove: boolean;
  disableZoomControls: boolean;
  earthNumLatSegs: number;
  earthNumLonSegs: number;
  enableConstantSelectedSatRedraw: boolean;
  enableHoverOrbits: boolean;
  enableHoverOverlay: boolean;
  enableLimitedUI: boolean;
  fieldOfView: number;
  fieldOfViewMax: number;
  fieldOfViewMin: number;
  fitTleSteps: number;
  fpsForwardSpeed: number;
  fpsPitchRate: number;
  fpsRotateRate: number;
  fpsSideSpeed: number;
  fpsThrottle1: number;
  fpsThrottle2: number;
  fpsVertSpeed: number;
  fpsYawRate: number;
  geolocationUsed: boolean;
  gpsElevationMask: number;
  gpujsMode: string;
  hiresImages: boolean;
  hiresNoCloudsImages: boolean;
  hoverColor: [number, number, number, number];
  init(settingsOverride?: any): void;
  installDirectory: string;
  isAlwaysHidePropRate: boolean;
  isAutoResizeCanvas: boolean;
  isBlackEarth: boolean;
  isBottomMenuOpen: boolean;
  isDemoModeOn: boolean;
  isDisableControlSites: boolean;
  isDisableLaunchSites: boolean;
  isDisableSensors: boolean;
  isDrawLess: boolean;
  isEditTime: boolean;
  isEnableConsole: boolean;
  isEnableGsCatalog: boolean;
  isEnableRadarData: boolean;
  isFOVBubbleModeOn: boolean;
  isLoadLastMap: boolean;
  isMapUpdateOverride: boolean;
  isMobileModeEnabled: boolean;
  isOfficialWebsite: boolean;
  isOnlyFOVChecked: boolean;
  isPropRateChange: boolean;
  isResizing: boolean;
  isSatLabelModeOn: boolean;
  isSatOverflyModeOn: boolean;
  isShowLogo: boolean;
  isUseDebrisCatalog: boolean;
  isZoomStopsRotation: boolean;
  isZoomStopsSnappedOnSat: boolean;
  lastMapUpdateTime: number;
  lastSearchResults: any[];
  legendMenuOpen: boolean;
  limitSats: string;
  lineScanMinEl: number;
  lineScanSpeedRadar: number;
  lineScanSpeedSat: number;
  lkVerify: number;
  lowPerf: boolean;
  lowresImages: boolean;
  mapHeight: number;
  mapWidth: number;
  maxAnalystSats: number;
  maxFieldOfViewMarkers: number;
  maxLabels: number;
  maxMissiles: number;
  maxOrbitsDisplayedMobile: number;
  maxOribtsDisplayedDesktop: number;
  maxRadarData: number;
  maxZoomDistance: number;
  meshOverride: any;
  meshRotation: { x: number; y: number; z: number };
  minimumDrawDt: number;
  minimumSearchCharacters: number;
  minZoomDistance: number;
  mobileMaxLabels: number;
  modelsOnSatelliteViewOverride: boolean;
  nameOfSpecialSats: string;
  nasaImages: boolean;
  nextNPassesCount: number;
  noMeshManager: boolean;
  noStars: boolean;
  offline: boolean;
  offsetCameraModeX: number;
  offsetCameraModeZ: number;
  orbitFadeFactor: number;
  orbitGroupColor: [number, number, number, number];
  orbitHoverColor: [number, number, number, number];
  orbitInViewColor: [number, number, number, number];
  orbitPlanetariumColor: [number, number, number, number];
  orbitSelectColor: [number, number, number, number];
  orbitSelectColor2: [number, number, number, number];
  plugins: any;
  politicalImages: boolean;
  pTime: any[];
  queuedScreenshot: boolean;
  reColorMinimumTime: number;
  retro: boolean;
  satLabelInterval: number;
  satShader: SatShader;
  searchLimit: number;
  selectedColor: [number, number, number, number];
  setCurrentColorScheme: (val: any) => void;
  showOrbitThroughEarth: boolean;
  smallImages: boolean;
  startWithFocus: boolean;
  startWithOrbitsDisplayed: boolean;
  timeMachineDelay: number;
  tleSource: string;
  trusatImages: boolean;
  unofficial: boolean;
  updateHoverDelayLimitBig: number;
  updateHoverDelayLimitSmall: number;
  vectorImages: boolean;
  vertShadersSize: number;
  videoBitsPerSecond: number;
  zFar: number;
  zNear: number;
  zoomSpeed: number;
}

export type RocketUrl = {
  rocket: string;
  url: string;
};

export interface LaunchInfoObject {
  name: string;
  updated: Date;
  windowStart: Date;
  windowEnd: Date;
  location: string;
  locationURL: string;
  agency: string;
  agencyURL: string;
  country: string;
  mission: string;
  missionName: string;
  missionType: string;
  missionURL: string;
  rocket: string;
  rocketConfig: string;
  rocketFamily: string;
  rocketURL: string;
}

export interface MediaRecorderOptions {
  video: {
    cursor: string;
  };
  audio: boolean;
}

export type LineTypes = 'sat' | 'sat2' | 'sat3' | 'sat4' | 'sat5' | 'sat6' | 'scan' | 'scan2' | 'misl' | 'ref' | 'ref2';
export type LineColors = 'r' | 'o' | 'y' | 'g' | 'b' | 'c' | 'p' | 'w' | [number, number, number, number];

export interface UiInputInterface {
  isMouseMoving: boolean;
  isStartedOnCanvas: boolean;
  isAsyncWorking: boolean;
  unProject: any;
  clientWaitAsync: any;
  getBufferSubDataAsync: any;
  readPixelsAsync: any;
  init: any;
  canvasWheel: any;
  canvasClick: any;
  canvasMouseDown: any;
  canvasTouchStart: any;
  canvasMouseUp: any;
  mouseMoveTimeout: any;
  getEarthScreenPoint: any;
  mouseSat: any;
  getSatIdFromCoord: any;
  getSatIdFromCoordAlt: any;
  openRmbMenu: any;
  rmbMenuActions: any;
  canvasMouseMove: any;
  canvasTouchMove: any;
  canvasTouchEnd: any;
}

export interface SatCruncherMessage {
  data: {
    typ?: string;
    time?: number;
    propRate?: number;
    staticOffset?: number;
    dynamicOffsetEpoch?: number;
    satId?: number;
    extraData?: string; // JSON string
    extraUpdate?: boolean;
    satPos: number[];
    satVel: number[];
    satInView?: number[];
    satInSun?: number[];
    sensorMarkerArray?: number[];
  };
}

export enum SunStatus {
  UNKNOWN = -1,
  UMBRAL = 0,
  PENUMBRAL = 1,
  SUN = 2,
}

export declare interface SatObject {
  source: string;
  altId: string;
  pname?: string;
  bf?: string;
  active: boolean;
  apogee: number;
  argPe: number;
  associates?: any;
  az: number;
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
  FMISSED?: any;
  getAltitude?: any;
  getDirection?: any;
  getTEARR?: (
    propTime?: Date,
    sensors?: SensorObject[]
  ) => {
    lat: number;
    lon: number;
    alt: number;
    inView: boolean;
    rng?: number;
    az?: number;
    el?: number;
  };
  id: number;
  inclination: number;
  intlDes?: string;
  isInGroup?: boolean;
  isInSun?: () => SunStatus;
  isRadarData?: boolean;
  launchDate?: string;
  launchMass?: string;
  launchSite?: string;
  launchVehicle?: string;
  length?: string;
  lifetime?: string | number;
  lon: number;
  maneuver?: string;
  manufacturer?: string;
  marker?: boolean;
  meanMotion: number;
  missile?: boolean;
  missileComplex?: number;
  mission?: string;
  motor?: string;
  name?: string;
  NOTES?: string;
  ORPO?: string;
  owner?: string;
  payload?: string;
  perigee: number;
  period: number;
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
  span?: string;
  static?: boolean;
  staticNum: number;
  status?: string;
  TLE1: string;
  TLE2: string;
  TTP?: string;
  type: SpaceObjectType;
  user?: string;
  vmag?: number;

  position: { x: number; y: number; z: number };
  velocity: {
    total: number;
    x: number;
    y: number;
    z: number;
  };
}

export interface MissileObject extends SatObject {
  latList: number[];
  lonList: number[];
  altList: number[];
  startTime: number;
  maxAlt: number;
}

export interface RadarDataObject extends SatObject {
  isRadarData: boolean;
  missileComplex: number;
}

export interface SensorObject {
  static?: boolean;
  linkIridium?: boolean;
  linkGalileo?: boolean;
  linkStarlink?: boolean;
  obsmaxel2?: number;
  obsmaxrange2?: number;
  obsminrange2?: number;
  obsminel2?: number;
  obsmaxaz2?: number;
  obsminaz2?: number;
  alt: number;
  beamwidth?: number;
  changeObjectInterval?: number;
  country: string;
  lat: number;
  linkAehf?: boolean;
  linkWgs?: boolean;
  lon: number;
  name: string;
  observerGd?: {
    lat: number;
    lon: number;
    alt: number;
  };
  obsmaxaz: number;
  obsmaxel: number;
  obsmaxrange: number;
  obsminaz: number;
  obsminel: number;
  obsminrange: number;
  shortName: string;
  staticNum?: number;
  sun: string;
  type?: SpaceObjectType;
  url?: string;
  volume: boolean;
  zoom: ZoomValue;
}

export interface SensorObjectCruncher {
  obsmaxel2?: any;
  obsmaxrange2?: any;
  obsminrange2?: any;
  obsminel2?: any;
  obsmaxaz2?: any;
  obsminaz2?: any;
  alt: number;
  beamwidth?: number;
  changeObjectInterval?: number;
  country: string;
  lat: number;
  linkAehf?: boolean;
  linkWgs?: boolean;
  lon: number;
  name: string;
  observerGd: {
    lat: number;
    lon: number;
    alt: number;
  };
  obsmaxaz: number;
  obsmaxel: number;
  obsmaxrange: number;
  obsminaz: number;
  obsminel: number;
  obsminrange: number;
  shortName: string;
  staticNum: number;
  sun: string;
  type?: SpaceObjectType;
  url?: string;
  volume: boolean;
  zoom: string;
}
export interface Lla {
  lat: number;
  lon: number;
  alt: number;
}

export interface Rae {
  rng: number;
  az: number;
  el: number;
}

export interface InView {
  inView: boolean;
}

export interface CatalogSearches {
  year(satData: SatObject[], yr: number): SatObject[];
  yearOrLess(satData: SatObject[], yr: number): SatObject[];
  name(satData: SatObject[], regex: RegExp): SatObject[];
  shape(satData: SatObject[], text: string): SatObject[];
  bus(satData: SatObject[], text: string): SatObject[];
  type(satData: SatObject[], type: SpaceObjectType): SatObject[];
}

export type Kilometers = number;
export type Radians = number;
export type Degrees = number;
export type EciPos = { x: Kilometers; y: Kilometers; z: Kilometers };
export type EciVel = { x: Kilometers; y: Kilometers; z: Kilometers };
export type Eci = { position: EciPos; velocity: EciVel };

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

export interface Watchlist {
  lastOverlayUpdateTime: number;
  updateWatchlist: (updateWatchlistList?: any[], updateWatchlistInViewList?: any) => void;
  watchlistList: any[];
  watchlistInViewList: any[];
}

export interface SearchBox {
  isResultBoxOpen;
  getLastResultGroup;
  getCurrentSearch: () => string | null;
  isHovering;
  setHoverSat;
  getHoverSat;
  hideResults;
  doArraySearch;
  doSearch: (searchString: string, isPreventDropDown?: boolean) => number[];
  fillResultBox;
}
export interface SoundManager {
  isMute: boolean;
  play(arg0: string);
  loadVoices(): void;
  voices: any[];
  speak(arg0: string): void;
  sounds: any;
}

export interface SatChngObject {
  SCC: number;
  inc: number;
  meanmo: number;
  date: Date;
}

export interface SatChangePlugin {
  satChngTable: SatChngObject[];
}

export interface PhotoManager {}

export interface MapManager {
  options: any;
  isMapMenuOpen: any;
  braun(arg0: { lon: any; lat: any }, arg1: { meridian: number; latLimit: number }): any;
  updateMap();
  satCrunchNow: number;
}

export interface SensorFovPlugin {
  enableFovView: any;
}
export interface AdviceManager {
  showAdvice(header: string, text: string): void;
}

export interface GamepadPlugin {
  settings: any;
  index: number;
  currentState: any;
  getController: any;
  vibrate: any;
  buttonsPressedHistory: number[];
}

export interface SocratesPlugin {
  socratesObjOne: any;
  socratesObjTwo: any;
}
export interface KeepTrackPrograms {
  debug: any;
  satCruncher: any; // depricated
  adviceManager: AdviceManager;
  earth: EarthObject;
  satellite: SatMath;
  mainCamera: Camera;
  orbitManager: OrbitManager;
  sensorManager: SensorManager;
  uiManager: UiManager;
  drawManager: DrawManager;
  // starManager: StarManager;
  astronomy: any;
  planetarium: PlanetariumManager;
  objectManager: ObjectManager;
  lineManager: LineFactory;
  dotsManager: DotsManager;
  groupsManager: GroupsManager;
  satSet: CatalogManager;
  timeManager: TimeManager;
  colorSchemeManager: ColorSchemeManager;
  watchlist: Watchlist;
  searchBox: SearchBox;
  soundManager: SoundManager;
  starManager: StarManager;
  missileManager: MissileManager;
  photoManager: PhotoManager;
  satChange: SatChangePlugin;
  sensorFov: SensorFovPlugin;
  mapManager: MapManager;
  gamepad: GamepadPlugin;
  socrates: SocratesPlugin;
}
