/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * externalSources.ts is a plugin to allow downloading and parsing of external
 * data sources from the internet.
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

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';
import sat2Png from '@app/img/icons/sat2.png';

export const uiManagerInit = () => {
  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
    <div id="menu-sat-fov" class="bmenu-item bmenu-item-disabled">
      <img
        alt="sat2"
        src="" delayedsrc="${sat2Png}" />
      <span class="bmenu-title">Satellite FOV</span>
      <div class="status-icon"></div>
    </div>
  `);
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'satelliteFov',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'satelliteFov',
    cb: bottomMenuClick,
  });
};
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  const { satSet, objectManager, uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-sat-fov') {
    if (objectManager.selectedSat === -1 && $('#search').val() === '') {
      // No Sat Selected and No Search Present
      if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.satFovDisabled();
      uiManager.toast(`Select a Satellite First!`, 'caution');
      if (!$('#menu-sat-fov:animated').length) {
        $('#menu-sat-fov').effect('shake', {
          distance: 10,
        });
      }
      return;
    }
    if (settingsManager.isSatOverflyModeOn) {
      settingsManager.isSatOverflyModeOn = false;
      $('#menu-sat-fov').removeClass('bmenu-item-selected');
      satSet.satCruncher.postMessage({
        typ: 'isShowSatOverfly',
        isShowSatOverfly: 'reset',
      });
      return;
    } else {
      $('#menu-fov-bubble').removeClass('bmenu-item-selected');
      $('#menu-surveillance').removeClass('bmenu-item-selected');
      settingsManager.isShowSurvFence = false;
      settingsManager.isFOVBubbleModeOn = false;

      settingsManager.isSatOverflyModeOn = true;

      if ($('#search').val() !== '') {
        // If Group Selected
        uiManager.doSearch($('#search').val());
      }

      const satFieldOfView = parseFloat(<string>$('#satFieldOfView').val());
      $('#menu-sat-fov').addClass('bmenu-item-selected');
      satSet.satCruncher.postMessage({
        isShowFOVBubble: 'reset',
        isShowSurvFence: 'disable',
      });
      satSet.satCruncher.postMessage({
        typ: 'isShowSatOverfly',
        isShowSatOverfly: 'enable',
        selectedSatFOV: satFieldOfView,
      });
      satSet.setColorScheme(settingsManager.currentColorScheme, true);
      return;
    }
  }
};
