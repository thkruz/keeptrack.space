/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2016-2024 Theodore Kruczek
 * @Copyright (C) 2020-2024 Heather Kruczek
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

import { ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { shake } from '@app/lib/shake';
import { CameraType } from '@app/singletons/camera';
import sat3Png from '@public/img/icons/sat3.png';
import i18next from 'i18next';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class SatelliteViewPlugin extends KeepTrackPlugin {
  readonly id = 'SatelliteViewPlugin';
  dependencies_ = [SelectSatManager.name];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  isRequireSatelliteSelected = true;
  bottomIconImg = sat3Png;
  isIconDisabledOnLoad = true;
  bottomIconCallback = () => {
    if (keepTrackApi.getMainCamera().cameraType === CameraType.SATELLITE) {
      const uiManagerInstance = keepTrackApi.getUiManager();

      uiManagerInstance.hideSideMenus();
      keepTrackApi.getMainCamera().cameraType = CameraType.FIXED_TO_SAT; // Back to normal Camera Mode
      getEl(this.bottomIconElementName).classList.remove('bmenu-item-selected');
    } else if (this.selectSatManager_.selectedSat !== -1) {
      keepTrackApi.getMainCamera().cameraType = CameraType.SATELLITE; // Activate Satellite Camera Mode
      getEl(this.bottomIconElementName).classList.add('bmenu-item-selected');
    } else {
      const uiManagerInstance = keepTrackApi.getUiManager();

      uiManagerInstance.toast(i18next.t('plugins.SelectSatelliteFirst'), ToastMsgType.caution);
      shake(getEl(this.bottomIconElementName));
    }
  };
}
