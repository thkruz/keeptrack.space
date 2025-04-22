/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * astronomy.ts is a plugin for showing the stars above from the perspective
 * of a view on the earth.
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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

import { getEl } from '@app/lib/get-el';
import { CameraType } from '@app/singletons/camera';

import { MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import constellationPng from '@public/img/icons/constellation.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { Planetarium } from '../planetarium/planetarium';

export class Astronomy extends KeepTrackPlugin {
  readonly id = 'Astronomy';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ALL];

  bottomIconLabel = 'Astronomy View';
  bottomIconImg = constellationPng;
  isRequireSensorSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  bottomIconCallback = (): void => {
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    const drawManagerInstance = keepTrackApi.getRenderer();
    const uiManagerInstance = keepTrackApi.getUiManager();

    if (this.isMenuButtonActive) {
      if (!this.verifySensorSelected()) {
        return;
      }

      orbitManagerInstance.clearInViewOrbit();
      keepTrackApi.getMainCamera().cameraType = CameraType.ASTRONOMY; // Activate Astronomy Camera Mode
      // getEl('fov-text').innerHTML = ('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');

      keepTrackApi.getPlugin(Planetarium)?.setBottomIconToUnselected();
    } else {
      keepTrackApi.getMainCamera().isPanReset = true;
      keepTrackApi.getMainCamera().isLocalRotateReset = true;
      settingsManager.fieldOfView = 0.6;
      drawManagerInstance.glInit();
      uiManagerInstance.hideSideMenus();
      keepTrackApi.getMainCamera().cameraType = CameraType.DEFAULT; // Back to normal Camera Mode
      // getEl('fov-text').innerHTML = ('');
      getEl(this.bottomIconElementName)?.classList.remove('bmenu-item-selected');
    }
  };
}
