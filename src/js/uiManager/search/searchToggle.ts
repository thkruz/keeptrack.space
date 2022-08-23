import { getEl } from '@app/js/lib/helpers';
import { hideSideMenus } from '../../plugins/breakup/breakup';
import { searchBox } from './searchBox';

let isSearchOpen = false;
let forceClose = false;
let forceOpen = false;
export const searchToggle = (force?: boolean) => {
  // Reset Force Options
  forceClose = false;
  forceOpen = false;

  // Pass false to force close and true to force open
  if (typeof force != 'undefined') {
    if (!force) forceClose = true;
    if (force) forceOpen = true;
  }

  if ((!isSearchOpen && !forceClose) || forceOpen) {
    isSearchOpen = true;
    getEl('search-holder').classList.remove('search-slide-up');
    getEl('search-holder').classList.add('search-slide-down');
    getEl('search-icon').classList.add('search-icon-search-on');
    getEl('fullscreen-icon').classList.add('top-menu-icons-search-on');
    getEl('tutorial-icon').classList.add('top-menu-icons-search-on');
    getEl('legend-icon').classList.add('top-menu-icons-search-on');
  } else {
    isSearchOpen = false;
    getEl('search-holder').classList.remove('search-slide-down');
    getEl('search-holder').classList.add('search-slide-up');
    getEl('search-icon').classList.remove('search-icon-search-on');
    setTimeout(function () {
      getEl('fullscreen-icon').classList.remove('top-menu-icons-search-on');
      getEl('tutorial-icon').classList.remove('top-menu-icons-search-on');
      getEl('legend-icon').classList.remove('top-menu-icons-search-on');
    }, 500);
    hideSideMenus();
    searchBox.hideResults();
    // getEl('menu-space-stations').classList.remove('bmenu-item-selected');
    // This is getting called too much. Not sure what it was meant to prevent?
    // satSet.setColorScheme(colorSchemeManager.default, true);
    // uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
  }
};
