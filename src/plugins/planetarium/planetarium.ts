/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
 *
 * https://keeptrack.space
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

import { hideEl } from '@app/lib/get-el';
import { CameraType } from '@app/singletons/camera';

import { MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import planetariumPng from '@public/img/icons/planetarium.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { Astronomy } from '../astronomy/astronomy';

export class Planetarium extends KeepTrackPlugin {
  readonly id = 'Planetarium';
  dependencies_: string[] = [];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = planetariumPng;
  isRequireSensorSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  onSetBottomIconToUnselected = (): void => {
    const renderer = keepTrackApi.getRenderer();
    const uiManagerInstance = keepTrackApi.getUiManager();

    keepTrackApi.getMainCamera().isPanReset = true;
    keepTrackApi.getMainCamera().isLocalRotateReset = true;
    settingsManager.fieldOfView = 0.6;
    renderer.glInit();
    uiManagerInstance.hideSideMenus();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();

    orbitManagerInstance.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      keepTrackApi.getMainCamera().cameraType = CameraType.DEFAULT;
    }

    /*
     * TODO: implement fov information
     * getEl('fov-text').innerHTML = ('');
     */
  };

  bottomIconCallback = (): void => {
    if (this.isMenuButtonActive) {
      if (!this.verifySensorSelected()) {
        return;
      }

      keepTrackApi.getMainCamera().cameraType = CameraType.PLANETARIUM; // Activate Planetarium Camera Mode

      hideEl('cspocAllSensor');
      hideEl('mwAllSensor');
      hideEl('mdAllSensor');
      hideEl('esocAllSensor');
      hideEl('llAllSensor');
      hideEl('rusAllSensor');
      hideEl('prcAllSensor');

      /*
       * TODO: implement fov information
       * getEl('fov-text').innerHTML = ('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
       */
      keepTrackApi.getPlugin(Astronomy)?.setBottomIconToUnselected();
    } else {
      this.onSetBottomIconToUnselected();
    }
  };
}
