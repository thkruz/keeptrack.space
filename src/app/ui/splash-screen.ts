import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { WORKER_CACHE_BUST_KEY } from '@app/engine/threads/web-worker-thread';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { TranslationKey, t7e } from '@app/locales/keys';
import logoPng from '@public/img/logo.png';
import { wallpapers } from '@wallpapers';
import { getEl, hideEl, showEl } from '../../engine/utils/get-el';
import { MobileManager } from './mobileManager';

export abstract class SplashScreen {
  /** Wallpaper images provided by the active build profile via @wallpapers alias */
  private static splashScreenImgList_ = [...wallpapers];

  /**
   * Lazy getter so `t7e()` is resolved on first access (after i18next has
   * initialized) instead of at class-parse time. A `static readonly` object
   * evaluated these before localization loaded, so `t7e()` returned - and then
   * permanently cached - empty strings, leaving the loading messages blank.
   */
  static get msg() {
    return {
      math: t7e('loadingScreenMsgs.math'),
      science: t7e('loadingScreenMsgs.science'),
      science2: t7e('loadingScreenMsgs.science2'),
      dots: t7e('loadingScreenMsgs.dots'),
      satIntel: t7e('loadingScreenMsgs.satIntel'),
      painting: t7e('loadingScreenMsgs.painting'),
      coloring: t7e('loadingScreenMsgs.coloring'),
      elsets: t7e('loadingScreenMsgs.elsets'),
      models: t7e('loadingScreenMsgs.models'),

      cunningPlan: t7e('loadingScreenMsgs.cunningPlan'),
    };
  }

  static readonly textElId = 'loader-text';

