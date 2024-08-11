import { keepTrackApi } from '../keepTrackApi';
import { getEl, hideEl, showEl } from '../lib/get-el';
import { MobileManager } from '../singletons/mobileManager';

export abstract class SplashScreen {
  static readonly msg = {
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
    return SplashScreen.randomHintText_[Math.floor(Math.random() * SplashScreen.randomHintText_.length)];
  }

  static readonly randomHintText_ = [
    'Satellite models appear bigger than they really are. Everything else is to scale.',
    'Press the \'L\' key to toggle satellite orbits on/off.',
    'Press the \'P\' key to open a polar plot of the current satellite (You need to pick a sensor first!).',
    'Reset the simulation time by pressing the \'T\' key.',
    'Speed up the simulation by pressing the \'>\' key.',
    'Slow down the simulation by pressing the \'<\' key.',
    'Pressing the \'/\' key will toggle the simulation speed between 1x and 0x.',
    'Press the \'V\' key to change the view mode.',
    'Press Shift+F1 to open the help menu at any time.',
    'Press the \'R\' key to enable auto-rotation.',
    'Pressing Shift + C when a satellite is selected will toggle its visibility cone on/off.',
    'The \'Home\' key will rotate the camera to the current sensor.',
    'The \'`\' (tilda) key will reset the camera to the default view.',
    'The \'M\' key will show the 2D map view of the current satellite.',
    'The settings menu located in the bottom toolbar contains many options to customize your experience.',
    'Many of the menus have additional settings that can be accessed by clicking the gear icon.',
    'Add satellites to the watchlist to get notifications when they are overhead of the current sensor.',
    'Right click on the globe to open the context menu with more options.',
    'Press \'+\' or \'-\' keys to zoom in and out.',
    'Press \'F11\' to toggle on/off the fullscreen mode.',
    'You can search for satellites by name or NORAD ID in the search bar at the top right.',
    'A new launch nominal can be created by selecting a satellite and clicking the \'New Launch\' button in the bottom menu.',
  ];

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
