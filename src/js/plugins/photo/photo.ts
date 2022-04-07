/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * TESTING: This plugin requires php to be installed on the server. It won't work
 * with the default http npm module.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import cameraPng from '@app/img/icons/camera.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

export const rightBtnMenuAdd = () => {
  $('#right-btn-menu-ul').append(keepTrackApi.html`   
            <li class="rmb-menu-item" id="save-rmb"><a href="#">Save Image &#x27A4;</a></li>
          `);
};
export const uiManagerInit = () => {
  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-photo" class="bmenu-item">
          <img
            alt="camera"
            src=""
            delayedsrc="${cameraPng}"
          />
          <span class="bmenu-title">Take Photo</span>
          <div class="status-icon"></div>
        </div>
      `);

  keepTrackApi.register({
    method: 'rightBtnMenuAdd',
    cbName: 'photo',
    cb: rightBtnMenuAdd,
  });

  $('#rmb-wrapper').append(keepTrackApi.html`
        <div id="save-rmb-menu" class="right-btn-menu">
          <ul class='dropdown-contents'>
            <li id="save-hd-rmb"><a href="#">HD (1920 x 1080)</a></li>
            <li id="save-4k-rmb"><a href="#">4K (3840 x 2160)</a></li>
            <li id="save-8k-rmb"><a href="#">8K (7680 x 4320)</a></li>
          </ul>
        </div>
      `);
};
export const rmbMenuActions = (iconName: string): void => {
  switch (iconName) {
    case 'save-hd-rmb':
      saveHiResPhoto('hd');
      break;
    case 'save-4k-rmb':
      saveHiResPhoto('4k');
      break;
    case 'save-8k-rmb':
      saveHiResPhoto('8k');
      break;
  }
};
export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-photo') {
    saveHiResPhoto('4k');
  }
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'photo',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'photo',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'rmbMenuActions',
    cbName: 'editSat',
    cb: rmbMenuActions,
  });
};

export const saveHiResPhoto = (resolution: string) => {
  switch (resolution) {
    case 'hd':
      settingsManager.hiResWidth = 1920;
      settingsManager.hiResHeight = 1080;
      break;
    case '4k':
      settingsManager.hiResWidth = 3840;
      settingsManager.hiResHeight = 2160;
      break;
    case '8k':
      settingsManager.hiResWidth = 7680;
      settingsManager.hiResHeight = 4320;
      break;
  }
  settingsManager.screenshotMode = true;
};
