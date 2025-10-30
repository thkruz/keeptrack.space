import { ServiceLocator } from './engine/core/service-locator';
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

import 'material-icons/iconfont/material-icons.css';
import 'requestidlecallback-polyfill';

import { Localization } from './locales/locales'; // Ensure localization is imported first

import { CatalogLoader } from './app/data/catalog-loader';
import { CatalogManager } from './app/data/catalog-manager';
import { GroupsManager } from './app/data/groups-manager';
import { SensorMath } from './app/sensors/sensor-math';
import { SensorManager } from './app/sensors/sensorManager';
import { BottomMenu } from './app/ui/bottom-menu';
import { CameraControlWidget } from './app/ui/camera-control-widget';
import { HoverManager } from './app/ui/hover-manager';
import { SplashScreen } from './app/ui/splash-screen';
import { UiManager } from './app/ui/ui-manager';
import { Container } from './engine/core/container';
import { Singletons } from './engine/core/interfaces';
import { Engine } from './engine/engine';
import { EventBus } from './engine/events/event-bus';
import { EventBusEvent } from './engine/events/event-bus-events';
import { ColorSchemeManager } from './engine/rendering/color-scheme-manager';
import { DotsManager } from './engine/rendering/dots-manager';
import { lineManagerInstance } from './engine/rendering/line-manager';
import { OrbitManager } from './engine/rendering/orbitManager';
import { DemoManager } from './engine/utils/demo-mode';
import { html } from './engine/utils/development/formatter';
import { getEl } from './engine/utils/get-el';
import { isThisNode } from './engine/utils/isThisNode';
import { keepTrackApi } from './keepTrackApi';
import { settingsManager, SettingsManagerOverride } from './settings/settings';
import { VERSION } from './settings/version.js';

export class KeepTrack {
  private static instance: KeepTrack;
  private settingsOverride_: SettingsManagerOverride;

  isReady = false;
  engine: Engine;
  api = keepTrackApi;

  private constructor() {
    // Singleton
  }

  static getInstance(): KeepTrack {
    if (!KeepTrack.instance) {
      KeepTrack.instance = new KeepTrack();
    }

    return KeepTrack.instance;
  }

  static reset(): void {
    KeepTrack.instance = new KeepTrack();
  }

  init(settingsOverride: SettingsManagerOverride = {
    isPreventDefaultHtml: false,
    isShowSplashScreen: true,
  }) {
    if (this.isReady) {
      throw new Error('KeepTrack is already started');
    }

    // Update the version number
    settingsManager.versionNumber = VERSION;
    this.settingsOverride_ = settingsOverride;
    Localization.getInstance(); // Initialize localization early
    this.engine = new Engine();

    settingsManager.init(this.settingsOverride_);

    KeepTrack.setContainerElement();

    if (!this.settingsOverride_.isPreventDefaultHtml) {
      import(/* webpackMode: "eager" */ '@css/loading-screen.css');
      KeepTrack.getDefaultBodyHtml();
      BottomMenu.init();

      if (!isThisNode() && settingsManager.isShowSplashScreen) {
        SplashScreen.loadImages();
      }
    }

    const orbitManagerInstance = new OrbitManager();
    const catalogManagerInstance = new CatalogManager();
    const groupManagerInstance = new GroupsManager();
    const sensorManagerInstance = new SensorManager();
    const dotsManagerInstance = new DotsManager();
    const uiManagerInstance = new UiManager();
    const colorSchemeManagerInstance = new ColorSchemeManager();
    const sensorMathInstance = new SensorMath();
    const hoverManagerInstance = new HoverManager();

    Container.getInstance().registerSingleton(Singletons.OrbitManager, orbitManagerInstance);
    Container.getInstance().registerSingleton(Singletons.CatalogManager, catalogManagerInstance);
    Container.getInstance().registerSingleton(Singletons.GroupsManager, groupManagerInstance);
    Container.getInstance().registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    Container.getInstance().registerSingleton(Singletons.DotsManager, dotsManagerInstance);
    Container.getInstance().registerSingleton(Singletons.UiManager, uiManagerInstance);
    Container.getInstance().registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
    Container.getInstance().registerSingleton(Singletons.SensorMath, sensorMathInstance);
    Container.getInstance().registerSingleton(Singletons.HoverManager, hoverManagerInstance);

    CameraControlWidget.getInstance().init();
    DemoManager.getInstance().init();
  }

