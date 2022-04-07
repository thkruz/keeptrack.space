/* */

import calendarPng from '@app/img/icons/calendar.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

let isLaunchMenuOpen = true;

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
      try {
        $.colorbox({
          href: 'https://space.skyrocket.de/doc_chr/lau2020.htm',
          iframe: true,
          width: '80%',
          height: '80%',
          fastIframe: false,
          closeButton: false,
        });
      } catch (error) {
        // DEBUG:
        // console.debug(error);
      }
      isLaunchMenuOpen = true;
      $('#menu-launches').addClass('bmenu-item-selected');
      return;
    }
  }
};

export const hideSideMenus = (): void => {
  $('#menu-launches').removeClass('bmenu-item-selected');
};

export const cboxClosed = (): void => {
  if (isLaunchMenuOpen) {
    isLaunchMenuOpen = false;
    $('#menu-launches').removeClass('bmenu-item-selected');
  }
};
export const uiManagerInit = (): any => {
  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
    <div id="menu-launches" class="bmenu-item">
      <img alt="calendar2" src="" delayedsrc="${calendarPng}" />
      <span class="bmenu-title">Launch Calendar</span>
      <div class="status-icon"></div>
    </div> 
  `);

  $(document).on('cbox_closed', cboxClosed);
};
