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

/* eslint-disable no-unreachable */

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
import { Milliseconds } from 'ootk';
import { keepTrackContainer } from './container';
import { KeepTrackApiEvents, Singletons } from './interfaces';
import { keepTrackApi } from './keepTrackApi';
import { getEl } from './lib/get-el';
import { SelectSatManager } from './plugins/select-sat-manager/select-sat-manager';
import { SensorManager } from './plugins/sensor/sensorManager';
import { settingsManager, SettingsManagerOverride } from './settings/settings';
import { VERSION } from './settings/version.js';
import { Camera } from './singletons/camera';
import { CameraControlWidget } from './singletons/camera-control-widget';
import { CatalogManager } from './singletons/catalog-manager';
import { ColorSchemeManager } from './singletons/color-scheme-manager';
import { DemoManager } from './singletons/demo-mode';
import { DotsManager } from './singletons/dots-manager';
import { LineManager, lineManagerInstance } from './singletons/draw-manager/line-manager';
import { ErrorManager, errorManagerInstance } from './singletons/errorManager';
import { GroupsManager } from './singletons/groups-manager';
import { HoverManager } from './singletons/hover-manager';
import { InputManager } from './singletons/input-manager';
import { mobileManager } from './singletons/mobileManager';
import { OrbitManager } from './singletons/orbitManager';
import { Scene } from './singletons/scene';
import { TimeManager } from './singletons/time-manager';
import { UiManager } from './singletons/uiManager';
import { WebGLRenderer } from './singletons/webgl-renderer';
import { BottomMenu } from './static/bottom-menu';
import { CatalogLoader } from './static/catalog-loader';
import { isThisNode } from './static/isThisNode';
import { SensorMath } from './static/sensor-math';
import { SplashScreen } from './static/splash-screen';

export class KeepTrack {
  /** An image is picked at random and then if the screen is bigger than 1080p then it loads the next one in the list */
  private static readonly splashScreenImgList_ =
    [observatoryJpg, thuleJpg, rocketJpg, rocket2Jpg, telescopeJpg, issJpg, rocket3Jpg, rocket4Jpg, cubesatJpg, satJpg, sat2Jpg, earthJpg];

  private readonly isShowFPS = false;
  isReady = false;
  private isUpdateTimeThrottle_: boolean;
  private lastGameLoopTimestamp_ = <Milliseconds>0;
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
  renderer: WebGLRenderer;
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
    if (this.isReady) {
      throw new Error('KeepTrack is already started');
    }

