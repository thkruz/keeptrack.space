/* */

import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  let isLaunchMenuOpen = true;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'launchCalendar',
    cb: () => {
      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
      <div id="menu-launches" class="bmenu-item">
        <img alt="calendar2" src="" delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAABRUlEQVR4nO3cQWoCQRBAUQ25Tna5/wmy80BmFXDhgIPp/u343jIEHfhU05YkpxMAAAAA7+I8882+fq7Xez+/fJ+nPsefFZ7nY9YbcZ8AsadGbWuE380zR5YJiAkQEyAmQEyA2OeIF926FazwwefW3ucZceszATEBYkOOoC3VUbNlhecxATEBYkOOIDuix5mAmAAxAWICxASITd0FvTq7oAMSICZATICYALGp6+i9/usbq5W/oTMBMQFiAsQEiAkQW/oWtPc2Mvr3RzABMQFiSx9Bj9i7Il7h2LllAmICxKYeQavtauyCEKAmQEyAmACxpf9AY/RtZIUPZSYgJkDs5XdBKxwjzzABMQFih9oFrbDb2csExASICRATICZA7FC7oJVvO1tMQEyAmAAxAWICxPy/oJgJiAkQEyAmQEwAAAAAAAA4vl/1Vlb9QHsXDQAAAABJRU5ErkJggg==">
        <span class="bmenu-title">Launch Calendar</span>
        <div class="status-icon"></div>
      </div> 
    `);

      $(document).on('cbox_closed', function () {
        if (isLaunchMenuOpen) {
          isLaunchMenuOpen = false;
          $('#menu-launches').removeClass('bmenu-item-selected');
        }
      });
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'launchCalendar',
    cb: (iconName: string): void => {
      if (iconName === 'menu-launches') {
        if (isLaunchMenuOpen) {
          isLaunchMenuOpen = false;
          keepTrackApi.programs.uiManager.hideSideMenus();
          return;
        } else {
          if (keepTrackApi.programs.settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
          keepTrackApi.programs.settingsManager.isPreventColorboxClose = true;
          setTimeout(function () {
            keepTrackApi.programs.settingsManager.isPreventColorboxClose = false;
          }, 2000);
          keepTrackApi.programs.uiManager.hideSideMenus();
          try {
            if (location.protocol === 'https:') {
              $.colorbox({
                href: 'https://space.skyrocket.de/doc_chr/lau2020.htm',
                iframe: true,
                width: '80%',
                height: '80%',
                fastIframe: false,
                closeButton: false,
              });
            } else {
              $.colorbox({
                href: 'http://space.skyrocket.de/doc_chr/lau2020.htm',
                iframe: true,
                width: '80%',
                height: '80%',
                fastIframe: false,
                closeButton: false,
              });
            }
          } catch (error) {
            console.debug(error);
          }
          isLaunchMenuOpen = true;
          $('#menu-launches').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  // Might be unnecessary
  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'launchCalendar',
    cb: (): void => {
      $('#menu-launches').removeClass('bmenu-item-selected');
    },
  });
};
