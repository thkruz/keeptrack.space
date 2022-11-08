/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { getEl, shake } from '@app/js/lib/helpers';

import fovPng from '@app/img/icons/fov.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const uiManagerInit = () => {
  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-fov-bubble" class="bmenu-item bmenu-item-disabled">
          <img
            alt="fov"
            src=""
            delayedsrc="${fovPng}" 
          />
          <span class="bmenu-title">Sensor FOV</span>
          <div class="status-icon"></div>
        </div>
      `
  );
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'sensorFov',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'sensorFov',
    cb: bottomMenuClick,
  });

  keepTrackApi.programs.sensorFov = {
    enableFovView,
  };
};

export const enableFovView = () => {
  const { satSet } = keepTrackApi.programs;
  // Disable Satellite Overfly
  settingsManager.isSatOverflyModeOn = false;
  getEl('menu-sat-fov').classList.remove('bmenu-item-selected');

  settingsManager.isFOVBubbleModeOn = true;
  settingsManager.isShowSurvFence = false;
  getEl('menu-fov-bubble').classList.add('bmenu-item-selected');
  getEl('menu-surveillance').classList.remove('bmenu-item-selected');
  satSet.satCruncher.postMessage({
    isShowFOVBubble: 'enable',
    isShowSurvFence: 'disable',
  });
  satSet.satCruncher.postMessage({
    typ: 'isShowSatOverfly',
    isShowSatOverfly: 'reset',
  });
};

export const bottomMenuClick = (iconName: string): void => {
  const { sensorManager, satSet, uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-fov-bubble') {
    if (!sensorManager.checkSensorSelected()) {
      // No Sensor Selected
      uiManager.toast(`Select a Sensor First!`, 'caution');
      shake(getEl('menu-fov-bubble'));
      return;
    }
    if (settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence) {
      settingsManager.isFOVBubbleModeOn = false;
      getEl('menu-fov-bubble').classList.remove('bmenu-item-selected');
      satSet.satCruncher.postMessage({
        isShowFOVBubble: 'reset',
        isShowSurvFence: 'disable',
      });
      return;
    } else {
      enableFovView();
      return;
    }
  }
};
