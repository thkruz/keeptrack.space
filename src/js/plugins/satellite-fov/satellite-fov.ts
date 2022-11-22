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

import sat2Png from '@app/img/icons/sat2.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, shake } from '@app/js/lib/helpers';

export const uiManagerInit = () => {
  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <!-- ########################## HTML ########################## -->
    <div id="menu-sat-fov" class="bmenu-item bmenu-item-disabled">
      <img
        alt="sat2"
        src="" delayedsrc="${sat2Png}" />
      <span class="bmenu-title">Satellite FOV</span>
      <div class="status-icon"></div>
    </div>
    <!-- ########################## HTML ########################## -->
  `
  );
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

// prettier-ignore
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  const { satSet, objectManager, uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-sat-fov') {
    if (objectManager.selectedSat === -1 && (<HTMLInputElement>getEl('search')).value === '') {
      // No Sat Selected and No Search Present
      uiManager.toast(`Select a Satellite First!`, 'caution');
      shake(getEl('menu-sat-fov'));
      return;
    }
    if (settingsManager.isSatOverflyModeOn) {
      settingsManager.isSatOverflyModeOn = false;
      getEl('menu-sat-fov').classList.remove('bmenu-item-selected');
      satSet.satCruncher.postMessage({
        typ: 'isShowSatOverfly',
        isShowSatOverfly: 'reset',
      });
      return;
    } else {
      const fovDom = getEl('menu-fov-bubble');
      if (fovDom) fovDom.classList.remove('bmenu-item-selected');

      const survDom = getEl('menu-surveillance');
      if (survDom) survDom.classList.remove('bmenu-item-selected');
      settingsManager.isShowSurvFence = false;
      settingsManager.isFOVBubbleModeOn = false;

      settingsManager.isSatOverflyModeOn = true;

      if ((<HTMLInputElement>getEl('search')).value !== '') {
        // If Group Selected
        uiManager.doSearch((<HTMLInputElement>getEl('search')).value);
      }

      const satFieldOfView = parseFloat(<string>(<HTMLInputElement>getEl('satFieldOfView')).value);
      getEl('menu-sat-fov').classList.add('bmenu-item-selected');
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
