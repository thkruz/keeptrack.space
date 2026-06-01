/* eslint-disable no-console */
import { CatalogManager } from '@app/app/data/catalog-manager';
import { SatLinkManager } from '@app/app/data/catalog-manager/satLinkManager';
import { GroupsManager } from '@app/app/data/groups-manager';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { SensorManager } from '@app/app/sensors/sensorManager';
import { BottomMenu } from '@app/app/ui/bottom-menu';
import { SearchManager } from '@app/app/ui/search-manager';
import { UiManager } from '@app/app/ui/ui-manager';
import { SoundManager } from '@app/engine/audio/sound-manager';
import { Camera } from '@app/engine/camera/camera';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { InputManager } from '@app/engine/input/input-manager';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { DotsManager } from '@app/engine/rendering/dots-manager';
import { ConeMeshFactory } from '@app/engine/rendering/draw-manager/cone-mesh-factory';
import { SensorFovMeshFactory } from '@app/engine/rendering/draw-manager/sensor-fov-mesh-factory';
import { LineManager } from '@app/engine/rendering/line-manager';
import { KeepTrack } from '@app/keeptrack';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager } from '@app/settings/settings';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';
import { OrbitManager } from '../../src/app/rendering/orbit-manager';
import { Container } from '../../src/engine/core/container';
import { Constructor, Singletons } from '../../src/engine/core/interfaces';
import { WebGLRenderer } from '../../src/engine/rendering/webgl-renderer';
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
  Image = class MockImage {
    decode = vi.fn(() => Promise.resolve(new Uint8ClampedArray([0, 0, 0, 0])));
  } as unknown as typeof Image;
  KeepTrack.getInstance().containerRoot = null as unknown as HTMLDivElement;
  keepTrackApi.analytics = {
    track: vi.fn(),
  };
  EventBus.getInstance().unregisterAllEvents();
  PluginRegistry.unregisterAllPlugins();
  // eslint-disable-next-line dot-notation
  KeepTrack['setContainerElement']();
  setupDefaultHtml();

  clearAllCallbacks();

  const renderer = new WebGLRenderer();
  const scene = Scene.getInstance();

  scene.init({ gl: global.mocks.glMock });

  scene.sensorFovFactory = {
    drawAll: vi.fn(),
    updateAll: vi.fn(),
    generateSensorFovMesh: vi.fn(),
    meshes: [],
  } as unknown as SensorFovMeshFactory;

  scene.coneFactory = {
    drawAll: vi.fn(),
    updateAll: vi.fn(),
    generateMesh: vi.fn(),
    editSettings: vi.fn(),
    remove: vi.fn(),
    removeByObjectId: vi.fn(),
    meshes: [],
  } as unknown as ConeMeshFactory;

  const catalogManagerInstance = new CatalogManager();

  catalogManagerInstance.satCruncherThread = {
    postMessage: vi.fn(),
    sendSatEdit: vi.fn(),
    sendSensorUpdate: vi.fn(),
    sendSunlightViewToggle: vi.fn(),
    sendSatelliteSelected: vi.fn(),
    sendMarkerUpdate: vi.fn(),
    sendCatalogData: vi.fn(),
    sendTimeSync: vi.fn(),
    sendNewMissile: vi.fn(),
    worker: {
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
    },
  } as any;
  catalogManagerInstance.objectCache = [defaultSat];
  // Set up sccIndex so sccNum2Id can find satellites by their catalog number
  catalogManagerInstance.sccIndex = { '00005': 0 };
  catalogManagerInstance.satLinkManager = new SatLinkManager();
  Container.getInstance().registerSingleton(Singletons.CatalogManager, catalogManagerInstance);

  const orbitManagerInstance = new OrbitManager();

  orbitManagerInstance.init(null as unknown as LineManager, global.mocks.glMock);
  Container.getInstance().registerSingleton(Singletons.OrbitManager, orbitManagerInstance);

  const colorSchemeManagerInstance = new ColorSchemeManager();

  Container.getInstance().registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);

  const dotsManagerInstance = new DotsManager();

  dotsManagerInstance.inViewData = Array(100).fill(0) as unknown as Int8Array;

  Container.getInstance().registerSingleton(Singletons.DotsManager, dotsManagerInstance);

  const timeManagerInstance = new TimeManager();

  timeManagerInstance.init();

  timeManagerInstance.simulationTimeObj = new Date(2023, 1, 1, 0, 0, 0, 0);
  Container.getInstance().registerSingleton(Singletons.TimeManager, timeManagerInstance);

  const sensorManagerInstance = new SensorManager();

  Container.getInstance().registerSingleton(Singletons.SensorManager, sensorManagerInstance);

  mockUiManager.searchManager = new SearchManager();
  const soundManagerInstance = new SoundManager();

  catalogManagerInstance.satCruncherThread = {
    postMessage: vi.fn(),
    sendSatEdit: vi.fn(),
    sendSensorUpdate: vi.fn(),
    sendSunlightViewToggle: vi.fn(),
    sendSatelliteSelected: vi.fn(),
    sendMarkerUpdate: vi.fn(),
    sendCatalogData: vi.fn(),
    sendTimeSync: vi.fn(),
    sendNewMissile: vi.fn(),
    worker: {
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
    },
  } as any;

  // Pretend webGl works
  renderer.gl = global.mocks.glMock;
  // Pretend we have a working canvas
  renderer.domElement = { style: { cursor: 'default' } } as unknown as HTMLCanvasElement;

  const inputManagerInstance = new InputManager();
  const groupManagerInstance = new GroupsManager();

  Container.getInstance().registerSingleton(Singletons.WebGLRenderer, renderer);
  Container.getInstance().registerSingleton(Singletons.Scene, scene);
  Container.getInstance().registerSingleton(Singletons.UiManager, mockUiManager);
  Container.getInstance().registerSingleton(Singletons.TimeManager, timeManagerInstance);
  Container.getInstance().registerSingleton(Singletons.InputManager, inputManagerInstance);
  Container.getInstance().registerSingleton(Singletons.GroupsManager, groupManagerInstance);
  const sensorMathInstance = new SensorMath();

  Container.getInstance().registerSingleton(Singletons.SensorMath, sensorMathInstance);
  Container.getInstance().registerSingleton(Singletons.SoundManager, soundManagerInstance);

  ServiceLocator.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
  ServiceLocator.getDotsManager().sizeData = new Int8Array(Array(100).fill(0));
  ServiceLocator.getDotsManager().positionData = new Float32Array(Array(100).fill(0));
  // Setup a mock catalog
  const sat2 = defaultSat.clone();

  sat2.id = 1;
  sat2.sccNum = '11';
  ServiceLocator.getCatalogManager().objectCache = [defaultSat, sat2];

  KeepTrack.getInstance().containerRoot.innerHTML += `
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
    AutoInit: vi.fn(),
    toast: () => ({
      $el: [
        {
          addEventListener: vi.fn(),
          style: {
            background: 'red',
          },
        },
      ],
    }),
    Dropdown: {
      init: vi.fn(),
    },
    Tabs: {
      init: vi.fn(),
      getInstance: vi.fn(() => ({ updateTabIndicator: vi.fn() })),
    },
  } as unknown as typeof window.M;

  dependencies?.forEach((Dependency) => {
    const instance = new Dependency();

    instance.init();
    if (instance.singletonValue) {
      Container.getInstance().registerSingleton(instance.singletonValue, instance);
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
  // console.error = vi.fn();

  // console.warn = vi.fn();

  // console.info = vi.fn();
  console.log = vi.fn();
};

export const enableConsoleErrors = () => {
  console.error = backupConsoleError.error;
  console.warn = backupConsoleError.warn;
  console.info = backupConsoleError.info;
  console.log = backupConsoleError.log;
};

export const standardSelectSat = () => {
  ServiceLocator.getCatalogManager().objectCache = [defaultSat];
  ServiceLocator.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
  ServiceLocator.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
  ServiceLocator.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
  ServiceLocator.getCatalogManager().getObject = () => defaultSat;
  PluginRegistry.getPlugin(SelectSatManager)?.selectSat(0);
};
export const setupMinimumHtml = () => {
  KeepTrack.getInstance().containerRoot.innerHTML = `
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
  makeToast_: vi.fn(),
  addSearchEventListeners_: vi.fn(),
  activeToastList_: [],
  dismissAllToasts: vi.fn(),
  toast: vi.fn(),
  M: null,
  bottomIconPress: vi.fn(),
  hideSideMenus: vi.fn(),
  isCurrentlyTyping: false,
  isUiVisible: false,
  lastBoxUpdateTime: 0,
  lastColorScheme: vi.fn(),
  lastNextPassCalcSatId: 0,
  lastNextPassCalcSensorShortName: '',
  lastToast: '',
  searchHoverSatId: -1,
  lookAtLatLon: null,
  searchManager: null,
  updateInterval: 0,
  updateNextPassOverlay: vi.fn(),
  colorSchemeChangeAlert: vi.fn(),
  doSearch: vi.fn(),
  footerToggle: vi.fn(),
  hideUi: vi.fn(),
  init: vi.fn(),
  initMenuController: vi.fn(),
  legendHoverMenuClick: vi.fn(),
  onReady: vi.fn(),
  updateSelectBox: vi.fn(),
});

