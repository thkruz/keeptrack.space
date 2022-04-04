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
import sat3Png from '@app/img/icons/sat3.png';

export const init = (): void => {
  const { adviceManager, objectManager, uiManager } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'satelliteView',
    cb: () => {
      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-satview" class="bmenu-item bmenu-item-disabled">
          <img
            alt="sat3"
            src=""
            delayedsrc=${sat3Png}/>
          <span class="bmenu-title">Satellite View</span>
          <div class="status-icon"></div>
        </div>
      `);
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'satelliteView',
    cb: (iconName: string): void => { // NOSONAR
      if (iconName === 'menu-satview') {
        const mainCamera = keepTrackApi.programs.mainCamera;
        if (mainCamera.cameraType.current === mainCamera.cameraType.Satellite) {
          uiManager.hideSideMenus();
          mainCamera.cameraType.current = mainCamera.cameraType.FixedToSat; // Back to normal Camera Mode
          $('#menu-satview').removeClass('bmenu-item-selected');
          return;
        } else {
          if (objectManager.selectedSat !== -1) {
            mainCamera.cameraType.current = mainCamera.cameraType.Satellite; // Activate Satellite Camera Mode
            $('#menu-satview').addClass('bmenu-item-selected');
          } else {
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (settingsManager.plugins.topMenu) adviceManager.adviceList.satViewDisabled();
            if (!$('#menu-satview:animated').length) {
              $('#menu-satview').effect('shake', {
                distance: 10,
              });
            }
          }
          return;
        }
      }
    },
  });
};
