import { getEl } from '@app/js/lib/helpers';
import { uiManager } from '../uiManager';

export const hideUi = () => {
  if (uiManager.isUiVisible) {
    getEl('header').style.display = 'none';
    getEl('ui-wrapper').style.display = 'none';
    getEl('nav-footer').style.display = 'none';
    uiManager.isUiVisible = false;
  } else {
    getEl('header').style.display = 'block';
    getEl('ui-wrapper').style.display = 'block';
    getEl('nav-footer').style.display = 'block';
    uiManager.isUiVisible = true;
  }
};
