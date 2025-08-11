/* eslint-disable no-console */
import { KeepTrack } from '@app/keeptrack';
import { keepTrackApi } from '@app/keepTrackApi';
import { KeepTrackPlugin } from '@app/plugins/KeepTrackPlugin';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SensorManager } from '@app/plugins/sensor/sensorManager';
import { SoundManager } from '@app/plugins/sounds/sound-manager';
import { SettingsManager } from '@app/settings/settings';
import { Camera } from '@app/singletons/camera';
import { SatLinkManager } from '@app/singletons/catalog-manager/satLinkManager';
import { ColorSchemeManager } from '@app/singletons/color-scheme-manager';
import { DotsManager } from '@app/singletons/dots-manager';
import { ConeMeshFactory } from '@app/singletons/draw-manager/cone-mesh-factory';
import { SensorFovMeshFactory } from '@app/singletons/draw-manager/sensor-fov-mesh-factory';
import { GroupsManager } from '@app/singletons/groups-manager';
import { InputManager } from '@app/singletons/input-manager';
import { Scene } from '@app/singletons/scene';
import { SearchManager } from '@app/singletons/search-manager';
import { TimeManager } from '@app/singletons/time-manager';
import { UiManager } from '@app/singletons/uiManager';
import { BottomMenu } from '@app/static/bottom-menu';
import { SensorMath } from '@app/static/sensor-math';
import { mat4 } from 'gl-matrix';
import { keepTrackContainer } from '../../src/container';
import { Constructor, Singletons } from '../../src/interfaces';
import { CatalogManager } from '../../src/singletons/catalog-manager';
import { OrbitManager } from '../../src/singletons/orbitManager';
import { WebGLRenderer } from '../../src/singletons/webgl-renderer';
import { defaultSat, defaultSensor } from './apiMocks';

export const setupStandardEnvironment = (dependencies?: Constructor<KeepTrackPlugin>[]) => {
  document.body.innerHTML = '<div id="keeptrack-root"></div>';
  const settingsManager = new SettingsManager();

  settingsManager.isShowSplashScreen = true;
  settingsManager.init();
  window.settingsManager = settingsManager;
  (global as unknown as Global).settingsManager = settingsManager;
  // Mock the Image class with a mock decode method and the ability to create new Image objects.
  // eslint-disable-next-line no-native-reassign, no-global-assign
  Image = jest.fn().mockImplementation(() => ({
    decode: () => Promise.resolve(new Uint8ClampedArray([0, 0, 0, 0])),
  }));
  keepTrackApi.containerRoot = null as unknown as HTMLDivElement;
  keepTrackApi.analytics = {
    track: jest.fn(),
    identify: jest.fn(),
    page: jest.fn(),
    user: jest.fn(),
    reset: jest.fn(),
    ready: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    getState: jest.fn(),
    storage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
    plugins: {
      enable: jest.fn(),
      disable: jest.fn(),
    },
  };
  keepTrackApi.unregisterAllEvents();
  keepTrackApi.unregisterAllPlugins();
  // eslint-disable-next-line dot-notation
  KeepTrack['setContainerElement']();
  setupDefaultHtml();

  clearAllCallbacks();

  const renderer = new WebGLRenderer();
  const scene = new Scene({
    gl: global.mocks.glMock,
  });

  scene.sensorFovFactory = {
    drawAll: jest.fn(),
    updateAll: jest.fn(),
    generateSensorFovMesh: jest.fn(),
    meshes: [],
  } as unknown as SensorFovMeshFactory;

  scene.coneFactory = {
    drawAll: jest.fn(),
    updateAll: jest.fn(),
    generateMesh: jest.fn(),
    editSettings: jest.fn(),
    remove: jest.fn(),
    removeByObjectId: jest.fn(),
    meshes: [],
  } as unknown as ConeMeshFactory;

  const catalogManagerInstance = new CatalogManager();

  catalogManagerInstance.satCruncher = {
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
  } as unknown as Worker;
  catalogManagerInstance.objectCache = [defaultSat];
  catalogManagerInstance.satLinkManager = new SatLinkManager();
  keepTrackContainer.registerSingleton(Singletons.CatalogManager, catalogManagerInstance);

  const orbitManagerInstance = new OrbitManager();

  orbitManagerInstance.orbitWorker = {
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
  } as unknown as Worker;

  orbitManagerInstance.init(null, global.mocks.glMock);
  keepTrackContainer.registerSingleton(Singletons.OrbitManager, orbitManagerInstance);

  const colorSchemeManagerInstance = new ColorSchemeManager();

  keepTrackContainer.registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);

  const dotsManagerInstance = new DotsManager();

  dotsManagerInstance.inViewData = Array(100).fill(0) as unknown as Int8Array;

  keepTrackContainer.registerSingleton(Singletons.DotsManager, dotsManagerInstance);

  const timeManagerInstance = new TimeManager();

  timeManagerInstance.simulationTimeObj = new Date(2023, 1, 1, 0, 0, 0, 0);
  keepTrackContainer.registerSingleton(Singletons.TimeManager, timeManagerInstance);

  const sensorManagerInstance = new SensorManager();

  keepTrackContainer.registerSingleton(Singletons.SensorManager, sensorManagerInstance);

  mockUiManager.searchManager = new SearchManager(mockUiManager);
  const soundManagerInstance = new SoundManager();

  // Jest all Image class objects with a mock decode method.
  Image.prototype.decode = jest.fn();

  catalogManagerInstance.satCruncher = {
    addEventListener: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn(),
  } as unknown as Worker;

  // Pretend webGl works
  renderer.gl = global.mocks.glMock;
  // Pretend we have a working canvas
  renderer.domElement = { style: { cursor: 'default' } } as unknown as HTMLCanvasElement;

  const inputManagerInstance = new InputManager();
  const groupManagerInstance = new GroupsManager();

  keepTrackContainer.registerSingleton(Singletons.WebGLRenderer, renderer);
  keepTrackContainer.registerSingleton(Singletons.Scene, scene);
  keepTrackContainer.registerSingleton(Singletons.UiManager, mockUiManager);
  keepTrackContainer.registerSingleton(Singletons.InputManager, inputManagerInstance);
  keepTrackContainer.registerSingleton(Singletons.GroupsManager, groupManagerInstance);
  const sensorMathInstance = new SensorMath();

  keepTrackContainer.registerSingleton(Singletons.SensorMath, sensorMathInstance);
  keepTrackContainer.registerSingleton(Singletons.SoundManager, soundManagerInstance);

  keepTrackApi.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
  keepTrackApi.getDotsManager().sizeData = new Int8Array(Array(100).fill(0));
  keepTrackApi.getDotsManager().positionData = new Float32Array(Array(100).fill(0));
  // Setup a mock catalog
  const sat2 = defaultSat.clone();

  sat2.id = 1;
  sat2.sccNum = '11';
  keepTrackApi.getCatalogManager().objectCache = [defaultSat, sat2];
  const selectSatManager = new SelectSatManager();

  selectSatManager.init();

  keepTrackApi.containerRoot.innerHTML += `
    <div id="save-rmb"></div>
    <div id="save-rmb-menu"></div>
    <div id="view-rmb"></div>
    <div id="view-rmb-menu"></div>
    <div id="create-rmb"></div>
    <div id="create-rmb-menu"></div>
    <div id="colors-rmb"></div>
    <div id="colors-rmb-menu"></div>
    <div id="draw-rmb"></div>
    <div id="draw-rmb-menu"></div>
    <div id="edit-rmb"></div>
    <div id="edit-rmb-menu"></div>
    <div id="earth-rmb"></div>
    <div id="earth-rmb-menu"></div>
    <div id="dops-rmb"></div>
    <div id="dops-rmb-menu"></div>
    <div id="camera-control-widget"></div>
    `;

  BottomMenu.createBottomMenu();
  inputManagerInstance.init();
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
  } as unknown as typeof window.M;

  dependencies?.forEach((Dependency) => {
    const instance = new Dependency();

    instance.init();
    if (instance.singletonValue) {
      keepTrackContainer.registerSingleton(instance.singletonValue, instance);
    }
  });
};

