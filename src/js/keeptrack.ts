/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General License for more details.
 *
 * You should have received a copy of the GNU Affero General License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

/* eslint-disable no-unreachable */

import issJpg from '@app/img/wallpaper/iss.jpg';
import missionControlJpg from '@app/img/wallpaper/mission-control.jpg';
import rocketJpg from '@app/img/wallpaper/rocket.jpg';
import rocket2Jpg from '@app/img/wallpaper/rocket2.jpg';
import rocket3Jpg from '@app/img/wallpaper/rocket3.jpg';
import telescopeJpg from '@app/img/wallpaper/telescope.jpg';
import thuleJpg from '@app/img/wallpaper/thule.jpg';

import eruda from 'eruda';
import erudaFps from 'eruda-fps';
import { Milliseconds } from 'ootk';
import { keepTrackContainer } from './container';
import { CatalogManager, OrbitManager, SensorManager, Singletons, UiManager } from './interfaces';
import { isThisNode, keepTrackApi } from './keepTrackApi';
import { getEl } from './lib/get-el';
import { getUnique } from './lib/get-unique';
import { saveCsv, saveVariable } from './lib/saveVariable';
import { StandardSensorManager } from './plugins/sensor/sensorManager';
import { settingsManager } from './settings/settings';
import { VERSION } from './settings/version.js';
import { VERSION_DATE } from './settings/versionDate.js';
import { Camera } from './singletons/camera';
import { StandardCatalogManager } from './singletons/catalog-manager';
import { StandardColorSchemeManager } from './singletons/color-scheme-manager';
import { DemoManager } from './singletons/demo-mode';
import { DotsManager } from './singletons/dots-manager';
import { DrawManager, StandardDrawManager } from './singletons/draw-manager';
import { LineManager, lineManagerInstance } from './singletons/draw-manager/line-manager';
import { ErrorManager, errorManagerInstance } from './singletons/errorManager';
import { StandardGroupManager } from './singletons/groups-manager';
import { HoverManager } from './singletons/hover-manager';
import { InputManager } from './singletons/input-manager';
import { mobileManager } from './singletons/mobileManager';
import { StandardOrbitManager } from './singletons/orbitManager';
import { TimeManager } from './singletons/time-manager';
import { StandardUiManager } from './singletons/uiManager';
import { CatalogLoader } from './static/catalog-loader';
import { SatMath } from './static/sat-math';
import { SensorMath } from './static/sensor-math';
import { SplashScreen } from './static/splash-screen';

export class KeepTrack {
  /** An image is picked at random and then if the screen is bigger than 1080p then it loads the next one in the list */
  private static splashScreenImgList_ = [thuleJpg, rocketJpg, rocket2Jpg, telescopeJpg, missionControlJpg, issJpg, rocket3Jpg];

  private isShowFPS = false;
  public isReady = false;
  private isUpdateTimeThrottle_: boolean;
  private lastGameLoopTimestamp_ = <Milliseconds>0;
  public api = {
    SatMath: SatMath,
  };

  colorManager: StandardColorSchemeManager;
  demoManager: DemoManager;
  dotsManager: DotsManager;
  errorManager: ErrorManager;
  lineManager: LineManager;
  colorSchemeManager: StandardColorSchemeManager;
  orbitManager: OrbitManager;
  catalogManager: CatalogManager;
  timeManager: TimeManager;
  drawManager: DrawManager;
  sensorManager: SensorManager;
  uiManager: UiManager;
  inputManager: InputManager;
  mainCameraInstance: Camera;

