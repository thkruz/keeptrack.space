/* */

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, openColorbox } from '@app/js/lib/helpers';
import { LaunchCalendarButton } from './components/launch-calendar-button';

let isLaunchMenuOpen = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'launchCalendar',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'launchCalendar',
    cb: bottomMenuClick,
  });

  // Might be unnecessary
  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'launchCalendar',
    cb: hideSideMenus,
  });
};

export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-launches') {
    console.log('launches clicked');
    if (isLaunchMenuOpen) {
      isLaunchMenuOpen = false;
      keepTrackApi.programs.uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
      settingsManager.isPreventColorboxClose = true;
      setTimeout(function () {
        settingsManager.isPreventColorboxClose = false;
      }, 2000);
      keepTrackApi.programs.uiManager.hideSideMenus();
      const year = new Date().getFullYear();
      openColorbox(`https://space.skyrocket.de/doc_chr/lau${year}.htm`, {
        callback: cboxClosed,
      });
      isLaunchMenuOpen = true;
      getEl('menu-launches').classList.add('bmenu-item-selected');
      return;
    }
  }
};

export const hideSideMenus = (): void => {
  getEl('menu-launches').classList.remove('bmenu-item-selected');
};

export const cboxClosed = (): void => {
  if (isLaunchMenuOpen) {
    isLaunchMenuOpen = false;
    getEl('menu-launches').classList.remove('bmenu-item-selected');
  }
};
export const uiManagerInit = (): any => {
  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML('beforeend', LaunchCalendarButton);
};
