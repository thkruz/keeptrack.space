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
import './engine/ui/menu-v13.css'; // v13+ menu UI standard (opt-in via .kt-ui-v13)
import './engine/ui/theme-form-controls.css'; // global brand theming for native form controls
import 'requestidlecallback-polyfill';

import logoPrimaryPng from '@public/img/logo-primary.png';
import logoSecondaryPng from '@public/img/logo-secondary.png';

import { CatalogLoader } from './app/data/catalog-loader';
import { CatalogManager } from './app/data/catalog-manager';
import { GroupsManager } from './app/data/groups-manager';
import { OrbitManager } from './app/rendering/orbit-manager';
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
import { PersistenceManager } from './engine/persistence/persistence-manager';
import { ColorSchemeManager } from './engine/rendering/color-scheme-manager';
import { DotsManager } from './engine/rendering/dots-manager';
import { lineManagerInstance } from './engine/rendering/line-manager';
import { SatLabelManager } from './engine/rendering/sat-label-manager';
import { WebWorkerThreadManager, WORKER_CACHE_BUST_KEY } from './engine/threads/web-worker-thread';
import { initMaterialSelects } from './engine/ui/material-select';
import { DemoManager } from './engine/utils/demo-mode';
import { html } from './engine/utils/development/formatter';
import { errorManagerInstance } from './engine/utils/errorManager';
import { getEl } from './engine/utils/get-el';
import { isThisNode } from './engine/utils/isThisNode';
import { keepTrackApi } from './keepTrackApi';
import { Localization } from './locales/locales'; // Ensure localization is imported first
import { SettingsManagerOverride, settingsManager } from './settings/settings';

export class KeepTrack {
  private static instance: KeepTrack;
  private settingsOverride_: SettingsManagerOverride;

  isInitialized = false;
  engine: Engine;
  api = keepTrackApi;
  containerRoot: HTMLDivElement;
  isReady: boolean = false;
  threads: WebWorkerThreadManager[] = [];

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

