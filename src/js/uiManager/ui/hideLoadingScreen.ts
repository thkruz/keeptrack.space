import { drawManager } from '@app/js/drawManager/drawManager';
import { getEl } from '@app/js/lib/helpers';
import { mobileManager } from '@app/js/uiManager/mobile/mobileManager';
import { loadStr } from './loadStr';

export const hideLoadingScreen = () => {
  // Don't wait if we are running Jest
  if ((drawManager.sceneManager.earth.isUseHiRes && drawManager.sceneManager.earth.isHiResReady !== true) || typeof process !== 'undefined') {
    setTimeout(function () {
      hideLoadingScreen();
    }, 100);
    return;
  }

  // Display content when loading is complete.
  getEl('canvas-holder').style.display = 'block';

  mobileManager.checkMobileMode();

  if (settingsManager.isMobileModeEnabled) {
    loadStr('math');
    getEl('loading-screen').style.display = 'none';
    getEl('loading-earth').style.display = 'none';
  } else {
    // Loading Screen Resized and Hidden
    setTimeout(function () {
      getEl('loading-screen').classList.remove('full-loader');
      getEl('loading-screen').classList.add('mini-loader-container');
      getEl('logo-inner-container').classList.add('mini-loader');
      getEl('logo-text').innerHTML = '';
      getEl('loading-earth').style.display = 'none';
      getEl('logo-text-version').innerHTML = '';
      getEl('loading-screen').style.display = 'none';
      loadStr('math');
    }, 100);
  }
};
