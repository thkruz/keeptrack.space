/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * externalSources.ts is a plugin to allow downloading and parsing of external
 * data sources from the internet.
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

import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { settingsManager, sensorManager, satSet, uiManager } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'sensorFov',
    cb: () => {
      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-fov-bubble" class="bmenu-item bmenu-item-disabled">
          <img
            alt="fov"
            src=""
            delayedsrc="data:image/png;base64,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"
          />
          <span class="bmenu-title">Sensor FOV</span>
          <div class="status-icon"></div>
        </div>
      `);
    },
  });

  // Add JavaScript
  const enableFovView = () => {
    // Disable Satellite Overfly
    settingsManager.isSatOverflyModeOn = false;
    $('#menu-sat-fov').removeClass('bmenu-item-selected');

    settingsManager.isFOVBubbleModeOn = true;
    settingsManager.isShowSurvFence = false;
    $('#menu-fov-bubble').addClass('bmenu-item-selected');
    $('#menu-surveillance').removeClass('bmenu-item-selected');
    satSet.satCruncher.postMessage({
      isShowSatOverfly: 'reset',
      isShowFOVBubble: 'enable',
      isShowSurvFence: 'disable',
    });
  };

  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'sensorFov',
    cb: (iconName: string): void => {
      if (iconName === 'menu-fov-bubble') {
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.bubbleDisabled();
          uiManager.toast(`Select a Sensor First!`, 'caution');
          if (!$('#menu-fov-bubble:animated').length) {
            $('#menu-fov-bubble').effect('shake', {
              distance: 10,
            });
          }
          return;
        }
        if (settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence) {
          settingsManager.isFOVBubbleModeOn = false;
          $('#menu-fov-bubble').removeClass('bmenu-item-selected');
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
    },
  });
  
  keepTrackApi.programs.sensorFov = {
    enableFovView: enableFovView,
  };
};
