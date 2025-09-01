import { t7e, TranslationKey } from '@app/locales/keys';
import { getEl, hideEl, showEl } from '../../engine/utils/get-el';
import { keepTrackApi } from '../../keepTrackApi';
import { MobileManager } from './mobileManager';

import { EventBusEvent } from '@app/engine/core/interfaces';
import blueMarbleJpg from '@public/img/wallpaper/blue-marble.jpg';
import cubesatJpg from '@public/img/wallpaper/cubesat.jpg';
import earthJpg from '@public/img/wallpaper/Earth.jpg';
import epfl1Jpg from '@public/img/wallpaper/epfl-1.jpg';
import epfl2Jpg from '@public/img/wallpaper/epfl-2.jpg';
import issJpg from '@public/img/wallpaper/iss.jpg';
import moonJpg from '@public/img/wallpaper/moon.jpg';
import observatoryJpg from '@public/img/wallpaper/observatory.jpg';
import opsJpg from '@public/img/wallpaper/ops.jpg';
import ops2Jpg from '@public/img/wallpaper/ops2.jpg';
import ops3Jpg from '@public/img/wallpaper/ops3.jpg';
import rocketJpg from '@public/img/wallpaper/rocket.jpg';
import rocket2Jpg from '@public/img/wallpaper/rocket2.jpg';
import rocket3Jpg from '@public/img/wallpaper/rocket3.jpg';
import rocket4Jpg from '@public/img/wallpaper/rocket4.jpg';
import satJpg from '@public/img/wallpaper/sat.jpg';
import sat2Jpg from '@public/img/wallpaper/sat2.jpg';
import telescopeJpg from '@public/img/wallpaper/telescope.jpg';
import thuleJpg from '@public/img/wallpaper/thule.jpg';

export abstract class SplashScreen {
  /** An image is picked at random and then if the screen is bigger than 1080p then it loads the next one in the list */
  private static splashScreenImgList_ =
    [
      blueMarbleJpg, moonJpg, observatoryJpg, thuleJpg, rocketJpg, rocket2Jpg, telescopeJpg, issJpg, rocket3Jpg, rocket4Jpg, cubesatJpg, satJpg, sat2Jpg, earthJpg,
      epfl1Jpg, epfl2Jpg, opsJpg, ops2Jpg, ops3Jpg,
    ];

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
          <div style="height: 50px; min-height: 50px; max-height: 50px; overflow: hidden; display: flex; align-items: center;">
            <span id="loader-text" style="width: 100%;">Downloading Science...</span>
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
        <div id="loading-hint">Hint: ${this.showHint()}</div>
        <div id="version-text">v${settingsManager.versionNumber}</div>
        <div id="copyright-notice">
        ${settingsManager.isMobileModeEnabled ? t7e('copyright.noticeMobile') : t7e('copyright.notice')}
        </div>
      </div>`;

    if (!settingsManager.isShowLoadingHints) {
      hideEl('loading-hint');
    }

    keepTrackApi.on(EventBusEvent.uiManagerFinal, () => {
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
    // Don't wait if we are running Jest
    if (keepTrackApi.getScene().earth.isUseHiRes && keepTrackApi.getScene().earth.isHiResReady !== true) {
      setTimeout(() => {
        SplashScreen.hideSplashScreen();
      }, 100);

      return;
    }

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
    hideEl('loading-hint');
    hideEl('logo-text-version');
    hideEl('copyright-notice');
    hideEl('version-text');
  }

  static handleStartAppButton() {
    SplashScreen.hideLoadingScreenElements();
    hideEl('start-app-btn');
    hideEl('adsense-placeholder');

    // Loading Screen Resized and Hidden
    setTimeout(() => {
      getEl('loading-screen')?.classList.remove('full-loader');
      getEl('loading-screen')?.classList.add('mini-loader-container');
      getEl('logo-inner-container')?.classList.add('mini-loader');
      hideEl('loading-screen');
      showEl('keeptrack-header');
      SplashScreen.loadStr(SplashScreen.msg.math);
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
    const allowedNames = new Set(settingsManager.splashScreenList);

    if (this.splashScreenImgList_ !== null && allowedNames.size > 0) {
      // Filter images whose file name (without extension) matches an entry in splashScreenList
      this.splashScreenImgList_ = this.splashScreenImgList_.filter((imgPath) => {
        const fileName = imgPath.split('/').pop()?.split('.')[0]?.toLowerCase();


        return fileName && allowedNames.has(fileName);
      });
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

    // Preload the rest of the images after 30 seconds
    setTimeout(() => {
      this.splashScreenImgList_.forEach((img) => {
        const preloadImg = new Image();

        preloadImg.src = img;
      });
    }, 30000);
  }
}