  constructor(
    settingsOverride = {
      isPreventDefaultHtml: false,
      isShowSplashScreen: true,
    }
  ) {
    if (this.isReady) {
      throw new Error('KeepTrack is already started');
    }

    settingsManager.init(settingsOverride);
    if (!settingsOverride.isPreventDefaultHtml) {
      import(/* webpackMode: "eager" */ '@css/loading-screen.css');
      KeepTrack.getDefaultBodyHtml();

      if (!isThisNode() && settingsManager.isShowSplashScreen) KeepTrack.loadSplashScreen_();
    }

    const orbitManagerInstance = new StandardOrbitManager();
    keepTrackContainer.registerSingleton(Singletons.OrbitManager, orbitManagerInstance);
    const catalogManagerInstance = new StandardCatalogManager();
    keepTrackContainer.registerSingleton(Singletons.CatalogManager, catalogManagerInstance);
    const groupManagerInstance = new StandardGroupManager();
    keepTrackContainer.registerSingleton(Singletons.GroupsManager, groupManagerInstance);
    const timeManagerInstance = new TimeManager();
    keepTrackContainer.registerSingleton(Singletons.TimeManager, timeManagerInstance);
    const drawManagerInstance = new StandardDrawManager();
    keepTrackContainer.registerSingleton(Singletons.DrawManager, drawManagerInstance);
    const sensorManagerInstance = new StandardSensorManager();
    keepTrackContainer.registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    const dotsManagerInstance = new DotsManager();
    keepTrackContainer.registerSingleton(Singletons.DotsManager, dotsManagerInstance);
    const uiManagerInstance = new StandardUiManager();
    keepTrackContainer.registerSingleton(Singletons.UiManager, uiManagerInstance);
    const colorSchemeManagerInstance = new StandardColorSchemeManager();
    keepTrackContainer.registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
    const inputManagerInstance = new InputManager();
    keepTrackContainer.registerSingleton(Singletons.InputManager, inputManagerInstance);
    const sensorMathInstance = new SensorMath();
    keepTrackContainer.registerSingleton(Singletons.SensorMath, sensorMathInstance);
    const mainCameraInstance = new Camera();
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
    this.drawManager = drawManagerInstance;
    this.sensorManager = sensorManagerInstance;
    this.uiManager = uiManagerInstance;
    this.inputManager = inputManagerInstance;
    this.demoManager = new DemoManager();
  }

  /** Check if the FPS is above a certain threshold */
  static isFpsAboveLimit(dt: Milliseconds, minimumFps: number): boolean {
    return KeepTrack.getFps_(dt) > minimumFps;
  }

  gameLoop(timestamp?: Milliseconds): void {
    requestAnimationFrame(this.gameLoop.bind(this));
    const dt = <Milliseconds>(timestamp - this.lastGameLoopTimestamp_);
    this.lastGameLoopTimestamp_ = timestamp;

    if (settingsManager.cruncherReady) {
      this.update_(dt); // Do any per frame calculations
      this.draw_(dt);
      if (this.catalogManager.selectedSat !== -1) {
        keepTrackApi.getUiManager().updateSelectBox(this.timeManager.realTime, this.timeManager.lastBoxUpdateTime, this.catalogManager.getSat(this.catalogManager.selectedSat));
      }
    }
  }

  static getDefaultBodyHtml(): void {
    const bodyDOM = document.getElementsByTagName('body')[0];

    bodyDOM.innerHTML = keepTrackApi.html`
      <div id="loading-screen" class="valign-wrapper full-loader">
          <div id="logo-inner-container" class="valign">
            <div style="display: flex;">
              <span id="logo-text" class="logo-font">KEEP TRACK</span>
              <span id="logo-text-version" class="logo-font">8</span>
            </div>
            <span id="loader-text">Downloading Science...</span>
          </div>
        </div>
        <div id="keeptrack-main-container">
          <header>
            <div id="keeptrack-header"></div>
          </header>
          <main>
            <div id="rmb-wrapper"></div>

            <div id="canvas-holder">
              <canvas id="keeptrack-canvas"></canvas>
              <div id="ui-wrapper">
                <div id="sat-hoverbox">
                  <span id="sat-hoverbox1"></span>
                  <br />
                  <span id="sat-hoverbox2"></span>
                  <br />
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
              <div id="demo-logo" class="logo-font start-hidden">
                <a href="https://keeptrack.space" target="_blank" style="color: white !important;">
                Powered by KeepTrack.space
                </a>
              </div>
            </figcaption>
          </main>
          <footer id="nav-footer" class="page-footer resizable">
            <div id="footer-handle" class="ui-resizable-handle ui-resizable-n"></div>
            <div id="footer-toggle-wrapper">
              <div id="nav-footer-toggle">&#x25BC;</div>
            </div>
            <div id="bottom-icons-container">
              <div id="bottom-icons"></div>
            </div>
          </footer>
        </div>
      `;
  }

  private static getFps_(dt: Milliseconds): number {
    return 1000 / dt;
  }

