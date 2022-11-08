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

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import sat3Png from '@app/img/icons/sat3.png';

export const init = (): void => {
  const { objectManager, uiManager } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'satelliteView',
    cb: () => {
      // Bottom Icon
      getEl('bottom-icons').insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
        <div id="menu-satview" class="bmenu-item bmenu-item-disabled">
          <img
            alt="sat3"
            src=""
            delayedsrc="${sat3Png}"
          />
          <span class="bmenu-title">Satellite View</span>
          <div class="status-icon"></div>
        </div>
      `
      );
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'satelliteView',
    // prettier-ignore
    cb: (iconName: string): void => { // NOSONAR
      if (iconName === 'menu-satview') {
        const mainCamera = keepTrackApi.programs.mainCamera;
        if (mainCamera.cameraType.current === mainCamera.cameraType.Satellite) {
          uiManager.hideSideMenus();
          mainCamera.cameraType.current = mainCamera.cameraType.FixedToSat; // Back to normal Camera Mode
          getEl('menu-satview').classList.remove('bmenu-item-selected');
          return;
        } else {
          if (objectManager.selectedSat !== -1) {
            mainCamera.cameraType.current = mainCamera.cameraType.Satellite; // Activate Satellite Camera Mode
            getEl('menu-satview').classList.add('bmenu-item-selected');
          } else {
            uiManager.toast(`Select a Satellite First!`, 'caution');
            shake(getEl('menu-satview'));
          }
          return;
        }
      }
    },
  });
};
