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
  const { objectManager, settingsManager, uiManager } = keepTrackApi.programs;
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
            delayedsrc="data:image/png;base64,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"
          />
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
    cb: (iconName: string): void => {
      if (iconName === 'menu-satview') {
        const cameraManager = keepTrackApi.programs.cameraManager;
        if (cameraManager.cameraType.current === cameraManager.cameraType.satellite) {
          // isSatView = false;
          uiManager.hideSideMenus();
          cameraManager.cameraType.current = cameraManager.cameraType.fixedToSat; // Back to normal Camera Mode
          $('#menu-satview').removeClass('bmenu-item-selected');
          return;
        } else {
          if (objectManager.selectedSat !== -1) {
            cameraManager.cameraType.current = cameraManager.cameraType.satellite; // Activate Satellite Camera Mode
            $('#menu-satview').addClass('bmenu-item-selected');
            // isSatView = true;
          } else {
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.satViewDisabled();
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
