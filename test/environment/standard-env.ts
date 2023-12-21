import { keepTrackApi } from '@app/keepTrackApi';
import { KeepTrack } from '@app/keeptrack';
import { KeepTrackPlugin } from '@app/plugins/KeepTrackPlugin';
import { StandardSensorManager } from '@app/plugins/sensor/sensorManager';
import { SettingsManager } from '@app/settings/settings';
import { Camera } from '@app/singletons/camera';
import { DotsManager } from '@app/singletons/dots-manager';
import { StandardGroupManager } from '@app/singletons/groups-manager';
import { InputManager } from '@app/singletons/input-manager';
import { Scene } from '@app/singletons/scene';
import { SearchManager } from '@app/singletons/search-manager';
import { starManager } from '@app/singletons/starManager';
import { TimeManager } from '@app/singletons/time-manager';
import { SensorMath } from '@app/static/sensor-math';
import { mat4 } from 'gl-matrix';
import { keepTrackContainer } from '../../src/container';
import { Constructor, Singletons } from '../../src/interfaces';
import { StandardCatalogManager } from '../../src/singletons/catalog-manager';
import { StandardColorSchemeManager } from '../../src/singletons/color-scheme-manager';
import { StandardOrbitManager } from '../../src/singletons/orbitManager';
import { WebGLRenderer } from '../../src/singletons/webgl-renderer';
import { defaultSat, defaultSensor } from './apiMocks';

export const setupStandardEnvironment = (dependencies?: Constructor<KeepTrackPlugin>[]) => {
  const settingsManager = new SettingsManager();
  settingsManager.isShowSplashScreen = true;
  settingsManager.init();
  window.settingsManager = settingsManager;
  (global as any).settingsManager = settingsManager;
  // Mock the Image class with a mock decode method and the ability to create new Image objects.
  // eslint-disable-next-line no-native-reassign, no-global-assign
  Image = jest.fn().mockImplementation(() => ({
    decode: () => Promise.resolve(new Uint8ClampedArray([0, 0, 0, 0])),
  }));
  keepTrackApi.containerRoot = null;
  document.body.innerHTML = `<div id="keeptrack-root"></div>`;
  setupDefaultHtml();

  clearAllCallbacks();

  const renderer = new WebGLRenderer();
  const scene = new Scene({
    gl: global.mocks.glMock,
  });
  const catalogManagerInstance = new StandardCatalogManager();
  catalogManagerInstance.satCruncher = {
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
  } as unknown as Worker;
  const orbitManagerInstance = new StandardOrbitManager();
  orbitManagerInstance.orbitWorker = {
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
  } as unknown as Worker;
  orbitManagerInstance['gl_'] = global.mocks.glMock;
  const colorSchemeManagerInstance = new StandardColorSchemeManager();
  const dotsManagerInstance = new DotsManager();
  const timeManagerInstance = new TimeManager();
  timeManagerInstance.simulationTimeObj = new Date(2023, 1, 1, 0, 0, 0, 0);
  const sensorManagerInstance = new StandardSensorManager();
  mockUiManager.searchManager = new SearchManager(mockUiManager);

  // Jest all Image class objects with a mock decode method.
  Image.prototype.decode = jest.fn();

  catalogManagerInstance.satCruncher = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
  } as any;

  // Pretend webGl works
  renderer.gl = global.mocks.glMock;
  // Pretend we have a working canvas
  renderer['domElement'] = <any>{ style: { cursor: 'default' } };

  const inputManagerInstance = new InputManager();
  const groupManagerInstance = new StandardGroupManager();

  keepTrackContainer.registerSingleton(Singletons.WebGLRenderer, renderer);
  keepTrackContainer.registerSingleton(Singletons.Scene, scene);
  keepTrackContainer.registerSingleton(Singletons.CatalogManager, catalogManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.OrbitManager, orbitManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.UiManager, mockUiManager);
  keepTrackContainer.registerSingleton(Singletons.DotsManager, dotsManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.TimeManager, timeManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.SensorManager, sensorManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.InputManager, inputManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.GroupsManager, groupManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.StarManager, starManager);
  const sensorMathInstance = new SensorMath();
  keepTrackContainer.registerSingleton(Singletons.SensorMath, sensorMathInstance);

  keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
  keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
  keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
  // Setup a mock catalog
  keepTrackApi.getCatalogManager().satData = [defaultSat, { ...defaultSat, ...{ id: 1, sccNum: '11' } }];
  catalogManagerInstance.selectedSat = -1;
  catalogManagerInstance.staticSet = [defaultSensor];

  window.M = {
    AutoInit: jest.fn(),
    toast: () => ({
      $el: [
        {
          addEventListener: jest.fn(),
          style: {
            background: 'red',
          },
        },
      ],
    }),
    Dropdown: {
      init: jest.fn(),
    },
  };

  dependencies?.forEach((dependency) => {
    const instance = new dependency();
    instance.init();
    if (instance.singletonValue) {
      keepTrackContainer.registerSingleton(instance.singletonValue, instance);
    }
  });
};

let backupConsoleError = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  log: console.log,
};
export const disableConsoleErrors = () => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.log = jest.fn();
};