  init(
    settingsOverride: SettingsManagerOverride = {
      isPreventDefaultHtml: false,
      isShowSplashScreen: true,
    }
  ) {
    if (this.isInitialized) {
      throw new Error('KeepTrack is already started');
    }

    this.settingsOverride_ = settingsOverride;
    Localization.getInstance(); // Initialize localization early
    this.engine = new Engine(this);

    settingsManager.init(this.settingsOverride_);

    /*
     * Route SGP4 propagation through the configured Astro Standards wasm
     * backend (no-op for the default 'sgp4'). Fire-and-forget: satKeys attach
     * lazily, so propagation upgrades seamlessly once the runtime is ready.
     */
    import('./engine/utils/sgp4-wasm-loader')
      .then(({ activateConfiguredPropagatorBackend }) => activateConfiguredPropagatorBackend())
      .catch(() => {
        // Failures are logged inside activateConfiguredPropagatorBackend
      });

    KeepTrack.setContainerElement();

    if (!this.settingsOverride_.isPreventDefaultHtml) {
      import(/* webpackMode: "eager" */ '@css/loading-screen.css');
      import(/* webpackMode: "eager" */ '@css/loading-overlay.css');
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
    const satLabelManagerInstance = new SatLabelManager();
    const uiManagerInstance = new UiManager();
    const colorSchemeManagerInstance = new ColorSchemeManager();
    const sensorMathInstance = new SensorMath();
    const hoverManagerInstance = new HoverManager();

    Container.getInstance().registerSingleton(Singletons.OrbitManager, orbitManagerInstance);
    Container.getInstance().registerSingleton(Singletons.CatalogManager, catalogManagerInstance);
    Container.getInstance().registerSingleton(Singletons.GroupsManager, groupManagerInstance);
    Container.getInstance().registerSingleton(Singletons.SensorManager, sensorManagerInstance);
    Container.getInstance().registerSingleton(Singletons.DotsManager, dotsManagerInstance);
    Container.getInstance().registerSingleton(Singletons.SatLabelManager, satLabelManagerInstance);
    Container.getInstance().registerSingleton(Singletons.UiManager, uiManagerInstance);
    Container.getInstance().registerSingleton(Singletons.ColorSchemeManager, colorSchemeManagerInstance);
    Container.getInstance().registerSingleton(Singletons.SensorMath, sensorMathInstance);
    Container.getInstance().registerSingleton(Singletons.HoverManager, hoverManagerInstance);

    CameraControlWidget.getInstance().init();
    DemoManager.getInstance().init();

    // Initialize enhanced persistence features (cross-tab sync, provider subscriptions).
    // The PersistenceManager already works synchronously from its constructor;
    // this adds the async enhancements without blocking boot.
    PersistenceManager.getInstance()
      .initialize()
      .catch((e) => {
        errorManagerInstance.warn(`Failed to initialize enhanced persistence: ${e.message}`);
      });
  }

  static getDefaultBodyHtml(): void {
    if (!KeepTrack.getInstance().containerRoot) {
      throw new Error('Container root is not set');
    }

    SplashScreen.initLoadingScreen(KeepTrack.getInstance().containerRoot);

    KeepTrack.getInstance().containerRoot.id = 'keeptrack-root';
    KeepTrack.getInstance().containerRoot.innerHTML += html`
      <header>
        <div id="keeptrack-header" class="start-hidden"></div>
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
    const containerDom = settingsManager.containerRoot ?? (document.getElementById('keeptrack-root') as HTMLDivElement);

    if (!containerDom) {
      throw new Error('Failed to find container');
    }

    // If no current shadow DOM, create one - this is mainly for testing
    if (!KeepTrack.getInstance().containerRoot) {
      KeepTrack.getInstance().containerRoot = containerDom;
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
        import(/* webpackMode: "eager" */ '@materializecss/materialize/dist/css/materialize.css').catch(() => {
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
            })
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-md.css').catch(() => {
              // This is intentional
            })
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-lg.css').catch(() => {
              // This is intentional
            })
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-xl.css').catch(() => {
              // This is intentional
            })
          )
          .catch(() => {
            // This is intentional
          })
          .then(
            await import(/* webpackMode: "eager" */ '@css/responsive-2xl.css').catch(() => {
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
      errorManagerInstance.warn(error.message);
    } else {
      errorManagerInstance.warn(error.message);
    }
    // istanbul ignore next
    if (!isThisNode()) {
      errorManagerInstance.warn(error.message);
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
      colorSchemeManagerInstance.init(renderer, this.threads);

      if (settingsManager.noCatalogOnLoad) {
        // Empty catalog — still adds stars, sensors, planets, etc.
        await CatalogLoader.parse({});
      } else {
        await CatalogLoader.load(); // Needs Object Manager and gl first
      }

      lineManagerInstance.init();

      orbitManagerInstance.init(lineManagerInstance, renderer.gl);

      uiManagerInstance.init();

      dotsManagerInstance.initBuffers(colorSchemeManagerInstance.colorBuffer!);

      ServiceLocator.getSatLabelManager()?.init(renderer.gl, settingsManager.maxLabels || settingsManager.desktopMaxLabels);

      inputManagerInstance.init();

      await renderer.init(settingsManager);
      renderer.meshManager.init(renderer.gl);

      // Now that everything is loaded, start rendering to the canvas
      this.engine.run();

      this.postStart_();
    } catch (error) {
      KeepTrack.showErrorCode(<Error & { lineNumber: number }>error);
    }
  }

  private static readonly POST_START_TIMEOUT_MS_ = 30_000;
  /**
   * Grace period, measured from the moment the ESSENTIAL workers become ready,
   * that OPTIONAL workers (e.g. the orbit-line cruncher) get to signal ready
   * before the boot watchdog drops them and boots degraded. Kept generous so a
   * merely-slow-but-healthy machine still gets its orbit lines, but far below the
   * 30s hard deadline so a genuinely wedged optional worker can't hang boot.
   */
  private static readonly OPTIONAL_WORKER_GRACE_MS_ = 12_000;
  private postStartElapsed_ = 0;
  /** postStartElapsed_ value at which the essential workers first became ready (-1 = not yet). */
  private essentialsReadyAtMs_ = -1;

  private postStart_() {
    // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
    UiManager.postStart();

    const essentialThreads = this.threads.filter((t) => t.isEssential);
    const optionalThreads = this.threads.filter((t) => !t.isEssential);
    const essentialsReady = essentialThreads.every((t) => t.isReady);
    // A disabled optional worker counts as "resolved": the watchdog gave up on it,
    // so it no longer holds up boot.
    const optionalsResolved = optionalThreads.every((t) => t.isReady || t.isDisabled);

    if (essentialsReady && optionalsResolved) {
      if (settingsManager.isDisableCanvas) {
        const canvasHolderDom = getEl('keeptrack-canvas');

        if (canvasHolderDom) {
          canvasHolderDom.style.display = 'none';
        }
      }

      // Update any CSS now that we know what is loaded
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      ServiceLocator.getUiManager().initMenuController();

      // Style every plugin menu's <select> (Tabs/Dropdown are initialized per-plugin)
      try {
        initMaterialSelects();
      } catch {
        // intentionally left blank
      }

      window.addEventListener('resize', () => {
        EventBus.getInstance().emit(EventBusEvent.resize);
      });
      EventBus.getInstance().emit(EventBusEvent.resize);

      this.isInitialized = true;

      EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);

      // Register runtime internet connectivity detection
      window.addEventListener('online', () => {
        EventBus.getInstance().emit(EventBusEvent.connectivityChange, true);
      });
      window.addEventListener('offline', () => {
        EventBus.getInstance().emit(EventBusEvent.connectivityChange, false);
      });

      if (settingsManager.onLoadCb) {
        settingsManager.onLoadCb();
      }

      this.isReady = true;
      // Boot succeeded: clear the self-heal marker so a genuine future failure in
      // this session still gets its one reload attempt. (The cache-bust token is
      // left in place so reloads keep using the fresh worker URL.)
      KeepTrack.clearWorkerSelfHealFlag_();
      SplashScreen.hideSplashScreen();
    } else {
      this.postStartElapsed_ += 100;

      // Note when the essential workers first became ready, so optional workers get
      // their grace window measured from that moment (not from boot start).
      if (essentialsReady && this.essentialsReadyAtMs_ < 0) {
        this.essentialsReadyAtMs_ = this.postStartElapsed_;
      }

      // Optional-worker safety net: essentials are up but one or more OPTIONAL
      // workers never signalled ready within the grace window. Drop them and boot
      // DEGRADED rather than hanging forever - the app is fully usable without
      // orbit lines. This is the self-heal for an environment where an optional
      // worker won't start (a wedged worker fetch, a browser extension hooking
      // Worker, a stale cache the reload couldn't clear); no browser-clearing
      // required. Disabling them makes optionalsResolved true, so the next tick
      // takes the normal-boot branch above.
      if (essentialsReady && this.postStartElapsed_ - this.essentialsReadyAtMs_ >= KeepTrack.OPTIONAL_WORKER_GRACE_MS_) {
        const stalled = optionalThreads.filter((t) => !t.isReady && !t.isDisabled);

        if (stalled.length > 0) {
          for (const t of stalled) {
            t.disableDueToStall();
          }
          errorManagerInstance.warn(
            `[KeepTrack] Optional worker(s) failed to start within ${KeepTrack.OPTIONAL_WORKER_GRACE_MS_ / 1000}s; booting without them: ${stalled
              .map((t) => t.WEB_WORKER_CODE)
              .join(', ')}. The affected features (e.g. orbit lines) are disabled for this session.`
          );
          KeepTrack.reportWorkerBootFailure_('degraded', stalled, this.postStartElapsed_);
        }

        setTimeout(() => {
          this.postStart_();
        }, 100);

        return;
      }

      // Essential workers themselves are stalled past the hard deadline. There is
      // no degraded mode for these (no dots without the position cruncher), so the
      // usual stale/broken cached-worker cause gets one cache-bust reload, then a
      // one-click boot-failure screen.
      if (!essentialsReady && this.postStartElapsed_ >= KeepTrack.POST_START_TIMEOUT_MS_) {
        const stalled = essentialThreads.filter((t) => !t.isReady);
        const notReady = stalled.map((t) => t.WEB_WORKER_CODE);

        errorManagerInstance.warn(
          `[KeepTrack] Essential web workers failed to initialize after ${KeepTrack.POST_START_TIMEOUT_MS_ / 1000}s. Stalled workers: ${notReady.join(', ')}.`
        );

        // Peek (without mutating the guard flag) whether a self-heal reload is still
        // available, so the reported telemetry outcome matches what happens next.
        KeepTrack.reportWorkerBootFailure_(KeepTrack.isWorkerSelfHealAvailable_() ? 'self-heal-reload' : 'boot-failure', stalled, this.postStartElapsed_);

        // First failure this session: the usual cause is a stale/broken cached
        // worker script (they load by a stable URL). Self-heal by reloading ONCE
        // with a cache-bust token so the worker URLs refetch fresh. sessionStorage-
        // guarded, so it can never loop.
        if (KeepTrack.tryWorkerSelfHeal_()) {
          return;
        }

        // Self-heal already ran and it still failed: give the user a one-click fix
        // instead of a dead-end "hard refresh" hint (which does not refetch workers).
        SplashScreen.showBootFailure(notReady.join(', '));

        return;
      }

      setTimeout(() => {
        this.postStart_();
      }, 100);
    }
  }

  /** sessionStorage flag marking that this session already tried a self-heal reload. */
  private static readonly WORKER_SELF_HEAL_FLAG_ = 'kt-worker-self-heal-tried';

  /**
   * Report a boot-time worker failure to telemetry. The pro Telemetry plugin's
   * EventBusEvent.error handler enriches this with system/WebGL/plugin context and
   * POSTs it (keepalive, so it survives the self-heal reload) to the telemetry
   * endpoint; OSS builds simply have no listener. Routed through reportEvent with
   * the user-facing effects suppressed (no toast, no auto-filed GitHub issue) - the
   * failure is already surfaced by the degraded boot or the recovery splash, and we
   * only want the diagnostic signal. `outcome` distinguishes a degraded boot
   * (optional worker dropped, app still usable) from an essential-worker self-heal
   * reload or a hard boot failure.
   */
  private static reportWorkerBootFailure_(outcome: 'degraded' | 'self-heal-reload' | 'boot-failure', stalled: WebWorkerThreadManager[], elapsedMs: number): void {
    const detail = {
      outcome,
      elapsedMs,
      workers: stalled.map((t) => ({ code: t.WEB_WORKER_CODE, essential: t.isEssential })),
    };
    const err = new Error(`Worker boot failure [${outcome}]: ${JSON.stringify(detail)}`);

    err.name = 'WorkerBootFailure';

    errorManagerInstance.reportEvent({
      error: err,
      funcName: 'KeepTrack.postStart_',
      opts: { skipToast: true, skipAutoFile: true },
    });
  }

  /**
   * Whether a one-shot self-heal reload is still available this session (the guard
   * flag is unset). Read-only peek used to label telemetry before tryWorkerSelfHeal_
   * mutates the flag; mirrors that method's guard.
   */
  private static isWorkerSelfHealAvailable_(): boolean {
    try {
      const storage = globalThis.sessionStorage;

      if (!storage) {
        return false;
      }

      return !storage.getItem(KeepTrack.WORKER_SELF_HEAL_FLAG_);
    } catch {
      return false;
    }
  }

  /**
   * One-shot boot self-heal: reload the page with a busted worker cache so a
   * stale/broken cached worker script is refetched fresh. Returns true if a
   * reload was triggered (caller must stop). Guarded by sessionStorage so it runs
   * at most once per tab session and can never loop.
   */
  private static tryWorkerSelfHeal_(): boolean {
    try {
      const storage = globalThis.sessionStorage;

      if (!storage || storage.getItem(KeepTrack.WORKER_SELF_HEAL_FLAG_)) {
        return false;
      }
      storage.setItem(KeepTrack.WORKER_SELF_HEAL_FLAG_, '1');
      storage.setItem(WORKER_CACHE_BUST_KEY, String(Date.now()));
      errorManagerInstance.info('[KeepTrack] Workers stalled; reloading once with a fresh worker cache to self-heal.');
      globalThis.location.reload();

      return true;
    } catch {
      return false;
    }
  }

  private static clearWorkerSelfHealFlag_(): void {
    try {
      globalThis.sessionStorage?.removeItem(KeepTrack.WORKER_SELF_HEAL_FLAG_);
    } catch {
      // sessionStorage unavailable; nothing to clear.
    }
  }
}