    this.settingsOverride_ = settingsOverride;
  }

  init() {
    settingsManager.init(this.settingsOverride_);

    KeepTrack.setContainerElement();

    if (!this.settingsOverride_.isPreventDefaultHtml) {
      import(/* webpackMode: "eager" */ '@css/loading-screen.css');
      KeepTrack.getDefaultBodyHtml();
      BottomMenu.init();

      keepTrackApi.register({
        event: KeepTrackApiEvents.uiManagerFinal,
        cbName: 'addBottomMenuFilterButtons',
        cb: () => BottomMenu.addBottomMenuFilterButtons(),
      });

      if (!isThisNode() && settingsManager.isShowSplashScreen) {
        KeepTrack.loadSplashScreen_();
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
    const rendererInstance = new WebGLRenderer();

    keepTrackContainer.registerSingleton(Singletons.WebGLRenderer, rendererInstance);
    keepTrackContainer.registerSingleton(Singletons.MeshManager, rendererInstance.meshManager);
    const sceneInstance = new Scene({
      gl: keepTrackApi.getRenderer().gl,
    });

    keepTrackContainer.registerSingleton(Singletons.Scene, sceneInstance);
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

    this.mainCameraInstance = mainCameraInstance;
    this.errorManager = errorManagerInstance;
    this.dotsManager = dotsManagerInstance;
    this.lineManager = lineManagerInstance;
    this.colorSchemeManager = colorSchemeManagerInstance;
    this.orbitManager = orbitManagerInstance;
    this.catalogManager = catalogManagerInstance;
    this.timeManager = timeManagerInstance;
    this.renderer = rendererInstance;
    this.sensorManager = sensorManagerInstance;
    this.uiManager = uiManagerInstance;
    this.inputManager = inputManagerInstance;
    this.demoManager = new DemoManager();
  }

  /** Check if the FPS is above a certain threshold */
  static isFpsAboveLimit(dt: Milliseconds, minimumFps: number): boolean {
    return KeepTrack.getFps_(dt) > minimumFps;
  }

  gameLoop(timestamp = <Milliseconds>0): void {
    requestAnimationFrame(this.gameLoop.bind(this));
    const dt = <Milliseconds>(timestamp - this.lastGameLoopTimestamp_);

    this.lastGameLoopTimestamp_ = timestamp;

    if (settingsManager.cruncherReady) {
      this.update_(dt); // Do any per frame calculations
      this.draw_(dt);

      if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1) {
        const selectedSatellite = keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj;

        if (selectedSatellite) {
          keepTrackApi.getUiManager().
            updateSelectBox(this.timeManager.realTime, this.timeManager.lastBoxUpdateTime, selectedSatellite);
        }
      }
    }
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

  private static setContainerElement() {
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

  private static getFps_(dt: Milliseconds): number {
    return 1000 / dt;
  }

  /* istanbul ignore next */
  static async initCss(): Promise<void> {
    try {
      if (!isThisNode()) {
        KeepTrack.printLogoToConsole_();
      }

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

  private static showErrorCode(error: Error & { lineNumber: number }): void {
    // TODO: Replace console calls with ErrorManagerInstance

    let errorHtml = '';

    errorHtml += error?.message ? `${error.message}<br>` : '';
    errorHtml += error?.lineNumber ? `Line: ${error.lineNumber}<br>` : '';
    errorHtml += error?.stack ? `${error.stack}<br>` : '';
    const LoaderText = getEl('loader-text');

    if (LoaderText) {
      LoaderText.innerHTML = errorHtml;
      // eslint-disable-next-line no-console
      console.error(error);
    } else {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    // istanbul ignore next
    if (!isThisNode()) {
      // eslint-disable-next-line no-console
      console.warn(error);
    }
  }

  private draw_(dt = <Milliseconds>0) {
    const renderer = keepTrackApi.getRenderer();
    const camera = keepTrackApi.getMainCamera();

    camera.draw(keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj, renderer.sensorPos);
    renderer.render(keepTrackApi.getScene(), keepTrackApi.getMainCamera());

    if (KeepTrack.isFpsAboveLimit(dt, 5) && !settingsManager.lowPerf && !settingsManager.isDragging && !settingsManager.isDemoModeOn) {
      keepTrackApi.getOrbitManager().updateAllVisibleOrbits();
      this.inputManager.update(dt);

      // Only update hover if we are not on mobile
      if (!settingsManager.isMobileModeEnabled) {
        keepTrackApi.getHoverManager().setHoverId(this.inputManager.mouse.mouseSat, keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
      }
    }

    // If Demo Mode do stuff
    if (settingsManager.isDemoModeOn && keepTrackApi.getSensorManager()?.currentSensors[0]?.lat !== null) {
      this.demoManager.update();
    }

    keepTrackApi.runEvent(KeepTrackApiEvents.endOfDraw, dt);
  }

  async run(): Promise<void> {
    try {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      const timeManagerInstance = keepTrackApi.getTimeManager();
      const renderer = keepTrackApi.getRenderer();
      const sceneInstance = keepTrackApi.getScene();
      const dotsManagerInstance = keepTrackApi.getDotsManager();
      const uiManagerInstance = keepTrackApi.getUiManager();
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

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

      SplashScreen.loadStr(SplashScreen.msg.science);
      mobileManager.init();

      // Load all the plugins now that we have the API initialized
      await import('./plugins/plugins')
        .then((mod) => mod.loadPlugins(keepTrackApi, settingsManager.plugins))
        .catch(() => {
          // intentionally left blank
        });

      SplashScreen.loadStr(SplashScreen.msg.science2);
      // Start initializing the rest of the website
      timeManagerInstance.init();
      uiManagerInstance.onReady();

      SplashScreen.loadStr(SplashScreen.msg.dots);
      /*
       * MobileManager.checkMobileMode();
       * We need to know if we are on a small screen before starting webgl
       */
      await renderer.glInit();

      sceneInstance.init(renderer.gl);
      sceneInstance.loadScene();

      dotsManagerInstance.init(settingsManager);

      catalogManagerInstance.initObjects();

      catalogManagerInstance.init();
      colorSchemeManagerInstance.init();

      await CatalogLoader.load(); // Needs Object Manager and gl first

      lineManagerInstance.init();

      orbitManagerInstance.init(lineManagerInstance, renderer.gl);

      uiManagerInstance.init();

      dotsManagerInstance.initBuffers(colorSchemeManagerInstance.colorBuffer!);

      this.inputManager.init();

      await renderer.init(settingsManager);
      renderer.meshManager.init(renderer.gl);

      // Now that everything is loaded, start rendering to thg canvas
      this.gameLoop();

      this.postStart_();
      this.isReady = true;
    } catch (error) {
      KeepTrack.showErrorCode(<Error & { lineNumber: number }>error);
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
      keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerFinal);

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

      window.addEventListener('resize', () => {
        keepTrackApi.runEvent(KeepTrackApiEvents.resize);
      });
      keepTrackApi.runEvent(KeepTrackApiEvents.resize);

      keepTrackApi.isInitialized = true;
      keepTrackApi.runEvent(KeepTrackApiEvents.onKeepTrackReady);
      if (settingsManager.onLoadCb) {
        settingsManager.onLoadCb();
      }
    } else {
      setTimeout(() => {
        this.postStart_();
      }, 100);
    }
  }

  private update_(dt = <Milliseconds>0) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const renderer = keepTrackApi.getRenderer();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    renderer.dt = dt;
    renderer.dtAdjusted = <Milliseconds>(Math.min(renderer.dt / 1000.0, 1.0 / Math.max(timeManagerInstance.propRate, 0.001)) * timeManagerInstance.propRate);

    // Display it if that settings is enabled
    if (this.isShowFPS) {
      // eslint-disable-next-line no-console
      console.log(KeepTrack.getFps_(renderer.dt));
    }

    // Update official time for everyone else
    timeManagerInstance.setNow(<Milliseconds>Date.now());
    if (!this.isUpdateTimeThrottle_) {
      this.isUpdateTimeThrottle_ = true;
      timeManagerInstance.setSelectedDate(timeManagerInstance.simulationTimeObj);
      setTimeout(() => {
        this.isUpdateTimeThrottle_ = false;
      }, 500);
    }

    // Update Draw Positions
    keepTrackApi.getDotsManager().updatePositionBuffer();

    renderer.update();

    /*
     * Update Colors
     * NOTE: We used to skip this when isDragging was true, but its so efficient that doesn't seem necessary anymore
     */
    colorSchemeManagerInstance.calculateColorBuffers(false); // avoid recalculating ALL colors
  }

  // Make the api available
  api = keepTrackApi;
}

