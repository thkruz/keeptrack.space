/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference https://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import logoPrimaryPng from '@public/img/logo-primary.png';
import logoSecondaryPng from '@public/img/logo-secondary.png';
import cubesatJpg from '@public/img/wallpaper/cubesat.jpg';
import earthJpg from '@public/img/wallpaper/Earth.jpg';
import issJpg from '@public/img/wallpaper/iss.jpg';
import observatoryJpg from '@public/img/wallpaper/observatory.jpg';
import rocketJpg from '@public/img/wallpaper/rocket.jpg';
import rocket2Jpg from '@public/img/wallpaper/rocket2.jpg';
import rocket3Jpg from '@public/img/wallpaper/rocket3.jpg';
import rocket4Jpg from '@public/img/wallpaper/rocket4.jpg';
import satJpg from '@public/img/wallpaper/sat.jpg';
import sat2Jpg from '@public/img/wallpaper/sat2.jpg';
import telescopeJpg from '@public/img/wallpaper/telescope.jpg';
import thuleJpg from '@public/img/wallpaper/thule.jpg';

import 'material-icons/iconfont/material-icons.css';

import eruda, { ErudaConsole } from 'eruda';
import { BaseObject, CatalogSource, DetailedSatellite, GreenwichMeanSiderealTime } from 'ootk';
import { keepTrackContainer } from './container';
import { Doris } from './doris/doris';
import { CanvasEvents, CoreEngineEvents, WebGlEvents } from './doris/events/event-types';
import { Renderer } from './doris/rendering/renderer';
import { GetSatType, KeepTrackApiEvents, Singletons } from './interfaces';
import { keepTrackApi } from './keepTrackApi';
import { getEl } from './lib/get-el';
import { loadLocalization } from './locales/locales';
import { SensorManager } from './plugins/sensor/sensorManager';
import { WatchlistPlugin } from './plugins/watchlist/watchlist';
import { settingsManager, SettingsManagerOverride } from './settings/settings';
import { VERSION } from './settings/version.js';
import { Camera, CameraType } from './singletons/camera';
import { CameraControlWidget } from './singletons/camera-control-widget';
import { CatalogManager } from './singletons/catalog-manager';
import { ColorSchemeManager } from './singletons/color-scheme-manager';
import { DemoManager } from './singletons/demo-mode';
import { DotsManager } from './singletons/dots-manager';
import { LineManager, lineManagerInstance } from './singletons/draw-manager/line-manager';
import { MeshManager } from './singletons/draw-manager/mesh-manager';
import { ErrorManager, errorManagerInstance } from './singletons/errorManager';
import { GroupsManager } from './singletons/groups-manager';
import { HoverManager } from './singletons/hover-manager';
import { InputManager } from './singletons/input-manager';
import { mobileManager } from './singletons/mobileManager';
import { OrbitManager } from './singletons/orbitManager';
import { Scene } from './singletons/scene';
import { TimeManager } from './singletons/time-manager';
import { UiManager } from './singletons/uiManager';
import { BottomMenu } from './static/bottom-menu';
import { CatalogLoader } from './static/catalog-loader';
import { isThisNode } from './static/isThisNode';
import { SensorMath } from './static/sensor-math';
import { SplashScreen } from './static/splash-screen';

export class KeepTrack {
  static readonly id = 'KeepTrack';

  /** An image is picked at random and then if the screen is bigger than 1080p then it loads the next one in the list */
  private static readonly splashScreenImgList_ =
    [observatoryJpg, thuleJpg, rocketJpg, rocket2Jpg, telescopeJpg, issJpg, rocket3Jpg, rocket4Jpg, cubesatJpg, satJpg, sat2Jpg, earthJpg];

  private readonly settingsOverride_: SettingsManagerOverride;