  /**
   * Initializes the loading screen and appends it to the specified root DOM element.
   * @param rootDom The root DOM element to which the loading screen will be appended.
   */
  static initLoadingScreen(rootDom: HTMLElement) {
    rootDom.innerHTML += html`
      <div id="loading-screen" class="valign-wrapper full-loader">
        <div id="logo-inner-container" class="valign">
          <div id="logo-edition-wrapper" style="position: relative;">
          <!-- <span id="logo-text" class="logo-font">KEEP TRACK</span> -->
          <img src="${logoPng}" alt="Keep Track" id="logo-text" class="logo-font">
          <!-- <span id="logo-text-version" class="logo-font">10</span> -->
          ${__EDITION__ === 'celestrak' ? '' : html`<span id="logo-edition">${t7e(`loadingScreen.edition.${__EDITION__}` as TranslationKey)}</span>`}
          </div>
          <div style="height: 50px; min-height: 50px; max-height: 50px; margin-top: 1rem; display: flex; align-items: center;">
            <span id="loader-text" style="width: 100%;">${t7e('loadingScreen.downloadingScience' as TranslationKey)}</span>
          </div>
          <div id="adsense-placeholder"
            style="width:970px;height:90px; margin:16px 0; display: none; position: absolute; bottom: 50px">
          </div>
          <div style="height:36px; min-height:36px; max-height:36px; position: relative;">
            <button
            id="start-app-btn"
            class="btn btn-large btn-ui waves-effect waves-light">
              ${t7e('loadingScreen.startButton')}
            </button>
          </div>
        </div>
        <div id="loading-hint">${t7e('loadingScreen.hint' as TranslationKey)} ${this.showHint()}</div>
        <div id="version-text">v${__VERSION__}-${__COMMIT_HASH__}</div>
        <div id="copyright-notice">
        ${settingsManager.isMobileModeEnabled ? t7e('copyright.noticeMobile') : t7e('copyright.notice')}
        </div>
      </div>`;

    if (!settingsManager.isShowLoadingHints) {
      hideEl('loading-hint');
    }

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      getEl('start-app-btn')?.addEventListener('click', () => {
        SplashScreen.handleStartAppButton();
      });
    });
  }

  static showHint(): string {
    const messageCount = Object.keys(t7e('splashScreens' as TranslationKey, { returnObjects: true })).length;
    const randomIndex = Math.floor(Math.random() * messageCount) + 1;

    return t7e(`splashScreens.${randomIndex}` as TranslationKey);
  }

  static hideSplashScreen() {
    MobileManager.checkMobileMode();

    if (settingsManager.isMobileModeEnabled) {
      SplashScreen.loadStr(SplashScreen.msg.math);
      hideEl('loading-screen');
      showEl('keeptrack-header');
      SplashScreen.hideLoadingScreenElements();
    }

    getEl('loader-text')!.innerText = '';

    if (!settingsManager.isAutoStart) {
      showEl('start-app-btn');
    } else {
      SplashScreen.handleStartAppButton();
    }
  }

  static hideLoadingScreenElements() {
    // Display content when loading is complete.
    showEl('canvas-holder');

    hideEl('logo-text');
    hideEl('logo-edition');
    hideEl('loading-hint');
    hideEl('logo-text-version');
    hideEl('copyright-notice');
    hideEl('version-text');
  }

  static handleStartAppButton() {
    SplashScreen.hideLoadingScreenElements();
    hideEl('start-app-btn');
    hideEl('adsense-placeholder');

    setTimeout(() => {
      hideEl('loading-screen');
      showEl('keeptrack-header');
      EventBus.getInstance().emit(EventBusEvent.splashScreenHidden);
    }, 100);
  }

  static loadStr(str: string) {
    const LoaderText = getEl(SplashScreen.textElId);

    if (!LoaderText) {
      return;
    } // If the element is not found, do nothing
    LoaderText.textContent = str;
  }

  /**
   * Boot failed even after the one-shot worker self-heal reload (see
   * KeepTrack.postStart_). Replace the dead-end "hard refresh" hint - which does
   * NOT refetch cached worker scripts - with a one-click recovery any user can
   * act on: bust the worker cache, drop cached assets + unregister the service
   * worker, then reload. `stalled` is the stalled-worker list (logged only, not
   * shown, to avoid jargon on the splash).
   */
  static showBootFailure(stalled: string) {
    errorManagerInstance.warn(`[KeepTrack] Boot recovery UI shown (stalled workers: ${stalled}).`);
    SplashScreen.loadStr(t7e('loadingScreen.loadFailed' as TranslationKey));

    const container = getEl('logo-inner-container');

    if (!container || getEl('kt-recovery-btn')) {
      return;
    }

    const wrapper = document.createElement('div');

    wrapper.style.cssText = 'margin-top: 12px; display: flex; justify-content: center;';
    wrapper.innerHTML = html`
      <button id="kt-recovery-btn" class="btn btn-large btn-ui waves-effect waves-light">${t7e('loadingScreen.resetAndReload' as TranslationKey)}</button>`;
    container.appendChild(wrapper);
    getEl('kt-recovery-btn')?.addEventListener('click', () => {
      SplashScreen.recoverAndReload_();
    });
  }

  /**
   * Persisted display/settings key prefixes cleared by the last-resort recovery.
   * A perfectly VALID saved value in one of these groups can wedge a worker on
   * boot - `drawOrbits:false` deferred the orbit cruncher and hung the old boot
   * gate, and a bad `colorScheme`/override could wedge the (essential) color
   * cruncher. `applyPersistedSetting`'s try/catch only guards against values that
   * THROW on deserialize, not valid-but-harmful ones, so a settings reset is the
   * real escape hatch here. User DATA (watchlists, favorites, scenarios, saved
   * searches, symbology, lists) is intentionally NOT matched, so recovery keeps
   * the user's content and drops only render/settings state.
   */
  private static readonly RECOVERY_CLEAR_PREFIXES_ = [
    'v2-keepTrack-settings-',
    'v2-filter-settings-',
    'v2-keepTrack-graphicsSettings-',
    'v2-keepTrack-colorScheme', // colorScheme + colorSchemeOverrides
  ];

  /**
   * One-click recovery for a wedged boot: bust the worker cache, reset persisted
   * display/settings state (see RECOVERY_CLEAR_PREFIXES_ - a valid saved setting
   * can wedge a worker), clear cached assets (Cache API), unregister the service
   * worker, then reload. Best-effort - every step is optional and the reload
   * always happens. User data (watchlists, favorites, scenarios) is preserved.
   */
  private static recoverAndReload_() {
    try {
      globalThis.sessionStorage?.setItem(WORKER_CACHE_BUST_KEY, String(Date.now()));
    } catch {
      // sessionStorage unavailable; clearing caches below still helps.
    }

    SplashScreen.resetDisplaySettings_();

    const reload = () => {
      try {
        globalThis.location.reload();
      } catch {
        // nothing else to do
      }
    };

    const jobs: Promise<unknown>[] = [];
    const cachesApi = globalThis.caches;

    if (cachesApi) {
      jobs.push(cachesApi.keys().then((keys) => Promise.all(keys.map((k) => cachesApi.delete(k)))));
    }

    const sw = globalThis.navigator?.serviceWorker;

    if (sw) {
      jobs.push(sw.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister()))));
    }

    Promise.all(jobs)
      .catch(() => undefined)
      .finally(reload);
  }

  /**
   * Remove persisted display/settings keys (see RECOVERY_CLEAR_PREFIXES_) from
   * localStorage so a valid-but-boot-wedging saved value (e.g. drawOrbits:false)
   * can't re-hang the reload. Best-effort; never throws. User data is preserved
   * because only the settings-family prefixes are matched.
   */
  private static resetDisplaySettings_(): void {
    try {
      const ls = globalThis.localStorage;

      if (!ls) {
        return;
      }

      const toRemove: string[] = [];

      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);

        if (key !== null && SplashScreen.RECOVERY_CLEAR_PREFIXES_.some((prefix) => key.startsWith(prefix))) {
          toRemove.push(key);
        }
      }

      for (const key of toRemove) {
        ls.removeItem(key);
      }
    } catch {
      // localStorage unavailable/locked-down; the cache clear + reload still helps.
    }
  }

  static loadImages() {
    const splashList = settingsManager.splashScreenList;

    // Runtime filtering (used by presets like STEM/darkClouds)
    if (splashList !== null) {
      const allowedNames = new Set(splashList);

      this.splashScreenImgList_ = wallpapers.filter((imgPath) => {
        const fileName = imgPath.split('/').pop()?.split('.')[0]?.toLowerCase();

        return fileName && allowedNames.has(fileName);
      });
    }

    // If no images remain, skip setting background
    if (this.splashScreenImgList_.length === 0) {
      return;
    }

    // Randomly load a splash screen - not a vulnerability
    const image = this.splashScreenImgList_[Math.floor(Math.random() * this.splashScreenImgList_.length)];
    const loadingDom = getEl('loading-screen');

    if (loadingDom) {
      loadingDom.style.backgroundImage = `url(${image})`;
      loadingDom.style.backgroundSize = 'cover';
      loadingDom.style.backgroundPosition = 'center';
      loadingDom.style.backgroundRepeat = 'no-repeat';
    }

    // Preload the rest of the images after 3 minutes
    setTimeout(
      () => {
        this.splashScreenImgList_.forEach((img) => {
          const preloadImg = new Image();

          preloadImg.src = img;
        });
      },
      3 * 60 * 1000
    );
  }
}
