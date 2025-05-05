import { t7e, TranslationKey } from '@app/locales/keys';
import { keepTrackApi } from '../keepTrackApi';
import { getEl, hideEl, showEl } from '../lib/get-el';
import { MobileManager } from '../singletons/mobileManager';

export abstract class SplashScreen {
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
    rootDom.innerHTML += keepTrackApi.html`
      <div id="loading-screen" class="valign-wrapper full-loader">
        <div id="logo-inner-container" class="valign">
          <div style="display: flex;">
            <!-- <span id="logo-text" class="logo-font">KEEP TRACK</span> -->
            <img src="img/logo.png" alt="Keep Track" id="logo-text" class="logo-font">
            <!-- <span id="logo-text-version" class="logo-font">10</span> -->
          </div>
          <span id="loader-text">Downloading Science...</span>
        </div>
        <div id="loading-hint">Hint: ${this.showHint()}</div>
        <div id="version-text">v${keepTrackApi.version}</div>
        <div id="copyright-notice">
          This version of KeepTrack is provided under the GNU AGPL v3.0 license.<br/>
          © 2025 Kruczek Labs LLC. All rights reserved.<br/>
          This instance is operating without a commercial license or compensation.<br/>
          Attribution and source code disclosures are required under AGPL v3.<br/>
          See LICENSE for details.<br/>
        </div>
      </div>`;
  }

  static showHint(): string {
    const messageCount = Object.keys(t7e('splashScreens' as TranslationKey, { returnObjects: true })).length;
    const randomIndex = Math.floor(Math.random() * messageCount) + 1;

    return t7e(`splashScreens.${randomIndex}` as TranslationKey);
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
      hideEl('version-text');
      hideEl('copyright-notice');
    } else {
      // Loading Screen Resized and Hidden
      setTimeout(() => {
        const loadingScreenDom = getEl('loading-screen');

        if (loadingScreenDom) {
          loadingScreenDom.style.transition = 'opacity 0.25s';
          loadingScreenDom.style.opacity = '0';
          setTimeout(() => {
            loadingScreenDom.classList.remove('full-loader');
            loadingScreenDom.classList.add('mini-loader-container');
            getEl('logo-inner-container')?.classList.add('mini-loader');
            // We no longer need these elements
            hideEl('loading-screen');
            hideEl('version-text');
            hideEl('copyright-notice');
            hideEl('loading-hint');
            hideEl('logo-text');
            hideEl('logo-text-version');
          }, 250);
          SplashScreen.loadStr(SplashScreen.msg.math);
        }
      }, 1000);
    }
  }

  static loadStr(str: string) {
    const LoaderText = getEl(SplashScreen.textElId);

    if (!LoaderText) {
      return;
    } // If the element is not found, do nothing
    LoaderText.textContent = str;
  }
}
