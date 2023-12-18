/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
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

import sat3Png from '@app/img/icons/sat3.png';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { shake } from '@app/js/lib/shake';
import { CameraType } from '@app/js/singletons/camera';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class SatelliteViewPlugin extends KeepTrackPlugin {
  bottomIconElementName = 'menu-satview';
  bottomIconLabel = 'Satellite View';
  bottomIconImg = sat3Png;
  isIconDisabledOnLoad = true;
  bottomIconCallback = () => {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.SATELLITE) {
      const uiManagerInstance = keepTrackApi.getUiManager();
      uiManagerInstance.hideSideMenus();
      keepTrackApi.getMainCamera().cameraType = CameraType.FIXED_TO_SAT; // Back to normal Camera Mode
      getEl(this.bottomIconElementName).classList.remove('bmenu-item-selected');
    } else {
      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      if (catalogManagerInstance.selectedSat !== -1) {
        keepTrackApi.getMainCamera().cameraType = CameraType.SATELLITE; // Activate Satellite Camera Mode
        getEl(this.bottomIconElementName).classList.add('bmenu-item-selected');
      } else {
        const uiManagerInstance = keepTrackApi.getUiManager();
        uiManagerInstance.toast(`Select a Satellite First!`, 'caution');
        shake(getEl(this.bottomIconElementName));
      }
    }
  };

  lastLongAudioTime = 0;

  constructor() {
    const PLUGIN_NAME = 'Satellite View';
    super(PLUGIN_NAME);
  }
}

export const satelliteViewPlugin = new SatelliteViewPlugin();