  colorManager: ColorSchemeManager;
  demoManager: DemoManager;
  dotsManager: DotsManager;
  errorManager: ErrorManager;
  lineManager: LineManager;
  colorSchemeManager: ColorSchemeManager;
  orbitManager: OrbitManager;
  catalogManager: CatalogManager;
  timeManager: TimeManager;
  renderer: Renderer;
  sensorManager: SensorManager;
  uiManager: UiManager;
  inputManager: InputManager;
  mainCameraInstance: Camera;
  cameraControlWidget: CameraControlWidget;

  constructor(
    settingsOverride: SettingsManagerOverride = {
      isPreventDefaultHtml: false,
      isShowSplashScreen: true,
    },
  ) {
    this.settingsOverride_ = settingsOverride;
    settingsManager.init(this.settingsOverride_);
  }

  private static keepTrackInstance: KeepTrack | null = null;

  static getInstance(settingsOverride?: SettingsManagerOverride): KeepTrack {
    if (!KeepTrack.keepTrackInstance) {
      KeepTrack.keepTrackInstance = new KeepTrack(settingsOverride);

      // Expose to window for debugging
      window.keepTrack = KeepTrack.keepTrackInstance;
    }

    return KeepTrack.keepTrackInstance;
  }

  init() {
    KeepTrack.setContainerElement_();

    if (!this.settingsOverride_.isPreventDefaultHtml) {
      import(/* webpackMode: "eager" */ '@css/loading-screen.css');
      KeepTrack.getDefaultBodyHtml();

      if (!isThisNode() && settingsManager.isShowSplashScreen) {
        Doris.getInstance().on(CoreEngineEvents.Initialize, () => {
          KeepTrack.loadSplashScreen_();
        });
      }
    }

    const orbitManagerInstance = new OrbitManager();

    keepTrackContainer.registerSingleton(Singletons.OrbitManager, orbitManagerInstance);
    const catalogManagerInstance = new CatalogManager();

    keepTrackContainer.registerSingleton(Singletons.CatalogManager, catalogManagerInstance);
    const groupManagerInstance = new GroupsManager();

    keepTrackContainer.registerSingleton(Singletons.GroupsManager, groupManagerInstance);
    const timeManagerInstance = new TimeManager();

    keepTrackContainer.registerSingleton(Singletons.TimeManager, timeManagerInstance);

    keepTrackContainer.registerSingleton(Singletons.WebGLRenderer, Doris.getInstance().getRenderer());
    const meshManagerInstance = new MeshManager();

    keepTrackContainer.registerSingleton(Singletons.MeshManager, meshManagerInstance);

    Doris.getInstance().once(WebGlEvents.AfterInit, () => {
      const sceneInstance = new Scene({
        gl: keepTrackApi.getRenderer().gl,
      });

      keepTrackContainer.registerSingleton(Singletons.Scene, sceneInstance);
      this.renderer = Doris.getInstance().getRenderer();
    });
    const sensorManagerInstance = new SensorManager();

    keepTrackContainer.registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    const dotsManagerInstance = new DotsManager();

    keepTrackContainer.registerSingleton(Singletons.DotsManager, dotsManagerInstance);
    const uiManagerInstance = new UiManager();

    keepTrackContainer.registerSingleton(Singletons.UiManager, uiManagerInstance);
    const colorSchemeManagerInstance = new ColorSchemeManager();

    keepTrackContainer.registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
    const inputManagerInstance = new InputManager();

    keepTrackContainer.registerSingleton(Singletons.InputManager, inputManagerInstance);
    const sensorMathInstance = new SensorMath();

    keepTrackContainer.registerSingleton(Singletons.SensorMath, sensorMathInstance);
    const mainCameraInstance = new Camera();

    const cameraControlWidget = new CameraControlWidget();

    this.cameraControlWidget = cameraControlWidget;

    keepTrackContainer.registerSingleton(Singletons.MainCamera, mainCameraInstance);
    const hoverManagerInstance = new HoverManager();

    keepTrackContainer.registerSingleton(Singletons.HoverManager, hoverManagerInstance);
    const demoManagerInstance = new DemoManager();

    keepTrackContainer.registerSingleton(Singletons.DemoManager, demoManagerInstance);

    this.mainCameraInstance = mainCameraInstance;
    this.errorManager = errorManagerInstance;
    this.dotsManager = dotsManagerInstance;
    this.lineManager = lineManagerInstance;
    this.colorSchemeManager = colorSchemeManagerInstance;
    this.orbitManager = orbitManagerInstance;
    this.catalogManager = catalogManagerInstance;
    this.timeManager = timeManagerInstance;
    this.sensorManager = sensorManagerInstance;
    this.uiManager = uiManagerInstance;
    this.inputManager = inputManagerInstance;
    this.demoManager = demoManagerInstance;
  }

