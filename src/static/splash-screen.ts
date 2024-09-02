import i18next from 'i18next';
import { keepTrackApi } from '../keepTrackApi';
import { getEl, hideEl, showEl } from '../lib/get-el';
import { MobileManager } from '../singletons/mobileManager';

export abstract class SplashScreen {
  static readonly msg = {
    math: i18next.t('loadingScreenMsgs.math'),
    science: i18next.t('loadingScreenMsgs.science'),
    science2: i18next.t('loadingScreenMsgs.science2'),
    dots: i18next.t('loadingScreenMsgs.dots'),
    satIntel: i18next.t('loadingScreenMsgs.satIntel'),
    painting: i18next.t('loadingScreenMsgs.painting'),
    coloring: i18next.t('loadingScreenMsgs.coloring'),
    elsets: i18next.t('loadingScreenMsgs.elsets'),
    models: i18next.t('loadingScreenMsgs.models'),
  };

  static readonly textElId = 'loader-text';

  /**
   * Initializes the loading screen and appends it to the specified root DOM element.
   * @param rootDom The root DOM element to which the loading screen will be appended.
   */
  static initLoadingScreen(rootDom: HTMLElement) {
    rootDom.innerHTML += keepTrackApi.html`
      <div id="loading-screen" class="valign-wrapper full-loader">
        <div id="logo-inner-container" class="valign">
          <div style="display: flex;">
            <!-- <span id="logo-text" class="logo-font">KEEP TRACK</span> -->
            <img src="img/textLogoMd.png" alt="Keep Track" id="logo-text" class="logo-font">
            <!-- <span id="logo-text-version" class="logo-font">10</span> -->
          </div>
          <span id="loader-text">Downloading Science...</span>
        </div>
        <div id="loading-hint">Hint: ${this.showHint()}</div>
      </div>`;
  }

  static showHint(): string {
    const messageCount = Object.keys(i18next.t('splashScreens', { returnObjects: true })).length;
    const randomIndex = Math.floor(Math.random() * messageCount) + 1;

    return i18next.t(`splashScreens.${randomIndex}`);
  }

  static hideSplashScreen() {
    // Don't wait if we are running Jest
    if (keepTrackApi.getScene().earth.isUseHiRes && keepTrackApi.getScene().earth.isHiResReady !== true) {
      setTimeout(() => {
        SplashScreen.hideSplashScreen();
      }, 100);

      return;
    }

    // Display content when loading is complete.
    showEl('canvas-holder');

    MobileManager.checkMobileMode();

    if (settingsManager.isMobileModeEnabled) {
      SplashScreen.loadStr(SplashScreen.msg.math);
      hideEl('loading-screen');
    } else {
      // Loading Screen Resized and Hidden
      setTimeout(() => {
        getEl('loading-screen')?.classList.remove('full-loader');
        getEl('loading-screen')?.classList.add('mini-loader-container');
        getEl('logo-inner-container')?.classList.add('mini-loader');
        hideEl('loading-screen');
        SplashScreen.loadStr(SplashScreen.msg.math);
      }, 100);
    }

    // We no longer need these elements
    hideEl('loading-hint');
    hideEl('logo-text');
    hideEl('logo-text-version');
  }

  static loadStr(str: string) {
    const LoaderText = getEl(SplashScreen.textElId);

    if (!LoaderText) {
      return;
    } // If the element is not found, do nothing
    LoaderText.textContent = str;
  }
}