const backupConsoleError = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  log: console.log,
};

export const disableConsoleErrors = () => {
  // console.error = jest.fn();

  // console.warn = jest.fn();

  // console.info = jest.fn();
  console.log = jest.fn();
};

export const enableConsoleErrors = () => {
  console.error = backupConsoleError.error;
  console.warn = backupConsoleError.warn;
  console.info = backupConsoleError.info;
  console.log = backupConsoleError.log;
};

export const standardSelectSat = () => {
  keepTrackApi.getCatalogManager().objectCache = [defaultSat];
  keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
  keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
  keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
  keepTrackApi.getCatalogManager().getObject = () => defaultSat;
  keepTrackApi.getPlugin(SelectSatManager)?.selectSat(0);
};
export const setupMinimumHtml = () => {
  keepTrackApi.containerRoot.innerHTML = `
  <div id="keeptrack-root">
    <div id="keeptrack-header"></div>
    <div id="${KeepTrackPlugin.bottomIconsContainerId}"></div>
    <div id="search"></div>
    <div id="search-icon"></div>
    <div id="search-results"></div>
    <nav id="nav-footer"></nav>
  </div>`;
};

export const mockUiManager: UiManager = <UiManager>(<unknown>{
  isFooterVisible_: false,
  isInitialized_: true,
  makeToast_: jest.fn(),
  addSearchEventListeners_: jest.fn(),
  activeToastList_: [],
  dismissAllToasts: jest.fn(),
  toast: jest.fn(),
  M: null,
  bottomIconPress: jest.fn(),
  hideSideMenus: jest.fn(),
  isAnalysisMenuOpen: false,
  isCurrentlyTyping: false,
  isUiVisible: false,
  lastBoxUpdateTime: 0,
  lastColorScheme: jest.fn(),
  lastNextPassCalcSatId: 0,
  lastNextPassCalcSensorShortName: '',
  lastToast: '',
  searchHoverSatId: -1,
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
  updateSelectBox: jest.fn(),
});

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
  BottomMenu.init();
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
  for (const callback in keepTrackApi.events) {
    if (!Object.prototype.hasOwnProperty.call(keepTrackApi.events, callback)) {
      continue;
    }
    keepTrackApi.events[callback] = [];
  }
};