  static getDefaultBodyHtml(): void {
    if (!keepTrackApi.containerRoot) {
      throw new Error('Container root is not set');
    }

    SplashScreen.initLoadingScreen(keepTrackApi.containerRoot);

    keepTrackApi.containerRoot.id = 'keeptrack-root';
    keepTrackApi.containerRoot.innerHTML += keepTrackApi.html`
      <header>
        <div id="keeptrack-header"></div>
      </header>
      <main>
        <div id="rmb-wrapper"></div>
        <div id="canvas-holder">
        <div id="logo-primary" class="start-hidden">
            <a href="https://keeptrack.space" target="_blank">
              <img src="${logoPrimaryPng}" alt="KeepTrack">
            </a>
          </div>
          <div id="logo-secondary" class="start-hidden">
            <a href="https://celestrak.org" target="_blank">
              <img src="${logoSecondaryPng}" alt="Celestrak">
            </a>
          </div>
          <canvas id="keeptrack-canvas"></canvas>
          <div id="ui-wrapper">
            <div id="sat-hoverbox">
              <span id="sat-hoverbox1"></span>
              <span id="sat-hoverbox2"></span>
              <span id="sat-hoverbox3"></span>
            </div>
            <div id="sat-minibox"></div>

            <div id="legend-hover-menu" class="start-hidden"></div>
            <aside id="left-menus"></aside>
          </div>
        </div>
        <figcaption id="info-overlays">
          <div id="camera-status-box" class="start-hidden status-box">Earth Centered Camera Mode</div>
          <div id="propRate-status-box" class="start-hidden status-box">Propagation Rate: 1.00x</div>
        </figcaption>
      </main>
      <footer id="nav-footer" class="page-footer resizable">
        <div id="footer-handle" class="ui-resizable-handle ui-resizable-n"></div>
        <div id="footer-toggle-wrapper">
          <div id="nav-footer-toggle">&#x25BC;</div>
        </div>
      </footer>`;

    if (!settingsManager.isShowSplashScreen) {
      /*
       * hideEl('loading-screen');
       * hideEl('nav-footer');
       */
    }
  }

  private static setContainerElement_() {
    // User provides the container using the settingsManager
    const containerDom = settingsManager.containerRoot ?? document.getElementById('keeptrack-root') as HTMLDivElement;

    if (!containerDom) {
      throw new Error('Failed to find container');
    }

    // If no current shadow DOM, create one - this is mainly for testing
    if (!keepTrackApi.containerRoot) {
      keepTrackApi.containerRoot = containerDom;
    }
  }

