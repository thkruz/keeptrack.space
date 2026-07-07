import { t7e, TranslationKey } from '@app/locales/keys';
import { getEl, hideEl, showEl } from '../../engine/utils/get-el';
import { MobileManager } from './mobileManager';

import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import logoPng from '@public/img/logo.png';
import { wallpapers } from '@wallpapers';

export abstract class SplashScreen {
  /** Wallpaper images provided by the active build profile via @wallpapers alias */
  private static splashScreenImgList_ = [...wallpapers];

  static readonly msg = {
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
    setTimeout(() => {
      this.splashScreenImgList_.forEach((img) => {
        const preloadImg = new Image();

        preloadImg.src = img;
      });
    }, 3 * 60 * 1000);
  }
}