export const enableConsoleErrors = () => {
  console.error = backupConsoleError.error;
  console.warn = backupConsoleError.warn;
  console.info = backupConsoleError.info;
  console.log = backupConsoleError.log;
};

export const standardSelectSat = () => {
  keepTrackApi.getCatalogManager().satData = [defaultSat];
  keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
  keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
  keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
  keepTrackApi.getCatalogManager().getSat = () => defaultSat;
  keepTrackApi.getCatalogManager().selectSat(0);
};
export const setupMinimumHtml = () => {
  keepTrackApi.containerRoot.innerHTML = `
  <div id="keeptrack-root">
    <div id="keeptrack-header"></div>
    <div id="${KeepTrackPlugin.bottomIconsContainerId}"></div>
  </div>`;
};

export const mockUiManager = {
  dismissAllToasts: jest.fn(),
  toast: jest.fn(),
  M: null,
  bottomIconPress: jest.fn(),
  clearRMBSubMenu: jest.fn(),
  earthClicked: jest.fn(),
  hideSideMenus: jest.fn(),
  isAnalysisMenuOpen: false,
  isCurrentlyTyping: false,
  isUiVisible: false,
  lastBoxUpdateTime: 0,
  lastColorScheme: jest.fn(),
  lastNextPassCalcSatId: 0,
  lastNextPassCalcSensorShortName: '',
  lastToast: '',
  hoverSatId: -1,
  lookAtLatLon: null,
  searchManager: null,
  updateInterval: 0,
  updateNextPassOverlay: jest.fn(),
  colorSchemeChangeAlert: jest.fn(),
  doSearch: jest.fn(),
  footerToggle: jest.fn(),
  hideUi: jest.fn(),
  init: jest.fn(),
  initMenuController: jest.fn(),
  legendHoverMenuClick: jest.fn(),
  onReady: jest.fn(),
  searchToggle: jest.fn(),
  updateSelectBox: jest.fn(),
};

export const mockCameraManager = <Camera>(<unknown>{
  camAngleSnappedOnSat: false,
  camMatrix: mat4.create().fill(0),
  camPitch: null,
  camPitchSpeed: 0,
  camPitchTarget: null,
  camRotateSpeed: 0,
  camSnapToSat: null,
  camYaw: null,
  camYawSpeed: 0,
  camZoomSnappedOnSat: false,
  cameraType: 0,
  dragStartPitch: null,
  dragStartYaw: null,
  ecLastZoom: 0,
  fpsForwardSpeed: 0,
  fpsPitch: null,
  fpsPitchRate: 0,
  fpsRotate: null,
  fpsRotateRate: 0,
  fpsRun: 0,
  fpsSideSpeed: 0,
  fpsVertSpeed: 0,
  fpsYaw: null,
  fpsYawRate: 0,
  ftsPitch: 0,
  ftsRotateReset: false,
  isCamSnapMode: false,
  isDragging: false,
  isLocalRotateOverride: false,
  isLocalRotateReset: false,
  isLocalRotateRoll: false,
  isLocalRotateYaw: false,
  isPanReset: false,
  isScreenPan: false,
  isWorldPan: false,
  isZoomIn: false,
  localRotateCurrent: null,
  localRotateDif: null,
  localRotateSpeed: null,
  localRotateStartPosition: null,
  mouseX: 0,
  mouseY: 0,
  panCurrent: null,
  panSpeed: null,
  panStartPosition: null,
  position: [0, 0, 0],
  screenDragPoint: [],
  settings_: null,
  speedModifier: 0,
  startMouseX: 0,
  startMouseY: 0,
  zoomTarget: 0,
  autoPan: jest.fn(),
  autoRotate: jest.fn(),
  camSnap: jest.fn(),
  changeCameraType: jest.fn(),
  changeZoom: jest.fn(),
  draw: jest.fn(),
  exitFixedToSat: jest.fn(),
  getCamDist: jest.fn(),
  getCamPos: jest.fn(),
  getDistFromEarth: jest.fn(),
  getForwardVector: jest.fn(),
  init: jest.fn(),
  lookAtLatLon: jest.fn(),
  lookAtPosition: jest.fn(),
  setCameraType: jest.fn(),
  snapToSat: jest.fn(),
  update: jest.fn(),
  zoomLevel: jest.fn(),
  drawAstronomy: jest.fn(),
  drawFts: jest.fn(),
  drawPlanetarium_: jest.fn(),
  updateCameraSnapMode: jest.fn(),
});

export const setupDefaultHtml = () => {
  keepTrackApi.getMainCamera = jest.fn().mockReturnValue(mockCameraManager);
  KeepTrack.getDefaultBodyHtml();
  keepTrackApi.containerRoot.innerHTML += `
    <input id="search"></input>
    <div id="search-holder"></div>
    <div id="search-icon"></div>
    <div id="sat-hoverbox"></div>
    <div id="sat-infobox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="fullscreen-icon"></div>
    <div id="tutorial-icon"></div>
    <div id="legend-icon"></div>
    <div id="sound-icon"></div>
    `;
};

export const clearAllCallbacks = () => {
  for (const callback in keepTrackApi.callbacks) {
    keepTrackApi.callbacks[callback] = [];
  }
};