  /* istanbul ignore next */
  public static async initCss(): Promise<void> {
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
        import(/* webpackMode: "eager" */ '@app/js/lib/external/colorPick.css').catch(() => {
          // This is intentional
        });
        import(/* webpackMode: "eager" */ '@css/jquery-ui.min.css').catch(() => {
          // This is intentional
        });
        import(/* webpackMode: "eager" */ '@css/jquery-ui-timepicker-addon.css').catch(() => {
          // This is intentional
        });
        import(/* webpackMode: "eager" */ '@css/style.css')
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive.css').catch(() => {
              // This is intentional
            })
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
    const loadingDom = document.getElementById('loading-screen');

    loadingDom.style.backgroundImage = `url(${image})`;
    loadingDom.style.backgroundSize = 'cover';
    loadingDom.style.backgroundPosition = 'center';
    loadingDom.style.backgroundRepeat = 'no-repeat';

    // Preload the rest of the images after 30 seconds
    setTimeout(() => {
      KeepTrack.splashScreenImgList_.forEach((img) => {
        const preloadImg = new Image();
        preloadImg.src = img;
      });
    }, 30000);
  }

  private static printLogoToConsole_() {
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
      console.error(error);
    } else {
      console.error(error);
    }
    // istanbul ignore next
    if (!isThisNode()) console.warn(error);
  }

  private draw_(dt?: Milliseconds) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const drawManagerInstance = keepTrackApi.getDrawManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
    const hoverManagerInstance = keepTrackApi.getHoverManager();

    keepTrackApi.getMainCamera().draw(drawManagerInstance.sat, drawManagerInstance.sensorPos);

    drawManagerInstance.draw(dotsManagerInstance);

    // Draw Dots
    dotsManagerInstance.draw(drawManagerInstance.pMvCamMatrix, drawManagerInstance.postProcessingManager.curBuffer);

    orbitManagerInstance.draw(
      drawManagerInstance.pMatrix,
      keepTrackApi.getMainCamera().camMatrix,
      drawManagerInstance.postProcessingManager.curBuffer,
      hoverManagerInstance,
      colorSchemeManagerInstance,
      keepTrackApi.getMainCamera()
    );

    // Draw a cone
    // this.sceneManager.cone.draw(this.pMatrix, mainCamera.camMatrix);

    lineManagerInstance.draw(drawManagerInstance, dotsManagerInstance.inViewData, keepTrackApi.getMainCamera().camMatrix, null);

    // Draw Satellite Model if a satellite is selected and meshManager is loaded
    if (catalogManagerInstance.selectedSat !== -1) {
      if (!settingsManager.modelsOnSatelliteViewOverride && keepTrackApi.getMainCamera().camDistBuffer <= keepTrackApi.getMainCamera().thresholdForCloseCamera) {
        drawManagerInstance.meshManager.draw(drawManagerInstance.pMatrix, keepTrackApi.getMainCamera().camMatrix, drawManagerInstance.postProcessingManager.curBuffer);
      }

      drawManagerInstance.sceneManager.searchBox.draw(drawManagerInstance.pMatrix, keepTrackApi.getMainCamera().camMatrix, drawManagerInstance.postProcessingManager.curBuffer);
    }

    if (KeepTrack.isFpsAboveLimit(dt, 5) && !settingsManager.lowPerf && !settingsManager.isDragging && !settingsManager.isDemoModeOn) {
      orbitManagerInstance.updateAllVisibleOrbits(uiManagerInstance);
      this.inputManager.update(dt);

      // Only update hover if we are not on mobile
      if (!settingsManager.isMobileModeEnabled) {
        hoverManagerInstance.setHoverId(this.inputManager.mouse.mouseSat, keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
      }
    }

    // If Demo Mode do stuff
    if (settingsManager.isDemoModeOn && sensorManagerInstance?.currentSensors[0]?.lat !== null) {
      this.demoManager.update();
    }

    keepTrackApi.methods.endOfDraw(dt);
  }

  public async init(): Promise<void> {
    try {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const orbitManagerInstance = keepTrackApi.getOrbitManager();
      const timeManagerInstance = keepTrackApi.getTimeManager();
      const drawManagerInstance = keepTrackApi.getDrawManager();
      const dotsManagerInstance = keepTrackApi.getDotsManager();
      const uiManagerInstance = keepTrackApi.getUiManager();
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

      // Upodate the version number and date
      settingsManager.versionNumber = VERSION;
      settingsManager.versionDate = VERSION_DATE;

      // Error Trapping
      window.addEventListener('error', (e: ErrorEvent) => {
        if (!settingsManager.isGlobalErrorTrapOn) return;
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
        .then((mod) => mod.loadCorePlugins(keepTrackApi, settingsManager.plugins))
        .catch(() => {
          // intentionally left blank
        });

      SplashScreen.loadStr(SplashScreen.msg.science2);
      // Start initializing the rest of the website
      timeManagerInstance.init();
      uiManagerInstance.onReady();

      SplashScreen.loadStr(SplashScreen.msg.dots);
      // MobileManager.checkMobileMode();
      // We need to know if we are on a small screen before starting webgl
      await drawManagerInstance.glInit();

      drawManagerInstance.loadScene();

      dotsManagerInstance.init(settingsManager);

      catalogManagerInstance.initObjects();

      await catalogManagerInstance.init();
      colorSchemeManagerInstance.init();

      await CatalogLoader.load(); // Needs Object Manager and gl first

      lineManagerInstance.init();

      orbitManagerInstance.init(lineManagerInstance, drawManagerInstance.gl);

      uiManagerInstance.init();

      dotsManagerInstance.initBuffers(colorSchemeManagerInstance.colorBuffer);

      catalogManagerInstance?.satLinkManager?.idToSatnum();

      this.inputManager.init();

      await drawManagerInstance.init(settingsManager);
      drawManagerInstance.meshManager.init(drawManagerInstance.gl, drawManagerInstance.sceneManager.earth.lightDirection);

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
    StandardUiManager.postStart();

    if (settingsManager.cruncherReady) {
      // Create Container Div
      // NOTE: This needs to be done before uiManagerFinal
      if (settingsManager.plugins.debug) {
        getEl('ui-wrapper').innerHTML += '<div id="eruda"></div>';
      }

      // Update any CSS now that we know what is loaded
      keepTrackApi.methods.uiManagerFinal();

      if (settingsManager.plugins.debug) {
        eruda.init({
          autoScale: false,
          container: getEl('eruda'),
          useShadowDom: false,
          tool: ['console', 'elements'],
        });
        eruda.add(erudaFps);

        // Hide Eruda
        try {
          (<HTMLDivElement>(<unknown>document.getElementsByClassName('eruda-entry-btn')[0])).style.display = 'none';
          (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.top = 'var(--top-menu-height)';
          (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.height = '80%';
          (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.width = '60%';
          (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.left = '20%';
        } catch {
          // Eruda might not be there
        }
      }

      if (settingsManager.onLoadCb) {
        settingsManager.onLoadCb();
      }

      keepTrackApi.getUiManager().initMenuController();

      // Update MaterialUI with new menu options
      try {
        // Jest workaround
        window.M.AutoInit();
      } catch {
        // intentionally left blank
      }

      keepTrackApi.isInitialized = true;
      keepTrackApi.methods.onKeepTrackReady();
    } else {
      setTimeout(() => {
        this.postStart_();
      }, 100);
    }
  }

  private update_(dt?: Milliseconds) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const drawManagerInstance = keepTrackApi.getDrawManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    drawManagerInstance.dt = dt;
    drawManagerInstance.dtAdjusted = <Milliseconds>(Math.min(drawManagerInstance.dt / 1000.0, 1.0 / Math.max(timeManagerInstance.propRate, 0.001)) * timeManagerInstance.propRate);

    // Display it if that settings is enabled
    if (this.isShowFPS) console.log(KeepTrack.getFps_(dt));

    // Update official time for everyone else
    if (!this.isUpdateTimeThrottle_) {
      this.isUpdateTimeThrottle_ = true;
      timeManagerInstance.setNow(<Milliseconds>Date.now());
      setTimeout(() => {
        this.isUpdateTimeThrottle_ = false;
      }, 500);
    }

    drawManagerInstance.updateLoop();

    // Update Colors
    // NOTE: We used to skip this when isDragging was true, but its so efficient that doesn't seem necessary anymore
    if (!settingsManager.isMobileModeEnabled) {
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme); // avoid recalculating ALL colors
    }

    // Update Draw Positions
    keepTrackApi.getDotsManager().updatePositionBuffer();
  }
}

/**
 * Add some methods to the window object so that we can call them from the console
 *
 * NOTE: Only applies to the browser
 */
declare global {
  interface Window {
    getUnique: typeof getUnique;
    saveCsv: typeof saveCsv;
    saveVariable: typeof saveVariable;
  }
}

if (!isThisNode()) {
  window.getUnique = getUnique;
  window.saveCsv = saveCsv;
  window.saveVariable = saveVariable;
  window.keepTrackApi = keepTrackApi;
}
