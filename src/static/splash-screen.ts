import { keepTrackApi } from '../keepTrackApi';
import { getEl, hideEl, setInnerHtml, showEl } from '../lib/get-el';
import { MobileManager } from '../singletons/mobileManager';

export abstract class SplashScreen {
  static msg = {
    math: 'Attempting to Math...',
    science: 'Locating Science...',
    science2: 'Found Science...',
    dots: 'Drawing Dots in Space...',
    satIntel: 'Integrating Satellite Intel...',
    painting: 'Painting the Earth...',
    coloring: 'Coloring Inside the Lines..',
    elsets: 'Locating ELSETs...',
    models: 'Building 3D Models...',
  };

  static textElId = 'loader-text';

  /**
   * Initializes the loading screen and appends it to the specified root DOM element.
   * @param rootDom The root DOM element to which the loading screen will be appended.
   */
  static initLoadingScreen(rootDom: HTMLElement) {
    rootDom.innerHTML += keepTrackApi.html`
      <div id="loading-screen" class="valign-wrapper full-loader">
        <div id="logo-inner-container" class="valign">
          <div style="display: flex;">
            <span id="logo-text" class="logo-font">KEEP TRACK</span>
            <span id="logo-text-version" class="logo-font">8</span>
          </div>
          <span id="loader-text">Downloading Science...</span>
        </div>
      </div>`;
  }

  static hideSplashScreen() {
    // Don't wait if we are running Jest
    if (keepTrackApi.getScene().earth.isUseHiRes && keepTrackApi.getScene().earth.isHiResReady !== true) {
      setTimeout(function () {
        SplashScreen.hideSplashScreen();
      }, 100);
      return;
    }

    // Display content when loading is complete.
    showEl('canvas-holder');

    MobileManager.checkMobileMode();

    if (settingsManager.isMobileModeEnabled) {
      SplashScreen.loadStr('Attempting to Math');
      hideEl('loading-screen');
    } else {
      // Loading Screen Resized and Hidden
      setTimeout(function () {
        getEl('loading-screen')?.classList.remove('full-loader');
        getEl('loading-screen')?.classList.add('mini-loader-container');
        getEl('logo-inner-container')?.classList.add('mini-loader');
        setInnerHtml('logo-text', '');
        setInnerHtml('logo-text-version', '');
        hideEl('loading-screen');
        SplashScreen.loadStr(SplashScreen.msg.math);
      }, 100);
    }
  }

  static loadStr(str: string) {
    const LoaderText = getEl(SplashScreen.textElId);
    if (!LoaderText) return; // If the element is not found, do nothing
    LoaderText.textContent = str;
  }
}
