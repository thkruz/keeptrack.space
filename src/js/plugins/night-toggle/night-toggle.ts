import dayNightPng from '@app/img/icons/day-night.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl } from '@app/js/lib/helpers';

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'nightToggle',
    cb: () => {
      // Bottom Icon
      getEl('bottom-icons').insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
        <div id="menu-day-night" class="bmenu-item">
          <img alt="day-night" src="" delayedsrc="${dayNightPng}" />
          <span class="bmenu-title">Night Toggle</span>
          <div class="status-icon"></div>
        </div>
        `
      );
      settingsManager.isDayNightToggle = false;
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'nightToggle',
    cb: (iconName: string): void => {
      if (iconName === 'menu-day-night') {
        if (settingsManager.isDayNightToggle) {
          settingsManager.isDayNightToggle = false;
          getEl('menu-day-night').classList.remove('bmenu-item-selected');
          return;
        } else {
          settingsManager.isDayNightToggle = true;
          getEl('menu-day-night').classList.add('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'nightToggle',
    cbName: 'nightToggle',
    cb: (gl: any, nightTexture: any, texture: any): void => {
      if (!settingsManager.isDayNightToggle) {
        gl.bindTexture(gl.TEXTURE_2D, nightTexture);
      } else {
        gl.bindTexture(gl.TEXTURE_2D, texture);
      }
    },
  });
};
