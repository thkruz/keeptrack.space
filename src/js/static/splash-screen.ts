import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { MobileManager } from '../singletons/mobileManager';

export abstract class SplashScreen {
  static msg = {
    math: 'Attempting to Math...',
    science: 'Locating Science...',
    science2: 'Found Science...',
    dots: 'Drawing Dots in Space...',
    satIntel: 'Integrating Satellite Intel...',
    radarData: 'Importing Radar Data...',
    painting: 'Painting the Earth...',
    coloring: 'Coloring Inside the Lines..',
    elsets: 'Locating ELSETs...',
    models: 'Building 3D Models...',
  };

  static textElId = 'loader-text';

  static hideSplashScreen() {
    // Don't wait if we are running Jest
    if (keepTrackApi.getScene().earth.isUseHiRes && keepTrackApi.getScene().earth.isHiResReady !== true) {
      setTimeout(function () {
        SplashScreen.hideSplashScreen();
      }, 100);
      return;
    }

    // Display content when loading is complete.
    getEl('canvas-holder').style.display = 'block';

    MobileManager.checkMobileMode();

    if (settingsManager.isMobileModeEnabled) {
      SplashScreen.loadStr('Attempting to Math');
      getEl('loading-screen').style.display = 'none';
    } else {
      // Loading Screen Resized and Hidden
      setTimeout(function () {
        getEl('loading-screen').classList.remove('full-loader');
        getEl('loading-screen').classList.add('mini-loader-container');
        getEl('logo-inner-container').classList.add('mini-loader');
        getEl('logo-text').innerHTML = '';
        getEl('logo-text-version').innerHTML = '';
        getEl('loading-screen').style.display = 'none';
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