  static getDefaultBodyHtml(): void {
    if (!keepTrackApi.containerRoot) {
      throw new Error('Container root is not set');
    }

    SplashScreen.initLoadingScreen(keepTrackApi.containerRoot);

    keepTrackApi.containerRoot.id = 'keeptrack-root';
    keepTrackApi.containerRoot.innerHTML += html`
      <header>
        <div id="keeptrack-header" class="start-hidden"></div>
      </header>
      <main>
        <div id="rmb-wrapper"></div>
        <div id="canvas-holder">
        <div id="logo-primary" class="start-hidden">
            <a href="https://keeptrack.space" target="_blank">
              <img src="${settingsManager.installDirectory}img/logo-primary.png" alt="KeepTrack">
            </a>
          </div>
          <div id="logo-secondary" class="start-hidden">
            <a href="https://celestrak.org" target="_blank">
              <img src="${settingsManager.installDirectory}img/logo-secondary.png" alt="Celestrak">
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

            <div id="layers-hover-menu" class="start-hidden"></div>
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
    } catch {
      // intentionally left blank
    }
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

  async run(): Promise<void> {
    try {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();
      const orbitManagerInstance = ServiceLocator.getOrbitManager();
      const renderer = ServiceLocator.getRenderer();
      const sceneInstance = ServiceLocator.getScene();
      const dotsManagerInstance = ServiceLocator.getDotsManager();
      const uiManagerInstance = ServiceLocator.getUiManager();
      const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
      const inputManagerInstance = ServiceLocator.getInputManager();

      this.engine.init();

      // ServiceLocator.getMainCamera().init(settingsManager);

      SplashScreen.loadStr(SplashScreen.msg.science);

      // Load all the plugins now that we have the API initialized
      await this.engine.pluginManager.loadPlugins(settingsManager.plugins);

      SplashScreen.loadStr(SplashScreen.msg.science2);
      /*
       * Start initializing the rest of the website
       * timeManagerInstance.init();
       */
      uiManagerInstance.onReady();

      SplashScreen.loadStr(SplashScreen.msg.dots);
      /*
       * MobileManager.checkMobileMode();
       * We need to know if we are on a small screen before starting webgl
       */
      await renderer.glInit();

      sceneInstance.init({ gl: renderer.gl });
      sceneInstance.loadScene();

      dotsManagerInstance.init(settingsManager);

      catalogManagerInstance.initObjects();

      catalogManagerInstance.init();
      colorSchemeManagerInstance.init(renderer);

      await CatalogLoader.load(); // Needs Object Manager and gl first

      lineManagerInstance.init();

      orbitManagerInstance.init(lineManagerInstance, renderer.gl);

      uiManagerInstance.init();

      dotsManagerInstance.initBuffers(colorSchemeManagerInstance.colorBuffer!);

      inputManagerInstance.init();

      await renderer.init(settingsManager);
      renderer.meshManager.init(renderer.gl);

      // Now that everything is loaded, start rendering to the canvas
      this.engine.run();

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
      if (settingsManager.isDisableCanvas) {
        const canvasHolderDom = getEl('keeptrack-canvas');

        if (canvasHolderDom) {
          canvasHolderDom.style.display = 'none';
        }
      }

      // Update any CSS now that we know what is loaded
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      ServiceLocator.getUiManager().initMenuController();

      // Update MaterialUI with new menu options
      try {
        // Jest workaround
        // eslint-disable-next-line new-cap
        window.M.AutoInit();
      } catch {
        // intentionally left blank
      }

      window.addEventListener('resize', () => {
        EventBus.getInstance().emit(EventBusEvent.resize);
      });
      EventBus.getInstance().emit(EventBusEvent.resize);

      keepTrackApi.isInitialized = true;
      EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);
      if (settingsManager.onLoadCb) {
        settingsManager.onLoadCb();
      }

      SplashScreen.hideSplashScreen();
    } else {
      setTimeout(() => {
        this.postStart_();
      }, 100);
    }
  }
}

