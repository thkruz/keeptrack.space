/* eslint-disable no-unused-vars */
import { mobileManager } from '@app/js/uiManager/mobileManager';
import { searchBox } from '@app/js/uiManager/search-box';
import * as glm from 'gl-matrix';

export declare enum CameraType {
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

export interface sunObject {
  eci: {
    x: number;
    y: number;
    z: number;
  };
}

export interface UiManager {
  createClockDOMOnce: boolean;
  toast: (toastText: string, type: string, isLong?: boolean) => void;
  uiInput: UiInputInterface;
  searchBox: typeof searchBox;
  mobileManager: typeof mobileManager;
  isCurrentlyTyping: boolean;
  searchToggle: (force?: any) => void;
  hideSideMenus();
  isUiVisible: any;
  hideUi: () => void;
  keyHandler: (evt: any) => void;
  legendMenuChange(arg0: string);
  hideLoadingScreen: () => void;
  loadStr(arg0: string);
  useCurrentGeolocationAsSensor: () => void;
  legendColorsChange: () => void;
  colorSchemeChangeAlert: (scheme: any) => void;
  lastColorScheme: any;
  updateURL: () => void;
  lookAtLatLon: () => void;
  reloadLastSensor: () => void;
  getsensorinfo();
  doSearch(searchString: string, isPreventDropDown?: boolean);
  startLowPerf: () => void;
  panToStar: (c: any) => void;
  clearRMBSubMenu: () => void;
  menuController: () => void;
  legendHoverMenuClick: (legendType: any) => void;
  footerToggle();
  bottomIconPress: (evt: any) => any;
  onReady: () => void;
  init: () => void;
  postStart: () => void;
}

export type EciVector = [number, number, number];

export interface TearrData {
  time?: string;
  alt?: number;
  lat?: number;
  lon?: number;
  az: number;
  el: number;
  rng: number;
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

export interface OrbitManager {
  clearInViewOrbit(): void;
}

export interface Colors {
  inViewAlt: [number, number, number, number];
  rocketBodyBody(arg0: string, rocketBodyBody: any);
  sunlight60(arg0: string, sunlight60: any);
  sunlight80(arg0: string, sunlight80: any);
  sunlight100(arg0: string, sunlight100: any);
  length: number;
  version: string;
  facility: [number, number, number, number];
  starHi: [number, number, number, number];
  starMed: [number, number, number, number];
  starLow: [number, number, number, number];
  sensor: [number, number, number, number];
  marker: [number, number, number, number][];
  deselected: [number, number, number, number];
  inView: [number, number, number, number];
  inviewAlt: [number, number, number, number];
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
}

export type DrawProgram = WebGLProgram & {
  aPos: number;
  aColor: number;
  aStar: number;
  pMvCamMatrix: WebGLUniformLocation;
  minSize: WebGLUniformLocation;
  maxSize: WebGLUniformLocation;
  vertShader: WebGLShader;
  fragShader: WebGLShader;
};

export type PickingProgram = WebGLProgram & {
  aColor: number;
  aPos: number;
  aPickable: number;
  pMvCamMatrix: WebGLUniformLocation;
  vertShader: WebGLShader;
  fragShader: WebGLShader;
};

export interface DotsManager {
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
  velocityData: any;
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

export interface DrawManager {
  glInit(): void;
}

export interface SettingsManager {
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
  breakTheLaw: boolean;
  camDistBuffer: number;
  cameraDecayFactor: number;
  cameraMovementSpeed: number;
  cameraMovementSpeedMin: number;
  colors: Colors;
  copyrightOveride: boolean;
  cruncherReady: boolean;
  currentColorScheme: any;
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
  init(): void;
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
  isForceColorScheme: boolean;
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

export interface ObjectManager {
  hoveringSat: any;
  selectedSat: number;
  isSensorManagerLoaded: any;
}

export interface MapManager {
  options: any;
  braun: any;
  check: any;
  addMeridian: any;
  updateMap(): any;
  isMapMenuOpen: boolean;
  mapManager: number;
}

export interface SensorManager {
  checkSensorSelected(): boolean;
}

export type LaunchInfoObject = {
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
};

export interface MediaRecorderOptions {
  video: {
    cursor: string;
  };
  audio: boolean;
}

export type LineTypes = 'sat' | 'sat2' | 'sat3' | 'sat4' | 'sat5' | 'sat6' | 'scan' | 'scan2' | 'misl' | 'ref' | 'ref2';
export type LineColors = 'r' | 'o' | 'y' | 'g' | 'b' | 'c' | 'p' | 'w' | [number, number, number, number];

export type AdviceList = {
  welcome: any;
  useLegend: any;
  showSensors: any;
  findIss: any;
  missileMenu: any;
  toggleNight: any;
  colorScheme: any;
  customSensors: any;
  countries: any;
  breakupDisabled?: () => void;
  bubbleDisabled?: () => void;
  cspocSensors?: () => void;
  editSatDisabled?: () => void;
  lookanglesDisabled?: () => void;
  mapDisabled?: () => void;
  mwSensors?: () => void;
  planetariumDisabled?: () => void;
  satelliteSelected?: () => void;
  satFovDisabled?: () => void;
  satViewDisabled?: () => void;
  sensor?: () => void;
  sensorInfoDisabled?: () => void;
  ssnLookanglesDisabled?: () => void;
  survFenceDisabled?: () => void;
};
export type AdviceCounter = {
  welcome: any;
  findIss: any;
  showSensors: any;
  useLegend: any;
  toggleNight: any;
  missileMenu: any;
  satelliteView: any;
  newLaunch?: any;
  breakup: any;
  editSat: any;
  colorScheme: any;
  countries: any;
  cspocSensors: any;
  mwSensors: any;
  customSensors: any;
  planetariumDisabled: any;
  satViewDisabled: any;
  mapDisabled: any;
  lookanglesDisabled: any;
  ssnLookanglesDisabled: any;
  survFenceDisabled: any;
  bubbleDisabled: any;
  sensorInfoDisabled: any;
  editSatDisabled: any;
  breakupDisabled: any;
  satFovDisabled: any;
  sensorFOV: any;
  sensorSurv: any;
};

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
  getRayOrigin: any;
}

export interface Camera {
  fpsPitch: number;
  fpsYaw: number;
  fpsRotate: number;
  fpsPos: glm.vec3;
  camMatrix: glm.mat4;
  camAngleSnappedOnSat: boolean;
  camZoomSnappedOnSat: boolean;
  isScreenPan: boolean;
  isWorldPan: boolean;
  isPanReset: boolean;
  isLocalRotateRoll: boolean;
  isLocalRotateYaw: boolean;
  isLocalRotateOverride: boolean;
  ftsRotateReset: boolean;
  isRayCastingEarth: boolean;
  cameraType: {
    current: CameraType;
    Default: number;
    FixedToSat: number;
    Offset: number;
    Fps: number;
    Astronomy: number;
    Planetarium: number;
    Satellite: number;
    set: any;
  };
  fpsLastTime: number;
  isFPSForwardSpeedLock: boolean;
  fpsForwardSpeed: number;
  isFPSSideSpeedLock: boolean;
  fpsSideSpeed: number;
  isFPSVertSpeedLock: boolean;
  fpsVertSpeed: number;
  fpsRun: number;
  fpsPitchRate: number;
  fpsYawRate: number;
  fpsRotateRate: number;
  _zoomLevel: number;
  isAutoRotate: boolean;
  isAutoPan: boolean;
  _zoomTarget: number;
  isLocalRotateReset: boolean;
  camPitchTarget: number;
  camYawTarget: number;
  ecPitch: number;
  ecYaw: number;
  isCamSnapMode: boolean;
  camSnapToSat: any;
  ecLastZoom: number;
  camPitch: number;
  camYaw: number;
  isShiftPressed: boolean;
  speedModifier: number;
  camPitchSpeed: number;
  camYawSpeed: number;
  panDif: any;
  screenDragPoint: any;
  mouseX: number;
  mouseY: number;
  panTarget: any;
  panStartPosition: any;
  panMovementSpeed: number;
  panCurrent: any;
  panSpeed: any;
  localRotateCurrent: any;
  localRotateTarget: any;
  localRotateSpeed: any;
  localRotateStartPosition: any;
  localRotateMovementSpeed: number;
  localRotateDif: any;
  isDragging: boolean;
  dragStartYaw: number;
  dragStartPitch: number;
  ftsPitch: number;
  camRotateSpeed: number;
  chaseSpeed: number;
  yawErr: number;
  isZoomIn: boolean;
  ftsYaw: number;
  camMatrixEmpty: glm.mat4;
  alt2zoom: any;
  autoPan: any;
  autoRotate: any;
  calculate: any;
  camSnap: any;
  changeCameraType: any;
  changeZoom: any;
  earthHitTest: any;
  fpsMovement: any;
  fts2default: any;
  getCamDist: any;
  getCamPos: any;
  getDistFromEarth: any;
  getForwardVector: any;
  keyDownHandler: any;
  keyUpHandler: any;
  latToPitch: any;
  lookAtLatLon: any;
  longToYaw: any;
  normalizeAngle: any;
  resetFpsPos: any;
  snapToSat: any;
  update: any;
  zoomLevel: any;
  zoomTarget: any;
}

export type SatCruncherMessage = {
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
};

export interface TimeManager {
  propRate: number;
  dynamicOffsetEpoch: number;
  staticOffset: number;
  dateObject: Date;
  simulationTimeObj: any;
  datetimeInputDOM: any;
  timeTextStr: string;
  timeTextStrEmpty: string;
  propFrozen: number;
  realTime: any;
  dt: number;
  drawDt: number;
  calculateSimulationTime: (newSimulationTime?: any) => any;
  getOffsetTimeObj: (offset: number, timeObj: Date) => Date;
  setNow: (now: any, dt: any) => void;
  setLastTime(simulationTimeObj: any);
  setSelectedDate(simulationTimeObj: any);
  lastTime: any;
  selectedDate: any;
  tDS: any;
  iText: number;
  propRate0: any;
  dateDOM: any;
  getDayOfYear(arg0: any);
  getPropOffset: () => number;
  changePropRate: any;
  changeStaticOffset: any;
  synchronize: any;
  init: any;
}