  static async loadCss(): Promise<void> {
    try {
      // Load the CSS
      if (!settingsManager.isDisableCss) {
        import('@css/fonts.css');
        import(/* webpackMode: "eager" */ '@css/materialize.css').catch(() => {
          // This is intentional
        });
        import(/* webpackMode: "eager" */ '@css/astroux/css/astro.css').catch(() => {
          // This is intentional
        });
        import(/* webpackMode: "eager" */ '@css/materialize-local.css').catch(() => {
          // This is intentional
        });
        import(/* webpackMode: "eager" */ '@css/style.css')
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-sm.css').catch(() => {
              // This is intentional
            }),
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-md.css').catch(() => {
              // This is intentional
            }),
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-lg.css').catch(() => {
              // This is intentional
            }),
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-xl.css').catch(() => {
              // This is intentional
            }),
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-2xl.css').catch(() => {
              // This is intentional
            }),
          )
          .catch(() => {
            // This is intentional
          });
      } else if (settingsManager.enableLimitedUI) {
        import(/* webpackMode: "eager" */ '@css/limitedUI.css').catch(() => {
          // This is intentional
        });
      }
    } catch (e) {
      // intentionally left blank
    }
  }

  /* istanbul ignore next */
  private static loadSplashScreen_(): void {
    // Randomly load a splash screen - not a vulnerability
    const image = KeepTrack.splashScreenImgList_[Math.floor(Math.random() * KeepTrack.splashScreenImgList_.length)];
    const loadingDom = getEl('loading-screen');

    if (loadingDom) {
      loadingDom.style.backgroundImage = `url(${image})`;
      loadingDom.style.backgroundSize = 'cover';
      loadingDom.style.backgroundPosition = 'center';
      loadingDom.style.backgroundRepeat = 'no-repeat';
    } else {
      errorManagerInstance.debug('Failed to load splash screen');
    }

    // Preload the rest of the images after 30 seconds
    setTimeout(() => {
      KeepTrack.splashScreenImgList_.forEach((img) => {
        const preloadImg = new Image();

        preloadImg.src = img;
      });
    }, 30000);
  }

  private static printLogoToConsole_() {
    // eslint-disable-next-line no-console
    console.log(`
 _  __            _______             _       _____
| |/ /           |__   __|           | |     / ____|
| ' / ___  ___ _ __ | |_ __ __ _  ___| | __ | (___  _ __   __ _  ___ ___
|  < / _ \\/ _ | '_ \\| | '__/ _\` |/ __| |/ /  \\___ \\| '_ \\ / _\` |/ __/ _ \\
| . |  __|  __| |_) | | | | (_| | (__|   < _ ____) | |_) | (_| | (_|  __/
|_|\\_\\___|\\___| .__/|_|_|  \\__,_|\\___|_|\\_(_|_____/| .__/ \\__,_|\\___\\___|
              | |                                  | |
              |_|                                  |_|
##################################################################################
Trying to figure out how the code works? Check out
https://github.com/thkruz/keeptrack.space/ or send me an email at
theodore.kruczek at gmail dot com.
        `);
  }

  registerAssets(): void {
    Doris.getInstance().on(CoreEngineEvents.BeforeInitialize, () => {
      this.init();
      loadLocalization();
    });

    Doris.getInstance().on(CoreEngineEvents.AssetLoadStart, (): Promise<void> => new Promise((resolve) => {
      Doris.getInstance().on(KeepTrackApiEvents.onCruncherReady, () => {
        resolve();
      });
    }));

    Doris.getInstance().on(CoreEngineEvents.AssetLoadStart,
      async () => {
        await KeepTrack.loadCss();


        if (!isThisNode()) {
          KeepTrack.printLogoToConsole_();
        }

        BottomMenu.init();

        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const orbitManagerInstance = keepTrackApi.getOrbitManager();
        const timeManagerInstance = keepTrackApi.getTimeManager();
        const renderer = keepTrackApi.getRenderer();
        const sceneInstance = keepTrackApi.getScene();
        const dotsManagerInstance = keepTrackApi.getDotsManager();
        const uiManagerInstance = keepTrackApi.getUiManager();
        const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
        const groupsManagerInstance = keepTrackApi.getGroupsManager();

        // Upodate the version number and date
        settingsManager.versionNumber = VERSION;

        // Error Trapping
        window.addEventListener('error', (e: ErrorEvent) => {
          if (!settingsManager.isGlobalErrorTrapOn) {
            return;
          }
          if (isThisNode()) {
            throw e.error;
          }
          errorManagerInstance.error(e.error, 'Global Error Trapper', e.message);
        });

        keepTrackApi.getMainCamera().init(settingsManager);

        Doris.getInstance().emit(CoreEngineEvents.AssetLoadProgress, 1, 5);
        mobileManager.init();

        // Load all the plugins now that we have the API initialized
        await import('./plugins/plugins')
          .then((mod) => mod.loadPlugins(settingsManager.plugins))
          .catch(() => {
            // intentionally left blank
          });

        Doris.getInstance().emit(CoreEngineEvents.AssetLoadProgress, 2, 5);
        // Start initializing the rest of the website
        timeManagerInstance.init();
        uiManagerInstance.onReady();

        /*
         * MobileManager.checkMobileMode();
         * We need to know if we are on a small screen before starting webgl
         */
        renderer.initializeWebGLContext(getEl('keeptrack-canvas') as HTMLCanvasElement);

        sceneInstance.init(renderer.gl);
        Doris.getInstance().emit(CoreEngineEvents.AssetLoadProgress, 3, 5);
        sceneInstance.loadScene();

        dotsManagerInstance.init(settingsManager);

        catalogManagerInstance.initObjects();

        Doris.getInstance().emit(CoreEngineEvents.AssetLoadProgress, 4, 5);
        catalogManagerInstance.init();
        colorSchemeManagerInstance.init();

        await CatalogLoader.load(); // Needs Object Manager and gl first

        lineManagerInstance.init();

        orbitManagerInstance.init(lineManagerInstance, renderer.gl);

        uiManagerInstance.init();

        dotsManagerInstance.initBuffers(colorSchemeManagerInstance.colorBuffer!);

        groupsManagerInstance.init();

        this.inputManager.init();
        this.demoManager.init();

        keepTrackApi.getHoverManager().init();

        Doris.getInstance().emit(CoreEngineEvents.AssetLoadProgress, 5, 5);
      });

    Doris.getInstance().once(WebGlEvents.AfterFirstInit, (gl: WebGL2RenderingContext) => {
      keepTrackApi.getScene().earth.reloadEarthHiResTextures(gl);
      keepTrackApi.getMeshManager().init(gl);
    });

    Doris.getInstance().on(CoreEngineEvents.AssetLoadProgress, (progress: number, total: number) => {
      switch (progress) {
        case 1:
          SplashScreen.loadStr(`${SplashScreen.msg.science} ${Math.floor((progress / total) * 100)}%`);
          break;
        case 2:
          SplashScreen.loadStr(SplashScreen.msg.science2);
          break;
        case 3:
          SplashScreen.loadStr(SplashScreen.msg.painting);
          break;
        case 4:
          SplashScreen.loadStr(SplashScreen.msg.elsets);
          break;
        case 5:
          SplashScreen.loadStr(SplashScreen.msg.models);
          break;
        default:
          break;
      }

      Doris.getInstance().pause(50);
    });

    Doris.getInstance().on(CanvasEvents.Resize, (width: number, height: number) => {
      const gl = Doris.getInstance().getRenderer().gl;

      if (!gl) {
        return;
      }

      gl.viewport(0, 0, width, height);
      keepTrackApi.getMainCamera().projectionMatrix = Camera.calculatePMatrix(gl);

      // Fix the gpu picker texture size if it has already been created
      const dotsManagerInstance = keepTrackApi.getDotsManager();

      if (dotsManagerInstance.isReady) {
        dotsManagerInstance.initProgramPicking();
      }

      // Fix flat geometry if it has already been created
      keepTrackApi.getScene().godrays?.init(gl, keepTrackApi.getScene().sun);
    });

    Doris.getInstance().on(WebGlEvents.FovChanged, () => {
      keepTrackApi.getMainCamera().projectionMatrix = Camera.calculatePMatrix(Doris.getInstance().getRenderer().gl);
      // Fix the gpu picker texture size if it has already been created
      const dotsManagerInstance = keepTrackApi.getDotsManager();

      if (dotsManagerInstance.isReady) {
        dotsManagerInstance.initProgramPicking();
      }

      // Fix flat geometry if it has already been created
      keepTrackApi.getScene().godrays?.reinitialize();

    });

    Doris.getInstance().on(CoreEngineEvents.Update, () => {
      this.orbitsAbove(); // this.sensorPos is set here for the Camera Manager
    });
    Doris.getInstance().on(CoreEngineEvents.AssetLoadComplete, this.postStart_.bind(this));
  }

  private hoverBoxOnSatMiniElements_: HTMLElement | null = null;
  private isSatMiniBoxInUse_ = false;
  private labelCount_ = 0;
  private satHoverMiniDOM_: HTMLDivElement;
  private satLabelModeLastTime_ = 0;
  sensorPos: { x: number; y: number; z: number; lat: number; lon: number; gmst: GreenwichMeanSiderealTime } | null = null;
  isDrawOrbitsAbove: boolean;

  /**
   * Calculates and displays the orbits and labels of satellites above the current camera view.
   * This method is only called when camera type is astronomy or planetarium,
   * or when watchlist satellites are in view.
   *
   * @remarks
   * - If the scene is not yet redrawn with a new camera, the method sets a flag to draw the orbits above once the scene is redrawn.
   * - If the satellite label mode is off or the camera type is not planetarium and there are no satellites in the watchlist in view,
   *   the method clears the satellite mini boxes and returns.
   * - If the current sensor's latitude is null, the method returns.
   * - If the minimum time between satellite labels has not elapsed since the last label update, the method returns.
   * - The method clears the in-view orbits and initializes a counter for the labels.
   * - The method retrieves the DOM element for the satellite mini boxes.
   * - If the camera type is planetarium, the method iterates over the orbital satellites in the catalog and adds their orbits and labels.
   * - If the camera type is not planetarium, the method iterates over the satellites in the watchlist and adds their labels.
   * - The method updates the flag indicating that the satellite mini boxes are in use and records the current time as the last label update time.
   * - If the camera type is not astronomy, planetarium, or there are no satellites in the watchlist in view, the method resets the sensor position and the flag to draw orbits
   *   above.
   * - If the satellite label mode is off or the camera type is not planetarium and there are no satellites in the watchlist in view,
   *   the method clears the satellite mini boxes and returns.
   */
  // eslint-disable-next-line max-statements
  orbitsAbove() {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const watchlistPluginInstance = keepTrackApi.getPlugin(WatchlistPlugin);

    if (
      keepTrackApi.getMainCamera().cameraType === CameraType.ASTRONOMY ||
      keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM ||
      watchlistPluginInstance?.hasAnyInView()
    ) {
      // Catch race condition where sensor has been reset but camera hasn't been updated
      try {
        this.sensorPos = sensorManagerInstance.calculateSensorPos(timeManagerInstance.simulationTimeObj, sensorManagerInstance.currentSensors);
      } catch (e) {
        errorManagerInstance.debug('Sensor not found, clearing orbits above!');
        this.sensorPos = null;
        keepTrackApi.getOrbitManager().clearInViewOrbit();

        return;
      }
      if (!this.isDrawOrbitsAbove) {
        /*
         * Don't do this until the scene is redrawn with a new camera or thousands of satellites will
         * appear to be in the field of view
         */
        this.isDrawOrbitsAbove = true;

        return;
      }
      // Previously called showOrbitsAbove();
      if (!settingsManager.isSatLabelModeOn || (keepTrackApi.getMainCamera().cameraType !== CameraType.PLANETARIUM && !watchlistPluginInstance?.hasAnyInView())) {
        if (this.isSatMiniBoxInUse_) {
          this.hoverBoxOnSatMiniElements_ = getEl('sat-minibox');

          if (this.hoverBoxOnSatMiniElements_) {
            this.hoverBoxOnSatMiniElements_.innerHTML = '';
          }
        }
        this.isSatMiniBoxInUse_ = false;

        return;
      }

      if (sensorManagerInstance?.currentSensors[0]?.lat === null) {
        return;
      }
      if (timeManagerInstance.realTime - this.satLabelModeLastTime_ < settingsManager.minTimeBetweenSatLabels) {
        return;
      }

      const orbitManagerInstance = keepTrackApi.getOrbitManager();

      orbitManagerInstance.clearInViewOrbit();

      let obj: BaseObject | null;

      this.labelCount_ = 0;

      this.hoverBoxOnSatMiniElements_ = getEl('sat-minibox');

      /**
       * @todo Reuse hoverBoxOnSatMini DOM Elements
       * @body Currently are writing and deleting the nodes every draw element. Reusuing them with a transition effect will make it smoother
       */
      this.hoverBoxOnSatMiniElements_!.innerHTML = '';
      if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();

        for (let i = 0; i < catalogManagerInstance.orbitalSats && this.labelCount_ < settingsManager.maxLabels; i++) {
          obj = catalogManagerInstance.getObject(i, GetSatType.POSITION_ONLY);

          if (!obj?.isSatellite()) {
            continue;
          }
          const sat = <DetailedSatellite>obj;
          const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

          if (colorSchemeManagerInstance.isPayloadOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isRocketBodyOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isDebrisOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isJscVimpelSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isNotionalSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isGeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isLeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isMeoSatOff(sat)) {
            continue;
          }
          if (colorSchemeManagerInstance.isHeoSatOff(sat)) {
            continue;
          }

          const satScreenPositionArray = this.mainCameraInstance.getScreenCoords(sat);

          if (satScreenPositionArray.error) {
            continue;
          }
          if (typeof satScreenPositionArray.x === 'undefined' || typeof satScreenPositionArray.y === 'undefined') {
            continue;
          }
          if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) {
            continue;
          }

          // Draw Orbits
          if (!settingsManager.isShowSatNameNotOrbit) {
            orbitManagerInstance.addInViewOrbit(i);
          }

          /*
           * Draw Sat Labels
           * if (!settingsManager.enableHoverOverlay) continue
           */
          this.satHoverMiniDOM_ = document.createElement('div');
          this.satHoverMiniDOM_.id = `sat-minibox-${i}`;
          if (sat.source === CatalogSource.VIMPEL) {
            this.satHoverMiniDOM_.textContent = `JSC${sat.altId}`;
          } else {
            this.satHoverMiniDOM_.textContent = sat.sccNum;
          }

          this.satHoverMiniDOM_.style.display = 'block';
          this.satHoverMiniDOM_.style.position = 'absolute';
          this.satHoverMiniDOM_.style.textShadow = '-2px -2px 5px #000, 2px -2px 5px #000, -2px 2px 5px #000, 2px 2px 5px #000';
          this.satHoverMiniDOM_.style.left = `${satScreenPositionArray.x + 20}px`;
          this.satHoverMiniDOM_.style.top = `${satScreenPositionArray.y}px`;

          this.hoverBoxOnSatMiniElements_!.appendChild(this.satHoverMiniDOM_);
          this.labelCount_++;
        }
      } else {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();
        const dotsManagerInstance = keepTrackApi.getDotsManager();

        if (!dotsManagerInstance.inViewData) {
          return;
        }

        watchlistPluginInstance?.watchlistList.forEach(({ id }) => {
          const obj = catalogManagerInstance.getObject(id, GetSatType.POSITION_ONLY) as DetailedSatellite;

          if (dotsManagerInstance.inViewData[id] === 0) {
            return;
          }
          const satScreenPositionArray = this.mainCameraInstance.getScreenCoords(obj);

          if (satScreenPositionArray.error) {
            return;
          }
          if (typeof satScreenPositionArray.x === 'undefined' || typeof satScreenPositionArray.y === 'undefined') {
            return;
          }
          if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) {
            return;
          }

          /*
           * Draw Sat Labels
           * if (!settingsManager.enableHoverOverlay) continue
           */
          this.satHoverMiniDOM_ = document.createElement('div');
          this.satHoverMiniDOM_.id = `sat-minibox-${id}`;
          if (obj.source === CatalogSource.VIMPEL) {
            this.satHoverMiniDOM_.textContent = `JSC${obj.altId}`;
          } else {
            this.satHoverMiniDOM_.textContent = obj.sccNum;
          }

          // Draw Orbits
          if (!settingsManager.isShowSatNameNotOrbit) {
            orbitManagerInstance.addInViewOrbit(id);
          }

          this.satHoverMiniDOM_.style.display = 'block';
          this.satHoverMiniDOM_.style.position = 'absolute';
          this.satHoverMiniDOM_.style.textShadow = '-2px -2px 5px #000, 2px -2px 5px #000, -2px 2px 5px #000, 2px 2px 5px #000';
          this.satHoverMiniDOM_.style.left = `${satScreenPositionArray.x + 20}px`;
          this.satHoverMiniDOM_.style.top = `${satScreenPositionArray.y}px`;

          this.hoverBoxOnSatMiniElements_!.appendChild(this.satHoverMiniDOM_);
          this.labelCount_++;
        });
      }
      this.isSatMiniBoxInUse_ = true;
      this.satLabelModeLastTime_ = timeManagerInstance.realTime;
    } else {
      this.sensorPos = null;
      this.isDrawOrbitsAbove = false;
    }

    // Hide satMiniBoxes When Not in Use
    if (!settingsManager.isSatLabelModeOn || (keepTrackApi.getMainCamera().cameraType !== CameraType.PLANETARIUM && !watchlistPluginInstance?.hasAnyInView())) {
      if (this.isSatMiniBoxInUse_) {
        const satMiniBox = getEl('sat-minibox');

        if (satMiniBox) {
          satMiniBox.innerHTML = '';
        }
      }
      this.isSatMiniBoxInUse_ = false;
    }
  }

  private postStart_() {
    // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
    UiManager.postStart();

    if (settingsManager.cruncherReady) {
      /*
       * Create Container Div
       * NOTE: This needs to be done before uiManagerFinal
       */
      if (settingsManager.plugins.debug) {
        const uiWrapperDom = getEl('ui-wrapper');

        if (uiWrapperDom) {
          uiWrapperDom.innerHTML += '<div id="eruda"></div>';
        }
      }

      // Update any CSS now that we know what is loaded
      Doris.getInstance().emit(KeepTrackApiEvents.AfterHtmlInitialize);

      if (settingsManager.plugins.debug) {
        const erudaDom = getEl('eruda');

        if (erudaDom) {
          eruda.init({
            autoScale: false,
            container: erudaDom,
            useShadowDom: false,
            tool: ['console', 'elements', 'network', 'resources', 'storage', 'sources', 'info', 'snippets'],
          });
          const console = eruda.get('console') as ErudaConsole;

          console.config.set('catchGlobalErr', false);

          const erudaContainerDom = getEl('eruda-console')?.parentElement?.parentElement;

          if (erudaContainerDom) {
            erudaContainerDom.style.top = 'calc(var(--top-menu-height) + 30px)';
            erudaContainerDom.style.height = '80%';
            erudaContainerDom.style.width = '60%';
            erudaContainerDom.style.left = '20%';
          }
        }
      }

      keepTrackApi.getUiManager().initMenuController();

      // Update MaterialUI with new menu options
      try {
        // Jest workaround
        // eslint-disable-next-line new-cap
        window.M.AutoInit();
      } catch {
        // intentionally left blank
      }

      keepTrackApi.isInitialized = true;
      Doris.getInstance().emit(KeepTrackApiEvents.onKeepTrackReady);
      if (settingsManager.onLoadCb) {
        settingsManager.onLoadCb();
      }
    } else {
      setTimeout(() => {
        this.postStart_();
      }, 100);
    }
  }

  // Make the api available
  api = keepTrackApi;
}