export const mockCameraManager = <Camera>(<unknown>{
  camAngleSnappedOnSat: false,
  camMatrix: mat4.create(),
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
  state: {
    mouseX: 0,
    mouseY: 0,
  },
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
  autoPan: vi.fn(),
  autoRotate: vi.fn(),
  camSnap: vi.fn(),
  changeCameraType: vi.fn(),
  changeZoom: vi.fn(),
  draw: vi.fn(),
  exitFixedToSat: vi.fn(),
  getCamDist: vi.fn(),
  getCamPos: vi.fn().mockReturnValue([0, 0, 0]),
  getDistFromEarth: vi.fn(),
  getForwardVector: vi.fn(),
  init: vi.fn(),
  lookAtLatLon: vi.fn(),
  lookAtPosition: vi.fn(),
  setCameraType: vi.fn(),
  snapToSat: vi.fn(),
  registerCameraModeDelegate: vi.fn(),
  unregisterCameraModeDelegate: vi.fn(),
  update: vi.fn(),
  zoomLevel: vi.fn(),
  drawAstronomy: vi.fn(),
  drawFts: vi.fn(),
  drawPlanetarium_: vi.fn(),
  updateCameraSnapMode: vi.fn(),
  transition: {
    isActive: false,
    duration: 500,
    begin: vi.fn(),
    cancel: vi.fn(),
    apply: vi.fn(),
  },
});

export const setupDefaultHtml = () => {
  PluginRegistry.unregisterAllPlugins();
  // ServiceLocator.getMainCamera = vi.fn().mockReturnValue(mockCameraManager);
  Container.getInstance().registerSingleton(Singletons.MainCamera, mockCameraManager);
  KeepTrack.getInstance().containerRoot = document.body as HTMLDivElement;
  KeepTrack.getDefaultBodyHtml();
  BottomMenu.init();
  KeepTrack.getInstance().containerRoot.innerHTML += `
    <input id="search"></input>
    <div id="search-holder"></div>
    <div id="search-btn"></div>
    <div id="sat-hoverbox"></div>
    <div id="sat-infobox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="fullscreen-btn"></div>
    <div id="layers-btn"></div>
    <div id="sound-btn"></div>
    <div id="colors-rmb-menu"></div>
    `;
};

export const clearAllCallbacks = () => {
  for (const callback in EventBus.getInstance().events) {
    if (!Object.prototype.hasOwnProperty.call(EventBus.getInstance().events, callback)) {
      continue;
    }
    EventBus.getInstance().events[callback] = [];
  }
};
