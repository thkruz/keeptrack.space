/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
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
            delayedsrc="data:image/png;base64,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"
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
