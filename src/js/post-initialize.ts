import eruda from 'eruda';
import erudaFps from 'eruda-fps';
import { keepTrackApi } from './api/keepTrackApi';
import { getEl } from './lib/helpers';

export const postInitialize = () => {
  if (settingsManager.cruncherReady) {
    // Create Container Div
    // NOTE: This needs to be done before uiManagerFinal
    getEl('ui-wrapper').innerHTML += '<div id="eruda"></div>';

    // Update any CSS now that we know what is loaded
    keepTrackApi.methods.uiManagerFinal();
    // Update MaterialUI with new menu options
    window.M.AutoInit();

    eruda.init({
      autoScale: false,
      container: getEl('eruda'),
      useShadowDom: false,
      tool: ['console', 'elements'],
    });
    eruda.add(erudaFps);

    // Hide Eruda
    try {
      (<HTMLDivElement>(<unknown>document.getElementsByClassName('eruda-entry-btn')[0])).style.display = 'none';
      (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.top = 'var(--top-menu-height)';
      (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.height = '80%';
      (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.width = '60%';
      (<HTMLDivElement>(<unknown>document.getElementById('eruda'))).style.left = '20%';
    } catch {
      // Eruda might not be there
    }

    if (settingsManager.onLoadCb) {
      settingsManager.onLoadCb();
    }

    keepTrackApi.programs.uiManager.menuController();
  } else {
    setTimeout(postInitialize, 100);
  }
};
